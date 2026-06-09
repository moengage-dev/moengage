# MoEngage – Investor Demo Walkthrough

> **Platform:** QR-driven FMCG advertising and consumer engagement  
> **Stack:** Next.js 16 App Router · TypeScript · Tailwind CSS · shadcn/ui · Prisma 7 · Supabase Postgres

---

## 1. Setup

### Prerequisites
- Node.js 20+
- PostgreSQL database (Supabase recommended)
- `.env` file configured (copy from `.env.example`)

### Install dependencies
```bash
npm install
```

### Configure environment
```bash
cp .env.example .env
# Fill in DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
```

### Run database migrations and generate client
```bash
npx prisma generate
npx prisma migrate deploy
```

### Seed demo data
```bash
npm run db:seed
```

The seed will print all demo credentials and public QR URLs to the console.

### Start the dev server
```bash
npm run dev
# App runs at http://localhost:3000
```

---

## 2. Demo Credentials

All accounts use the same password: **`DemoPass123!`**

| Role | Email | Scope |
|------|-------|-------|
| `ADMIN` | `admin@moengage.local` | Full platform access |
| `BRAND_ADMIN` | `brand.admin@moengage.local` | Mo Beverages only |
| `CAMPAIGN_MANAGER` | `campaign.manager@moengage.local` | Vodacom + NCBA campaigns |
| `ADVERTISER_VIEWER` (Vodacom) | `advertiser.viewer@moengage.local` | Vodacom campaigns only |
| `ADVERTISER_VIEWER` (NCBA) | `ncba.viewer@moengage.local` | NCBA Bank campaigns only |
| `RETAIL_OPERATIONS` | `retail.ops@moengage.local` | Mo Beverages deliveries |
| `RETAIL_OPERATIONS` | `bright.retail.ops@moengage.local` | Bright Foods deliveries |

---

## 3. Public QR Scan URLs (Consumer Flow)

Open these in a browser or mobile device to simulate the consumer experience:

| Campaign | URL | Status |
|----------|-----|--------|
| Vodacom Free 5GB Data | `http://localhost:3000/q/mo-xtra-vodacom-free-5gb` | ✅ Active |
| NCBA Cashback | `http://localhost:3000/q/bright-crisp-ncba-cashback` | ✅ Active |
| SafeGuard Insurance (Paused) | `http://localhost:3000/q/paused-safeguard-cover-mo-malto` | ⏸ Paused |

| Delivery QR | URL |
|-------------|-----|
| Mo Xtra – Dar es Salaam | `http://localhost:3000/d/delivery-moxtra-vodacom-dar-001` |
| Mo Xtra – Nairobi | `http://localhost:3000/d/delivery-moxtra-vodacom-nbi-001` |

---

## 4. Investor Demo Script

### Step 1 — Login as Admin
1. Go to `http://localhost:3000/login`
2. Login with `admin@moengage.local` / `DemoPass123!`
3. You land on the **Admin Analytics Dashboard**

**What to highlight:**
- Platform-wide KPIs: total scans, unique visitors, billable scans, approved claims, delivery units
- Campaign performance table shows 2 active campaigns (Vodacom, NCBA) and 1 paused (SafeGuard)
- Location performance and recent events tables are live from seed data

---

### Step 2 — Show Campaign Management
1. Click **Campaigns** in the sidebar
2. Show the 3 campaigns: Vodacom (ACTIVE), NCBA (ACTIVE), SafeGuard (PAUSED)
3. Click into **Vodacom Free 5GB Data Campaign** and show billing rates

**Business narrative:** *"Brands define campaigns linked to their FMCG products. Each campaign has a fixed-fee-per-unit (for delivered inventory) and an engagement-fee-per-scan (for consumer interactions). The platform tracks both."*

---

### Step 3 — Show QR Code Management
1. Click **QR Codes** in the sidebar
2. Show the 7+ QR codes across types: `CONSUMER_CAMPAIGN`, `BATCH_DELIVERY`, `SAMPLE_LABEL`, `INTERNAL_TEST`
3. Download a QR PNG — explain how printed QR codes go on product packaging

**Business narrative:** *"Each QR code maps to a campaign, batch, and product. There's no per-can uniqueness in Phase 1 — the same batch QR goes on all cans in a batch."*

---

### Step 4 — Consumer Scan Flow (live demo)
1. Open `http://localhost:3000/q/mo-xtra-vodacom-free-5gb` in a new tab
2. The **campaign landing page** renders immediately
3. Enter mobile: `+255799999999`
4. Enter the generated OTP displayed in the demo helper (requires local development or `DEMO_OTP_ECHO=true`)
5. Claim is **APPROVED** ✅

**Business narrative:** *"When a consumer scans, a ScanEvent is logged instantly — no claim required. The consumer then enters their mobile number, receives a simulated OTP, and claims the reward. Mobile is hashed for privacy."*

---

### Step 5 — Attempt Duplicate Claim
1. Stay on the same QR page or refresh
2. Try the same mobile number `+255799999999`
3. The duplicate is blocked. The public response remains generic so prior participation is not exposed.

**Business narrative:** *"One mobile number can receive at most one approved reward per campaign. Duplicate approval is blocked without exposing claim history."*

---

### Step 6 — Show Admin Analytics (updated)
1. Return to `/admin` and refresh
2. Show the new ScanEvent in the Recent Scan Events table
3. Note the hit, suspicious, and billable counters for the aggregate scan bucket

---

### Step 7 — Suspicious Scans & Fraud Controls
1. Click **Suspicious Scans** in the sidebar
2. Show the pre-seeded suspicious scans:
   - `HIGH_FREQUENCY_VISITOR` — Bot/Script detected
   - `HIGH_FREQUENCY_IP` — Same IP with 20+ scans
3. Show the total, suspicious, and billable hit counts for each aggregate bucket
4. Demonstrate the explicit whole-bucket manual override

**Business narrative:** *"The platform automatically classifies scans. High-frequency visitors and IP addresses are flagged as non-billable. Admins can manually override any decision."*

---

### Step 8 — Billing Summary
1. Click **Billing** in the sidebar
2. Show the Campaign Breakdown table:
   - Vodacom: Fixed fee (units placed) + Engagement fee (billable scans) = Total
   - NCBA: Separate campaign, separate billing row
3. Highlight the `+2 non-billable` annotation on the Vodacom row

**Business narrative:** *"Billing is calculated live from database counters. Fixed fees come from estimated delivered units. Engagement fees only count billable consumer scan hits."*

---

### Step 9 — Reports Download
1. Click **Reports** in the sidebar
2. Download **Campaign Summary CSV** — opens a spreadsheet
3. Download **Billing Summary PDF** — shows the full billing breakdown
4. Download **Suspicious Scans CSV** — shows flagged scan log

---

### Step 10 — Heatmaps
1. Click **Heatmaps** in the sidebar
2. Show the Consumer Engagement Layer — dots clustered around Dar es Salaam, Nairobi, Mombasa
3. Toggle to Delivery Distribution Layer — shows distribution points across cities

---

### Step 11 — Delivery Scan Flow (Retail Ops)
1. Open a new private/incognito window
2. Go to `http://localhost:3000/d/delivery-moxtra-vodacom-dar-001`
3. Login as `retail.ops@moengage.local` / `DemoPass123!`
4. The **Delivery Scan Form** loads with QR batch info
5. Select retailer "Kariakoo Demo Outlet", enter `10` cartons, submit
6. A new DeliveryScan record is created

**Business narrative:** *"Retail operations staff scan the batch QR when delivering to a retailer. They enter carton count — the platform estimates units placed using the configured units-per-carton."*

---

### Step 12 — Brand Admin Scoped View
1. In a new window, login as `brand.admin@moengage.local`
2. Dashboard shows **only Mo Beverages** campaigns, scans, and delivery data
3. Navigate to **Billing** — only Mo Beverages billing rows appear
4. Navigate to **Reports** — downloaded CSVs are filtered to Mo Beverages

**Business narrative:** *"Brand Admins only see their own brand's data. Server-side scoping ensures a Brand Admin can never access another brand's analytics, billing, or reports — even via direct API calls."*

---

### Step 13 — Advertiser Viewer Scoped View
1. Login as `advertiser.viewer@moengage.local` (Vodacom)
2. Dashboard is **read-only** — no edit buttons
3. Reports and Billing are scoped to Vodacom campaigns only
4. Navigate to `/admin` — redirected back to `/advertiser` (correct)

---

## 5. Business Model Explanation

| Concept | How it works |
|---------|-------------|
| **Scan = Engagement** | Every consumer QR scan logs a ScanEvent with device, location, and timing metadata |
| **Mobile + OTP = Reward Identity** | Consumers provide their mobile number; it's hashed for privacy, used to prevent duplicate claims |
| **Duplicate Mobile = Declined** | Same mobile number can only claim once per campaign — protects advertisers |
| **Suspicious Scan = Non-Billable** | High-frequency visitors or IPs are auto-flagged and excluded from billing |
| **Delivery QR + Cartons = Distribution** | Retail operations scan batch QRs to log carton counts; units are estimated from carton size |
| **No Per-Can QR in Phase 1** | The same batch QR is printed on all cans in a batch — unique per-can is Phase 2 |
| **Fixed Fee** | Charged per estimated unit placed in retail (from delivery scan data) |
| **Engagement Fee** | Charged per billable consumer scan (non-suspicious, non-internal) |
| **Role Isolation** | All data scoping is enforced at the database query level — not just UI visibility |

---

## 6. Architecture Notes

- **Next.js App Router** — all dashboard pages are server components with `requireRole()` guards
- **Prisma + Supabase** — Prisma manages the schema and most queries; the scan hot path uses a parameterized PostgreSQL upsert for atomic bucket aggregation
- **NextAuth v4** — JWT session with role and scope (brandId/advertiserId) embedded
- **Role Scopes** — `getRoleScopeFilters()` in `src/lib/auth/role-scope.ts` generates Prisma `where` clauses from session
- **Fraud Detection** — `scan-classification.service.ts` classifies scans before inserting ScanEvents
- **Report Generation** — PapaParse (CSV) + jsPDF (PDF) — all server-side, no client-side data exposure

---

## 7. Known Phase 1 Limitations (by design)

| Limitation | Phase 2 Plan |
|-----------|-------------|
| Simulated OTP (6-digit, no real SMS) | Integrate Africa's Talking or Twilio SMS |
| Simulated reward fulfilment | Integrate telecom APIs for actual data/airtime provisioning |
| Same QR per batch (no per-can uniqueness) | Generate unique QR per unit with serialized codes |
| No scheduled reports or email delivery | Add job queue (e.g. BullMQ) for async report generation |
| No real payment/invoicing | Integrate billing engine + Stripe/M-Pesa |
