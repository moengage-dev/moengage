# Admin Brands & Advertisers CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full ADMIN-only CRUD (create, edit, soft-archive) for Brands and Advertisers using server actions, Zod validation, and shadcn Sheet + AlertDialog — no hard delete, no new packages.

**Architecture:** Pages remain async server components; they fetch data via service functions and pass serialized rows to a client component that owns all interactive state (sheet open/close, selected row). Form components use `react-hook-form` + `@hookform/resolvers/zod`. Server actions enforce role, call services, then `revalidatePath`. Archived rows stay in the DB and are clearly badged in the table.

**Tech Stack:** Next.js 16 App Router, Prisma 7, NextAuth 4, Zod 4, react-hook-form 7, @hookform/resolvers, shadcn Sheet + AlertDialog + Select + Input + Label + Badge + Button + Card + Table, sonner (toast), TypeScript 5.

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `src/lib/slug.ts` | `slugify()` helper |
| Create | `src/lib/validators/brand.validator.ts` | Zod schema + inferred type |
| Create | `src/lib/validators/advertiser.validator.ts` | Zod schema + inferred type |
| Create | `src/server/services/brands.service.ts` | Prisma queries: list, create, update, archive |
| Create | `src/server/services/advertisers.service.ts` | Prisma queries: list, create, update, archive |
| Create | `src/app/admin/brands/actions.ts` | Next.js server actions (role-gated) |
| Create | `src/app/admin/advertisers/actions.ts` | Next.js server actions (role-gated) |
| Create | `src/components/forms/brand-form.tsx` | react-hook-form create/edit form (client) |
| Create | `src/components/forms/advertiser-form.tsx` | react-hook-form create/edit form (client) |
| Create | `src/app/admin/brands/brands-client.tsx` | Table + Sheet + Archive dialog (client) |
| Create | `src/app/admin/advertisers/advertisers-client.tsx` | Table + Sheet + Archive dialog (client) |
| Modify | `src/app/admin/brands/page.tsx` | Server component calling service + rendering client |
| Modify | `src/app/admin/advertisers/page.tsx` | Server component calling service + rendering client |

---

## Task 1: Slug helper

**Files:**
- Create: `src/lib/slug.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/slug.ts
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

---

## Task 2: Brand Zod validator

**Files:**
- Create: `src/lib/validators/brand.validator.ts`

- [ ] **Step 1: Create validators directory and file**

```bash
mkdir -p /Users/sumedh/Documents/PersonalProjects/moengage/src/lib/validators
```

- [ ] **Step 2: Write the validator**

```typescript
// src/lib/validators/brand.validator.ts
import { z } from "zod";

const optionalUrl = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.string().url("Must be a valid URL").optional()
);

export const brandSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase letters, numbers, and hyphens only"
    ),
  industry: z.string().optional(),
  websiteUrl: optionalUrl,
  logoUrl: optionalUrl,
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]),
});

export type BrandFormValues = z.infer<typeof brandSchema>;

export function emptyStringToUndefined(v: string | undefined | null): string | undefined {
  if (!v || v.trim() === "") return undefined;
  return v;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && npx tsc --noEmit 2>&1 | head -20
```

---

## Task 3: Advertiser Zod validator

**Files:**
- Create: `src/lib/validators/advertiser.validator.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/validators/advertiser.validator.ts
import { z } from "zod";

const optionalUrl = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.string().url("Must be a valid URL").optional()
);

const optionalEmail = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.string().email("Must be a valid email").optional()
);

export const advertiserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase letters, numbers, and hyphens only"
    ),
  industry: z.string().optional(),
  websiteUrl: optionalUrl,
  logoUrl: optionalUrl,
  contactName: z.string().optional(),
  contactEmail: optionalEmail,
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]),
});

export type AdvertiserFormValues = z.infer<typeof advertiserSchema>;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && npx tsc --noEmit 2>&1 | head -20
```

---

## Task 4: Brands service

**Files:**
- Create: `src/server/services/brands.service.ts`

> `getAdminBrandsPageData` returns a serializable object (dates as ISO strings) safe to pass from server to client components as props.

- [ ] **Step 1: Create the file**

```typescript
// src/server/services/brands.service.ts
import prisma from "@/lib/prisma";
import { brandSchema } from "@/lib/validators/brand.validator";
import type { BrandFormValues } from "@/lib/validators/brand.validator";

function toNull(v: string | undefined | null): string | null {
  if (!v || v.trim() === "") return null;
  return v;
}

export type BrandRow = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  createdAt: string;
};

export type AdminBrandsPageData = {
  brands: BrandRow[];
  totalBrands: number;
  activeBrands: number;
};

export async function getAdminBrandsPageData(): Promise<AdminBrandsPageData> {
  const [brands, totalBrands, activeBrands] = await Promise.all([
    prisma.brand.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.brand.count(),
    prisma.brand.count({ where: { status: "ACTIVE" } }),
  ]);

  return {
    brands: brands.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      industry: b.industry,
      websiteUrl: b.websiteUrl,
      logoUrl: b.logoUrl,
      status: b.status as "ACTIVE" | "PAUSED" | "ARCHIVED",
      createdAt: b.createdAt.toISOString(),
    })),
    totalBrands,
    activeBrands,
  };
}

export type ServiceResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function createBrand(
  input: BrandFormValues
): Promise<ServiceResult<BrandRow>> {
  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, slug, industry, websiteUrl, logoUrl, status } = parsed.data;

  const existing = await prisma.brand.findUnique({ where: { slug } });
  if (existing) {
    return { ok: false, error: `Slug "${slug}" is already taken` };
  }

  const brand = await prisma.brand.create({
    data: {
      name,
      slug,
      industry: toNull(industry),
      websiteUrl: toNull(websiteUrl),
      logoUrl: toNull(logoUrl),
      status,
    },
  });

  return {
    ok: true,
    data: {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      industry: brand.industry,
      websiteUrl: brand.websiteUrl,
      logoUrl: brand.logoUrl,
      status: brand.status as "ACTIVE" | "PAUSED" | "ARCHIVED",
      createdAt: brand.createdAt.toISOString(),
    },
  };
}

export async function updateBrand(
  id: string,
  input: BrandFormValues
): Promise<ServiceResult<BrandRow>> {
  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, slug, industry, websiteUrl, logoUrl, status } = parsed.data;

  const slugConflict = await prisma.brand.findFirst({
    where: { slug, NOT: { id } },
  });
  if (slugConflict) {
    return { ok: false, error: `Slug "${slug}" is already taken` };
  }

  const brand = await prisma.brand.update({
    where: { id },
    data: {
      name,
      slug,
      industry: toNull(industry),
      websiteUrl: toNull(websiteUrl),
      logoUrl: toNull(logoUrl),
      status,
    },
  });

  return {
    ok: true,
    data: {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      industry: brand.industry,
      websiteUrl: brand.websiteUrl,
      logoUrl: brand.logoUrl,
      status: brand.status as "ACTIVE" | "PAUSED" | "ARCHIVED",
      createdAt: brand.createdAt.toISOString(),
    },
  };
}

export async function archiveBrand(id: string): Promise<ServiceResult> {
  await prisma.brand.update({ where: { id }, data: { status: "ARCHIVED" } });
  return { ok: true, data: undefined };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && npx tsc --noEmit 2>&1 | head -20
```

---

## Task 5: Advertisers service

**Files:**
- Create: `src/server/services/advertisers.service.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/server/services/advertisers.service.ts
import prisma from "@/lib/prisma";
import { advertiserSchema } from "@/lib/validators/advertiser.validator";
import type { AdvertiserFormValues } from "@/lib/validators/advertiser.validator";

function toNull(v: string | undefined | null): string | null {
  if (!v || v.trim() === "") return null;
  return v;
}

export type AdvertiserRow = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  contactName: string | null;
  contactEmail: string | null;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  createdAt: string;
};

export type AdminAdvertisersPageData = {
  advertisers: AdvertiserRow[];
  totalAdvertisers: number;
  activeAdvertisers: number;
};

export async function getAdminAdvertisersPageData(): Promise<AdminAdvertisersPageData> {
  const [advertisers, totalAdvertisers, activeAdvertisers] = await Promise.all([
    prisma.advertiser.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.advertiser.count(),
    prisma.advertiser.count({ where: { status: "ACTIVE" } }),
  ]);

  return {
    advertisers: advertisers.map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      industry: a.industry,
      websiteUrl: a.websiteUrl,
      logoUrl: a.logoUrl,
      contactName: a.contactName,
      contactEmail: a.contactEmail,
      status: a.status as "ACTIVE" | "PAUSED" | "ARCHIVED",
      createdAt: a.createdAt.toISOString(),
    })),
    totalAdvertisers,
    activeAdvertisers,
  };
}

export type ServiceResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function createAdvertiser(
  input: AdvertiserFormValues
): Promise<ServiceResult<AdvertiserRow>> {
  const parsed = advertiserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, slug, industry, websiteUrl, logoUrl, contactName, contactEmail, status } =
    parsed.data;

  const existing = await prisma.advertiser.findUnique({ where: { slug } });
  if (existing) {
    return { ok: false, error: `Slug "${slug}" is already taken` };
  }

  const advertiser = await prisma.advertiser.create({
    data: {
      name,
      slug,
      industry: toNull(industry),
      websiteUrl: toNull(websiteUrl),
      logoUrl: toNull(logoUrl),
      contactName: toNull(contactName),
      contactEmail: toNull(contactEmail),
      status,
    },
  });

  return {
    ok: true,
    data: {
      id: advertiser.id,
      name: advertiser.name,
      slug: advertiser.slug,
      industry: advertiser.industry,
      websiteUrl: advertiser.websiteUrl,
      logoUrl: advertiser.logoUrl,
      contactName: advertiser.contactName,
      contactEmail: advertiser.contactEmail,
      status: advertiser.status as "ACTIVE" | "PAUSED" | "ARCHIVED",
      createdAt: advertiser.createdAt.toISOString(),
    },
  };
}

export async function updateAdvertiser(
  id: string,
  input: AdvertiserFormValues
): Promise<ServiceResult<AdvertiserRow>> {
  const parsed = advertiserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, slug, industry, websiteUrl, logoUrl, contactName, contactEmail, status } =
    parsed.data;

  const slugConflict = await prisma.advertiser.findFirst({
    where: { slug, NOT: { id } },
  });
  if (slugConflict) {
    return { ok: false, error: `Slug "${slug}" is already taken` };
  }

  const advertiser = await prisma.advertiser.update({
    where: { id },
    data: {
      name,
      slug,
      industry: toNull(industry),
      websiteUrl: toNull(websiteUrl),
      logoUrl: toNull(logoUrl),
      contactName: toNull(contactName),
      contactEmail: toNull(contactEmail),
      status,
    },
  });

  return {
    ok: true,
    data: {
      id: advertiser.id,
      name: advertiser.name,
      slug: advertiser.slug,
      industry: advertiser.industry,
      websiteUrl: advertiser.websiteUrl,
      logoUrl: advertiser.logoUrl,
      contactName: advertiser.contactName,
      contactEmail: advertiser.contactEmail,
      status: advertiser.status as "ACTIVE" | "PAUSED" | "ARCHIVED",
      createdAt: advertiser.createdAt.toISOString(),
    },
  };
}

export async function archiveAdvertiser(id: string): Promise<ServiceResult> {
  await prisma.advertiser.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });
  return { ok: true, data: undefined };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && npx tsc --noEmit 2>&1 | head -20
```

---

## Task 6: Brands server actions

**Files:**
- Create: `src/app/admin/brands/actions.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/app/admin/brands/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import {
  createBrand,
  updateBrand,
  archiveBrand,
} from "@/server/services/brands.service";
import type { BrandFormValues } from "@/lib/validators/brand.validator";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function createBrandAction(
  input: BrandFormValues
): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    const result = await createBrand(input);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/brands");
    return { ok: true, message: "Brand created successfully." };
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function updateBrandAction(
  id: string,
  input: BrandFormValues
): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    const result = await updateBrand(id, input);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/brands");
    return { ok: true, message: "Brand updated successfully." };
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function archiveBrandAction(id: string): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    await archiveBrand(id);
    revalidatePath("/admin/brands");
    return { ok: true, message: "Brand archived." };
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && npx tsc --noEmit 2>&1 | head -20
```

---

## Task 7: Advertisers server actions

**Files:**
- Create: `src/app/admin/advertisers/actions.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/app/admin/advertisers/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import {
  createAdvertiser,
  updateAdvertiser,
  archiveAdvertiser,
} from "@/server/services/advertisers.service";
import type { AdvertiserFormValues } from "@/lib/validators/advertiser.validator";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function createAdvertiserAction(
  input: AdvertiserFormValues
): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    const result = await createAdvertiser(input);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/advertisers");
    return { ok: true, message: "Advertiser created successfully." };
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function updateAdvertiserAction(
  id: string,
  input: AdvertiserFormValues
): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    const result = await updateAdvertiser(id, input);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/advertisers");
    return { ok: true, message: "Advertiser updated successfully." };
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function archiveAdvertiserAction(
  id: string
): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    await archiveAdvertiser(id);
    revalidatePath("/admin/advertisers");
    return { ok: true, message: "Advertiser archived." };
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && npx tsc --noEmit 2>&1 | head -20
```

---

## Task 8: BrandForm component

**Files:**
- Create: `src/components/forms/brand-form.tsx`

> Uses react-hook-form + zod. `initialData` is undefined in create mode. `onSuccess` is called after successful submit so the parent can close the sheet. `slugify` auto-fills slug from name if the user hasn't manually edited slug.

- [ ] **Step 1: Create the forms directory and file**

```bash
mkdir -p /Users/sumedh/Documents/PersonalProjects/moengage/src/components/forms
```

- [ ] **Step 2: Write the component**

```typescript
// src/components/forms/brand-form.tsx
"use client";

import React, { useEffect, useState } from "react";
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
import { brandSchema } from "@/lib/validators/brand.validator";
import type { BrandFormValues } from "@/lib/validators/brand.validator";
import { slugify } from "@/lib/slug";
import type { BrandRow } from "@/server/services/brands.service";
import type { ActionResult } from "@/app/admin/brands/actions";

type Props = {
  initialData?: BrandRow;
  onSubmitAction: (values: BrandFormValues) => Promise<ActionResult>;
  onSuccess?: () => void;
};

export function BrandForm({ initialData, onSubmitAction, onSuccess }: Props) {
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
  } = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      slug: initialData?.slug ?? "",
      industry: initialData?.industry ?? "",
      websiteUrl: initialData?.websiteUrl ?? "",
      logoUrl: initialData?.logoUrl ?? "",
      status: (initialData?.status as BrandFormValues["status"]) ?? "ACTIVE",
    },
  });

  const nameValue = watch("name");

  useEffect(() => {
    if (!slugManuallyEdited && !initialData) {
      setValue("slug", slugify(nameValue ?? ""));
    }
  }, [nameValue, slugManuallyEdited, initialData, setValue]);

  const onSubmit = async (values: BrandFormValues) => {
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
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="name">
          Name <span className="text-destructive">*</span>
        </label>
        <Input id="name" {...register("name")} placeholder="Mo Beverages" />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="slug">
          Slug <span className="text-destructive">*</span>
        </label>
        <Input
          id="slug"
          {...register("slug", {
            onChange: () => setSlugManuallyEdited(true),
          })}
          placeholder="mo-beverages"
          className="font-mono"
        />
        {errors.slug && (
          <p className="text-xs text-destructive">{errors.slug.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="industry">
          Industry
        </label>
        <Input
          id="industry"
          {...register("industry")}
          placeholder="FMCG Beverages"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="websiteUrl">
          Website URL
        </label>
        <Input
          id="websiteUrl"
          {...register("websiteUrl")}
          placeholder="https://example.com"
        />
        {errors.websiteUrl && (
          <p className="text-xs text-destructive">{errors.websiteUrl.message}</p>
        )}
      </div>

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
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
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
        {initialData ? "Save Changes" : "Create Brand"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && npx tsc --noEmit 2>&1 | head -20
```

---

## Task 9: AdvertiserForm component

**Files:**
- Create: `src/components/forms/advertiser-form.tsx`

- [ ] **Step 1: Write the component**

```typescript
// src/components/forms/advertiser-form.tsx
"use client";

import React, { useEffect, useState } from "react";
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
import { advertiserSchema } from "@/lib/validators/advertiser.validator";
import type { AdvertiserFormValues } from "@/lib/validators/advertiser.validator";
import { slugify } from "@/lib/slug";
import type { AdvertiserRow } from "@/server/services/advertisers.service";
import type { ActionResult } from "@/app/admin/advertisers/actions";

type Props = {
  initialData?: AdvertiserRow;
  onSubmitAction: (values: AdvertiserFormValues) => Promise<ActionResult>;
  onSuccess?: () => void;
};

export function AdvertiserForm({
  initialData,
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
  } = useForm<AdvertiserFormValues>({
    resolver: zodResolver(advertiserSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      slug: initialData?.slug ?? "",
      industry: initialData?.industry ?? "",
      websiteUrl: initialData?.websiteUrl ?? "",
      logoUrl: initialData?.logoUrl ?? "",
      contactName: initialData?.contactName ?? "",
      contactEmail: initialData?.contactEmail ?? "",
      status:
        (initialData?.status as AdvertiserFormValues["status"]) ?? "ACTIVE",
    },
  });

  const nameValue = watch("name");

  useEffect(() => {
    if (!slugManuallyEdited && !initialData) {
      setValue("slug", slugify(nameValue ?? ""));
    }
  }, [nameValue, slugManuallyEdited, initialData, setValue]);

  const onSubmit = async (values: AdvertiserFormValues) => {
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
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="adv-name">
          Name <span className="text-destructive">*</span>
        </label>
        <Input id="adv-name" {...register("name")} placeholder="Vodacom" />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="adv-slug">
          Slug <span className="text-destructive">*</span>
        </label>
        <Input
          id="adv-slug"
          {...register("slug", {
            onChange: () => setSlugManuallyEdited(true),
          })}
          placeholder="vodacom"
          className="font-mono"
        />
        {errors.slug && (
          <p className="text-xs text-destructive">{errors.slug.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="adv-industry">
          Industry
        </label>
        <Input
          id="adv-industry"
          {...register("industry")}
          placeholder="Telecom"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="adv-contactName">
          Contact Name
        </label>
        <Input
          id="adv-contactName"
          {...register("contactName")}
          placeholder="John Doe"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="adv-contactEmail">
          Contact Email
        </label>
        <Input
          id="adv-contactEmail"
          {...register("contactEmail")}
          placeholder="partner@vodacom.com"
          type="email"
        />
        {errors.contactEmail && (
          <p className="text-xs text-destructive">
            {errors.contactEmail.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="adv-websiteUrl">
          Website URL
        </label>
        <Input
          id="adv-websiteUrl"
          {...register("websiteUrl")}
          placeholder="https://vodacom.com"
        />
        {errors.websiteUrl && (
          <p className="text-xs text-destructive">{errors.websiteUrl.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="adv-status">
          Status <span className="text-destructive">*</span>
        </label>
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="adv-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
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
        {initialData ? "Save Changes" : "Create Advertiser"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && npx tsc --noEmit 2>&1 | head -20
```

---

## Task 10: BrandsClient component

**Files:**
- Create: `src/app/admin/brands/brands-client.tsx`

> This client component owns all interactive state. It receives serialized `BrandRow[]` from the server page. The Sheet is controlled (open/close via state) — opening for create passes `undefined` initialData; opening for edit passes the selected brand row. Archive uses AlertDialog for confirmation.

- [ ] **Step 1: Create the file**

```typescript
// src/app/admin/brands/brands-client.tsx
"use client";

import React, { useState } from "react";
import { Plus, Pencil, Archive } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { BrandForm } from "@/components/forms/brand-form";
import {
  createBrandAction,
  updateBrandAction,
  archiveBrandAction,
} from "@/app/admin/brands/actions";
import type { BrandRow } from "@/server/services/brands.service";
import type { BrandFormValues } from "@/lib/validators/brand.validator";
import { formatDate, formatStatusLabel } from "@/lib/format";

type Props = {
  brands: BrandRow[];
};

export function BrandsClient({ brands }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandRow | undefined>(
    undefined
  );

  function openCreate() {
    setEditingBrand(undefined);
    setSheetOpen(true);
  }

  function openEdit(brand: BrandRow) {
    setEditingBrand(brand);
    setSheetOpen(true);
  }

  function handleSheetSuccess() {
    setSheetOpen(false);
  }

  async function handleArchive(brand: BrandRow) {
    const result = await archiveBrandAction(brand.id);
    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error(result.error);
    }
  }

  function makeSubmitAction(brand?: BrandRow) {
    return (values: BrandFormValues) =>
      brand ? updateBrandAction(brand.id, values) : createBrandAction(values);
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Brand
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brands.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                >
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
                    {brand.websiteUrl ? (
                      <a
                        href={brand.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm underline underline-offset-2 text-muted-foreground hover:text-foreground"
                      >
                        Link
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        brand.status === "ACTIVE"
                          ? "default"
                          : brand.status === "ARCHIVED"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {formatStatusLabel(brand.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(brand.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(brand)}
                        title="Edit brand"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      {brand.status !== "ARCHIVED" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Archive brand"
                            >
                              <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="sr-only">Archive</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Archive brand?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will set <strong>{brand.name}</strong> to
                                Archived status. No data will be deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleArchive(brand)}
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
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingBrand ? "Edit Brand" : "Add Brand"}
            </SheetTitle>
            <SheetDescription>
              {editingBrand
                ? "Update brand details below."
                : "Fill in the details to create a new brand."}
            </SheetDescription>
          </SheetHeader>
          <BrandForm
            key={editingBrand?.id ?? "create"}
            initialData={editingBrand}
            onSubmitAction={makeSubmitAction(editingBrand)}
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
cd /Users/sumedh/Documents/PersonalProjects/moengage && npx tsc --noEmit 2>&1 | head -20
```

---

## Task 11: AdvertisersClient component

**Files:**
- Create: `src/app/admin/advertisers/advertisers-client.tsx`

- [ ] **Step 1: Create the file**

```typescript
// src/app/admin/advertisers/advertisers-client.tsx
"use client";

import React, { useState } from "react";
import { Plus, Pencil, Archive } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { AdvertiserForm } from "@/components/forms/advertiser-form";
import {
  createAdvertiserAction,
  updateAdvertiserAction,
  archiveAdvertiserAction,
} from "@/app/admin/advertisers/actions";
import type { AdvertiserRow } from "@/server/services/advertisers.service";
import type { AdvertiserFormValues } from "@/lib/validators/advertiser.validator";
import { formatDate, formatStatusLabel } from "@/lib/format";

type Props = {
  advertisers: AdvertiserRow[];
};

export function AdvertisersClient({ advertisers }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAdvertiser, setEditingAdvertiser] = useState<
    AdvertiserRow | undefined
  >(undefined);

  function openCreate() {
    setEditingAdvertiser(undefined);
    setSheetOpen(true);
  }

  function openEdit(advertiser: AdvertiserRow) {
    setEditingAdvertiser(advertiser);
    setSheetOpen(true);
  }

  function handleSheetSuccess() {
    setSheetOpen(false);
  }

  async function handleArchive(advertiser: AdvertiserRow) {
    const result = await archiveAdvertiserAction(advertiser.id);
    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error(result.error);
    }
  }

  function makeSubmitAction(advertiser?: AdvertiserRow) {
    return (values: AdvertiserFormValues) =>
      advertiser
        ? updateAdvertiserAction(advertiser.id, values)
        : createAdvertiserAction(values);
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Advertiser
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Contact Name</TableHead>
              <TableHead>Contact Email</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {advertisers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-muted-foreground py-8"
                >
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
                  <TableCell>{adv.contactName ?? "—"}</TableCell>
                  <TableCell>{adv.contactEmail ?? "—"}</TableCell>
                  <TableCell>
                    {adv.websiteUrl ? (
                      <a
                        href={adv.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm underline underline-offset-2 text-muted-foreground hover:text-foreground"
                      >
                        Link
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        adv.status === "ACTIVE"
                          ? "default"
                          : adv.status === "ARCHIVED"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {formatStatusLabel(adv.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(adv.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(adv)}
                        title="Edit advertiser"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      {adv.status !== "ARCHIVED" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Archive advertiser"
                            >
                              <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="sr-only">Archive</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Archive advertiser?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This will set <strong>{adv.name}</strong> to
                                Archived status. No data will be deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleArchive(adv)}
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
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingAdvertiser ? "Edit Advertiser" : "Add Advertiser"}
            </SheetTitle>
            <SheetDescription>
              {editingAdvertiser
                ? "Update advertiser details below."
                : "Fill in the details to create a new advertiser."}
            </SheetDescription>
          </SheetHeader>
          <AdvertiserForm
            key={editingAdvertiser?.id ?? "create"}
            initialData={editingAdvertiser}
            onSubmitAction={makeSubmitAction(editingAdvertiser)}
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
cd /Users/sumedh/Documents/PersonalProjects/moengage && npx tsc --noEmit 2>&1 | head -20
```

---

## Task 12: Update /admin/brands page

**Files:**
- Modify: `src/app/admin/brands/page.tsx`

- [ ] **Step 1: Replace the full file**

```typescript
// src/app/admin/brands/page.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminBrandsPageData } from "@/server/services/brands.service";
import { formatNumber } from "@/lib/format";
import { BrandsClient } from "@/app/admin/brands/brands-client";

export default async function BrandsPage() {
  const { brands, totalBrands, activeBrands } = await getAdminBrandsPageData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Brands</h1>
        <p className="text-muted-foreground">
          FMCG brands registered on the platform.
        </p>
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

      <BrandsClient brands={brands} />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && npx tsc --noEmit 2>&1 | head -20
```

---

## Task 13: Update /admin/advertisers page

**Files:**
- Modify: `src/app/admin/advertisers/page.tsx`

- [ ] **Step 1: Replace the full file**

```typescript
// src/app/admin/advertisers/page.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminAdvertisersPageData } from "@/server/services/advertisers.service";
import { formatNumber } from "@/lib/format";
import { AdvertisersClient } from "@/app/admin/advertisers/advertisers-client";

export default async function AdvertisersPage() {
  const { advertisers, totalAdvertisers, activeAdvertisers } =
    await getAdminAdvertisersPageData();

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
            <div className="text-2xl font-bold">
              {formatNumber(totalAdvertisers)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Advertisers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(activeAdvertisers)}
            </div>
          </CardContent>
        </Card>
      </div>

      <AdvertisersClient advertisers={advertisers} />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && npx tsc --noEmit 2>&1 | head -20
```

---

## Task 14: Final validation

- [ ] **Step 1: Full TypeScript check**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && npx tsc --noEmit 2>&1
```

Expected: zero errors.

- [ ] **Step 2: Production build**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && npm run build 2>&1
```

Expected: build succeeds, all routes shown as `ƒ` (dynamic).

- [ ] **Step 3: Grep for stale terms**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage && grep -R "CREATOR\|EXTERNAL\|role: \"USER\"\|creatorRequest\|brandRequest\|campaignUnlock\|lessonProgress\|qr-redemption\|points\|Shopify\|imageUrl\|isTemporary\|hasPendingApproval" src/
```

Expected: no output.

---

## Spec Coverage Checklist

| Requirement | Task |
|-------------|------|
| `src/lib/validators/brand.validator.ts` with zod | Task 2 |
| `src/lib/validators/advertiser.validator.ts` with zod | Task 3 |
| `src/lib/slug.ts` with `slugify()` | Task 1 |
| `src/server/services/brands.service.ts` with CRUD | Task 4 |
| `src/server/services/advertisers.service.ts` with CRUD | Task 5 |
| `archiveBrand` sets status = ARCHIVED (no hard delete) | Task 4 |
| `archiveAdvertiser` sets status = ARCHIVED (no hard delete) | Task 5 |
| Duplicate slug check on create | Tasks 4, 5 |
| Duplicate slug check on update, excluding current id | Tasks 4, 5 |
| `src/app/admin/brands/actions.ts` with 3 actions | Task 6 |
| `src/app/admin/advertisers/actions.ts` with 3 actions | Task 7 |
| All actions call `requireRole(["ADMIN"])` | Tasks 6, 7 |
| `revalidatePath` after mutation | Tasks 6, 7 |
| ActionResult type: `{ok, message}` or `{ok, error}` | Tasks 6, 7 |
| `src/components/forms/brand-form.tsx` react-hook-form + zod | Task 8 |
| `src/components/forms/advertiser-form.tsx` react-hook-form + zod | Task 9 |
| Create/edit mode in form | Tasks 8, 9 |
| Loading state on submit | Tasks 8, 9 |
| `/admin/brands` Add Brand button + Sheet + table with actions | Tasks 10, 12 |
| `/admin/advertisers` Add Advertiser button + Sheet + table with actions | Tasks 11, 13 |
| Edit per row, Archive per row | Tasks 10, 11 |
| Archive via AlertDialog (no accidental clicks) | Tasks 10, 11 |
| No hard delete | Tasks 4, 5, 10, 11 |
| Archived badge clearly shown | Tasks 10, 11 |
| shadcn components only | All tasks |
| No new packages | All tasks |
| TypeScript + build + grep validation | Task 14 |
