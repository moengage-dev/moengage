# Admin DB-Backed Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all fake placeholder data in the ADMIN section with real Prisma-backed read-only pages, add auth helpers, and validate with TypeScript/build checks.

**Architecture:** Convert admin pages from "use client" placeholders to async server components that query Prisma directly. Auth helpers (`getCurrentUser`, `requireRole`) are thin wrappers around `getServerSession`. A single `admin-dashboard.service.ts` centralises all admin Prisma queries using `Promise.all` for parallel fetching.

**Tech Stack:** Next.js 16 App Router, Prisma 7 + PostgreSQL, NextAuth 4, shadcn/ui (Card, Badge, Table, Button), Tailwind CSS 4, TypeScript 5.

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `src/lib/auth/get-current-user.ts` | Returns session user or null |
| Create | `src/lib/auth/require-role.ts` | Guards pages, redirects if wrong role |
| Create | `src/lib/auth/role-redirect.ts` | Maps role → dashboard path |
| Create | `src/lib/format.ts` | `formatDate`, `formatCurrency`, `formatNumber`, `formatStatusLabel` |
| Create | `src/server/services/admin-dashboard.service.ts` | All admin Prisma queries |
| Modify | `src/app/admin/layout.tsx` | Use `requireRole` helper |
| Modify | `src/app/admin/page.tsx` | Server component + real counts |
| Modify | `src/app/admin/brands/page.tsx` | Server component + real table |
| Modify | `src/app/admin/advertisers/page.tsx` | Server component + real table |
| Modify | `src/app/admin/products/page.tsx` | Server component + real table |
| Modify | `src/app/admin/campaigns/page.tsx` | Server component + real table |
| Modify | `src/app/admin/users/page.tsx` | Server component + real table |

---

## Task 1: Auth helper — role-redirect.ts

**Files:**
- Create: `src/lib/auth/role-redirect.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/auth/role-redirect.ts
export type AppRole =
  | "ADMIN"
  | "BRAND_ADMIN"
  | "CAMPAIGN_MANAGER"
  | "ADVERTISER_VIEWER"
  | "RETAIL_OPERATIONS";

export const ROLE_DASHBOARD: Record<AppRole, string> = {
  ADMIN: "/admin",
  BRAND_ADMIN: "/brand",
  CAMPAIGN_MANAGER: "/campaign-manager",
  ADVERTISER_VIEWER: "/advertiser",
  RETAIL_OPERATIONS: "/retail",
};

export function getDashboardForRole(role: AppRole): string {
  return ROLE_DASHBOARD[role] ?? "/login";
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors from this file.

---

## Task 2: Auth helper — get-current-user.ts

**Files:**
- Create: `src/lib/auth/get-current-user.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/auth/get-current-user.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import type { AppRole } from "@/lib/auth/role-redirect";

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: AppRole;
  isEmailVerified: boolean;
  brandId: string | null;
  advertiserId: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as CurrentUser;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

---

## Task 3: Auth helper — require-role.ts

**Files:**
- Create: `src/lib/auth/require-role.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/auth/require-role.ts
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getDashboardForRole } from "@/lib/auth/role-redirect";
import type { AppRole } from "@/lib/auth/role-redirect";
import type { CurrentUser } from "@/lib/auth/get-current-user";

export async function requireRole(allowedRoles: AppRole[]): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!allowedRoles.includes(user.role)) {
    redirect(getDashboardForRole(user.role));
  }

  return user;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

---

## Task 4: Update admin layout to use requireRole

**Files:**
- Modify: `src/app/admin/layout.tsx`

- [ ] **Step 1: Replace layout with requireRole helper**

Replace the full content of `src/app/admin/layout.tsx` with:

```typescript
import React from "react";
import { requireRole } from "@/lib/auth/require-role";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["ADMIN"]);

  return (
    <DashboardShell role="ADMIN" user={user}>
      {children}
    </DashboardShell>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

---

## Task 5: Format helpers

**Files:**
- Create: `src/lib/format.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/format.ts

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatCurrency(
  amount: number | string | null | undefined,
  currency = "USD",
): string {
  if (amount === null || amount === undefined) return "—";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

---

## Task 6: Admin dashboard service

**Files:**
- Create: `src/server/services/admin-dashboard.service.ts`

> Note: `Decimal` fields (`fixedFeePerUnit`, `engagementFeePerScan`, `totalAmount`) from Prisma's `@db.Decimal` are returned as `Prisma.Decimal` objects. Call `.toNumber()` before passing to the UI.

- [ ] **Step 1: Create the server directory**

```bash
mkdir -p /Users/sumedh/Documents/PersonalProjects/moengage/src/server/services
```

- [ ] **Step 2: Create the service file**

```typescript
// src/server/services/admin-dashboard.service.ts
import prisma from "@/lib/prisma";

export type AdminDashboardStats = {
  totalBrands: number;
  activeBrands: number;
  totalAdvertisers: number;
  activeAdvertisers: number;
  totalProducts: number;
  activeProducts: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  totalQrCodes: number;
  totalScanEvents: number;
  totalRewardClaims: number;
  totalDeliveryScans: number;
  estimatedBillingTotal: number;
};

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const [
    totalBrands,
    activeBrands,
    totalAdvertisers,
    activeAdvertisers,
    totalProducts,
    activeProducts,
    totalCampaigns,
    activeCampaigns,
    totalUsers,
    activeUsers,
    verifiedUsers,
    totalQrCodes,
    totalScanEvents,
    totalRewardClaims,
    totalDeliveryScans,
    billingAgg,
  ] = await Promise.all([
    prisma.brand.count(),
    prisma.brand.count({ where: { status: "ACTIVE" } }),
    prisma.advertiser.count(),
    prisma.advertiser.count({ where: { status: "ACTIVE" } }),
    prisma.product.count(),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.campaign.count(),
    prisma.campaign.count({ where: { status: "ACTIVE" } }),
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isEmailVerified: true } }),
    prisma.qRCode.count(),
    prisma.scanEvent.count(),
    prisma.rewardClaim.count(),
    prisma.deliveryScan.count(),
    prisma.billingSummary.aggregate({ _sum: { totalAmount: true } }),
  ]);

  const rawTotal = billingAgg._sum.totalAmount;
  const estimatedBillingTotal =
    rawTotal !== null ? rawTotal.toNumber() : 0;

  return {
    totalBrands,
    activeBrands,
    totalAdvertisers,
    activeAdvertisers,
    totalProducts,
    activeProducts,
    totalCampaigns,
    activeCampaigns,
    totalUsers,
    activeUsers,
    verifiedUsers,
    totalQrCodes,
    totalScanEvents,
    totalRewardClaims,
    totalDeliveryScans,
    estimatedBillingTotal,
  };
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors. If Prisma enum types don't match string literals, import from `@prisma/client` e.g. `import { BrandStatus } from "@prisma/client"` and use `{ status: BrandStatus.ACTIVE }`.

---

## Task 7: Update /admin dashboard page

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Replace entire file content**

```typescript
// src/app/admin/page.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminDashboardStats } from "@/server/services/admin-dashboard.service";
import { formatNumber, formatCurrency } from "@/lib/format";

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();

  const cards = [
    { title: "Total Brands", value: formatNumber(stats.totalBrands) },
    { title: "Active Campaigns", value: formatNumber(stats.activeCampaigns) },
    { title: "Total Advertisers", value: formatNumber(stats.totalAdvertisers) },
    { title: "Total Products", value: formatNumber(stats.totalProducts) },
    { title: "Total Users", value: formatNumber(stats.totalUsers) },
    { title: "Total QR Codes", value: formatNumber(stats.totalQrCodes) },
    { title: "Total Scans", value: formatNumber(stats.totalScanEvents) },
    { title: "Reward Claims", value: formatNumber(stats.totalRewardClaims) },
    { title: "Delivery Scans", value: formatNumber(stats.totalDeliveryScans) },
    {
      title: "Est. Billing Total",
      value: formatCurrency(stats.estimatedBillingTotal),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Platform-wide overview for brands, advertisers, campaigns, QR
          activity, delivery scans, and billing.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

---

## Task 8: Update /admin/brands page

**Files:**
- Modify: `src/app/admin/brands/page.tsx`

- [ ] **Step 1: Replace entire file content**

```typescript
// src/app/admin/brands/page.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import prisma from "@/lib/prisma";
import { formatDate, formatStatusLabel, formatNumber } from "@/lib/format";

export default async function BrandsPage() {
  const [brands, totalBrands, activeBrands] = await Promise.all([
    prisma.brand.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.brand.count(),
    prisma.brand.count({ where: { status: "ACTIVE" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brands</h1>
          <p className="text-muted-foreground">
            FMCG brands registered on the platform.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Brands</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalBrands)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Brands</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(activeBrands)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brands.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No brands found.
                </TableCell>
              </TableRow>
            ) : (
              brands.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell className="font-medium">{brand.name}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">
                    {brand.slug}
                  </TableCell>
                  <TableCell>{brand.industry ?? "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={brand.status === "ACTIVE" ? "default" : "secondary"}
                    >
                      {formatStatusLabel(brand.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(brand.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && npx tsc --noEmit 2>&1 | head -30
```

---

## Task 9: Update /admin/advertisers page

**Files:**
- Modify: `src/app/admin/advertisers/page.tsx`

- [ ] **Step 1: Replace entire file content**

```typescript
// src/app/admin/advertisers/page.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import prisma from "@/lib/prisma";
import { formatDate, formatStatusLabel, formatNumber } from "@/lib/format";

export default async function AdvertisersPage() {
  const [advertisers, totalAdvertisers, activeAdvertisers] = await Promise.all([
    prisma.advertiser.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.advertiser.count(),
    prisma.advertiser.count({ where: { status: "ACTIVE" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Advertisers</h1>
        <p className="text-muted-foreground">
          Advertiser organisations running campaigns on the platform.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Advertisers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalAdvertisers)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Advertisers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(activeAdvertisers)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Contact Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {advertisers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No advertisers found.
                </TableCell>
              </TableRow>
            ) : (
              advertisers.map((adv) => (
                <TableRow key={adv.id}>
                  <TableCell className="font-medium">{adv.name}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">
                    {adv.slug}
                  </TableCell>
                  <TableCell>{adv.industry ?? "—"}</TableCell>
                  <TableCell>{adv.contactEmail ?? "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={adv.status === "ACTIVE" ? "default" : "secondary"}
                    >
                      {formatStatusLabel(adv.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(adv.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && npx tsc --noEmit 2>&1 | head -30
```

---

## Task 10: Update /admin/products page

**Files:**
- Modify: `src/app/admin/products/page.tsx`

- [ ] **Step 1: Replace entire file content**

```typescript
// src/app/admin/products/page.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import prisma from "@/lib/prisma";
import { formatDate, formatStatusLabel, formatNumber } from "@/lib/format";

export default async function ProductsPage() {
  const [products, totalProducts, activeProducts] = await Promise.all([
    prisma.product.findMany({
      include: { brand: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.count(),
    prisma.product.count({ where: { status: "ACTIVE" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground">
          All products registered across brands on the platform.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalProducts)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(activeProducts)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Unit Label</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.brand.name}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {product.sku ?? "—"}
                  </TableCell>
                  <TableCell>{product.category ?? "—"}</TableCell>
                  <TableCell>{product.unitLabel ?? "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={product.status === "ACTIVE" ? "default" : "secondary"}
                    >
                      {formatStatusLabel(product.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(product.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && npx tsc --noEmit 2>&1 | head -30
```

---

## Task 11: Update /admin/campaigns page

**Files:**
- Modify: `src/app/admin/campaigns/page.tsx`

- [ ] **Step 1: Replace entire file content**

```typescript
// src/app/admin/campaigns/page.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import prisma from "@/lib/prisma";
import {
  formatDate,
  formatStatusLabel,
  formatCurrency,
  formatNumber,
} from "@/lib/format";

export default async function CampaignsPage() {
  const [campaigns, totalCampaigns, activeCampaigns] = await Promise.all([
    prisma.campaign.findMany({
      include: {
        brand: { select: { name: true } },
        advertiser: { select: { name: true } },
        product: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.campaign.count(),
    prisma.campaign.count({ where: { status: "ACTIVE" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
        <p className="text-muted-foreground">
          All QR advertising campaigns across brands and advertisers.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalCampaigns)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(activeCampaigns)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Advertiser</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Reward Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fixed Fee/Unit</TableHead>
              <TableHead>Engagement Fee/Scan</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No campaigns found.
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>{campaign.brand.name}</TableCell>
                  <TableCell>{campaign.advertiser.name}</TableCell>
                  <TableCell>{campaign.product?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {formatStatusLabel(campaign.rewardType)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={campaign.status === "ACTIVE" ? "default" : "secondary"}
                    >
                      {formatStatusLabel(campaign.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {campaign.fixedFeePerUnit
                      ? formatCurrency(campaign.fixedFeePerUnit.toNumber())
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {campaign.engagementFeePerScan
                      ? formatCurrency(campaign.engagementFeePerScan.toNumber())
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(campaign.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && npx tsc --noEmit 2>&1 | head -30
```

---

## Task 12: Update /admin/users page

**Files:**
- Modify: `src/app/admin/users/page.tsx`

- [ ] **Step 1: Replace entire file content**

```typescript
// src/app/admin/users/page.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import prisma from "@/lib/prisma";
import { formatDate, formatStatusLabel, formatNumber } from "@/lib/format";

export default async function UsersPage() {
  const [users, totalUsers, activeUsers, verifiedUsers] = await Promise.all([
    prisma.user.findMany({
      include: {
        brand: { select: { name: true } },
        advertiser: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isEmailVerified: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          All platform users across roles, brands, and advertisers.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalUsers)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(activeUsers)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(verifiedUsers)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Advertiser</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Email Verified</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {formatStatusLabel(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.brand?.name ?? "—"}</TableCell>
                  <TableCell>{user.advertiser?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.isEmailVerified ? "default" : "secondary"}
                    >
                      {user.isEmailVerified ? "Verified" : "Unverified"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && npx tsc --noEmit 2>&1 | head -30
```

---

## Task 13: Final validation

- [ ] **Step 1: Full TypeScript check**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && npx tsc --noEmit 2>&1
```

Expected: zero errors.

- [ ] **Step 2: Production build**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && npm run build 2>&1
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Grep for stale/invalid terms**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && grep -R "CREATOR\|EXTERNAL\|role: \"USER\"\|creatorRequest\|brandRequest\|campaignUnlock\|lessonProgress\|qr-redemption\|points\|Shopify\|imageUrl\|isTemporary\|hasPendingApproval" src/
```

Expected: no output (or output only in files unrelated to admin pages).

- [ ] **Step 4: Verify seeded data appears**

Start the dev server and visit these pages while logged in as admin@moengage.local / DemoPass123!:

| Page | Expected |
|------|---------|
| `/admin` | Real counts (1 brand, 1 active campaign, 2 advertisers, 2 products, 5 users, 3 QR codes, 3 scans, 1 reward claim, 2 delivery scans, ~$31 billing) |
| `/admin/brands` | "Mo Beverages" row with slug `mo-beverages` |
| `/admin/advertisers` | "Vodacom" and "NCBA" rows |
| `/admin/products` | "Mo Xtra 330ml Can" and "Mo Malto 330ml Can" rows |
| `/admin/campaigns` | "Vodacom Free 5GB Data Campaign" row |
| `/admin/users` | 5 seeded demo user rows |

---

## Checklist: Spec Coverage

| Spec Requirement | Task |
|-----------------|------|
| `get-current-user.ts` | Task 2 |
| `require-role.ts` | Task 3 |
| `role-redirect.ts` | Task 1 |
| Auth helpers used in admin layout | Task 4 |
| `admin-dashboard.service.ts` | Task 6 |
| `/admin` with real counts | Task 7 |
| `/admin/brands` table | Task 8 |
| `/admin/advertisers` table | Task 9 |
| `/admin/products` table | Task 10 |
| `/admin/campaigns` table | Task 11 |
| `/admin/users` table | Task 12 |
| `format.ts` helpers | Task 5 |
| Remove fake numbers | Tasks 7–12 (all replacements) |
| TypeScript + build validation | Task 13 |
| No create/edit/delete | All tasks — no forms added |
| No QR/reward/heatmap/billing impl | All tasks — only counts shown |
| shadcn Card/Badge/Table/Button | All page tasks |
| Decimal → number conversion | Tasks 6, 11 |
