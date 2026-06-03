# Admin Batches CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full ADMIN-only CRUD (create, edit, soft-close) for Batches at `/admin/batches`, preparing the foundational batch structure needed before QR generation.

**Architecture:** Batches belong to a Brand + Campaign (required) and optionally a Product. `batchCode` is globally unique (`@unique`). The page follows the established Brands/Campaigns CRUD pattern: async server component → `BatchesClient` → Sheet for create/edit → AlertDialog for close. The campaign dropdown filters by selected brand; the product dropdown filters by selected brand; if the chosen campaign already has a `productId`, it is auto-populated into the product field when that field is empty. "Close" (status = CLOSED) replaces "Archive" as the terminal-state action.

**Tech Stack:** Next.js 16 App Router, Prisma 7, Zod v4, react-hook-form v7, shadcn/ui (Sheet, AlertDialog, Select, Input, Badge, Button, Table, Card), sonner v2, lucide-react

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/lib/validators/batch.validator.ts` | Create | Zod schema + `BatchFormValues` type |
| `src/server/services/batches.service.ts` | Create | DB queries, batchCode uniqueness, brand-ownership checks, ServiceResult |
| `src/app/admin/batches/actions.ts` | Create | Server actions gated by `requireRole(["ADMIN"])` |
| `src/components/forms/batch-form.tsx` | Create | 9-field form, brand-filtered campaign+product dropdowns, campaign→product auto-fill |
| `src/app/admin/batches/batches-client.tsx` | Create | 4 stat cards, 11-column table, Sheet + AlertDialog for close |
| `src/app/admin/batches/page.tsx` | Modify | Replace placeholder "use client" page with CRUD server component |

---

### Task 1: Batch Validator

**Files:**
- Create: `src/lib/validators/batch.validator.ts`

- [ ] **Step 1: Write the validator file**

```typescript
// src/lib/validators/batch.validator.ts
import { z } from "zod";

const optionalString = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z.string().optional()
);

const optionalId = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z.string().optional()
);

const optionalPositiveInt = z.preprocess(
  (v) => {
    if (v == null || (typeof v === "string" && v.trim() === "")) return undefined;
    const n = Number(v);
    return isNaN(n) ? undefined : n;
  },
  z.number().int("Must be a whole number").positive("Must be greater than 0").optional()
);

export const batchSchema = z.object({
  brandId: z.string().min(1, "Brand is required"),
  campaignId: z.string().min(1, "Campaign is required"),
  productId: optionalId,
  batchCode: z.string().min(2, "Batch code must be at least 2 characters").trim(),
  region: optionalString,
  city: optionalString,
  estimatedUnitCount: optionalPositiveInt,
  unitsPerCarton: optionalPositiveInt,
  status: z.enum(["CREATED", "ACTIVE", "DELIVERING", "DELIVERED", "CLOSED"]),
});

export type BatchFormValues = z.infer<typeof batchSchema>;

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

### Task 2: Batches Service

**Files:**
- Create: `src/server/services/batches.service.ts`

- [ ] **Step 1: Write the service file**

```typescript
// src/server/services/batches.service.ts
import prisma from "@/lib/prisma";
import { BatchStatus } from "@prisma/client";
import { batchSchema } from "@/lib/validators/batch.validator";
import type { BatchFormValues } from "@/lib/validators/batch.validator";

function toNull(v: string | undefined | null): string | null {
  if (!v || v.trim() === "") return null;
  return v;
}

function toInt(v: number | undefined | null): number | null {
  if (v == null) return null;
  return Math.floor(v);
}

export type BatchRow = {
  id: string;
  brandId: string;
  brandName: string;
  campaignId: string;
  campaignName: string;
  productId: string | null;
  productName: string | null;
  batchCode: string;
  region: string | null;
  city: string | null;
  estimatedUnitCount: number | null;
  unitsPerCarton: number | null;
  status: string;
  createdAt: string;
};

export type BrandOption = {
  id: string;
  name: string;
};

export type CampaignOption = {
  id: string;
  name: string;
  brandId: string;
  productId: string | null;
};

export type ProductOption = {
  id: string;
  name: string;
  brandId: string;
};

export type AdminBatchesPageData = {
  batches: BatchRow[];
  brands: BrandOption[];
  campaigns: CampaignOption[];
  products: ProductOption[];
  totalBatches: number;
  activeBatches: number;
  deliveringBatches: number;
  closedBatches: number;
};

export type ServiceResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function toBatchRow(b: {
  id: string;
  brandId: string;
  campaignId: string;
  productId: string | null;
  batchCode: string;
  region: string | null;
  city: string | null;
  estimatedUnitCount: number | null;
  unitsPerCarton: number | null;
  status: string;
  createdAt: Date;
  brand: { name: string };
  campaign: { name: string };
  product: { name: string } | null;
}): BatchRow {
  return {
    id: b.id,
    brandId: b.brandId,
    brandName: b.brand.name,
    campaignId: b.campaignId,
    campaignName: b.campaign.name,
    productId: b.productId,
    productName: b.product?.name ?? null,
    batchCode: b.batchCode,
    region: b.region,
    city: b.city,
    estimatedUnitCount: b.estimatedUnitCount,
    unitsPerCarton: b.unitsPerCarton,
    status: b.status,
    createdAt: b.createdAt.toISOString(),
  };
}

const batchInclude = {
  brand: { select: { name: true } },
  campaign: { select: { name: true } },
  product: { select: { name: true } },
} as const;

export async function getAdminBatchesPageData(): Promise<AdminBatchesPageData> {
  const [
    batches,
    brands,
    campaigns,
    products,
    totalBatches,
    activeBatches,
    deliveringBatches,
    closedBatches,
  ] = await Promise.all([
    prisma.batch.findMany({
      include: batchInclude,
      orderBy: { createdAt: "desc" },
    }),
    prisma.brand.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.campaign.findMany({
      where: { status: { in: ["ACTIVE", "DRAFT", "PAUSED"] } },
      select: { id: true, name: true, brandId: true, productId: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, brandId: true },
      orderBy: { name: "asc" },
    }),
    prisma.batch.count(),
    prisma.batch.count({ where: { status: "ACTIVE" } }),
    prisma.batch.count({ where: { status: "DELIVERING" } }),
    prisma.batch.count({ where: { status: "CLOSED" } }),
  ]);

  return {
    batches: batches.map(toBatchRow),
    brands: brands.map((b) => ({ id: b.id, name: b.name })),
    campaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      brandId: c.brandId,
      productId: c.productId,
    })),
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      brandId: p.brandId,
    })),
    totalBatches,
    activeBatches,
    deliveringBatches,
    closedBatches,
  };
}

export async function createBatch(
  input: BatchFormValues
): Promise<ServiceResult<BatchRow>> {
  const parsed = batchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const {
    brandId,
    campaignId,
    productId,
    batchCode,
    region,
    city,
    estimatedUnitCount,
    unitsPerCarton,
    status,
  } = parsed.data;

  const existing = await prisma.batch.findUnique({ where: { batchCode } });
  if (existing) {
    return { ok: false, error: `Batch code "${batchCode}" is already taken` };
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { brandId: true, productId: true },
  });
  if (!campaign || campaign.brandId !== brandId) {
    return {
      ok: false,
      error: "Selected campaign does not belong to the selected brand",
    };
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

  const batch = await prisma.batch.create({
    data: {
      brandId,
      campaignId,
      productId: productId ?? null,
      batchCode,
      region: toNull(region),
      city: toNull(city),
      estimatedUnitCount: toInt(estimatedUnitCount),
      unitsPerCarton: toInt(unitsPerCarton),
      status: status as BatchStatus,
    },
    include: batchInclude,
  });

  return { ok: true, data: toBatchRow(batch) };
}

export async function updateBatch(
  id: string,
  input: BatchFormValues
): Promise<ServiceResult<BatchRow>> {
  const parsed = batchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const {
    brandId,
    campaignId,
    productId,
    batchCode,
    region,
    city,
    estimatedUnitCount,
    unitsPerCarton,
    status,
  } = parsed.data;

  const codeConflict = await prisma.batch.findFirst({
    where: { batchCode, NOT: { id } },
  });
  if (codeConflict) {
    return { ok: false, error: `Batch code "${batchCode}" is already taken` };
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { brandId: true },
  });
  if (!campaign || campaign.brandId !== brandId) {
    return {
      ok: false,
      error: "Selected campaign does not belong to the selected brand",
    };
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

  const batch = await prisma.batch.update({
    where: { id },
    data: {
      brandId,
      campaignId,
      productId: productId ?? null,
      batchCode,
      region: toNull(region),
      city: toNull(city),
      estimatedUnitCount: toInt(estimatedUnitCount),
      unitsPerCarton: toInt(unitsPerCarton),
      status: status as BatchStatus,
    },
    include: batchInclude,
  });

  return { ok: true, data: toBatchRow(batch) };
}

export async function closeBatch(id: string): Promise<ServiceResult> {
  await prisma.batch.update({
    where: { id },
    data: { status: "CLOSED" },
  });
  return { ok: true, data: undefined };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

---

### Task 3: Server Actions

**Files:**
- Create: `src/app/admin/batches/actions.ts`

- [ ] **Step 1: Write the actions file**

```typescript
// src/app/admin/batches/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import {
  createBatch,
  updateBatch,
  closeBatch,
} from "@/server/services/batches.service";
import type { BatchFormValues } from "@/lib/validators/batch.validator";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function createBatchAction(
  input: BatchFormValues
): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    const result = await createBatch(input);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/batches");
    return { ok: true, message: "Batch created successfully." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function updateBatchAction(
  id: string,
  input: BatchFormValues
): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    const result = await updateBatch(id, input);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/batches");
    return { ok: true, message: "Batch updated successfully." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function closeBatchAction(id: string): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    await closeBatch(id);
    revalidatePath("/admin/batches");
    return { ok: true, message: "Batch closed." };
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

### Task 4: Batch Form Component

**Files:**
- Create: `src/components/forms/batch-form.tsx`

9 fields. Campaign dropdown filters by selected `brandId`. Product dropdown filters by selected `brandId`. When `campaignId` changes and the campaign has a `productId`, auto-populate the product field if it is currently empty. Helper text appears below `unitsPerCarton`.

- [ ] **Step 1: Write the form component**

```typescript
// src/components/forms/batch-form.tsx
"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { batchSchema } from "@/lib/validators/batch.validator";
import type { BatchFormValues } from "@/lib/validators/batch.validator";
import type {
  BatchRow,
  BrandOption,
  CampaignOption,
  ProductOption,
} from "@/server/services/batches.service";
import type { ActionResult } from "@/app/admin/batches/actions";

type Props = {
  initialData?: BatchRow;
  brands: BrandOption[];
  campaigns: CampaignOption[];
  products: ProductOption[];
  onSubmitAction: (values: BatchFormValues) => Promise<ActionResult>;
  onSuccess?: () => void;
};

export function BatchForm({
  initialData,
  brands,
  campaigns,
  products,
  onSubmitAction,
  onSuccess,
}: Props) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BatchFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(batchSchema) as any,
    defaultValues: {
      brandId: initialData?.brandId ?? "",
      campaignId: initialData?.campaignId ?? "",
      productId: initialData?.productId ?? "",
      batchCode: initialData?.batchCode ?? "",
      region: initialData?.region ?? "",
      city: initialData?.city ?? "",
      estimatedUnitCount: initialData?.estimatedUnitCount ?? undefined,
      unitsPerCarton: initialData?.unitsPerCarton ?? undefined,
      status:
        (initialData?.status as BatchFormValues["status"]) ?? "CREATED",
    },
  });

  const selectedBrandId = watch("brandId");
  const selectedCampaignId = watch("campaignId");
  const selectedProductId = watch("productId");
  const prevBrandId = useRef(initialData?.brandId ?? "");
  const prevCampaignId = useRef(initialData?.campaignId ?? "");

  // Reset campaign + product when brand changes
  useEffect(() => {
    if (selectedBrandId !== prevBrandId.current) {
      setValue("campaignId", "");
      setValue("productId", "");
      prevBrandId.current = selectedBrandId;
    }
  }, [selectedBrandId, setValue]);

  // Auto-fill product from campaign when campaign changes
  useEffect(() => {
    if (selectedCampaignId !== prevCampaignId.current) {
      const campaign = campaigns.find((c) => c.id === selectedCampaignId);
      if (campaign?.productId && !selectedProductId) {
        setValue("productId", campaign.productId);
      }
      prevCampaignId.current = selectedCampaignId;
    }
  }, [selectedCampaignId, campaigns, selectedProductId, setValue]);

  const filteredCampaigns = useMemo(
    () => campaigns.filter((c) => c.brandId === selectedBrandId),
    [campaigns, selectedBrandId]
  );

  const filteredProducts = useMemo(
    () => products.filter((p) => p.brandId === selectedBrandId),
    [products, selectedBrandId]
  );

  const onSubmit = async (values: BatchFormValues) => {
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

      {/* Campaign (filtered by brand) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="campaignId">
          Campaign <span className="text-destructive">*</span>
        </label>
        <Controller
          name="campaignId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={!selectedBrandId}
            >
              <SelectTrigger id="campaignId">
                <SelectValue
                  placeholder={
                    selectedBrandId
                      ? "Select campaign"
                      : "Select a brand first"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {filteredCampaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.campaignId && (
          <p className="text-xs text-destructive">
            {errors.campaignId.message}
          </p>
        )}
      </div>

      {/* Product (filtered by brand, optional) */}
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
                    selectedBrandId
                      ? "Select product (optional)"
                      : "Select a brand first"
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

      {/* Batch Code */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="batchCode">
          Batch Code <span className="text-destructive">*</span>
        </label>
        <Input
          id="batchCode"
          {...register("batchCode")}
          placeholder="BATCH-2024-001"
          className="font-mono"
        />
        {errors.batchCode && (
          <p className="text-xs text-destructive">{errors.batchCode.message}</p>
        )}
      </div>

      {/* Region / City */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="region">
            Region
          </label>
          <Input id="region" {...register("region")} placeholder="Lagos" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="city">
            City
          </label>
          <Input id="city" {...register("city")} placeholder="Ikeja" />
        </div>
      </div>

      {/* Estimated Unit Count / Units Per Carton */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="estimatedUnitCount">
            Estimated Units
          </label>
          <Input
            id="estimatedUnitCount"
            type="number"
            min={1}
            {...register("estimatedUnitCount")}
            placeholder="5000"
          />
          {errors.estimatedUnitCount && (
            <p className="text-xs text-destructive">
              {errors.estimatedUnitCount.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="unitsPerCarton">
            Units Per Carton
          </label>
          <Input
            id="unitsPerCarton"
            type="number"
            min={1}
            {...register("unitsPerCarton")}
            placeholder="24"
          />
          {errors.unitsPerCarton && (
            <p className="text-xs text-destructive">
              {errors.unitsPerCarton.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Used later to calculate delivered units from carton count.
          </p>
        </div>
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
                <SelectItem value="CREATED">Created</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="DELIVERING">Delivering</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.status && (
          <p className="text-xs text-destructive">{errors.status.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="mt-2">
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {initialData ? "Save Changes" : "Create Batch"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

---

### Task 5: Batches Client Component

**Files:**
- Create: `src/app/admin/batches/batches-client.tsx`

4 stat cards (Total, Active, Delivering, Closed). 11-column table. Sheet for create/edit. AlertDialog for close (sets status = CLOSED, button only shown for non-CLOSED batches).

- [ ] **Step 1: Write the client component**

```typescript
// src/app/admin/batches/batches-client.tsx
"use client";

import React, { useState } from "react";
import { Plus, Pencil, XCircle } from "lucide-react";
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
import { BatchForm } from "@/components/forms/batch-form";
import {
  createBatchAction,
  updateBatchAction,
  closeBatchAction,
} from "@/app/admin/batches/actions";
import type {
  BatchRow,
  BrandOption,
  CampaignOption,
  ProductOption,
} from "@/server/services/batches.service";
import type { BatchFormValues } from "@/lib/validators/batch.validator";
import { formatDate, formatStatusLabel, formatNumber } from "@/lib/format";

type Props = {
  batches: BatchRow[];
  brands: BrandOption[];
  campaigns: CampaignOption[];
  products: ProductOption[];
  totalBatches: number;
  activeBatches: number;
  deliveringBatches: number;
  closedBatches: number;
};

function batchStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "ACTIVE") return "default";
  if (status === "DELIVERING") return "outline";
  if (status === "CLOSED") return "destructive";
  return "secondary";
}

export function BatchesClient({
  batches,
  brands,
  campaigns,
  products,
  totalBatches,
  activeBatches,
  deliveringBatches,
  closedBatches,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchRow | undefined>(
    undefined
  );

  function openCreate() {
    setEditingBatch(undefined);
    setSheetOpen(true);
  }

  function openEdit(batch: BatchRow) {
    setEditingBatch(batch);
    setSheetOpen(true);
  }

  function handleSheetSuccess() {
    setSheetOpen(false);
  }

  async function handleClose(batch: BatchRow) {
    const result = await closeBatchAction(batch.id);
    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error(result.error);
    }
  }

  function makeSubmitAction(batch?: BatchRow) {
    return (values: BatchFormValues) =>
      batch
        ? updateBatchAction(batch.id, values)
        : createBatchAction(values);
  }

  return (
    <>
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalBatches)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(activeBatches)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivering</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(deliveringBatches)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(closedBatches)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Batch
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch Code</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Est. Units</TableHead>
              <TableHead>Units/Carton</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={11}
                  className="text-center text-muted-foreground py-8"
                >
                  No batches found.
                </TableCell>
              </TableRow>
            ) : (
              batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-mono font-medium text-sm">
                    {batch.batchCode}
                  </TableCell>
                  <TableCell>{batch.brandName}</TableCell>
                  <TableCell>{batch.campaignName}</TableCell>
                  <TableCell>{batch.productName ?? "—"}</TableCell>
                  <TableCell>{batch.region ?? "—"}</TableCell>
                  <TableCell>{batch.city ?? "—"}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {batch.estimatedUnitCount != null
                      ? formatNumber(batch.estimatedUnitCount)
                      : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {batch.unitsPerCarton != null
                      ? formatNumber(batch.unitsPerCarton)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={batchStatusVariant(batch.status)}>
                      {formatStatusLabel(batch.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(batch.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(batch)}
                        title="Edit batch"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      {batch.status !== "CLOSED" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Close batch"
                            >
                              <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="sr-only">Close</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Close batch?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will set{" "}
                                <strong>{batch.batchCode}</strong> to Closed
                                status. No data will be deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleClose(batch)}
                              >
                                Close Batch
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
        <SheetContent
          side="right"
          className="overflow-y-auto w-full sm:max-w-lg"
        >
          <SheetHeader>
            <SheetTitle>
              {editingBatch ? "Edit Batch" : "Add Batch"}
            </SheetTitle>
            <SheetDescription>
              {editingBatch
                ? "Update batch details below."
                : "Fill in the details to create a new batch."}
            </SheetDescription>
          </SheetHeader>
          <BatchForm
            key={editingBatch?.id ?? "create"}
            initialData={editingBatch}
            brands={brands}
            campaigns={campaigns}
            products={products}
            onSubmitAction={makeSubmitAction(editingBatch)}
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
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

---

### Task 6: Update /admin/batches Page

**Files:**
- Modify: `src/app/admin/batches/page.tsx`

Replace the existing placeholder `"use client"` page (has hardcoded fake data) with an async server component that calls `getAdminBatchesPageData()` and renders `<BatchesClient>`.

- [ ] **Step 1: Write the updated page**

```typescript
// src/app/admin/batches/page.tsx
import React from "react";
import { getAdminBatchesPageData } from "@/server/services/batches.service";
import { BatchesClient } from "@/app/admin/batches/batches-client";

export default async function BatchesPage() {
  const {
    batches,
    brands,
    campaigns,
    products,
    totalBatches,
    activeBatches,
    deliveringBatches,
    closedBatches,
  } = await getAdminBatchesPageData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Batches</h1>
        <p className="text-muted-foreground">
          Product batches assigned to campaigns, ready for QR code printing.
        </p>
      </div>

      <BatchesClient
        batches={batches}
        brands={brands}
        campaigns={campaigns}
        products={products}
        totalBatches={totalBatches}
        activeBatches={activeBatches}
        deliveringBatches={deliveringBatches}
        closedBatches={closedBatches}
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

Expected: build succeeds. `/admin/batches` appears as a dynamic (`ƒ`) route.

- [ ] **Step 3: Run grep for out-of-scope terms**

```bash
grep -R "CREATOR\|EXTERNAL\|role: \"USER\"\|creatorRequest\|brandRequest\|campaignUnlock\|lessonProgress\|qr-redemption\|points\|Shopify\|imageUrl\|isTemporary\|hasPendingApproval" src
```

Expected: no matches.
