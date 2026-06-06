# MoEngage — Senior Architecture & Security Audit (Opus 4.8)

> Date: 2026-06-04
> Scope: full codebase pass — architecture, correctness, security, performance, code quality, UX.
> Method: manual inspection of routes, services, validators, server actions, API routes, Prisma schema, plus the Graphify codebase graph (`graphify-out/`) and `docs/codebase-map.md`.
> Baseline: `npx tsc --noEmit` passes clean. Forbidden SQRATCH terms grep: clean.

---

## 1. Executive Summary

**Overall health: Good for an MVP.** The codebase is unusually consistent for AI-assembled work. The admin CRUD modules follow one clean pattern (RSC page → client component → server action gated by `requireRole(["ADMIN"])` → service → Zod validation). Auth, role scoping, PII hygiene (IP hashing, mobile hashing + last-4 masking), and soft-deletion conventions are largely respected. TypeScript compiles with zero errors.

**Biggest risks:**

1. **Broken access control (IDOR) in the delivery scan mutation.** The `/d/[code]` page guards brand ownership, but the underlying mutation `createDeliveryScan` does **not** re-check it. A `RETAIL_OPERATIONS` user scoped to Brand A can record delivery scans against another brand's delivery QR by invoking the server action with a different `qrCodeId`. **Must fix.**
2. **Reward OTP is not bound to the mobile number.** `verifyRewardOtpAndClaim` hashes the *client-supplied* mobile number at verify time and never compares it to the hash captured when the OTP was issued. A caller can verify a valid OTP against a *different* number. Lower impact because OTP is simulated in Phase 1, but it weakens the "one reward per mobile per campaign" integrity rule. **Should fix.**

**Must-fix before investor demo:**
- Delivery scan brand-ownership enforcement (#1 above).

**Should fix soon:**
- Bind reward OTP verification to the originating mobile-number hash (#2).
- Auth layout inconsistency (4 dashboards inline session logic instead of `requireRole`).

**What should wait (do not touch now):**
- Analytics N+1 query fan-out (bounded to top-5, fine at demo scale; needs a denormalized/groupBy rewrite that is too risky to do during a hardening pass).
- Inconsistent `ServiceResult` shapes between CRUD and public services (cosmetic; rewriting touches many call sites for no functional gain).
- Broad `any` removal in `where`-clause builders and `catch` blocks (pragmatic, low-value churn).

---

## 2. Architecture Review

| Area | Assessment |
|---|---|
| **App Router structure** | Clean. Route groups `(auth)` isolate login/signup/verify from the dashboard shell. Role dashboards (`/admin`, `/brand`, `/campaign-manager`, `/advertiser`, `/retail`) each have a layout. Public `/q/[code]` and role-gated `/d/[code]` are correctly outside dashboard layouts. |
| **Server vs client components** | Correct split. Pages are async RSCs that fetch via services and pass plain DTOs to `*-client.tsx`. Forms are client components using react-hook-form + zodResolver. A few pages pass `qrCode as any` to client components — works, but loses type safety. |
| **Service layer** | Consistent: all DB access lives in `src/server/services/*.service.ts`. No stray `new PrismaClient()` — everything imports the singleton from `src/lib/prisma.ts`. |
| **Validator layer** | Consistent: one Zod validator per entity in `src/lib/validators/`. Public reward/delivery inputs are validated server-side via `safeParse`. |
| **Prisma usage** | Singleton client used everywhere. Decimal fields serialized via `.toNumber()` and dates via `.toISOString()` before crossing to client components. |
| **Auth / role protection** | Two layers: `src/proxy.ts` middleware (JWT prefix guard) + per-layout server checks + per-action `requireRole`. Defense in depth is good. **Inconsistency:** `admin/layout.tsx` uses the `requireRole` helper; `brand`, `advertiser`, `campaign-manager`, `retail` layouts duplicate inline `getServerSession` + manual `switch` redirect logic. Same behavior, duplicated auth logic = drift risk. |
| **Public route isolation** | `/q/[code]` has no auth and `export const dynamic = "force-dynamic"`. It correctly rejects `BATCH_DELIVERY` QRs and routes them to `/d/[code]`. Good. |
| **Dashboard layout consistency** | All five role shells render `DashboardShell`. Visual consistency maintained. |

---

## 3. Security Review

| Check | Finding |
|---|---|
| **Auth route protection** | NextAuth credentials provider gates on `isActive` and `isEmailVerified` and uses bcrypt compare. Login errors are generic ("Invalid email or password"). Good. |
| **Server action role checks** | All 9 `actions.ts` files call `requireRole(...)` or `getCurrentUser` + role check. Verified by grep. |
| **Public APIs** | `/api/public/rewards/start` and `/verify` validate input via Zod and return generic 500s without stack traces. Good. |
| **QR scan safety** | `/q/[code]` resolves QR, blocks non-consumer types, logs scan in try/catch. Safe. |
| **Reward duplicate logic** | Enforced by DB constraint `@@unique([campaignId, mobileNumberHash])` plus a transactional re-check and a `P2002` fallback. Correct and race-safe. |
| **OTP handling** | OTP is hashed (`hashRewardOtp`) and expires in 10 min. Attempt count increments on failure. **Gap:** verify does not bind the OTP to the original mobile number (see #2). Also there is no max-attempt lockout — `attemptCount` is incremented but never enforced. |
| **Mobile hashing** | SHA-256 hash stored; only last-4 retained in plaintext; raw `mobileNumber` column exists but is left null. Good PII hygiene. |
| **IP hashing** | Raw IP is hashed (SHA-256) in `ip-location.ts` and `scan-classification.service.ts`; raw IP is never persisted. Matches CLAUDE.md rule. |
| **PII exposure** | Reports mask IP to first 8 hex chars of the hash and expose only mobile last-4. `getSuspiciousScansPageData` spreads full scan rows (`...s`) including `ipHash`/`userAgent` to the admin client — low risk (admin-only, hash not raw IP) but slightly more than needed. |
| **Stack trace leaks** | None found. All API catch blocks return generic strings; details go to `console.error` server-side only. |
| **Admin-only endpoint protection** | `/api/qr-codes/[id]/download/{png,svg}` require `user.role === "ADMIN"`. `/api/reports` requires auth, blocks `RETAIL_OPERATIONS`, applies role scope, and blocks report types per role. Good. |
| **`/q/[code]` public safety** | Confirmed public and safe. |
| **`/d/[code]` role safety** | Page + action both require `RETAIL_OPERATIONS`/`ADMIN`. **But** the mutation does not enforce brand ownership (see #1 — IDOR). |

### Security findings

- **SEC-1 (High / Must fix): Delivery scan IDOR.** `createDeliveryScan` in `src/server/services/delivery-scan.service.ts` loads the QR by client-supplied `qrCodeId` and validates type/status/batch but never checks `qrCode.brandId` against the acting user's `brandId`. `getDeliveryQRCodePageData` *does* enforce this on page load, so the mutation is the unguarded path. Fix: pass the `CurrentUser` into `createDeliveryScan` and reject when `user.role === "RETAIL_OPERATIONS" && qrCode.brandId !== user.brandId` (ADMIN bypasses, mirroring the page-load guard).
- **SEC-2 (Medium / Should fix): Reward OTP not bound to mobile.** `verifyRewardOtpAndClaim` should assert `hashMobileNumber(mobileNumber) === otpVerification.mobileNumberHash` before approving. One-line guard, no schema change.
- **SEC-3 (Low / Nice to have): OTP attempt lockout not enforced.** `attemptCount` is incremented but never checked. Consider rejecting once `attemptCount >= 5`.

---

## 4. Database Correctness Review

| Check | Finding |
|---|---|
| **Relations** | Coherent. `Brand → Product/Campaign/Batch/QRCode`, `Campaign → Batch/QRCode/ScanEvent/RewardClaim`, `ScanEvent → RewardClaim`, `QRCode/Batch → DeliveryScan`. Back-relations all declared. |
| **Indexes / unique constraints** | Strong. `@@unique([campaignId, mobileNumberHash])` (reward abuse), `@@unique([brandId, slug])` (product), unique `batchCode`, unique `code` on QRCode, unique `slug` on Brand/Advertiser/Campaign. Hot query columns (`createdAt`, `isSuspicious`, `isBillable`, `anonymousVisitorId`, `ipHash`, FKs) are indexed. |
| **Cascade behavior** | Sensible. Core parents cascade to children where deletion would orphan (e.g. `Campaign → Batch` cascade); optional links use `SetNull` (e.g. `QRCode.brand`, `ScanEvent.*`). Aligns with the "avoid hard delete; use status" policy (cascades are a safety net, not the delete path). |
| **Nullable fields** | Appropriately nullable (e.g. `Campaign.productId`, `QRCode.*Id`, location fields). |
| **Decimal handling** | `Decimal @db.Decimal(10,4)` for fees, `(10,7)` for lat/long; always converted to `number` before serialization. |
| **Scan/reward/delivery relationships** | Properly separated tables. Scans are never deleted on duplicate reward — matches business rules. |
| **Billing/report models** | `BillingSummary` and `ReportExport` exist with brand/advertiser/campaign scoping and indexes. |
| **Migration risk** | None introduced by this audit — no schema changes recommended. |

No must-fix database issues.

---

## 5. Performance Review

| Check | Finding |
|---|---|
| **N+1 queries** | `analytics.service.ts → computeMetricsAndPerformance` fans out per-campaign (5 queries × up to 5 campaigns), per-product (3 × 5), and per-location (3 × 5) — roughly 25–40 extra round-trips per dashboard load. Bounded by `take: 5`, so acceptable at demo scale, but it is the main perf hotspot. Rewrite to `groupBy`/joins later. |
| **Expensive dashboard queries** | The fan-out above is the cost center; the top-level `Promise.all` batch of counts/aggregates is fine. |
| **groupBy usage** | Used correctly for unique visitors and location grouping. |
| **Server components doing too much** | `/q/[code]/page.tsx` both resolves and logs the scan inline — acceptable since it's the scan entry point and wrapped in try/catch. |
| **Unnecessary client components** | None egregious. |
| **Map / report data size** | `reports.service.ts` and `heatmaps.service.ts` use unbounded `findMany` (no `take`). Fine for demo; cap before production to avoid large payloads. |
| **Prisma connection usage** | Singleton client; no per-request instantiation. Good for serverless. |
| **Vercel runtime** | `/q/[code]` and `/d/[code]` are `force-dynamic` (correct for scan logging). No obvious edge/runtime mismatches. |

### Minor correctness note
- **PERF/UX-1:** `productPerformance` is labeled "Top products" but selects the first 5 products by default ordering, not the 5 with the most scans. Cosmetic mislabel; not breaking. Leave for a later analytics rework.

---

## 6. Code Quality Review

| Check | Finding |
|---|---|
| **Duplicated patterns** | Auth logic duplicated across 4 dashboard layouts (see ARCH inconsistency). Otherwise duplication is the *intended* CRUD template. |
| **Inconsistent action result shapes** | CRUD actions return `{ ok, message } \| { ok, error }`; services return `{ ok, data } \| { ok, error }`; reward/delivery services add a `status` field. Harmless but inconsistent. Not worth a risky sweep. |
| **Inconsistent validators** | Validators are consistent in style (Zod + `z.preprocess` for optionals). |
| **Inconsistent error handling** | Server actions consistently re-throw `NEXT_REDIRECT` (`"digest" in e`) and return generic errors. Good. |
| **Messy form logic** | Forms are reasonable; `user-form.tsx` uses a discriminated-union prop with a couple of `as any` casts (a known react-hook-form + `z.preprocess` limitation). |
| **Stale files** | Deleted in working tree: `admin/fraud/page.tsx`, `admin/reports/reports-client.tsx`, `api/admin/reports/route.ts` (superseded by `api/reports/route.ts` + `suspicious-scans`). No live imports reference the deleted paths. One stale **comment** header in `src/app/api/reports/route.ts` still says `// src/app/api/admin/reports/route.ts`. |
| **Unused files / deps** | No obvious dead modules among the live set. |
| **Unsafe `any`** | ~38 `: any` + ~15 `as any`. Concentrated in `where`-clause builders (`whereClause: any`) and `catch (e: any)` — pragmatic and low-risk. A few `as any` props at component boundaries lose type safety but don't break. |
| **Oversized components** | None alarming. |
| **Placeholder/demo logic** | Dev-only OTP/email `console.log`s are correctly gated by `NODE_ENV === "development"`. Simulated OTP/reward provider is intentional for Phase 1. |

---

## 7. UX Review

| Surface | Finding |
|---|---|
| **Auth pages** | Clear error messaging surfaced from NextAuth. |
| **Admin CRUD pages** | Consistent stat-cards + table + Sheet/AlertDialog. Good. |
| **Public QR landing** | Distinct, well-handled states (NOT_FOUND / BATCH_DELIVERY / INACTIVE / WRONG_TYPE / VALID) with friendly copy. |
| **Reward claim flow** | Simulated OTP returns `devOtp` in development only — good for demo, safe in prod. |
| **Retail delivery form** | Clear error states for NOT_FOUND/WRONG_TYPE/INACTIVE/MISSING_BATCH/MISSING_CARTON_CONFIG/UNAUTHORIZED. |
| **Analytics dashboards** | Role-scoped; `hasData` flag drives empty states. |
| **Heatmap fallback** | Map + data tables; degrades to tables if map key/data absent. |
| **Reports page** | Type-gated export buttons per role. |

---

## 8. Critical Bugs (likely to break real usage)

1. **SEC-1 — Delivery scan IDOR** (cross-brand delivery logging by retail users). Security correctness bug. **Fixing in Phase 2.**
2. **SEC-2 — Reward verify not bound to originating mobile** (reward can be claimed for a number that didn't receive the OTP). Integrity bug. **Fixing in Phase 2.**

No crash-level bugs found (TypeScript and build pass).

---

## 9. Recommended Fix Plan

### Must fix before investor demo
- **SEC-1:** Enforce brand ownership in `createDeliveryScan` for `RETAIL_OPERATIONS`. *(Phase 2 — applying.)*

### Should fix soon
- **SEC-2:** Bind reward OTP verification to `otpVerification.mobileNumberHash`. *(Phase 2 — applying, low risk.)*
- **ARCH:** Migrate the 4 inline dashboard layouts to the existing `requireRole` helper for a single source of auth truth. *(Phase 2 — applying, mechanical/low risk.)*
- **CLEANUP:** Fix the stale comment header in `src/app/api/reports/route.ts`. *(Phase 2 — trivial.)*

### Nice to have
- **SEC-3:** Enforce OTP `attemptCount` lockout (e.g. reject at ≥5).
- Tighten `getSuspiciousScansPageData` to select only needed columns instead of spreading full rows.
- `createDeliveryScanAction` revalidates `/d/${qrCodeId}` but the route is keyed by `code` — harmless, ineffective; tidy later.

### Do not touch now
- Analytics N+1 fan-out (needs a careful `groupBy` rewrite; risk > reward during hardening).
- Unifying `ServiceResult` shapes across all services.
- Blanket `any` removal in `where`-builders / `catch` blocks.
- Prisma schema (no changes needed).

---

## Phase 2 — Applied Fixes (summary)

See the closing summary in the session for the exact diff. Applied only low-risk items from the "must / should / trivial" tiers above:

1. SEC-1: brand-ownership guard in `createDeliveryScan`.
2. SEC-2: mobile-hash binding in `verifyRewardOtpAndClaim`.
3. ARCH: dashboard layouts unified on `requireRole`.
4. CLEANUP: corrected stale comment header.

Risky items (analytics rewrite, ServiceResult unification, schema changes) intentionally **not** applied.
