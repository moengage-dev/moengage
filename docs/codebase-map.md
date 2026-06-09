# MoEngage Codebase Map

> Auto-generated from Graphify analysis + manual codebase inspection.
> Last updated: 2026-06-06.
> Graphify outputs: `graphify-out/graph.html` (interactive), `graphify-out/graph.json`, `graphify-out/GRAPH_REPORT.md`.
> Architecture documentation: `docs/scan-aggregation-architecture.md`.
> Concurrency test: `scripts/test-concurrency.ts`.
> Billing aggregation validation: `scripts/test-billing-aggregation.ts`.

---

## 1. High-Level Architecture

### Runtime Model

```
Browser
  └─ Next.js 16 App Router (server + client components)
       ├─ Middleware (src/proxy.ts → next.config.ts)      ← JWT role check, route guard,
       │                                                     Upstash Redis OTP rate limiter
       ├─ Server Components (page.tsx, layout.tsx)         ← DB reads via services
       ├─ Server Actions ("use server" actions.ts)         ← mutations, revalidatePath
       ├─ Client Components (*-client.tsx, forms/*.tsx)    ← Sheet/Dialog/Table UI
       └─ API Routes (src/app/api/**/route.ts)             ← public endpoints, auth, downloads

External dependencies:
  ├─ Supabase PostgreSQL    ← primary database (via Prisma + @prisma/adapter-pg)
  ├─ Upstash Redis          ← OTP edge rate limiting in proxy.ts (UPSTASH_REDIS_REST_URL/TOKEN)
  ├─ Resend                 ← transactional email (email verification OTPs)
  └─ MapTiler               ← base map tiles for MapLibre heatmaps (NEXT_PUBLIC_MAPTILER_KEY)
```

### Component Categories

| Type | Pattern | Examples |
|---|---|---|
| **Server Component (RSC)** | `async function Page()` — no `"use client"` | All `page.tsx`, `layout.tsx` |
| **Client Component** | `"use client"` at top | `*-client.tsx`, all `forms/*.tsx`, dashboard components |
| **Server Action** | `"use server"` + `requireRole` | All `actions.ts` files under `src/app/admin/*/` |
| **API Route** | `export async function GET/POST(req)` | `src/app/api/**/*.ts` |
| **Service** | Plain async functions, server-only | `src/server/services/*.service.ts` |
| **Validator** | Zod schema + exported type | `src/lib/validators/*.validator.ts` |

### Data Flow

```
page.tsx (RSC)
  → calls service function (src/server/services/)
  → passes plain DTO props to *-client.tsx
  → client opens Sheet → renders form (src/components/forms/)
  → form calls server action (actions.ts)
  → action calls requireRole + service mutation
  → revalidatePath → page re-renders
```

---

## 2. Directory Structure

```
src/
├── app/
│   ├── (auth)/               ← Login, Signup, Verify-Email pages (no layout shell)
│   │   ├── login/
│   │   ├── signup/
│   │   └── verify-email/
│   ├── admin/                ← ADMIN-only dashboard and CRUD pages
│   │   ├── page.tsx          ← Admin homepage dashboard
│   │   ├── layout.tsx        ← requireRole(["ADMIN"])
│   │   ├── brands/
│   │   ├── advertisers/
│   │   ├── products/
│   │   ├── campaigns/
│   │   ├── batches/
│   │   ├── users/
│   │   ├── qr-codes/
│   │   ├── delivery/
│   │   ├── heatmaps/
│   │   ├── reports/
│   │   ├── billing/
│   │   └── suspicious-scans/ ← Admin suspicious scan viewer + manual override
│   ├── brand/                ← BRAND_ADMIN-scoped pages
│   ├── campaign-manager/     ← CAMPAIGN_MANAGER-scoped pages
│   ├── advertiser/           ← ADVERTISER_VIEWER-scoped pages
│   ├── retail/               ← RETAIL_OPERATIONS pages
│   ├── d/[code]/             ← Delivery scan flow (retail)
│   ├── q/[code]/             ← Consumer scan flow (PUBLIC)
│   │   ├── route.ts          ← Cookie write (moengage_visitor_id) + redirect to /landing
│   │   └── landing/          ← Server page: logConsumerScan + render campaign offer
│   ├── api/
│   │   ├── auth/             ← Signup, email verification, NextAuth
│   │   ├── public/rewards/   ← OTP start + verify endpoints (hardened)
│   │   │   ├── start/route.ts  ← POST: validate, normalize, call startRewardClaim
│   │   │   └── verify/route.ts ← POST: validate, normalize, call verifyRewardOtpAndClaim
│   │   ├── qr-codes/[id]/    ← PNG/SVG QR download endpoints
│   │   └── reports/          ← Report CSV/PDF download endpoint
│   ├── layout.tsx            ← Root layout (SessionProvider, Toaster)
│   └── page.tsx              ← Root / → redirects to role dashboard
├── components/
│   ├── ui/                   ← shadcn/ui primitives (Button, Card, Sheet, etc.)
│   ├── forms/                ← react-hook-form + zod forms for each entity
│   ├── dashboard/            ← Shared dashboard shell, sidebar, analytics cards
│   ├── heatmaps/             ← MapLibre heatmap map + filters + data tables
│   ├── campaign/             ← Public campaign landing page component
│   ├── delivery/             ← Delivery scan form
│   ├── experience/           ← Consumer reward claim shell + client utils
│   │   ├── experience-shell.tsx
│   │   └── client-utils.ts
│   └── admin/                ← Admin-specific page shell
├── lib/
│   ├── auth/                 ← requireRole, getCurrentUser, role-redirect, role-scope
│   │   ├── get-current-user.ts
│   │   ├── require-role.ts
│   │   ├── role-redirect.ts
│   │   └── role-scope.ts
│   ├── validators/           ← Zod schemas (one per entity)
│   ├── qr/                   ← QR code PNG/SVG/data-URL generation
│   ├── rewards/              ← Mobile number hashing, OTP generation
│   │   ├── mobile-hash.ts    ← hashMobileNumber, getMobileNumberLast4, normalizeMobileNumber
│   │   └── otp.ts            ← generateRewardOtp, hashRewardOtp, verifyRewardOtpHash, MAX_OTP_ATTEMPTS
│   ├── scans/                ← Device parsing, IP geolocation, anonymous visitor cookie
│   │   ├── anonymous-visitor.ts  ← getOrCreateAnonymousVisitorId (reads/writes moengage_visitor_id cookie)
│   │   ├── device-parser.ts      ← parseUserAgent → deviceType, os, browser
│   │   └── ip-location.ts        ← getApproximateLocationFromHeaders → country, city, ipHash
│   ├── format.ts             ← Date, currency, number, status label formatters
│   ├── prisma.ts             ← Singleton PrismaClient (with @prisma/adapter-pg pool)
│   ├── report-generator.ts   ← jsPDF/PapaParse CSV+PDF generator
│   ├── slug.ts               ← Slugify utility
│   ├── storage-upload.ts     ← Supabase Storage helpers
│   └── utils.ts              ← cn() Tailwind merge helper
├── server/services/          ← All DB query logic (never imported by client code)
│   ├── scan-event-aggregation.service.ts  ← ⭐ NEW: atomic INSERT ... ON CONFLICT DO UPDATE
│   ├── public-scan.service.ts             ← calls aggregateScanEvent (NOT prisma.scanEvent.create)
│   ├── scan-classification.service.ts     ← classifyConsumerScan, getSuspiciousScansPageData
│   ├── analytics.service.ts               ← SUM(hitCount) aggregates, getScanTrendByMinute
│   ├── reports.service.ts                 ← getCampaignSummaryData, getScanEventsData, getBillingSummaryData
│   ├── reward-claim.service.ts            ← startRewardClaim (OTP cooldown + enumeration prevention)
│   ├── billing.service.ts
│   ├── heatmaps.service.ts
│   ├── admin-dashboard.service.ts
│   ├── brands.service.ts
│   ├── advertisers.service.ts
│   ├── products.service.ts
│   ├── campaigns.service.ts
│   ├── batches.service.ts
│   ├── users.service.ts
│   ├── qr-codes.service.ts
│   └── delivery-scan.service.ts
├── proxy.ts                  ← Next.js middleware: JWT route guard + Upstash Redis rate limiter
├── helpers/
│   └── mailer.ts             ← Resend email sender
├── hooks/
│   └── use-mobile.ts         ← Responsive sidebar hook
├── context/
│   └── AuthProvider.tsx      ← NextAuth SessionProvider wrapper
└── types/
    └── next-auth.d.ts        ← NextAuth session type augmentation

scripts/
  ├── test-concurrency.ts            ← Concurrency proof: fires 100 parallel aggregateScanEvent calls, asserts 1 collapsed row
  └── test-billing-aggregation.ts    ← Billing validation: 9 scans (7 billable, 2 suspicious) → BillingSummary check

docs/
  ├── codebase-map.md                   ← this file
  ├── scan-aggregation-architecture.md  ← Architecture rationale: bucket model, ON CONFLICT, Upstash Redis
  ├── code-audit.md                     ← First Opus audit (Graphify session)
  └── opus-production-audit.md         ← Second Opus audit (production hardening — CB/H/M severity findings + applied fixes)
```

---

## 3. Key Files

### Auth / Session / Role Protection

| File | Purpose |
|---|---|
| `src/proxy.ts` | Next.js middleware — JWT token check, role-to-route enforcement, **Upstash Redis OTP rate limiting** |
| `src/app/api/auth/[...nextauth]/options.ts` | NextAuth CredentialsProvider — email+password login, session JWT hydration |
| `src/types/next-auth.d.ts` | Augments NextAuth `Session.user` with `id`, `role`, `brandId`, `advertiserId`, `isEmailVerified` |
| `src/lib/auth/get-current-user.ts` | `getCurrentUser()` — reads `getServerSession` and returns typed `CurrentUser` |
| `src/lib/auth/require-role.ts` | `requireRole(roles[])` — used in every server action and server component; redirects if unauthorized |
| `src/lib/auth/role-redirect.ts` | `ROLE_DASHBOARD` map, `getDashboardForRole()` |
| `src/lib/auth/role-scope.ts` | `getRoleScopeFilters()` — converts current user's role into Prisma `WHERE` clause for data scoping |
| `src/context/AuthProvider.tsx` | Client-side `<SessionProvider>` wrapper used in root layout |

### Services (`src/server/services/`)

| File | Purpose |
|---|---|
| `scan-event-aggregation.service.ts` | ⭐ **Atomic scan write**: raw SQL `INSERT ... ON CONFLICT (qrCodeId, fingerprintKey, windowStartedAt) DO UPDATE` — increments hitCount, repeatCount, suspiciousCount, billableCount |
| `public-scan.service.ts` | Handles consumer QR scan: resolves QR, classifies scan, **calls `aggregateScanEvent`** (not `prisma.scanEvent.create`), increments `QRCode.scanCount` |
| `scan-classification.service.ts` | `classifyConsumerScan()` — evaluates Rules A-E (repeat, abuse, IP frequency, internal test); uses `SUM(hitCount)` for frequency checks. `getSuspiciousScansPageData()` — uses `SUM(suspiciousCount)` |
| `analytics.service.ts` | Role-scoped dashboard data; all scan totals use `_sum.hitCount / repeatCount / billableCount / suspiciousCount`; `getScanTrendByMinute()` uses `date_trunc('minute', windowStartedAt)` + `SUM(hitCount)` |
| `reports.service.ts` | Campaign summaries, scan event rows, reward claims, delivery scans, billing data for exports |
| `reward-claim.service.ts` | `startRewardClaim()` — db-level 60s OTP cooldown, enumeration prevention, verification lockout; `verifyRewardOtpAndClaim()` — 3-attempt lockout, generic errors |
| `billing.service.ts` | Billing summary aggregation per campaign |
| `heatmaps.service.ts` | Lat/lng scan event data for MapLibre heatmap rendering |
| `admin-dashboard.service.ts` | Admin homepage summary stats |
| `brands.service.ts` | CRUD for Brand |
| `advertisers.service.ts` | CRUD for Advertiser |
| `products.service.ts` | CRUD for Product |
| `campaigns.service.ts` | CRUD for Campaign (Decimal fee fields) |
| `batches.service.ts` | CRUD for Batch + closeBatch |
| `users.service.ts` | CRUD for User (bcrypt hash, last-admin guard) |
| `qr-codes.service.ts` | CRUD for QRCode + generateQRCodeDownloadData |
| `delivery-scan.service.ts` | Delivery QR scan: logs DeliveryScan, calculates estimatedUnitsDelivered. RETAIL_OPERATIONS brand-ownership guard applied (IDOR fix). |

### Validators (`src/lib/validators/`)

| File | Schema(s) |
|---|---|
| `brand.validator.ts` | `brandSchema`, `BrandFormValues` |
| `advertiser.validator.ts` | `advertiserSchema`, `AdvertiserFormValues` |
| `product.validator.ts` | `productSchema`, `ProductFormValues` |
| `campaign.validator.ts` | `campaignSchema`, `CampaignFormValues` |
| `batch.validator.ts` | `batchSchema`, `BatchFormValues` |
| `user.validator.ts` | `createUserSchema`, `updateUserSchema`, `USER_ROLES` |
| `qr-code.validator.ts` | `qrCodeSchema`, `QRCodeFormValues` |
| `reward-claim.validator.ts` | Mobile number input + OTP format validation |
| `delivery-scan.validator.ts` | Carton count input for delivery scan |
| `report-filter.validator.ts` | Date range + role-scope filters for reports |
| `heatmap-filter.validator.ts` | Date range filters for heatmap |

### Form Components (`src/components/forms/`)

Each form uses `react-hook-form` + `zodResolver` + shadcn/ui. Server mutations pass through Server Actions.

| File | Entity | Mode |
|---|---|---|
| `brand-form.tsx` | Brand | create / edit |
| `advertiser-form.tsx` | Advertiser | create / edit |
| `product-form.tsx` | Product | create / edit |
| `campaign-form.tsx` | Campaign | create / edit |
| `batch-form.tsx` | Batch | create / edit |
| `user-form.tsx` | User | create / edit |
| `qr-code-form.tsx` | QRCode | create / edit |

### Dashboard Components (`src/components/dashboard/`)

| File | Purpose |
|---|---|
| `dashboard-shell.tsx` | Outer layout shell wrapping all dashboard pages |
| `app-sidebar.tsx` | Role-aware navigation sidebar |
| `nav-items.ts` | Navigation item definitions per role |
| `analytics-stat-card.tsx` | Metric card (value, label, delta) |
| `analytics-table-section.tsx` | Sortable analytics table section |
| `billing-client.tsx` | Billing summary client component |
| `reports-client.tsx` | Reports generation + download client component |
| `dashboard-header.tsx` | Page header with title |
| `dashboard-section-header.tsx` | Section header within a page |
| `user-menu.tsx` | Top-right user avatar + logout menu |

---

## 4. Feature Map

### Authentication & Email Verification

```
POST /api/auth/signup                → src/app/api/auth/signup/route.ts
                                        - validate, bcrypt hash, create User, send OTP email (Resend)
POST /api/auth/send-email-verification → src/app/api/auth/send-email-verification/route.ts
POST /api/auth/verify-email          → src/app/api/auth/verify-email/route.ts
                                        - validates OTP hash, sets isEmailVerified=true, emailVerifiedAt
POST /api/auth/resend-verification   → src/app/api/auth/resend-verification/route.ts

Login: POST /api/auth/[...nextauth]  → src/app/api/auth/[...nextauth]/options.ts (CredentialsProvider)
                                        - bcrypt verify, gates on isActive + isEmailVerified
                                        - injects id, role, brandId, advertiserId into JWT

Pages: (auth)/login, signup, verify-email  (no dashboard shell, public)
Email helper: src/helpers/mailer.ts  → Resend API
```

### OTP Rate Limiting (Edge Middleware)

```
src/proxy.ts  ← Executes BEFORE all /api/public/rewards/* requests

Upstash Redis (global, persistent across all Vercel Edge instances):

  /api/public/rewards/start (POST):
    ├─ IP limiter:          20 requests / 10 minutes       → 429 if exceeded
    ├─ Phone cooldown:       1 request  / 60 seconds        → 429 if exceeded
    └─ Phone hour limit:     3 requests / 1 hour            → 429 if exceeded

  /api/public/rewards/verify (POST):
    ├─ IP limiter:          30 requests / 10 minutes       → 429 if exceeded
    └─ Phone hour limit:     3 requests / 1 hour            → 429 if exceeded

  Error response:
    HTTP 429 { ok: false, error: "RATE_LIMIT_EXCEEDED", message: "..." }

  Fail-closed production behaviour:
    If UPSTASH_REDIS_REST_URL/TOKEN are not set:
      - NODE_ENV === "production"  → returns HTTP 503 { ok: false, error: "SERVICE_UNAVAILABLE" }
      - dev/test only              → logs warning and bypasses rate limiting

⚠️  WHY NOT IN-MEMORY MAP:
    Vercel Edge runs in isolated containers per region and cold-start.
    An in-memory Map is NOT shared across instances, regions, or restarts.
    Rate limits stored in Map can be trivially bypassed by routing requests
    to a fresh Edge instance. Upstash Redis provides globally consistent state.
```

### Role-Based Dashboard Shell

```
src/proxy.ts                         ← Middleware: JWT token → enforces /admin, /brand, /campaign-manager,
                                        /advertiser, /retail, /d prefixes per role
                                        ADMIN can access all protected dashboards.

Each role has its own layout:
  /admin/layout.tsx                  → requireRole(["ADMIN"])
  /brand/layout.tsx                  → requireRole(["BRAND_ADMIN"])
  /campaign-manager/layout.tsx       → requireRole(["CAMPAIGN_MANAGER"])
  /advertiser/layout.tsx             → requireRole(["ADVERTISER_VIEWER"])
  /retail/layout.tsx                 → requireRole(["RETAIL_OPERATIONS"])

Shared shell: src/components/dashboard/dashboard-shell.tsx
Sidebar:      src/components/dashboard/app-sidebar.tsx + nav-items.ts
```

### Admin CRUD (all at /admin/*)

Each entity follows the same 3-file pattern: `page.tsx` (RSC) → `*-client.tsx` → `actions.ts`

| Route | RSC Page | Client Component | Actions | Service |
|---|---|---|---|---|
| `/admin/brands` | `admin/brands/page.tsx` | `brands-client.tsx` | `brands/actions.ts` | `brands.service.ts` |
| `/admin/advertisers` | `admin/advertisers/page.tsx` | `advertisers-client.tsx` | `advertisers/actions.ts` | `advertisers.service.ts` |
| `/admin/products` | `admin/products/page.tsx` | `products-client.tsx` | `products/actions.ts` | `products.service.ts` |
| `/admin/campaigns` | `admin/campaigns/page.tsx` | `campaigns-client.tsx` | `campaigns/actions.ts` | `campaigns.service.ts` |
| `/admin/batches` | `admin/batches/page.tsx` | `batches-client.tsx` | `batches/actions.ts` | `batches.service.ts` |
| `/admin/users` | `admin/users/page.tsx` | `users-client.tsx` | `users/actions.ts` | `users.service.ts` |
| `/admin/qr-codes` | `admin/qr-codes/page.tsx` | `qr-codes-client.tsx` | `qr-codes/actions.ts` | `qr-codes.service.ts` |

Soft-deletion conventions:
- Brands, Advertisers, Products, Campaigns → `status = ARCHIVED`
- Batches → `status = CLOSED`
- QR Codes → `status = DISABLED`
- Users → `isActive = false` (deactivate/activate)

### QR Code Management

```
/admin/qr-codes                      → list + create + edit + disable QR codes
GET /api/qr-codes/[id]/download/png  → returns PNG buffer (src/lib/qr/generate-qr-code.ts)
GET /api/qr-codes/[id]/download/svg  → returns SVG string

QR types: CONSUMER_CAMPAIGN, SAMPLE_LABEL, BATCH_DELIVERY, INTERNAL_TEST
QR statuses: ACTIVE, PAUSED, EXPIRED, DISABLED

src/lib/qr/generate-qr-code.ts:
  generateQRCodePublicCode()   ← HMAC-signed code (QR_CODE_SECRET)
  generateQRCodeDataUrl()      ← data: URI for display
  generateQRCodePngBuffer()    ← PNG Buffer for download
  generateQRCodeSvg()          ← SVG string for download
  buildQRDestinationUrl()      ← resolves to /q/[code]
```

### Public Consumer Scan Flow (`/q/[code]`)

```
Browser scans QR code → GET /q/[code]
  │
  ├─ src/app/q/[code]/route.ts   (PUBLIC route handler)
  │    1. Call getConsumerQRCodeByCode() to check QR status
  │    2. If BATCH_DELIVERY → redirect to /d/[code]
  │    3. Read "moengage_visitor_id" cookie
  │       └─ If missing: generate UUID, set cookie (maxAge 1 year, httpOnly, secure)
  │    4. Redirect to /q/[code]/landing
  │
  └─ src/app/q/[code]/landing/page.tsx   (RSC)
       1. getConsumerQRCodeByCode() — resolve QR, check ACTIVE/VALID
       2. logConsumerScan() via src/server/services/public-scan.service.ts:
          a. getOrCreateAnonymousVisitorId()   ← src/lib/scans/anonymous-visitor.ts
          b. getApproximateLocationFromHeaders() ← src/lib/scans/ip-location.ts → ipHash, city, country
          c. parseUserAgent()                  ← src/lib/scans/device-parser.ts → deviceType, os, browser
          d. classifyConsumerScan()            ← src/server/services/scan-classification.service.ts
             ├─ Rule A: isRepeatScan (checks ScanEvent by anonymousVisitorId+campaignId)
             ├─ Rule B: HIGH_FREQUENCY_VISITOR (SUM(hitCount) ≥ 10 in 5 min)
             ├─ Rule C: HIGH_FREQUENCY_IP (SUM(hitCount) ≥ 20 in 10 min)
             ├─ Rule D: INTERNAL_TEST_QR → isBillable=false
             └─ Rule E: BATCH_DELIVERY_QR → isBillable=false
          e. aggregateScanEvent()              ← src/server/services/scan-event-aggregation.service.ts
             ├─ Compute windowStartedAt = Math.floor(now / 30000) * 30000
             ├─ Compute fingerprintKey:
             │    visitor:${anonymousVisitorId}  (if present)
             │    ip:${ipHash}                   (fallback)
             │    unknown:${randomUUID}          (last resort)
             └─ INSERT INTO "ScanEvent" ... ON CONFLICT (qrCodeId, fingerprintKey, windowStartedAt)
                DO UPDATE SET
                  hitCount += 1,
                  repeatCount += EXCLUDED.repeatCount,
                  suspiciousCount += EXCLUDED.suspiciousCount,
                  billableCount += EXCLUDED.billableCount,
                  lastScanAt = GREATEST(...),
                  isRepeatScan = existing OR incoming,
                  isSuspicious = existing OR incoming,
                  isBillable = (billableCount + EXCLUDED.billableCount) > 0,
                  suspiciousReason = COALESCE(existing, EXCLUDED)
             (atomic: no race conditions under concurrent load)
          f. prisma.qRCode.update scanCount += 1
       3. Render: src/components/campaign/public-campaign-landing.tsx
```

### Reward Claim Flow

```
Consumer enters mobile number on /q/[code]/landing

POST /api/public/rewards/start (via experience-shell.tsx)
  │
  ├─ src/proxy.ts: Upstash Redis rate check (IP + phone limits) → 429 if exceeded
  │
  └─ src/app/api/public/rewards/start/route.ts
       1. Route-level regex validation: mobileNumber /^\+?[1-9]\d{6,14}$/
       2. Normalize: normalizeMobileNumber() ← src/lib/rewards/mobile-hash.ts
       3. startRewardClaim() ← src/server/services/reward-claim.service.ts
          ├─ DB-level 60s OTP cooldown check (prevents resend loops)
          ├─ Verify ScanEvent + Campaign exist and are active
          ├─ Check duplicate claim (@@unique campaignId + mobileNumberHash):
          │    → If duplicate: create locked OtpVerification (decoy), return OTP_SENT
          │       (phone enumeration prevention: attacker cannot distinguish duplicate from success)
          ├─ Create OtpVerification (generateRewardOtp + hashRewardOtp)
          └─ Return otpVerificationId (+ devOtp in non-production)

Consumer enters 6-digit OTP code

POST /api/public/rewards/verify
  │
  ├─ src/proxy.ts: Upstash Redis rate check (IP + phone limits) → 429 if exceeded
  │
  └─ src/app/api/public/rewards/verify/route.ts
       1. Route-level validation: mobileNumber regex + otp /^\d{6}$/
       2. Normalize mobileNumber
       3. verifyRewardOtpAndClaim() ← src/server/services/reward-claim.service.ts
          ├─ Load OtpVerification by id + mobileNumberHash
          ├─ Check expired (> 10 min)
          ├─ Check attemptCount ≥ MAX_OTP_ATTEMPTS (3) → locked
          ├─ Increment attemptCount on every attempt
          ├─ verifyRewardOtpHash() ← src/lib/rewards/otp.ts
          ├─ On success: update RewardClaim status → APPROVED, providerStatus = SIMULATED
          └─ All failures → generic "Verification failed. Please try again." (no leaking)

src/components/experience/experience-shell.tsx  ← consumer-facing OTP/claim UI shell
src/components/experience/client-utils.ts       ← OTP API call helpers
```

### Retail Delivery Scan Flow (`/d/[code]`)

```
GET/POST /d/[code]                   ← RETAIL_OPERATIONS role required (enforced by middleware + actions)
  src/app/d/[code]/page.tsx          ← RSC: resolves QRCode, shows delivery form
  src/app/d/[code]/actions.ts        ← recordDeliveryScanAction
  src/server/services/delivery-scan.service.ts
    1. Look up QRCode (type=BATCH_DELIVERY)
    2. Validate retailer + batch
    3. Calculate: estimatedUnitsDelivered = cartonsDelivered × unitsPerCarton
    4. Create DeliveryScan record with location
  src/components/delivery/delivery-scan-form.tsx  ← carton count input form
```

### Analytics Dashboards

```
Each role has its own analytics page using the same shared components:
  /admin            → getAnalyticsDashboardData() (no filter — global view)
  /brand            → getAnalyticsDashboardData() (scoped to brandId — fail closed if null)
  /campaign-manager → getAnalyticsDashboardData() (scoped by CampaignAssignment.campaignId list — fail closed if empty)
  /advertiser       → getAnalyticsDashboardData() (scoped to advertiserId — fail closed if null)

⚠️  CAMPAIGN_MANAGER scoping uses CampaignAssignment table (not advertiserId which is always null for CMs):
    campaignIds = SELECT campaignId FROM CampaignAssignment WHERE userId = user.id
    All filters then use: { campaignId: { in: campaignIds } }
    Returns EMPTY_ANALYTICS_DATA if no campaigns are assigned.

src/server/services/analytics.service.ts
  computeMetricsAndPerformance()   ← parallelised Promise.all fetches
  getAnalyticsDashboardData()      ← role scoping applied

⚠️  AGGREGATED COUNTER QUERIES — physical row count is NOT used:
  totalScans      = _sum.hitCount          (NOT count(*))
  repeatScans     = _sum.repeatCount       (NOT count where isRepeatScan=true)
  billableScans   = _sum.billableCount     (NOT count where isBillable=true)
  suspiciousScans = _sum.suspiciousCount   (NOT count where isSuspicious=true)
  uniqueScans     = distinct anonymousVisitorId groups (distinct buckets, NOT total visits)

  getScanTrendByMinute():
    SELECT date_trunc('minute', "windowStartedAt"), SUM("hitCount")
    FROM "ScanEvent"
    GROUP BY minute
    ORDER BY minute ASC

Shared dashboard components:
  src/components/dashboard/analytics-stat-card.tsx
  src/components/dashboard/analytics-table-section.tsx
```

### Heatmaps

```
/admin/heatmaps + /brand/heatmaps + /advertiser/heatmaps

src/server/services/heatmaps.service.ts  ← queries ScanEvent lat/lng + filters
src/components/heatmaps/
  heatmap-map.tsx          ← MapLibre GL JS via react-map-gl, uses NEXT_PUBLIC_MAPTILER_KEY
  heatmap-filters.tsx      ← date range + campaign filter controls
  heatmap-data-tables.tsx  ← tabular scan event data below the map
```

### Reports

```
/admin/reports + /brand/reports + /campaign-manager/reports + /advertiser/reports

src/server/services/reports.service.ts
  getCampaignSummaryData()    ← Campaign rows; Decimal fees serialized to .toNumber()
  getScanEventsData()         ← Raw ScanEvent rows (for per-bucket export, NOT totals)
  getRewardClaimsData()       ← RewardClaim rows
  getDeliveryScansData()      ← DeliveryScan rows
  getSuspiciousScansData()    ← ScanEvent rows with isSuspicious=true
  getBillingSummaryData()     ← BillingSummary rows; all Decimal fields serialized to .toNumber()
  applyRoleScope()            ← scopes all queries by role

src/components/dashboard/reports-client.tsx  ← client: filter controls + export buttons
src/lib/report-generator.ts                  ← jsPDF (PDF) + PapaParse (CSV) generators

GET /api/reports               ← streams generated report file as download

⚠️  NOTE: getScanEventsData() returns physical ScanEvent bucket rows.
    Each row represents a collapsed 30-second window, NOT a single user scan.
    The CSV/PDF export includes: HitCount, RepeatCount, SuspiciousCount, BillableCount per row.
    Report consumers should treat each row as a bucket, not 1 row = 1 scan.
    Billing uses SUM(billableCount), not a row count or IsRepeat/IsBillable boolean column count.
```

### Suspicious Scans

```
/admin/suspicious-scans

src/app/admin/suspicious-scans/page.tsx
src/app/admin/suspicious-scans/suspicious-scans-client.tsx
src/app/admin/suspicious-scans/actions.ts

src/server/services/scan-classification.service.ts
  getSuspiciousScansPageData():
    ├─ Total suspicious count: _sum.suspiciousCount (NOT count(*))
    ├─ Reason breakdown: groupBy suspiciousReason, _sum.suspiciousCount per group
    └─ Recent scan list: findMany (individual bucket rows for inspection)
```

### Billing

```
/admin/billing + /brand/billing + /advertiser/billing

src/server/services/billing.service.ts    ← aggregates BillingSummary per campaign
src/components/dashboard/billing-client.tsx

BillingSummary fields serialized:
  fixedFeePerUnit, engagementFeePerScan, fixedFeeTotal,
  engagementFeeTotal, totalAmount → .toNumber() (Prisma Decimal → JS number)
```

---

## 5. Data Model Map

### Core Hierarchy

```
Brand ──────────────────────────── Advertiser
  │                                    │
  ├─ Product                           │
  │    │                               │
  └─ Campaign (Brand + Advertiser + Product?)
       │
       ├─ Batch (Campaign + Brand + Product?)
       │    └─ QRCode (type=BATCH_DELIVERY)
       │         └─ DeliveryScan
       │
       └─ QRCode (type=CONSUMER_CAMPAIGN)
            └─ ScanEvent  ←  collapsed 30-second bucket row
                 │            (qrCodeId + fingerprintKey + windowStartedAt = unique key)
                 │
                 └─ RewardClaim ── OtpVerification
```

### ScanEvent Schema — Aggregated Bucket Model

> ⚠️ **Critical change**: `ScanEvent` is no longer a raw one-row-per-scan table.
> Each row represents a **collapsed 30-second time bucket** per unique visitor/IP+QRCode combination.
> `COUNT(*)` on this table counts **buckets**, not individual scan hits.

| Field | Type | Meaning |
|---|---|---|
| `id` | UUID | Row ID (first insert wins; conflicts update in-place) |
| `qrCodeId` | String | QR code that was scanned |
| `fingerprintKey` | String | `visitor:${anonymousVisitorId}` \| `ip:${ipHash}` \| `unknown:${uuid}` |
| `windowStartedAt` | DateTime | 30-second bucket floor: `Math.floor(now / 30000) * 30000` |
| `firstScanAt` | DateTime | Timestamp of the first scan in this bucket |
| `lastScanAt` | DateTime | Timestamp of the most recent scan in this bucket |
| `hitCount` | Int | **Total scan attempts** in this bucket — use SUM for traffic totals |
| `repeatCount` | Int | Scans classified as repeats (returning visitor) — use SUM |
| `suspiciousCount` | Int | Scans classified as suspicious — use SUM |
| `billableCount` | Int | Scans qualifying for billing — use SUM |
| `isRepeatScan` | Boolean | True if ANY scan in this bucket was a repeat (OR-accumulated) |
| `isSuspicious` | Boolean | True if ANY scan in this bucket was suspicious (OR-accumulated) |
| `isBillable` | Boolean | True if billableCount > 0 |
| `suspiciousReason` | String? | First suspicious reason seen (COALESCE-accumulated) |
| `anonymousVisitorId` | String? | From `moengage_visitor_id` cookie |
| `ipHash` | String? | SHA-256 of client IP (raw IP never stored) |

**Unique constraint**: `@@unique([qrCodeId, fingerprintKey, windowStartedAt], name: "scan_event_window_unique")`

**Indexes** (single-column and compound):
- `@@index([qrCodeId, windowStartedAt])`
- `@@index([qrCodeId, createdAt])`
- `@@index([fingerprintKey, lastScanAt])`
- `@@index([campaignId, anonymousVisitorId, createdAt])` ← ⭐ classification hot-path
- `@@index([campaignId, ipHash, createdAt])` ← ⭐ classification hot-path
- `@@index([anonymousVisitorId, createdAt])` ← ⭐ classification hot-path
- `@@index([ipHash, createdAt])` ← ⭐ classification hot-path

> These 4 composite indexes were added in migration `20260605220051_add_scan_classification_composite_indexes`.
> On production apply them with `CREATE INDEX CONCURRENTLY` to avoid table lock (see migration SQL comments).

### Model Summary

| Model | Purpose | Terminal State |
|---|---|---|
| `User` | Platform user with role + brand/advertiser scope | `isActive = false` |
| `Brand` | FMCG brand/supplier (e.g. Mo Beverages) | `status = ARCHIVED` |
| `Advertiser` | Ad buyer associated with campaigns | `status = ARCHIVED` |
| `Product` | SKU within a Brand (brand-scoped slug `@@unique([brandId, slug])`) | `status = ARCHIVED` |
| `Campaign` | Advertising campaign linking Brand + Advertiser + Product | `status = ARCHIVED` |
| `Batch` | Physical product batch for a Campaign, used for delivery QR | `status = CLOSED` |
| `QRCode` | Individual QR code record (CONSUMER or BATCH_DELIVERY type) | `status = DISABLED` |
| `ScanEvent` | **Collapsed 30-second bucket** — never deleted; hitCount/billableCount/suspiciousCount/repeatCount accumulate via ON CONFLICT | — (immutable rows, counters mutable) |
| `RewardClaim` | Consumer reward claim per scan; `@@unique([campaignId, mobileNumberHash])` | `status = APPROVED / DECLINED_*` |
| `OtpVerification` | OTP session for reward claim; tracks `attemptCount` for lockout | `status = VERIFIED / EXPIRED` |
| `Retailer` | Physical retail outlet with lat/lng | — |
| `DeliveryScan` | Delivery scan event; `estimatedUnitsDelivered = cartonsDelivered × unitsPerCarton` | — |
| `BillingSummary` | Pre-computed billing snapshot per campaign | — |
| `ReportExport` | Log of exported reports (file URL, type, who generated) | — |
| `AuditLog` | Generic audit trail for admin actions | — |
| `CampaignAssignment` | Many-to-many: User ↔ Campaign (for CAMPAIGN_MANAGER scoping) | — |
| `EmailVerificationToken` | OTP token for email verification flow | — |

### Key Field Notes

- `ScanEvent.hitCount` — real scan volume; **always use SUM, never COUNT(*)**
- `ScanEvent.billableCount` — controls billing aggregation; internal/test scans set to 0
- `ScanEvent.isSuspicious` — flagged by `scan-classification.service.ts` or toggled manually
- `ScanEvent.fingerprintKey` — collapses multiple requests from same visitor into one row per 30s window
- `ScanEvent.windowStartedAt` — 30-second floor bucket; used for time-series grouping
- `QRCode.scanCount` — denormalized hit counter; still incremented on every `logConsumerScan` call
- `RewardClaim.mobileNumberHash` — SHA-256 of normalized phone; raw number stored masked in `mobileNumberLast4`
- `OtpVerification.attemptCount` — incremented on every failed verify; locked at `MAX_OTP_ATTEMPTS` (3)
- `Campaign.fixedFeePerUnit / engagementFeePerScan` — Prisma `Decimal` type, serialized to `.toNumber()` before passing to client
- `BillingSummary.*` — all monetary Decimal fields serialized to `.toNumber()` in `getBillingSummaryData()`

---

## 6. Dependency / Data Flow Graph

```
                     ┌──────────────────────────────────────────────┐
                     │              Admin Setup                      │
                     │  Brand → Advertiser → Product → Campaign      │
                     │              ↓                                │
                     │           Batch → QRCode (BATCH_DELIVERY)     │
                     │           Campaign → QRCode (CONSUMER)        │
                     └──────────────────────────────────────────────┘
                                    │                   │
                     Consumer path  │                   │  Retail path
                          ↓                             ↓
             GET /q/[code]/route.ts           /d/[code] page
              ↓ set moengage_visitor_id        (RETAIL_OPERATIONS)
             /q/[code]/landing                       │
              │                               DeliveryScan created
              │ logConsumerScan()             (cartonsDelivered ×
              │  ↓                             unitsPerCarton)
              │ scan-classification.service.ts
              │  (SUM(hitCount) for abuse thresholds)
              │  ↓
              │ scan-event-aggregation.service.ts
              │  INSERT ... ON CONFLICT DO UPDATE
              │  → ScanEvent bucket (hitCount++, etc.)
              │                          ▲
              │                          │ Supabase PostgreSQL
              │
              │ Consumer enters mobile
              │  ↓
              │ POST /api/public/rewards/start
              │  ├─ proxy.ts: Upstash Redis rate limit check
              │  └─ reward-claim.service.ts
              │       ├─ 60s OTP cooldown (DB check)
              │       ├─ Duplicate enumeration prevention
              │       └─ OtpVerification created
              │
              │ Consumer enters OTP
              │  ↓
              │ POST /api/public/rewards/verify
              │  ├─ proxy.ts: Upstash Redis rate limit check
              │  └─ reward-claim.service.ts
              │       ├─ 3-attempt lockout
              │       └─ RewardClaim APPROVED / DECLINED
              │
         ────────────┴─────────────────────────────────────────────┐
                                                                    │
                    Analytics / Reports / Billing                   │
         ScanEvent + RewardClaim + DeliveryScan ─────────────────────┘
                     ↓
              analytics.service.ts
                SUM(hitCount), SUM(billableCount),
                SUM(suspiciousCount), SUM(repeatCount)
                date_trunc('minute', windowStartedAt) for time charts

              scan-classification.service.ts
                SUM(suspiciousCount) for totals
                groupBy suspiciousReason, SUM(suspiciousCount)

              reports.service.ts     (CSV/PDF export)
              billing.service.ts     (BillingSummary per campaign)
              heatmaps.service.ts    (lat/lng points for MapLibre)


External services:
  Supabase PostgreSQL  ← all persistent data (via Prisma + @prisma/adapter-pg + pg Pool)
  Upstash Redis        ← OTP rate limit counters (sliding window, globally consistent)
  Resend               ← email verification OTPs (src/helpers/mailer.ts)
  MapTiler             ← map tile CDN for heatmap rendering
```

---

## 7. Route Map

### Auth Routes (public)

| Route | File | Notes |
|---|---|---|
| `/login` | `src/app/(auth)/login/page.tsx` | NextAuth `signIn` |
| `/signup` | `src/app/(auth)/signup/page.tsx` | POST `/api/auth/signup` |
| `/verify-email` | `src/app/(auth)/verify-email/page.tsx` | POST `/api/auth/verify-email` |

### Admin Routes (ADMIN only)

| Route | File |
|---|---|
| `/admin` | `src/app/admin/page.tsx` — dashboard overview |
| `/admin/brands` | CRUD for Brand |
| `/admin/advertisers` | CRUD for Advertiser |
| `/admin/products` | CRUD for Product |
| `/admin/campaigns` | CRUD for Campaign |
| `/admin/batches` | CRUD for Batch |
| `/admin/users` | CRUD for User (create/edit/deactivate/activate) |
| `/admin/qr-codes` | CRUD for QRCode + PNG/SVG download |
| `/admin/delivery` | View delivery scans |
| `/admin/heatmaps` | MapLibre heatmap of scan events |
| `/admin/reports` | Report generation + download |
| `/admin/billing` | Billing summary view |
| `/admin/suspicious-scans` | View + manage suspicious scan events (SUM-based counts) |

### Brand Routes (BRAND_ADMIN)

| Route | Notes |
|---|---|
| `/brand` | Dashboard |
| `/brand/campaigns` | Read-only campaign list scoped to brand |
| `/brand/products` | Read-only product list |
| `/brand/batches` | Read-only batch list |
| `/brand/qr-codes` | Read-only QR code list |
| `/brand/delivery` | Delivery scan view |
| `/brand/heatmaps` | Heatmap (brand-scoped) |
| `/brand/reports` | Report export (brand-scoped) |
| `/brand/billing` | Billing summary (brand-scoped) |

### Campaign Manager Routes (CAMPAIGN_MANAGER)

| Route | Notes |
|---|---|
| `/campaign-manager` | Dashboard |
| `/campaign-manager/campaigns` | Assigned campaigns only |
| `/campaign-manager/qr-codes` | QR codes for assigned campaigns |
| `/campaign-manager/analytics` | Analytics for assigned campaigns |
| `/campaign-manager/reports` | Report export for assigned campaigns |

### Advertiser Routes (ADVERTISER_VIEWER)

| Route | Notes |
|---|---|
| `/advertiser` | Dashboard |
| `/advertiser/campaigns` | Campaigns for this advertiser |
| `/advertiser/heatmaps` | Heatmap (advertiser-scoped) |
| `/advertiser/reports` | Report export (advertiser-scoped) |
| `/advertiser/billing` | Billing (advertiser-scoped) |

### Retail Routes (RETAIL_OPERATIONS)

| Route | Notes |
|---|---|
| `/retail` | Dashboard |
| `/retail/deliveries` | Delivery scan history |
| `/retail/scan` | Scan entry page |
| `/d/[code]` | Delivery scan flow — scan BATCH_DELIVERY QR, enter carton count |

### Public Routes (no auth)

| Route | Notes |
|---|---|
| `/q/[code]` | Route handler: sets `moengage_visitor_id` cookie, redirects to `/q/[code]/landing` |
| `/q/[code]/landing` | RSC: classifies and logs scan (via aggregation service), renders campaign offer |
| `GET /api/qr-codes/[id]/download/png` | Download QR PNG |
| `GET /api/qr-codes/[id]/download/svg` | Download QR SVG |

### API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth handler |
| `/api/auth/signup` | POST | Creates user, sends verification OTP |
| `/api/auth/send-email-verification` | POST | Sends/resends verification email |
| `/api/auth/verify-email` | POST | Validates OTP hash, marks email verified |
| `/api/auth/resend-verification` | POST | Resends verification OTP |
| `/api/public/rewards/start` | POST | **Rate-limited by proxy.ts (Upstash)** — starts reward claim (creates OTP session, 60s cooldown, enumeration prevention) |
| `/api/public/rewards/verify` | POST | **Rate-limited by proxy.ts (Upstash)** — verifies OTP, approves/declines reward claim (3-attempt lockout) |
| `/api/qr-codes/[id]/download/png` | GET | Streams QR PNG binary |
| `/api/qr-codes/[id]/download/svg` | GET | Streams QR SVG text |
| `/api/reports` | GET | Streams CSV/PDF report file |

---

## 8. Important Conventions

### Role Protection
- **Every server action must call `requireRole([...])` as its first statement.**
- Middleware (`src/proxy.ts`) provides first-line JWT enforcement, but is not sufficient on its own.
- Server actions are the authoritative enforcement point — never rely on UI hiding alone.

### Public Routes
- `/q/[code]` is and must remain **fully public** — no auth middleware, no layout wrapper.
- `/d/[code]` requires `RETAIL_OPERATIONS` (enforced in both middleware and `actions.ts`).

### Soft Deletion
- **Never hard-delete core business records.**
- Use: `ARCHIVED` for Brand/Advertiser/Product/Campaign · `CLOSED` for Batch · `DISABLED` for QRCode · `isActive = false` for User.

### Scan Event Aggregation (Critical)
- **`ScanEvent` is a collapsed bucket table, not a raw event log.**
- `COUNT(*)` on `ScanEvent` counts **buckets**, not individual scan hits.
- All scan metric calculations must use `SUM(hitCount)`, `SUM(billableCount)`, `SUM(suspiciousCount)`, `SUM(repeatCount)`.
- `prisma.scanEvent.create` must **never** be used directly for consumer scans — always go through `aggregateScanEvent()`.
- The aggregation key is: `(qrCodeId, fingerprintKey, windowStartedAt)`.
- `windowStartedAt` is a 30-second floor bucket: `new Date(Math.floor(now.getTime() / 30000) * 30000)`.
- `fingerprintKey` format: `visitor:${anonymousVisitorId}` | `ip:${ipHash}` | `unknown:${uuid}`.

### Scan vs. Reward Claim Separation
- A `ScanEvent` bucket is always created/updated on QR scan, regardless of fraud/duplicate status.
- Do not suppress or delete scan events because a reward claim was declined.
- Duplicate reward detection uses `@@unique([campaignId, mobileNumberHash])` on `RewardClaim`.

### Delivery vs. Consumer Scans
- Consumer scans → `/q/[code]` → `ScanEvent` bucket → `RewardClaim`
- Delivery scans → `/d/[code]` → `DeliveryScan` (separate table, separate flow)
- Do not mix these two flows.

### OTP Security
- Rate limiting at the **Edge** (proxy.ts via Upstash Redis) is the first gate; fails **closed** in production (503) if Upstash env vars are missing.
- Route handlers (`start/route.ts`, `verify/route.ts`) enforce their own validation and are secure even if the proxy matcher is bypassed.
- `reward-claim.service.ts` enforces DB-level 60s cooldown, 3-attempt lockout, and phone enumeration prevention.
- OTP generation uses `crypto.randomInt(100000, 1000000)` (CSPRNG — never `Math.random()`).
- OTP hashing uses HMAC-SHA256 keyed with `REWARD_OTP_SECRET` env var (required in production; throws if missing).
- OTP verification uses `crypto.timingSafeEqual()` (timing-attack safe).
- All OTP failure paths return generic "Verification failed. Please try again." — no enumeration leakage.
- Never use in-memory `Map` for rate limiting — Vercel Edge instances do not share memory.
- **Simulated OTP delivery:** there is no real SMS provider. The OTP is echoed to the consumer UI only in local dev, or when `DEMO_OTP_ECHO === "true"` (explicit, default-off flag for hosted demos). Real production leaves it unset → the OTP is never returned to the client.

### Stub / "Coming soon" Pages (NOT yet wired to real data)
These role sub-pages render an honest "coming soon" empty state — no fabricated metrics. The primary role dashboards (`/brand`, `/advertiser`, `/campaign-manager`, `/retail`) and the billing/reports pages ARE wired to real scoped data.
- `/brand/{campaigns,products,batches,qr-codes,delivery,heatmaps}`
- `/advertiser/{campaigns,heatmaps}`
- `/campaign-manager/{campaigns,qr-codes,analytics}`
- `/retail/scan`
- The full geographic heatmap (real data) exists only at `/admin/heatmaps`.

### Prisma Conventions
- Import PrismaClient exclusively from `src/lib/prisma.ts` (singleton).
- `Decimal` fields → serialize to `.toNumber()` before passing to client components.
- `Date` fields → serialize to `.toISOString()` before passing to client components.
- Never pass raw Prisma objects to client components.

### Banned Concepts (SQRATCH legacy — never reintroduce)
- Roles: `USER`, `CREATOR`, `EXTERNAL`
- Fields: `hasPendingApproval`, `imageUrl`, `isTemporary`, `points`
- Concepts: `qr-redemption`, `lessonProgress`, `campaignUnlock`, `brandRequest`, `creatorRequest`, `Shopify`

### QR Code Phase 1 Strategy
- Phase 1 does NOT use unique QR codes per can.
- A single `CONSUMER_CAMPAIGN` QR code is shared across all cans in a campaign or batch.
- `BATCH_DELIVERY` QR codes represent the whole batch, not individual cartons.

### Zod / Form Conventions
- Use `z.preprocess` for optional fields that come from HTML inputs (empty string → `undefined` or `null`).
- Use `zodResolver(schema) as any` when `z.preprocess` makes field types `unknown`.
- Two schemas per entity that has optional password: `createEntitySchema` (required) and `updateEntitySchema` (optional).

---

## 9. Seed / Demo Data Reference

Run `npm run db:seed` to wipe all app data and create fresh demo records.

### Seed Behaviour

`prisma/seed.ts` calls `resetDemoData()` first (hard-deletes all rows in dependency order) then rebuilds the full demo dataset. **Do not run against production.**

### Demo Login Credentials

| Role | Email | Password |
|---|---|---|
| ADMIN | `admin@moengage.local` | `DemoPass123!` |
| BRAND_ADMIN | `brand.admin@moengage.local` | `DemoPass123!` |
| CAMPAIGN_MANAGER | `campaign.manager@moengage.local` | `DemoPass123!` |
| ADVERTISER_VIEWER | `advertiser.viewer@moengage.local` | `DemoPass123!` |
| ADVERTISER_VIEWER | `ncba.viewer@moengage.local` | `DemoPass123!` |
| RETAIL_OPERATIONS | `retail.ops@moengage.local` | `DemoPass123!` |

### Seeded Entities

**Brands (2):**
- Mo Beverages (`mo-beverages`) — FMCG Beverages
- Bright Foods (`bright-foods`) — FMCG Snacks

**Advertisers (3):**
- Vodacom (`vodacom`) — Telecom
- NCBA Bank (`ncba-bank`) — Banking & Fintech
- SafeGuard Insurance (`safeguard-insurance`) — Insurance

**Products (3):**
- Mo Xtra 330ml Can (`MO-XTRA-330`, Mo Beverages)
- Mo Malto 330ml Can (`MO-MALTO-330`, Mo Beverages)
- Bright Crisp Maize Snack 80g (`BF-CRISP-080`, Bright Foods)

**Campaigns (3):**
- **Vodacom Free 5GB Data** — Mo Beverages × Vodacom, ACTIVE, reward FREE_DATA
- **NCBA Cashback** — Bright Foods × NCBA, ACTIVE, reward CASHBACK
- **SafeGuard 30-Day Cover** — Mo Beverages × SafeGuard, PAUSED, reward INSURANCE

CampaignAssignment: campaign.manager has both ACTIVE campaigns assigned.

**Batches (3):**
- `MOXTRA-VODACOM-DAR-001` — Dar es Salaam, 2400 units (100 cartons × 24)
- `MOXTRA-VODACOM-NBI-001` — Nairobi, 1200 units
- `BFCRISP-NCBA-MSA-001` — Mombasa, 3000 units (100 cartons × 30)

**QR Codes (7):**

| Code | Type | Status | Campaign |
|---|---|---|---|
| `mo-xtra-vodacom-free-5gb` | CONSUMER_CAMPAIGN | ACTIVE | Vodacom 5GB |
| `bright-crisp-ncba-cashback` | CONSUMER_CAMPAIGN | ACTIVE | NCBA Cashback |
| `sample-label-mo-xtra-vodacom` | SAMPLE_LABEL | ACTIVE | Vodacom 5GB |
| `delivery-moxtra-vodacom-dar-001` | BATCH_DELIVERY | ACTIVE | Vodacom 5GB / Dar |
| `delivery-moxtra-vodacom-nbi-001` | BATCH_DELIVERY | ACTIVE | Vodacom 5GB / Nairobi |
| `delivery-bfcrisp-ncba-msa-001` | BATCH_DELIVERY | ACTIVE | NCBA Cashback / Mombasa |
| `paused-safeguard-cover-mo-malto` | CONSUMER_CAMPAIGN | PAUSED | SafeGuard |

**Demo QR scan URLs:**
```
Consumer Active: {APP_BASE_URL}/q/mo-xtra-vodacom-free-5gb
Consumer Active: {APP_BASE_URL}/q/bright-crisp-ncba-cashback
Consumer Paused: {APP_BASE_URL}/q/paused-safeguard-cover-mo-malto
Delivery Dar:    {APP_BASE_URL}/d/delivery-moxtra-vodacom-dar-001
Delivery Nbi:    {APP_BASE_URL}/d/delivery-moxtra-vodacom-nbi-001
Delivery Msa:    {APP_BASE_URL}/d/delivery-bfcrisp-ncba-msa-001
```

**Retailers (4):**
- Kariakoo Demo Outlet (RETAILER, Dar es Salaam, TZ)
- Mlimani City Demo Retailer (SUPERMARKET, Dar es Salaam, TZ)
- Nairobi CBD Wholesale (WHOLESALER, Nairobi, KE)
- Mombasa Old Town Kiosk (KIOSK, Mombasa, KE)

**Scan Buckets (4 collapsed ScanEvent rows):**

| Visitor ID | QR | hitCount | billableCount | suspiciousCount | Notes |
|---|---|---|---|---|---|
| `demo-vodacom-mixed-visitor` | Vodacom 5GB | 9 | 7 | 2 | `HIGH_FREQUENCY_VISITOR` flag |
| `demo-vodacom-normal-visitor` | Vodacom 5GB | 3 | 3 | 0 | Normal Kenya scan |
| `internal-qa-tester` | Vodacom 5GB | 2 | 0 | 0 | INTERNAL_TEST_QR (non-billable) |
| `demo-ncba-visitor` | NCBA Cashback | 5 | 5 | 0 | Normal Mombasa scan |

**Reward Claims (4):**
- Vodacom `+2557000000**01` → APPROVED
- Vodacom `+2557000000**02` → APPROVED
- Vodacom `+2557000000**03` → DECLINED_DUPLICATE (demo duplicate rejection)
- NCBA `+2547000000**10` → APPROVED

**Delivery Scans (4):**
- Kariakoo outlet: 40 cartons × 24 = 960 units (72 hours ago)
- Mlimani City: 25 cartons × 24 = 600 units (60 hours ago)
- Nairobi CBD: 30 cartons × 24 = 720 units (48 hours ago)
- Mombasa kiosk: 50 cartons × 30 = 1500 units (24 hours ago)

**Billing Summaries (2):**
- Vodacom campaign: 14 total scans, 10 billable, 2 suspicious, $45.90 total
- NCBA campaign: 5 total scans, 5 billable, 0 suspicious, $22.63 total

### Validation Scripts

```bash
# Concurrency correctness (100 parallel writes → 1 collapsed row, no races)
npx tsx scripts/test-concurrency.ts

# Billing aggregation correctness (7 billable + 2 suspicious → correct BillingSummary)
npx tsx scripts/test-billing-aggregation.ts
```

Both scripts create isolated test data and clean up after themselves. Safe to run against a dev DB. **Do not run against production.**

---

## 10. Physical Row Count Warning Reference

The following places **must not** use `COUNT(*)` or `prisma.scanEvent.count()` to represent scan volume:

| Location | What to use instead |
|---|---|
| `analytics.service.ts` — totalScans | `_sum.hitCount` ✅ (already correct) |
| `analytics.service.ts` — repeatScans | `_sum.repeatCount` ✅ (already correct) |
| `analytics.service.ts` — billableScans | `_sum.billableCount` ✅ (already correct) |
| `analytics.service.ts` — suspiciousScans | `_sum.suspiciousCount` ✅ (already correct) |
| `scan-classification.service.ts` — abuse frequency checks | `_sum.hitCount` ✅ (already correct) |
| `scan-classification.service.ts` — totalSuspicious | `_sum.suspiciousCount` ✅ (already correct) |
| `analytics.service.ts` — getScanTrendByMinute | `SUM(hitCount)` + `windowStartedAt` ✅ (already correct) |
| Report exports — scan event rows | Each row is a bucket — display `hitCount` per row ⚠️ |
| Admin dashboard stat cards | Must use SUM aggregates, not row count ⚠️ verify on changes |
| `QRCode.scanCount` | Denormalized counter — still valid as approximate total ✅ |

---

## 11. Next Likely Features

Based on CLAUDE.md and project state as of 2026-06-06:

**Completed (this session):**
- ✅ Critical/high security fixes from `docs/opus-production-audit.md` applied:
  - Rate limiter fails closed in production (CB-1)
  - Campaign Manager analytics scoped by CampaignAssignment (CB-2)
  - 4 composite ScanEvent indexes (H-2)
  - CSPRNG + HMAC OTP + timing-safe comparison (H-4)
  - Test fallbacks gated to non-production (M-2)
  - `REWARD_OTP_SECRET` env var enforced in production

**Still pending (require manual action):**
1. **Apply composite indexes CONCURRENTLY on production** — run the 4 `CREATE INDEX CONCURRENTLY` statements from `migration.sql` comments, then `npm run prisma:deploy`
2. **Set `REWARD_OTP_SECRET` in Vercel** — `openssl rand -base64 32`; hard throws in production if missing
3. **Set Upstash env vars in Vercel** — `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`; 503 if missing in production
4. **Set `PG_SSL_REJECT_UNAUTHORIZED=true`** with Supabase CA cert
5. **Verify `DATABASE_URL` is pooled endpoint (port 6543)**; `DIRECT_URL` is direct (port 5432)
6. **M-1: visitor cookie not persisting across redirect** — cookie is set in `q/[code]/route.ts` but may not persist; needs `set-cookie` on the redirect response directly

**Next feature work:**
1. **Billing Summary Polish** — connect real computed billing data from `billing.service.ts` to the billing pages
2. **Brand/Advertiser Scoped Reports** — finish role-scoped report generation for `/brand/reports` and `/advertiser/reports`
3. **Fraud & Suspicious Scan Rules** — extend `scan-classification.service.ts` with geo-anomaly and repeat-mobile rules
4. **QA / Testing Pass** — integration tests for public scan + reward claim flows; extend `scripts/test-concurrency.ts` patterns
5. **Investor Demo Polish** — demo walkthrough script, demo QR URL print sheet

---

## 12. Graphify Graph Reference

The machine-readable knowledge graph of this codebase is stored at:

```
graphify-out/
  graph.html        ← Interactive browser visualization (509 nodes, 413 edges, 160 communities)
  graph.json        ← GraphRAG-ready JSON for agent queries
  GRAPH_REPORT.md   ← Full graphify audit report with community details
```

**Key communities identified by Graphify:**

| Community | Label | Notable nodes |
|---|---|---|
| 0 | Login & Auth Page Flow | page.tsx, getDefaultDashboard, onLogin |
| 1 | Role-Scoped Dashboard Pages | All role /page.tsx files |
| 2 | Users Service | createUser, updateUser, deactivateUser |
| 3 | Auth API & Email Verification | signup/route.ts, verify-email/route.ts |
| 4 | Campaigns Service | createCampaign, toCampaignRow, toDecimal |
| 5 | Reports & Billing Service | buildDateFilter, applyRoleScope, getBillingSummaryData |
| 6 | Batches Service | createBatch, closeBatch, toBatchRow |
| 8 | Format Utilities | formatDate, formatCurrency, formatNumber |
| 13 | QR Codes Service | createQRCode, generateQRCodeDownloadData |
| 24 | Analytics Service | computeMetricsAndPerformance, SUM(hitCount) aggregates |
| 27 | QR Code Generation | generateQRCodePngBuffer, generateQRCodeSvg, buildQRDestinationUrl |
| 28 | Route Middleware & Proxy | proxy(), roleIsAllowed(), Upstash Redis rate limiters |
| NEW | Scan Aggregation | aggregateScanEvent, fingerprintKey, windowStartedAt, ON CONFLICT |
| NEW | OTP Security Hardening | startRewardClaim, verifyRewardOtpAndClaim, attemptCount lockout |

To query the graph interactively:
```bash
# Open in browser
open graphify-out/graph.html

# Re-run graphify to update after code changes
# (from project root, no agent spawning needed for code-only changes)
```
