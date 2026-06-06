@AGENTS.md

## Project

MoEngage is a Next.js 16 App Router MVP for a QR-driven FMCG advertising and consumer engagement platform.

The platform is generic and multi-brand. Mo Beverages is the first brand, but the system must support other FMCG suppliers later.

Core flow:

1. Admin manages brands, advertisers, products, campaigns, batches, users, and QR codes.
2. Consumers scan `/q/[code]`.
3. Scan events are logged immediately.
4. Consumers view campaign offers.
5. Consumers enter mobile number and complete simulated OTP.
6. Reward claim is approved or declined.
7. Retail operators scan `/d/[code]`.
8. They enter cartons delivered.
9. System calculates estimated units delivered.
10. Dashboards, analytics, heatmaps, and reports visualize results.

## Tech Stack

* Next.js 16 App Router
* TypeScript
* Tailwind CSS
* shadcn/ui
* Prisma 7.8
* Supabase Postgres
* NextAuth v4 credentials auth
* Resend
* qrcode
* MapLibre / react-map-gl
* PapaParse
* jsPDF / jspdf-autotable

## Commands

Run before saying a task is complete:

```bash
npx tsc --noEmit
npm run build
```

## Valid Roles

Only these roles are valid:

* ADMIN
* BRAND_ADMIN
* CAMPAIGN_MANAGER
* ADVERTISER_VIEWER
* RETAIL_OPERATIONS

## Business Rules

Phase 1 does not use unique QR codes per can.

Consumer campaign QR codes can be shared across cans/products in a campaign or batch.

A scan is an engagement event.

A reward claim is separate from a scan.

Repeat scans still count as engagement unless suspicious, internal, test, invalid, or abusive.

Reward abuse is controlled by mobile number.

Only one reward claim is allowed per unique mobile number per campaign.

Duplicate reward claims must be declined.

Never delete or suppress scan events because a reward claim is duplicate.

Delivery teams do not scan every carton.

One delivery QR represents a batch/campaign delivery context.

Delivery user scans one QR and enters cartons delivered.

Calculation:

```txt
estimatedUnitsDelivered = cartonsDelivered * unitsPerCarton
```

Avoid hard deletes for core records.

Use:

* archive for Brands, Advertisers, Products, Campaigns
* close for Batches
* disable for QR Codes
* deactivate for Users

## QR Types

Valid QR types:

* CONSUMER_CAMPAIGN
* SAMPLE_LABEL
* BATCH_DELIVERY
* INTERNAL_TEST

Valid QR statuses:

* ACTIVE
* PAUSED
* EXPIRED
* DISABLED

Destination rules:

* Consumer/sample/internal QR → `/q/[code]`
* Delivery QR → `/d/[code]`

`/q/[code]` must stay public.

`/d/[code]` must require the right role.

## Important Routes

Auth:

* `/login`
* `/signup`
* `/verify-email`

Admin:

* `/admin`
* `/admin/brands`
* `/admin/advertisers`
* `/admin/products`
* `/admin/campaigns`
* `/admin/batches`
* `/admin/users`
* `/admin/qr-codes`
* `/admin/delivery`
* `/admin/heatmaps`
* `/admin/reports`
* `/admin/billing`

Role dashboards:

* `/brand`
* `/campaign-manager`
* `/advertiser`
* `/retail`
* `/retail/deliveries`

Public/operations:

* `/q/[code]`
* `/d/[code]`

## Folder Conventions

Routes live in:


src/app/

Services live in:


src/server/services/


Validators live in:


src/lib/validators/


Business helpers live in:


src/lib/


Forms live in:


src/components/forms/


Dashboard components live in:


src/components/dashboard/

Heatmap components live in:


src/components/heatmaps/

Delivery components live in:


src/components/delivery/

Campaign public UI lives in:


src/components/campaign/


## Prisma

Use Prisma only through:


src/lib/prisma.ts

Do not create random new PrismaClient instances in app code.

Schema:


prisma/schema.prisma

Seed:
prisma/seed.ts

## Auth

NextAuth options:


src/app/api/auth/[...nextauth]/options.ts

NextAuth types:

src/types/next-auth.d.ts

Auth helpers:

src/lib/auth/

Server actions that mutate protected data must enforce role protection server-side.

Do not rely only on UI hiding or route protection.

## Completed Features

Already built:

* Prisma/Supabase setup
* Seed data
* Credentials auth
* Signup
* Email verification OTP
* Role-based dashboard shell
* Admin CRUD for Brands
* Admin CRUD for Advertisers
* Admin CRUD for Products
* Admin CRUD for Campaigns
* Admin CRUD for Batches
* Admin CRUD for Users
* Admin QR Code Management
* QR PNG/SVG downloads
* Public `/q/[code]` scan flow
* Public reward claim flow with simulated OTP
* Retail `/d/[code]` delivery scan flow
* Retail dashboard and deliveries page
* Admin delivery page
* Role-scoped analytics dashboards
* Admin heatmap basics
* Admin reports basics

## Likely Next Work

Next likely features:

1. Billing Summary Basics
2. Billing dashboard polish
3. Brand/Advertiser scoped reports
4. Fraud and suspicious scan rules
5. Production deployment hardening
6. QA/testing pass
7. Investor demo polish

## Coding Rules

Keep changes small and scoped.

Do not refactor unrelated files.

Do not introduce new packages unless necessary.

Do not change package versions casually.

Do not run destructive database operations.

Do not modify Prisma schema unless required.

Do not break existing flows.

Prefer server components for read-only pages.

Prefer services/server actions for mutations.

Validate incoming data with Zod.

Use existing shadcn/ui components.

Keep the current dashboard visual style.

Do not add dropdown sidebar groups unless asked.

Do not add hardcoded fake dashboard numbers.

Do not store raw IP addresses.

Do not expose full mobile numbers when masked values are enough.

Do not expose stack traces in API responses.

Do not store secrets in code.

Keep reward duplicate logic based on `campaignId + mobileNumberHash`.

## Definition of Done

A task is done only when:

1. TypeScript passes.
2. Build passes.
3. Feature uses real DB data where applicable.
4. Scope was not exceeded.
5. Temporary test scripts are removed.
6. Final summary is clear.
