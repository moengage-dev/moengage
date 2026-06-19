# MoEngage — Production-Readiness Audit (Opus 4.8)

> Date: 2026-06-05 · Branch: `main` · Method: source verified against docs, not trusted blindly.
> Baseline: `npx tsc --noEmit` ✅ · `npm run build` ✅ (`ƒ Proxy (Middleware)` confirmed wired) · SQRATCH grep clean (the only "matches" are the substring "points" inside the word "end**points**" in comments — false positives).

---

## 1. Executive Verdict

**NOT production-ready.** The scan-aggregation rewrite is fundamentally sound — the atomic `INSERT … ON CONFLICT DO UPDATE` is race-safe, counters are honest, and analytics/billing/heatmaps consistently use `SUM(hitCount/billableCount/...)` rather than row counts. The OTP/reward flow is genuinely well-hardened. But there are correctness and configuration defects that will bite in production, plus scalability gaps on the hottest write path.

**Top 5 risks:**

1. **Rate limiting fails OPEN when Upstash env is missing** — in production this silently disables all OTP edge rate limiting (`src/proxy.ts`).
2. ~~**Campaign-Manager analytics scoping is broken**~~ — **RESOLVED** (2026-06-18): `CAMPAIGN_MANAGER` now scopes by assigned campaign IDs via `getAssignedCampaignIds`; `ADVERTISER_VIEWER` is branched separately. See `analytics.service.ts:500–552`.
3. **No composite indexes for the per-scan classification lookbacks** — 4 time-windowed aggregate queries run on every consumer scan against single-column indexes; this is a scalability cliff.
4. **The scan-collapse migration is table-locking** — full-table `UPDATE` backfill + `SET NOT NULL` + non-concurrent `UNIQUE INDEX` build will lock `ScanEvent` on a populated production DB.
5. **Weak OTP primitives + unverified DB TLS + test-fallback data poisoning** — `Math.random()` OTP, plain-SHA256 OTP hash, `rejectUnauthorized:false` by default, and hardcoded test fallbacks that can execute in prod.

---

## 2. Critical Blockers

### CB-1 — OTP rate limiter fails open
- **Risk:** All edge rate limiting for `/api/public/rewards/*` is bypassed if `UPSTASH_REDIS_REST_URL`/`TOKEN` are unset or wrong.
- **Why it matters:** A misconfigured Vercel env (very common) silently removes distributed-abuse protection. Combined with real SMS later, this is an SMS-bomb / enumeration vector.
- **File:** `src/proxy.ts:18-20`, `src/proxy.ts:113-117`.
- **Evidence:**
  ```ts
  const redis = redisUrl && redisToken ? new Redis(...) : null;
  ...
  if (!redis || !limiters) {
    console.warn("Upstash Redis ... not configured. Bypassing rate limits.");
    return NextResponse.next();   // ← fails OPEN
  }
  ```
- **Mitigation already present:** DB-level 60s cooldown (`/start`) and 3-attempt OTP lockout (`/verify`) survive a proxy bypass, so this is not a total hole — but IP-distributed abuse is unprotected.
- **Exact fix:** Fail closed in production. If `process.env.VERCEL_ENV === "production"` (or `NODE_ENV === "production"`) and `redis` is null, return `503` for `/api/public/rewards/*` instead of `NextResponse.next()`. Keep the bypass only for local/dev.

### ~~CB-2 — Campaign-Manager analytics scoped by the wrong (null) field~~ — RESOLVED 2026-06-18

> **Status:** Fixed. `CAMPAIGN_MANAGER` is now branched separately in `getAnalyticsDashboardData` and scopes every filter by the list returned from `getAssignedCampaignIds(user.id)`. `ADVERTISER_VIEWER` is also branched separately and scopes by `user.advertiserId`. Fail-closed: empty metrics returned if no assigned campaigns or missing scope id. See `src/server/services/analytics.service.ts:500–552`.

- ~~**Risk:** `getAnalyticsDashboardData` scopes `CAMPAIGN_MANAGER` by `advertiserId`. Per `user.validator.ts`, campaign managers require `brandId`, **not** `advertiserId`, so `user.advertiserId` is `null`. The dashboard then filters every model by `advertiserId: null`, which (a) shows `0` campaigns, (b) surfaces orphan `null`-advertiser scan rows that don't belong to the user, and (c) never shows the manager's actually-assigned campaigns.~~
- ~~**Exact fix:** Branch `CAMPAIGN_MANAGER` separately and scope by assigned campaign IDs (reuse `getRoleScopeFilters` or query `campaignAssignment`). Fail closed: if a non-admin's scope id/list is empty, return the empty-metrics object (as the function already does for the no-assignments case) — never an unfiltered query.~~

---

## 3. High-Risk Issues

### ~~H-1 — Inline analytics scoping does not fail closed~~ — RESOLVED 2026-06-18

> **Status:** Fixed. `getAnalyticsDashboardData` now fails closed for every non-admin role directly in the service: BRAND_ADMIN returns empty if `brandId` is null; CAMPAIGN_MANAGER returns empty if no assigned campaigns; ADVERTISER_VIEWER returns empty if `advertiserId` is null. Page-level guards are no longer required for correctness. See `src/server/services/analytics.service.ts:500–552`.

### H-2 — Missing composite indexes on the hot classification path
- **Risk:** Every consumer scan runs 4 lookbacks in `classifyConsumerScan`: repeat-by-visitor, repeat-by-ip (30 min), high-frequency-by-visitor (5 min), high-frequency-by-ip (10 min). They filter on `(anonymousVisitorId|ipHash) + (campaignId|qrCodeId) + createdAt`. Only single-column indexes exist (`@@index([anonymousVisitorId])`, `@@index([ipHash])`, `@@index([campaignId])`, `@@index([createdAt])`).
- **Why it matters:** At scale Postgres bitmap-ANDs single-column indexes or seq-scans a time window on the **write** path of every scan — the most frequent operation in the system.
- **File:** `prisma/schema.prisma` (ScanEvent indexes); queries in `src/server/services/scan-classification.service.ts:55-166`.
- **Fix:** Add `@@index([campaignId, anonymousVisitorId, createdAt])`, `@@index([campaignId, ipHash, createdAt])`, and `@@index([qrCodeId, ipHash, createdAt])`. Create them `CONCURRENTLY` in a manual migration on prod.

### H-3 — Scan-collapse migration is table-locking / can fail on real data
- **Risk:** `20260605182143_add_scan_collapsed_fields` does a full-table `UPDATE` backfill, then `ALTER COLUMN … SET NOT NULL` (ACCESS EXCLUSIVE), then `CREATE UNIQUE INDEX` non-concurrently. On a populated `ScanEvent` it locks scan logging for the duration, and the unique index can fail if two pre-existing rows share `(qrCodeId, fingerprintKey=visitorId, windowStartedAt=createdAt)`.
- **File:** `prisma/migrations/20260605182143_add_scan_collapsed_fields/migration.sql`.
- **Fix:** For production, pre-check for duplicate `(qrCodeId, COALESCE(anonymousVisitorId,ipHash,id), createdAt)` groups, build the unique index `CONCURRENTLY`, and run during a low-traffic window. For Phase-1 (near-empty prod DB) the existing migration is acceptable but must be applied with `migrate deploy`, not `migrate dev`.

### H-4 — OTP primitives are not production-grade
- **Risk:** `generateRewardOtp` uses `Math.random()` (non-CSPRNG, predictable). `hashRewardOtp` is a bare `SHA-256` of a 6-digit code → 10^6 space is trivially brute-forced from a DB dump.
- **File:** `src/lib/rewards/otp.ts`.
- **Fix:** `crypto.randomInt(100000, 1000000)` for generation; HMAC-SHA256 with a server secret (or bcrypt) for the stored hash. Low effort, meaningful hardening before real SMS is wired.

---

## 4. Medium-Risk Issues

### M-1 — Visitor cookie set in a Route Handler before a redirect may not persist
- **File:** `src/app/q/[code]/route.ts:21-37` sets `cookies().set(...)` then returns `NextResponse.redirect(...)`. This is a known Next.js footgun (cookies set via `next/headers` are not always attached to a hand-built redirect response). If it silently fails, visitor-based repeat/unique metrics degrade to ip-hash.
- **Fix:** Set the cookie on the response object: build `const res = NextResponse.redirect(...)`, then `res.cookies.set("moengage_visitor_id", ...)`. Verify at runtime that `moengage_visitor_id` round-trips.

### M-2 — Test fallbacks can execute in production
- **Files:** `src/server/services/public-scan.service.ts:56-66` injects fake Dar-es-Salaam location + `192.168.1.1` when `headers()` throws; `src/lib/scans/anonymous-visitor.ts:9-12` returns hardcoded `"test-visitor-id-123"` when `cookies()` throws.
- **Risk:** If ever triggered in prod, many scans collapse into one fake visitor bucket with fake geo → data poisoning.
- **Fix:** Gate both fallbacks behind `process.env.NODE_ENV !== "production"`; in production, log and skip rather than fabricate.

### M-3 — `QRCode.scanCount` drift, non-transactional
- **File:** `src/server/services/public-scan.service.ts:129-132`. The `scanCount` increment is a separate statement from the aggregation insert (not in one transaction) and also counts internal-test/suspicious hits.
- **Fix:** Treat `scanCount` as a lossy convenience counter (document it), or fold the increment into the same SQL/transaction. Never use it for billing/analytics (those already use `SUM(hitCount)` — good).

### M-4 — Bot/unfurler scans counted as engagement
- **File:** `src/app/q/[code]/landing/page.tsx:94` logs a scan on any GET render. Link unfurlers (WhatsApp/Slack/iMessage) and crawlers inflate scan counts; aggregation collapses same-IP hits per 30s but distinct bots still count.
- **Fix:** Add a lightweight bot UA filter in `classifyConsumerScan` (mark `isBillable=false`, `suspiciousReason="BOT_UA"`), or require a client interaction before counting billable engagement.

### M-5 — `uniqueScans` is not unique humans
- **File:** `src/server/services/analytics.service.ts:353` (`uniqueScans = distinct non-null anonymousVisitorId`). Excludes ip-only scans and equals "unique visitor cookies/devices."
- **Fix:** Rename to `uniqueVisitors` and label the dashboard card "Unique Visitors (devices)" to avoid misrepresenting unique people.

### M-6 — DB TLS verification disabled by default
- **File:** `src/lib/prisma.ts:22-25` (`rejectUnauthorized:false` unless `PG_SSL_REJECT_UNAUTHORIZED=true`).
- **Fix:** Set `PG_SSL_REJECT_UNAUTHORIZED=true` in production with the Supabase CA; document it in the deploy checklist.

### M-7 — `suspiciousReason = COALESCE(existing, incoming)` drops later signal
- **File:** `src/server/services/scan-event-aggregation.service.ts:144`. Within one 30s bucket, a later more-severe reason is lost from the human-readable field (counters stay correct).
- **Fix:** Acceptable for now; if signal fidelity matters, concatenate distinct reasons or store the most-severe.

### M-8 — Connection-pool topology must target the Supabase pooler
- **File:** `src/lib/prisma.ts` uses a `pg.Pool` (max=1 on Vercel) on `DATABASE_URL`. If `DATABASE_URL` points at the direct `5432` endpoint instead of the pooled `6543` (PgBouncer) endpoint, concurrent lambdas will exhaust Postgres connections.
- **Fix:** Ensure `DATABASE_URL` is the pooled endpoint; `DIRECT_URL` (used by `prisma.config.ts` for migrations) is the direct endpoint. This split is already correct in `.env.example`/`prisma.config.ts` — verify the actual prod values.

---

## 5. Low-Risk Cleanup

- **L-1** `src/app/admin/suspicious-scans/*`: `getSuspiciousScansPageData` returns raw bucket rows via `...s` (includes `ipHash`, `userAgent`); each row is a 30s bucket, not one person. Ensure the client surfaces `hitCount`/`suspiciousCount` and doesn't imply 1 row = 1 scan. (Admin-only, hash not raw IP.)
- **L-2** `src/proxy.ts:129` `(request as any).ip` is a removed API; harmless (falls through to `x-forwarded-for`).
- **L-3** `src/proxy.ts:137` IP fallback `"127.0.0.1"` lumps unknown-IP requests into one rate-limit bucket.
- **L-4** `src/server/services/analytics.service.ts:401` `getScanTrendByMinute` is **dead code** and **unscoped** (only optional `campaignId`). Remove, or add role scoping before wiring to any non-admin dashboard.
- **L-5** No `prisma migrate deploy` script; `prisma:migrate` is `migrate dev` (local only). Add `"prisma:deploy": "prisma migrate deploy"`.
- **L-6** Inconsistent service result shapes (`{ok,status,data}` vs `{ok,data}`/`{ok,error}`) — cosmetic.
- **L-7** The restricted SQRATCH grep needs word boundaries (`\b`) — "points" matches inside "endpoints".

---

## 6. Security Audit Findings

**Auth / role access**
- ✅ Middleware (`src/proxy.ts`) + per-layout `requireRole` + per-action `requireRole` = defense in depth. All `actions.ts` gate with `requireRole`.
- ✅ Reports route fails closed via `getRoleScopeFilters` (`scope === null && role !== ADMIN → 403`) and adds per-type role constraints.
- ✅ `/d/[code]` enforces `RETAIL_OPERATIONS`/`ADMIN` at page, action, and service (brand-ownership) layers.
- ❌ **CB-2 / H-1:** analytics scoping for `CAMPAIGN_MANAGER` is wrong and not fail-closed.
- ⚠️ Verify brand/advertiser **heatmap** pages scope and fail closed (admin heatmap is ADMIN-gated; confirm the scoped variants apply `getRoleScopeFilters`).

**Public QR flow**
- ✅ `/q/[code]` and `/q/[code]/landing` are public, `force-dynamic`, reject `BATCH_DELIVERY` (redirect to `/d`), and wrap scan logging in try/catch so logging failure never breaks the offer.
- ✅ Aggregation bounds row growth per (visitor|ip, 30s window). The `unknown:${randomUUID}` fingerprint (no visitor + no ip) defeats collapsing, but is essentially unreachable on Vercel (IP always present).
- ⚠️ **M-1** cookie-on-redirect; **M-4** bot scans.

**OTP / reward claim flow**
- ✅ 60s DB cooldown, 3-attempt lockout (`MAX_OTP_ATTEMPTS`), OTP↔mobile-hash binding, enumeration prevention (fake OTP for already-approved), generic "Verification failed" errors everywhere, transactional dedup + `P2002` fallback, DB unique `(campaignId, mobileNumberHash)`. Double-approval under concurrency is prevented by the unique constraint.
- ✅ Phone normalization is identical in `proxy.ts` and `lib/rewards/mobile-hash.ts`.
- ❌ **H-4** weak OTP RNG + hash.
- ⚠️ Phone rate-limit only applies when `mobileNumber` is present in the body; this is fine because the routes reject missing/invalid phone, and `/verify` is additionally protected by the DB 3-attempt lockout.

**Data leakage**
- ✅ Mobile hashed + last-4 masked; IP hashed (SHA-256), raw IP never persisted.
- ⚠️ Suspicious-scans page exposes `ipHash`/`userAgent` to admin client (**L-1**).
- ❌ **CB-2** orphan `null`-advertiser scans surface on CM dashboard.

**Rate limiting**
- ❌ **CB-1** fails open without Upstash. Otherwise sliding-window limits are reasonable (start: 20/10m IP, 1/60s phone, 3/h phone; verify: 30/10m IP, 3/h phone) and run on Edge via `crypto.subtle` (Edge-compatible).

**Logging / secrets**
- ✅ Dev OTP log + `devOtp` response are gated by `NODE_ENV==="development"`. Errors return generic strings; details go to `console.error` server-side.
- ⚠️ `console.warn` logs include `mobileNumberHash` (a hash, not raw) — acceptable.

---

## 7. Data Correctness Audit

**Scan aggregation** — ✅ Strong.
- Atomic `INSERT … ON CONFLICT (qrCodeId, fingerprintKey, windowStartedAt) DO UPDATE` with `hitCount = hitCount + 1` and `+ EXCLUDED.x` for the rest. Race-safe (row lock serializes conflicts; concurrency test proves 100→1 row, hit=100/billable=70/suspicious=30). Raw SQL is fully parameterized via Prisma tagged template — no injection.
- `isBillable = (billableCount + EXCLUDED.billableCount) > 0` and `isSuspicious = OR` are lossy booleans **by design**; the honest signal is the counters. (M-7 reason-coalesce is the only minor signal loss.)
- ⚠️ Classification reads happen before the write, outside a lock — concurrent first-scans in the same bucket can both classify `isRepeatScan=false` (slight unique overcount in a rare race). Acceptable.

**Analytics / dashboard** — ✅ uses `SUM(hitCount/repeatCount/billableCount/suspiciousCount)` everywhere; locations weighted by `SUM(hitCount)`. ❌ CM scoping (CB-2); ⚠️ `uniqueScans` naming (M-5); ⚠️ N+1 fan-out (see §8).

**Billing** — ✅ `getCampaignBillingSummaries` uses `_sum.billableCount` for billable scans and `_sum.hitCount` for totals; Decimals via `.toNumber()`. Manual suspicious override correctly rewrites `billableCount`/`suspiciousCount` so it actually affects billing.

**Reports** — ✅ role-scoped + fail-closed. ⚠️ Bucketed scan exports should label `hitCount` so a CSV row isn't read as one scan; confirm `SCAN_EVENTS_CSV`/`SUSPICIOUS_SCANS_CSV` include a `Hits` column.

**Heatmaps** — ✅ totals use `SUM(hitCount/billableCount/repeatCount)`. ⚠️ Confirm map **markers** are weighted by `hitCount` (a 30s bucket with 50 hits must not render as one point of equal weight to a 1-hit bucket); recommend `hitCount`-weighted heat intensity.

---

## 8. Performance / Scalability Audit

**PostgreSQL indexes** — ❌ **H-2**: no composite indexes for the 4 per-scan classification lookbacks (hottest path). Reward/OTP lookups are well-indexed (unique `(campaignId, mobileNumberHash)`, `otpVerification` by PK + `mobileNumberHash`). Dashboard aggregates scan by `brandId/advertiserId/campaignId` single-column indexes — adequate for now.

**Supabase connection pooling** — ⚠️ **M-8**: `pg.Pool` max=1 per Vercel lambda; correctness depends on `DATABASE_URL` pointing at the pooled (PgBouncer/6543) endpoint. Raw `$queryRaw` upsert is compatible with PgBouncer transaction mode (no session state, no prepared-statement reliance in the tagged template). Migrations correctly use `DIRECT_URL`.

**Vercel runtime** — ✅ proxy uses only Edge-safe APIs (`crypto.subtle`, `@upstash/*` REST, `next-auth/jwt`); no Prisma/Node-only modules imported into the Edge proxy. Body is `request.clone()`d before `.json()` so the downstream route still reads the body.

**Upstash overhead** — ⚠️ up to 3 Redis round-trips per `/start` and 2 per `/verify`, plus a body clone+parse in middleware on every rewards POST. Fine at demo scale; watch p95 latency.

**Dashboard/report query cost** — ⚠️ `computeMetricsAndPerformance` fan-out: per-campaign (5 queries × top-5), per-product (3 × 5), per-location (3 × 5) ≈ 30-40 round-trips per dashboard load. Bounded but the main dashboard cost center. Reports/heatmaps use unbounded `findMany` (no `take`) — cap before large datasets.

---

## 9. Migration / Deployment Audit

**Current risks**
- Scan-collapse migration is locking on populated DBs (**H-3**).
- `build` runs `prisma generate && next build` only — **no auto-migrate**. Migrations must be run manually with `migrate deploy` (correct, but must not be forgotten).
- `prisma:migrate` = `migrate dev` (must never run in prod).
- Runtime depends on `DATABASE_URL` = pooled endpoint; migrations depend on `DIRECT_URL` = direct endpoint (`prisma.config.ts`).

**Safe deployment order**
1. Set/verify all env vars on the target (see §13).
2. `npx prisma migrate status` (against `DIRECT_URL`) → confirm pending migrations.
3. Apply migrations in a low-traffic window: `npx prisma migrate deploy`.
4. `npx prisma generate` (also runs in build).
5. `npx tsc --noEmit` and `npm run build` in CI.
6. Deploy to Vercel.
7. Smoke-test `/q/[code]` scan → reward, `/d/[code]` delivery, each role dashboard.

**Rollback notes**
- The new columns are additive with defaults; the destructive step is `SET NOT NULL` + the UNIQUE index. Rolling back code is safe (old code ignored the new columns), but dropping the unique index/columns requires a manual down-migration — Prisma has no auto-rollback. Keep a tested down-migration script.

---

## 10. Testing Gaps & Recommended Tests

`scripts/test-concurrency.ts` is **meaningful** (proves upsert atomicity + counter math) but only exercises the raw aggregation, against the real DB. Run it on **local/preview only — never production** (it writes and deletes rows; it will use an existing active QR if present).

| Test | Verifies | Type |
|---|---|---|
| `aggregation.classification-mixture` | Mixed billable/suspicious/repeat hits in one bucket produce correct `hitCount/billableCount/suspiciousCount/repeatCount` | script (extend existing) |
| `aggregation.window-boundary` | Hits straddling a 30s boundary create exactly 2 rows | integration |
| `otp.resend-cooldown` | 2nd `/start` within 60s → `COOLDOWN_ACTIVE`; after 60s → new OTP | integration |
| `otp.wrong-code-lockout` | 3 wrong `/verify` → record `FAILED`, 4th rejected | integration |
| `reward.duplicate-concurrency` | 2 concurrent valid `/verify` for same (campaign, phone) → exactly 1 APPROVED, no dup row | script (real DB) |
| `reward.otp-mobile-binding` | Valid OTP + different phone → rejected | unit/integration |
| `rolescope.access` | Each role only sees its own brand/advertiser/assigned-campaign data; CM sees assigned campaigns (guards CB-2) | integration |
| `rolescope.fail-closed` | Non-admin with null scope id → empty data / 403, never global | unit |
| `report.export-scoping` | Brand/advertiser/CM exports contain only in-scope rows | integration |
| `heatmap.hitcount-weighting` | Marker intensity reflects `hitCount` | unit (service) |
| `ratelimit.fail-closed` | Prod + missing Upstash → `/api/public/rewards/*` returns 503 (guards CB-1) | unit (mock env) |
| `migration.verify` | `prisma migrate status` clean; unique index present; no dup buckets | manual/CI |

---

## 11. Exact Code Change Recommendations

| File · function | Change |
|---|---|
| `src/proxy.ts` · `proxy` | If `!redis` and env is production, return `503` for `/api/public/rewards/*` instead of `NextResponse.next()`. |
| `src/server/services/analytics.service.ts` · `getAnalyticsDashboardData` | Branch `CAMPAIGN_MANAGER` to scope by assigned campaign IDs (via `getRoleScopeFilters`/`campaignAssignment`); for any non-admin with empty scope, return empty metrics (fail closed). Stop scoping CM by `advertiserId`. |
| `prisma/schema.prisma` · `ScanEvent` | Add `@@index([campaignId, anonymousVisitorId, createdAt])`, `@@index([campaignId, ipHash, createdAt])`, `@@index([qrCodeId, ipHash, createdAt])`; create them `CONCURRENTLY` via a manual prod migration. |
| `src/lib/rewards/otp.ts` · `generateRewardOtp` / `hashRewardOtp` | `crypto.randomInt(100000, 1000000)`; HMAC-SHA256 with a server secret (or bcrypt) for the stored hash. |
| `src/app/q/[code]/route.ts` · `GET` | Build the redirect response first, then `res.cookies.set("moengage_visitor_id", …)` on it; return `res`. |
| `src/server/services/public-scan.service.ts` + `src/lib/scans/anonymous-visitor.ts` | Gate the fake-location / `"test-visitor-id-123"` fallbacks behind `NODE_ENV !== "production"`; in prod, log and skip. |
| `src/server/services/scan-classification.service.ts` · `classifyConsumerScan` | Add a bot-UA check → `isBillable=false`, `suspiciousReason="BOT_UA"`. |
| `src/lib/prisma.ts` | Document/require `PG_SSL_REJECT_UNAUTHORIZED=true` with Supabase CA in prod; confirm `DATABASE_URL` is the pooled endpoint. |
| `src/server/services/analytics.service.ts` · `getScanTrendByMinute` | Remove (dead) or add role scoping before any non-admin use. |
| `package.json` · scripts | Add `"prisma:deploy": "prisma migrate deploy"`. |
| `src/components/heatmaps/*` | Weight heat intensity by `hitCount`. |

---

## 12. Final Go / No-Go Checklist

- [ ] **CB-1** Rate limiter fails closed in production when Upstash is unset (503, not bypass).
- [ ] **CB-2** Campaign-Manager analytics scoped by assigned campaigns; verified a CM sees only assigned data.
- [ ] **H-1** Analytics service fails closed for any non-admin with empty scope (no inline-null reliance).
- [ ] **H-2** Composite classification indexes created `CONCURRENTLY` on prod; `EXPLAIN` confirms index use.
- [ ] **H-3** Scan-collapse migration dry-run on a prod-sized copy; no lock/timeout; no duplicate-bucket failures; applied via `migrate deploy` in a low-traffic window.
- [ ] **H-4** OTP uses CSPRNG + HMAC/bcrypt hash.
- [ ] **M-1** Visitor cookie verified to persist across the `/q/[code]` → `/landing` redirect.
- [ ] **M-2** Test fallbacks gated to non-production.
- [ ] **M-6 / M-8** `PG_SSL_REJECT_UNAUTHORIZED=true` (with CA) and `DATABASE_URL` = pooled (6543), `DIRECT_URL` = direct (5432), both verified.
- [ ] Heatmap markers weighted by `hitCount`; `uniqueScans` relabeled "Unique Visitors"; scan CSV exports include a `Hits` column.
- [ ] Required Vercel env vars present: `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_MAPTILER_KEY`, `QR_CODE_SECRET`, `PG_POOL_MAX`, `PG_SSL_REJECT_UNAUTHORIZED`.
- [ ] `npx tsc --noEmit` ✅, `npm run build` ✅, `npx prisma migrate status` clean.
- [ ] Concurrency + role-scope + OTP lockout tests pass on preview (not prod).
- [ ] Smoke test: consumer scan→reward, delivery scan, all five role dashboards, one report export per role.

**Verdict: hold deployment until CB-1, CB-2, H-1, H-2, H-3 are cleared. H-4 and the M-items should follow immediately after.**
