# Admin Campaigns CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full ADMIN-only CRUD (create, edit, soft-archive) for Campaigns at `/admin/campaigns`, connecting Brand → Advertiser → Product into a single campaign record.

**Architecture:** Campaigns are the core business entity. Slug uniqueness is global (`@unique`). The page follows the established pattern: async server component fetches data → passes serialised rows + option lists to a client component → Sheet (right side) for create/edit → AlertDialog for archive. The campaign form has 15 fields; the product dropdown filters client-side by the selected brand. `createdById` is injected server-side from the authenticated user — never from the form. `fixedFeePerUnit` / `engagementFeePerScan` are Prisma Decimals, stored as strings in the form and converted in the service.

**Tech Stack:** Next.js 16 App Router, Prisma 7, Zod v4, react-hook-form v7, shadcn/ui (Sheet, AlertDialog, Select, Input, Textarea, Badge, Button, Table), sonner v2, lucide-react

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/lib/validators/campaign.validator.ts` | Create | Zod schema, cross-field date validation, `CampaignFormValues` type |
| `src/server/services/campaigns.service.ts` | Create | DB queries, slug uniqueness, product-brand ownership, ServiceResult |
| `src/app/admin/campaigns/actions.ts` | Create | Server actions gated by `requireRole(["ADMIN"])`, injects `createdById` |
| `src/components/forms/campaign-form.tsx` | Create | 15-field form, brand-filtered product dropdown, auto-slug |
| `src/app/admin/campaigns/campaigns-client.tsx` | Create | 4 stat cards, 13-column table, Sheet + AlertDialog |
| `src/app/admin/campaigns/page.tsx` | Modify | Replace read-only page with CRUD server component |

---

### Task 1: Campaign Validator

**Files:**
- Create: `src/lib/validators/campaign.validator.ts`

- [ ] **Step 1: Write the validator file**

```typescript
// src/lib/validators/campaign.validator.ts
import { z } from "zod";

const optionalString = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z.string().optional()
);

const optionalId = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z.string().optional()
);

const optionalDecimal = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Must be a positive number (e.g. 1.50)")
    .optional()
);

const optionalDate = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date (YYYY-MM-DD)")
    .optional()
);

export const campaignSchema = z
  .object({
    brandId: z.string().min(1, "Brand is required"),
    advertiserId: z.string().min(1, "Advertiser is required"),
    productId: optionalId,
    name: z.string().min(2, "Name must be at least 2 characters"),
    slug: z
      .string()
      .min(1, "Slug is required")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must be lowercase letters, numbers, and hyphens only"
      ),
    offerTitle: z.string().min(2, "Offer title must be at least 2 characters"),
    offerDescription: optionalString,
    rewardType: z.enum([
      "FREE_DATA",
      "AIRTIME",
      "WALLET",
      "INSURANCE",
      "VOUCHER",
      "CASHBACK",
      "OTHER",
    ]),
    status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ENDED", "ARCHIVED"]),
    startDate: optionalDate,
    endDate: optionalDate,
    fixedFeePerUnit: optionalDecimal,
    engagementFeePerScan: optionalDecimal,
    currency: z.string().min(1, "Currency is required").default("USD"),
    maxClaimsPerMobile: z.coerce
      .number()
      .int()
      .min(1, "Must be at least 1")
      .default(1),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    { message: "End date must be on or after start date", path: ["endDate"] }
  );

export type CampaignFormValues = z.infer<typeof campaignSchema>;

export function emptyStringToUndefined(
  v: string | undefined | null
): string | undefined {
  if (!v || v.trim() === "") return undefined;
  return v;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

---

### Task 2: Campaigns Service

**Files:**
- Create: `src/server/services/campaigns.service.ts`

- [ ] **Step 1: Write the service file**

```typescript
// src/server/services/campaigns.service.ts
import prisma from "@/lib/prisma";
import { RewardType, CampaignStatus } from "@prisma/client";
import { campaignSchema } from "@/lib/validators/campaign.validator";
import type { CampaignFormValues } from "@/lib/validators/campaign.validator";

function toNull(v: string | undefined | null): string | null {
  if (!v || v.trim() === "") return null;
  return v;
}

function toDecimal(v: string | undefined | null): number | null {
  if (!v || v.trim() === "") return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function toDate(v: string | undefined | null): Date | null {
  if (!v || v.trim() === "") return null;
  return new Date(v);
}

export type CampaignRow = {
  id: string;
  brandId: string;
  brandName: string;
  advertiserId: string;
  advertiserName: string;
  productId: string | null;
  productName: string | null;
  name: string;
  slug: string;
  offerTitle: string;
  offerDescription: string | null;
  rewardType: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  fixedFeePerUnit: number | null;
  engagementFeePerScan: number | null;
  currency: string;
  maxClaimsPerMobile: number;
  createdAt: string;
};

export type BrandOption = {
  id: string;
  name: string;
};

export type AdvertiserOption = {
  id: string;
  name: string;
};

export type ProductOption = {
  id: string;
  name: string;
  brandId: string;
};

export type AdminCampaignsPageData = {
  campaigns: CampaignRow[];
  brands: BrandOption[];
  advertisers: AdvertiserOption[];
  products: ProductOption[];
  totalCampaigns: number;
  activeCampaigns: number;
  draftCampaigns: number;
  archivedCampaigns: number;
};

export type ServiceResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function toCampaignRow(
  c: {
    id: string;
    brandId: string;
    advertiserId: string;
    productId: string | null;
    name: string;
    slug: string;
    offerTitle: string;
    offerDescription: string | null;
    rewardType: string;
    status: string;
    startDate: Date | null;
    endDate: Date | null;
    fixedFeePerUnit: { toNumber(): number } | null;
    engagementFeePerScan: { toNumber(): number } | null;
    currency: string;
    maxClaimsPerMobile: number;
    createdAt: Date;
    brand: { name: string };
    advertiser: { name: string };
    product: { name: string } | null;
  }
): CampaignRow {
  return {
    id: c.id,
    brandId: c.brandId,
    brandName: c.brand.name,
    advertiserId: c.advertiserId,
    advertiserName: c.advertiser.name,
    productId: c.productId,
    productName: c.product?.name ?? null,
    name: c.name,
    slug: c.slug,
    offerTitle: c.offerTitle,
    offerDescription: c.offerDescription,
    rewardType: c.rewardType,
    status: c.status,
    startDate: c.startDate ? c.startDate.toISOString() : null,
    endDate: c.endDate ? c.endDate.toISOString() : null,
    fixedFeePerUnit: c.fixedFeePerUnit ? c.fixedFeePerUnit.toNumber() : null,
    engagementFeePerScan: c.engagementFeePerScan
      ? c.engagementFeePerScan.toNumber()
      : null,
    currency: c.currency,
    maxClaimsPerMobile: c.maxClaimsPerMobile,
    createdAt: c.createdAt.toISOString(),
  };
}

const campaignInclude = {
  brand: { select: { name: true } },
  advertiser: { select: { name: true } },
  product: { select: { name: true } },
} as const;

export async function getAdminCampaignsPageData(): Promise<AdminCampaignsPageData> {
  const [
    campaigns,
    brands,
    advertisers,
    products,
    totalCampaigns,
    activeCampaigns,
    draftCampaigns,
    archivedCampaigns,
  ] = await Promise.all([
    prisma.campaign.findMany({
      include: campaignInclude,
      orderBy: { createdAt: "desc" },
    }),
    prisma.brand.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.advertiser.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, brandId: true },
      orderBy: { name: "asc" },
    }),
    prisma.campaign.count(),
    prisma.campaign.count({ where: { status: "ACTIVE" } }),
    prisma.campaign.count({ where: { status: "DRAFT" } }),
    prisma.campaign.count({ where: { status: "ARCHIVED" } }),
  ]);

  return {
    campaigns: campaigns.map(toCampaignRow),
    brands: brands.map((b) => ({ id: b.id, name: b.name })),
    advertisers: advertisers.map((a) => ({ id: a.id, name: a.name })),
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      brandId: p.brandId,
    })),
    totalCampaigns,
    activeCampaigns,
    draftCampaigns,
    archivedCampaigns,
  };
}

export async function createCampaign(
  input: CampaignFormValues,
  createdById: string
): Promise<ServiceResult<CampaignRow>> {
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const {
    brandId,
    advertiserId,
    productId,
    name,
    slug,
    offerTitle,
    offerDescription,
    rewardType,
    status,
    startDate,
    endDate,
    fixedFeePerUnit,
    engagementFeePerScan,
    currency,
    maxClaimsPerMobile,
  } = parsed.data;

  const existing = await prisma.campaign.findUnique({ where: { slug } });
  if (existing) {
    return { ok: false, error: `Slug "${slug}" is already taken` };
  }

  if (productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { brandId: true },
    });
    if (!product || product.brandId !== brandId) {
      return {
        ok: false,
        error: "Selected product does not belong to the selected brand",
      };
    }
  }

  const campaign = await prisma.campaign.create({
    data: {
      brandId,
      advertiserId,
      productId: productId ?? null,
      createdById,
      name,
      slug,
      offerTitle,
      offerDescription: toNull(offerDescription),
      rewardType: rewardType as RewardType,
      status: status as CampaignStatus,
      startDate: toDate(startDate),
      endDate: toDate(endDate),
      fixedFeePerUnit: toDecimal(fixedFeePerUnit),
      engagementFeePerScan: toDecimal(engagementFeePerScan),
      currency,
      maxClaimsPerMobile,
    },
    include: campaignInclude,
  });

  return { ok: true, data: toCampaignRow(campaign) };
}

export async function updateCampaign(
  id: string,
  input: CampaignFormValues
): Promise<ServiceResult<CampaignRow>> {
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const {
    brandId,
    advertiserId,
    productId,
    name,
    slug,
    offerTitle,
    offerDescription,
    rewardType,
    status,
    startDate,
    endDate,
    fixedFeePerUnit,
    engagementFeePerScan,
    currency,
    maxClaimsPerMobile,
  } = parsed.data;

  const slugConflict = await prisma.campaign.findFirst({
    where: { slug, NOT: { id } },
  });
  if (slugConflict) {
    return { ok: false, error: `Slug "${slug}" is already taken` };
  }

  if (productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { brandId: true },
    });
    if (!product || product.brandId !== brandId) {
      return {
        ok: false,
        error: "Selected product does not belong to the selected brand",
      };
    }
  }

  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      brandId,
      advertiserId,
      productId: productId ?? null,
      name,
      slug,
      offerTitle,
      offerDescription: toNull(offerDescription),
      rewardType: rewardType as RewardType,
      status: status as CampaignStatus,
      startDate: toDate(startDate),
      endDate: toDate(endDate),
      fixedFeePerUnit: toDecimal(fixedFeePerUnit),
      engagementFeePerScan: toDecimal(engagementFeePerScan),
      currency,
      maxClaimsPerMobile,
    },
    include: campaignInclude,
  });

  return { ok: true, data: toCampaignRow(campaign) };
}

export async function archiveCampaign(id: string): Promise<ServiceResult> {
  await prisma.campaign.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });
  return { ok: true, data: undefined };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

---

### Task 3: Server Actions

**Files:**
- Create: `src/app/admin/campaigns/actions.ts`

- [ ] **Step 1: Write the actions file**

```typescript
// src/app/admin/campaigns/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import {
  createCampaign,
  updateCampaign,
  archiveCampaign,
} from "@/server/services/campaigns.service";
import type { CampaignFormValues } from "@/lib/validators/campaign.validator";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function createCampaignAction(
  input: CampaignFormValues
): Promise<ActionResult> {
  try {
    const user = await requireRole(["ADMIN"]);
    const result = await createCampaign(input, user.id);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/campaigns");
    return { ok: true, message: "Campaign created successfully." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function updateCampaignAction(
  id: string,
  input: CampaignFormValues
): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    const result = await updateCampaign(id, input);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/campaigns");
    return { ok: true, message: "Campaign updated successfully." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function archiveCampaignAction(id: string): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    await archiveCampaign(id);
    revalidatePath("/admin/campaigns");
    return { ok: true, message: "Campaign archived." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

---

### Task 4: Campaign Form Component

**Files:**
- Create: `src/components/forms/campaign-form.tsx`

The form has 15 fields. The product dropdown filters client-side by the selected `brandId` using `useMemo`. When `brandId` changes, `productId` is reset. Dates use `<input type="date">` (returns "YYYY-MM-DD"), which the validator accepts. Decimal fields use text inputs.

- [ ] **Step 1: Write the form component**

```typescript
// src/components/forms/campaign-form.tsx
"use client";

import React, { useEffect, useRef, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { campaignSchema } from "@/lib/validators/campaign.validator";
import type { CampaignFormValues } from "@/lib/validators/campaign.validator";
import { slugify } from "@/lib/slug";
import type {
  CampaignRow,
  BrandOption,
  AdvertiserOption,
  ProductOption,
} from "@/server/services/campaigns.service";
import type { ActionResult } from "@/app/admin/campaigns/actions";

type Props = {
  initialData?: CampaignRow;
  brands: BrandOption[];
  advertisers: AdvertiserOption[];
  products: ProductOption[];
  onSubmitAction: (values: CampaignFormValues) => Promise<ActionResult>;
  onSuccess?: () => void;
};

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.split("T")[0];
}

export function CampaignForm({
  initialData,
  brands,
  advertisers,
  products,
  onSubmitAction,
  onSuccess,
}: Props) {
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(
    !!initialData?.slug
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CampaignFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(campaignSchema) as any,
    defaultValues: {
      brandId: initialData?.brandId ?? "",
      advertiserId: initialData?.advertiserId ?? "",
      productId: initialData?.productId ?? "",
      name: initialData?.name ?? "",
      slug: initialData?.slug ?? "",
      offerTitle: initialData?.offerTitle ?? "",
      offerDescription: initialData?.offerDescription ?? "",
      rewardType:
        (initialData?.rewardType as CampaignFormValues["rewardType"]) ??
        "FREE_DATA",
      status:
        (initialData?.status as CampaignFormValues["status"]) ?? "DRAFT",
      startDate: toDateInput(initialData?.startDate),
      endDate: toDateInput(initialData?.endDate),
      fixedFeePerUnit:
        initialData?.fixedFeePerUnit != null
          ? String(initialData.fixedFeePerUnit)
          : "",
      engagementFeePerScan:
        initialData?.engagementFeePerScan != null
          ? String(initialData.engagementFeePerScan)
          : "",
      currency: initialData?.currency ?? "USD",
      maxClaimsPerMobile: initialData?.maxClaimsPerMobile ?? 1,
    },
  });

  const nameValue = watch("name");
  const selectedBrandId = watch("brandId");
  const prevBrandId = useRef(initialData?.brandId ?? "");

  useEffect(() => {
    if (!slugManuallyEdited && !initialData) {
      setValue("slug", slugify(nameValue ?? ""));
    }
  }, [nameValue, slugManuallyEdited, initialData, setValue]);

  useEffect(() => {
    if (selectedBrandId !== prevBrandId.current) {
      setValue("productId", "");
      prevBrandId.current = selectedBrandId;
    }
  }, [selectedBrandId, setValue]);

  const filteredProducts = useMemo(
    () => products.filter((p) => p.brandId === selectedBrandId),
    [products, selectedBrandId]
  );

  const onSubmit = async (values: CampaignFormValues) => {
    const result = await onSubmitAction(values);
    if (result.ok) {
      toast.success(result.message);
      onSuccess?.();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-4">
      {/* Brand */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="brandId">
          Brand <span className="text-destructive">*</span>
        </label>
        <Controller
          name="brandId"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="brandId">
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.brandId && (
          <p className="text-xs text-destructive">{errors.brandId.message}</p>
        )}
      </div>

      {/* Advertiser */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="advertiserId">
          Advertiser <span className="text-destructive">*</span>
        </label>
        <Controller
          name="advertiserId"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="advertiserId">
                <SelectValue placeholder="Select advertiser" />
              </SelectTrigger>
              <SelectContent>
                {advertisers.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.advertiserId && (
          <p className="text-xs text-destructive">
            {errors.advertiserId.message}
          </p>
        )}
      </div>

      {/* Product (filtered by brand) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="productId">
          Product
        </label>
        <Controller
          name="productId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? ""}
              onValueChange={(val) =>
                field.onChange(val === "__none__" ? "" : val)
              }
              disabled={!selectedBrandId}
            >
              <SelectTrigger id="productId">
                <SelectValue
                  placeholder={
                    selectedBrandId ? "Select product (optional)" : "Select a brand first"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {filteredProducts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="name">
          Name <span className="text-destructive">*</span>
        </label>
        <Input id="name" {...register("name")} placeholder="Summer Cola Push" />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Slug */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="slug">
          Slug <span className="text-destructive">*</span>
        </label>
        <Input
          id="slug"
          {...register("slug", {
            onChange: () => setSlugManuallyEdited(true),
          })}
          placeholder="summer-cola-push"
          className="font-mono"
        />
        {errors.slug && (
          <p className="text-xs text-destructive">{errors.slug.message}</p>
        )}
      </div>

      {/* Offer Title */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="offerTitle">
          Offer Title <span className="text-destructive">*</span>
        </label>
        <Input
          id="offerTitle"
          {...register("offerTitle")}
          placeholder="Scan to win 1GB data"
        />
        {errors.offerTitle && (
          <p className="text-xs text-destructive">{errors.offerTitle.message}</p>
        )}
      </div>

      {/* Offer Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="offerDescription">
          Offer Description
        </label>
        <Textarea
          id="offerDescription"
          {...register("offerDescription")}
          placeholder="Scan the QR code on any Mo Beverages can to claim 1GB of free data."
          rows={3}
        />
      </div>

      {/* Reward Type */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="rewardType">
          Reward Type <span className="text-destructive">*</span>
        </label>
        <Controller
          name="rewardType"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="rewardType">
                <SelectValue placeholder="Select reward type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FREE_DATA">Free Data</SelectItem>
                <SelectItem value="AIRTIME">Airtime</SelectItem>
                <SelectItem value="WALLET">Wallet</SelectItem>
                <SelectItem value="INSURANCE">Insurance</SelectItem>
                <SelectItem value="VOUCHER">Voucher</SelectItem>
                <SelectItem value="CASHBACK">Cashback</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.rewardType && (
          <p className="text-xs text-destructive">{errors.rewardType.message}</p>
        )}
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="status">
          Status <span className="text-destructive">*</span>
        </label>
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
                <SelectItem value="ENDED">Ended</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.status && (
          <p className="text-xs text-destructive">{errors.status.message}</p>
        )}
      </div>

      {/* Start Date / End Date */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="startDate">
            Start Date
          </label>
          <Input id="startDate" type="date" {...register("startDate")} />
          {errors.startDate && (
            <p className="text-xs text-destructive">
              {errors.startDate.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="endDate">
            End Date
          </label>
          <Input id="endDate" type="date" {...register("endDate")} />
          {errors.endDate && (
            <p className="text-xs text-destructive">{errors.endDate.message}</p>
          )}
        </div>
      </div>

      {/* Fixed Fee / Engagement Fee */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="fixedFeePerUnit">
            Fixed Fee/Unit
          </label>
          <Input
            id="fixedFeePerUnit"
            {...register("fixedFeePerUnit")}
            placeholder="0.50"
            className="font-mono"
          />
          {errors.fixedFeePerUnit && (
            <p className="text-xs text-destructive">
              {errors.fixedFeePerUnit.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="engagementFeePerScan">
            Engagement Fee/Scan
          </label>
          <Input
            id="engagementFeePerScan"
            {...register("engagementFeePerScan")}
            placeholder="0.10"
            className="font-mono"
          />
          {errors.engagementFeePerScan && (
            <p className="text-xs text-destructive">
              {errors.engagementFeePerScan.message}
            </p>
          )}
        </div>
      </div>

      {/* Currency / Max Claims */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="currency">
            Currency <span className="text-destructive">*</span>
          </label>
          <Input
            id="currency"
            {...register("currency")}
            placeholder="USD"
            className="font-mono uppercase"
          />
          {errors.currency && (
            <p className="text-xs text-destructive">{errors.currency.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="maxClaimsPerMobile">
            Max Claims/Mobile <span className="text-destructive">*</span>
          </label>
          <Input
            id="maxClaimsPerMobile"
            type="number"
            min={1}
            {...register("maxClaimsPerMobile")}
            placeholder="1"
          />
          {errors.maxClaimsPerMobile && (
            <p className="text-xs text-destructive">
              {errors.maxClaimsPerMobile.message}
            </p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="mt-2">
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {initialData ? "Save Changes" : "Create Campaign"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

---

### Task 5: Campaigns Client Component

**Files:**
- Create: `src/app/admin/campaigns/campaigns-client.tsx`

4 stat cards (Total, Active, Draft, Archived). Table has 13 columns. Sheet pattern for create/edit. AlertDialog for archive.

- [ ] **Step 1: Write the client component**

```typescript
// src/app/admin/campaigns/campaigns-client.tsx
"use client";

import React, { useState } from "react";
import { Plus, Pencil, Archive } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CampaignForm } from "@/components/forms/campaign-form";
import {
  createCampaignAction,
  updateCampaignAction,
  archiveCampaignAction,
} from "@/app/admin/campaigns/actions";
import type {
  CampaignRow,
  BrandOption,
  AdvertiserOption,
  ProductOption,
} from "@/server/services/campaigns.service";
import type { CampaignFormValues } from "@/lib/validators/campaign.validator";
import {
  formatDate,
  formatStatusLabel,
  formatCurrency,
  formatNumber,
} from "@/lib/format";

type Props = {
  campaigns: CampaignRow[];
  brands: BrandOption[];
  advertisers: AdvertiserOption[];
  products: ProductOption[];
  totalCampaigns: number;
  activeCampaigns: number;
  draftCampaigns: number;
  archivedCampaigns: number;
};

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "ACTIVE") return "default";
  if (status === "ARCHIVED") return "destructive";
  return "secondary";
}

export function CampaignsClient({
  campaigns,
  brands,
  advertisers,
  products,
  totalCampaigns,
  activeCampaigns,
  draftCampaigns,
  archivedCampaigns,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<
    CampaignRow | undefined
  >(undefined);

  function openCreate() {
    setEditingCampaign(undefined);
    setSheetOpen(true);
  }

  function openEdit(campaign: CampaignRow) {
    setEditingCampaign(campaign);
    setSheetOpen(true);
  }

  function handleSheetSuccess() {
    setSheetOpen(false);
  }

  async function handleArchive(campaign: CampaignRow) {
    const result = await archiveCampaignAction(campaign.id);
    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error(result.error);
    }
  }

  function makeSubmitAction(campaign?: CampaignRow) {
    return (values: CampaignFormValues) =>
      campaign
        ? updateCampaignAction(campaign.id, values)
        : createCampaignAction(values);
  }

  return (
    <>
      {/* Summary Cards */}
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
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(activeCampaigns)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(draftCampaigns)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archived</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(archivedCampaigns)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Campaign
        </Button>
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
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={12}
                  className="text-center text-muted-foreground py-8"
                >
                  No campaigns found.
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>{campaign.brandName}</TableCell>
                  <TableCell>{campaign.advertiserName}</TableCell>
                  <TableCell>{campaign.productName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {formatStatusLabel(campaign.rewardType)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(campaign.status)}>
                      {formatStatusLabel(campaign.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {campaign.fixedFeePerUnit != null
                      ? formatCurrency(campaign.fixedFeePerUnit, campaign.currency)
                      : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {campaign.engagementFeePerScan != null
                      ? formatCurrency(campaign.engagementFeePerScan, campaign.currency)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(campaign.startDate)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(campaign.endDate)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(campaign.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(campaign)}
                        title="Edit campaign"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      {campaign.status !== "ARCHIVED" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Archive campaign"
                            >
                              <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="sr-only">Archive</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Archive campaign?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will set{" "}
                                <strong>{campaign.name}</strong> to Archived
                                status. No data will be deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleArchive(campaign)}
                              >
                                Archive
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {editingCampaign ? "Edit Campaign" : "Add Campaign"}
            </SheetTitle>
            <SheetDescription>
              {editingCampaign
                ? "Update campaign details below."
                : "Fill in the details to create a new campaign."}
            </SheetDescription>
          </SheetHeader>
          <CampaignForm
            key={editingCampaign?.id ?? "create"}
            initialData={editingCampaign}
            brands={brands}
            advertisers={advertisers}
            products={products}
            onSubmitAction={makeSubmitAction(editingCampaign)}
            onSuccess={handleSheetSuccess}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

---

### Task 6: Update /admin/campaigns Page

**Files:**
- Modify: `src/app/admin/campaigns/page.tsx`

Replace the existing read-only inline-query page with a server component that delegates all data fetching to `getAdminCampaignsPageData()` and renders `<CampaignsClient>`.

- [ ] **Step 1: Write the updated page**

```typescript
// src/app/admin/campaigns/page.tsx
import React from "react";
import { getAdminCampaignsPageData } from "@/server/services/campaigns.service";
import { CampaignsClient } from "@/app/admin/campaigns/campaigns-client";

export default async function CampaignsPage() {
  const {
    campaigns,
    brands,
    advertisers,
    products,
    totalCampaigns,
    activeCampaigns,
    draftCampaigns,
    archivedCampaigns,
  } = await getAdminCampaignsPageData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
        <p className="text-muted-foreground">
          All QR advertising campaigns across brands and advertisers.
        </p>
      </div>

      <CampaignsClient
        campaigns={campaigns}
        brands={brands}
        advertisers={advertisers}
        products={products}
        totalCampaigns={totalCampaigns}
        activeCampaigns={activeCampaigns}
        draftCampaigns={draftCampaigns}
        archivedCampaigns={archivedCampaigns}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

---

### Task 7: Final Validation

**Files:** No changes — validation only.

- [ ] **Step 1: Run full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: build succeeds. `/admin/campaigns` appears as a dynamic (`ƒ`) route.

- [ ] **Step 3: Run grep for out-of-scope terms**

```bash
grep -R "CREATOR\|EXTERNAL\|role: \"USER\"\|creatorRequest\|brandRequest\|campaignUnlock\|lessonProgress\|qr-redemption\|points\|Shopify\|imageUrl\|isTemporary\|hasPendingApproval" src
```

Expected: no matches.
