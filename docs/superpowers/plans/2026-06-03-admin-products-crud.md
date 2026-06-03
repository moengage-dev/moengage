# Admin Products CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full ADMIN-only CRUD (create, edit, soft-archive) for Products at `/admin/products`, with brand-aware slug uniqueness.

**Architecture:** Products belong to a Brand via `brandId`; slug uniqueness is scoped per-brand (`@@unique([brandId, slug])`). The page follows the established Brands/Advertisers CRUD pattern: async server component fetches data → passes serialised rows + brands list to a client component → Sheet for create/edit → AlertDialog for archive confirmation → server actions with `requireRole(["ADMIN"])`.

**Tech Stack:** Next.js 16 App Router, Prisma 7, Zod v4, react-hook-form v7, shadcn/ui (Sheet, AlertDialog, Select, Input, Badge, Button, Table), sonner v2, lucide-react

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/lib/validators/product.validator.ts` | Create | Zod schema + `ProductFormValues` type |
| `src/server/services/products.service.ts` | Create | DB queries, slug uniqueness checks, ServiceResult |
| `src/app/admin/products/actions.ts` | Create | Server actions gated by `requireRole(["ADMIN"])` |
| `src/components/forms/product-form.tsx` | Create | Controlled form with brand select + auto-slug |
| `src/app/admin/products/products-client.tsx` | Create | Client table with Sheet + AlertDialog |
| `src/app/admin/products/page.tsx` | Modify | Replace read-only placeholder with CRUD server page |

---

### Task 1: Product Validator

**Files:**
- Create: `src/lib/validators/product.validator.ts`

- [ ] **Step 1: Write the validator file**

```typescript
// src/lib/validators/product.validator.ts
import { z } from "zod";

const optionalString = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z.string().optional()
);

export const productSchema = z.object({
  brandId: z.string().min(1, "Brand is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase letters, numbers, and hyphens only"
    ),
  sku: optionalString,
  category: optionalString,
  unitLabel: optionalString,
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]),
});

export type ProductFormValues = z.infer<typeof productSchema>;

export function emptyStringToUndefined(v: string | undefined | null): string | undefined {
  if (!v || v.trim() === "") return undefined;
  return v;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to this file.

- [ ] **Step 3: Commit**

```bash
git add src/lib/validators/product.validator.ts
git commit -m "feat: add product zod validator"
```

---

### Task 2: Products Service

**Files:**
- Create: `src/server/services/products.service.ts`

- [ ] **Step 1: Write the service file**

```typescript
// src/server/services/products.service.ts
import prisma from "@/lib/prisma";
import { productSchema } from "@/lib/validators/product.validator";
import type { ProductFormValues } from "@/lib/validators/product.validator";

function toNull(v: string | undefined | null): string | null {
  if (!v || v.trim() === "") return null;
  return v;
}

export type ProductRow = {
  id: string;
  brandId: string;
  brandName: string;
  name: string;
  slug: string;
  sku: string | null;
  category: string | null;
  unitLabel: string | null;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  createdAt: string;
};

export type BrandOption = {
  id: string;
  name: string;
};

export type AdminProductsPageData = {
  products: ProductRow[];
  brands: BrandOption[];
  totalProducts: number;
  activeProducts: number;
};

export type ServiceResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function getAdminProductsPageData(): Promise<AdminProductsPageData> {
  const [products, brands, totalProducts, activeProducts] = await Promise.all([
    prisma.product.findMany({
      include: { brand: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.brand.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.count(),
    prisma.product.count({ where: { status: "ACTIVE" } }),
  ]);

  return {
    products: products.map((p) => ({
      id: p.id,
      brandId: p.brandId,
      brandName: p.brand.name,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      category: p.category,
      unitLabel: p.unitLabel,
      status: p.status as "ACTIVE" | "PAUSED" | "ARCHIVED",
      createdAt: p.createdAt.toISOString(),
    })),
    brands: brands.map((b) => ({ id: b.id, name: b.name })),
    totalProducts,
    activeProducts,
  };
}

export async function createProduct(
  input: ProductFormValues
): Promise<ServiceResult<ProductRow>> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { brandId, name, slug, sku, category, unitLabel, status } = parsed.data;

  const existing = await prisma.product.findUnique({
    where: { brandId_slug: { brandId, slug } },
  });
  if (existing) {
    return { ok: false, error: `Slug "${slug}" is already taken for this brand` };
  }

  const product = await prisma.product.create({
    data: {
      brandId,
      name,
      slug,
      sku: toNull(sku),
      category: toNull(category),
      unitLabel: toNull(unitLabel),
      status,
    },
    include: { brand: { select: { name: true } } },
  });

  return {
    ok: true,
    data: {
      id: product.id,
      brandId: product.brandId,
      brandName: product.brand.name,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      category: product.category,
      unitLabel: product.unitLabel,
      status: product.status as "ACTIVE" | "PAUSED" | "ARCHIVED",
      createdAt: product.createdAt.toISOString(),
    },
  };
}

export async function updateProduct(
  id: string,
  input: ProductFormValues
): Promise<ServiceResult<ProductRow>> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { brandId, name, slug, sku, category, unitLabel, status } = parsed.data;

  const slugConflict = await prisma.product.findFirst({
    where: { brandId, slug, NOT: { id } },
  });
  if (slugConflict) {
    return { ok: false, error: `Slug "${slug}" is already taken for this brand` };
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      brandId,
      name,
      slug,
      sku: toNull(sku),
      category: toNull(category),
      unitLabel: toNull(unitLabel),
      status,
    },
    include: { brand: { select: { name: true } } },
  });

  return {
    ok: true,
    data: {
      id: product.id,
      brandId: product.brandId,
      brandName: product.brand.name,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      category: product.category,
      unitLabel: product.unitLabel,
      status: product.status as "ACTIVE" | "PAUSED" | "ARCHIVED",
      createdAt: product.createdAt.toISOString(),
    },
  };
}

export async function archiveProduct(id: string): Promise<ServiceResult> {
  await prisma.product.update({ where: { id }, data: { status: "ARCHIVED" } });
  return { ok: true, data: undefined };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/server/services/products.service.ts
git commit -m "feat: add products service with brand-aware slug uniqueness"
```

---

### Task 3: Server Actions

**Files:**
- Create: `src/app/admin/products/actions.ts`

- [ ] **Step 1: Write the actions file**

```typescript
// src/app/admin/products/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import {
  createProduct,
  updateProduct,
  archiveProduct,
} from "@/server/services/products.service";
import type { ProductFormValues } from "@/lib/validators/product.validator";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function createProductAction(
  input: ProductFormValues
): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    const result = await createProduct(input);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/products");
    return { ok: true, message: "Product created successfully." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function updateProductAction(
  id: string,
  input: ProductFormValues
): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    const result = await updateProduct(id, input);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/products");
    return { ok: true, message: "Product updated successfully." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function archiveProductAction(id: string): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    await archiveProduct(id);
    revalidatePath("/admin/products");
    return { ok: true, message: "Product archived." };
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

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/products/actions.ts
git commit -m "feat: add product server actions"
```

---

### Task 4: Product Form Component

**Files:**
- Create: `src/components/forms/product-form.tsx`

The form includes a Brand select (required), Name, Slug (auto-generated from name in create mode), SKU, Category, Unit Label, and Status. It follows the exact same pattern as `brand-form.tsx`.

- [ ] **Step 1: Write the form component**

```typescript
// src/components/forms/product-form.tsx
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
import { productSchema } from "@/lib/validators/product.validator";
import type { ProductFormValues } from "@/lib/validators/product.validator";
import { slugify } from "@/lib/slug";
import type { ProductRow, BrandOption } from "@/server/services/products.service";
import type { ActionResult } from "@/app/admin/products/actions";

type Props = {
  initialData?: ProductRow;
  brands: BrandOption[];
  onSubmitAction: (values: ProductFormValues) => Promise<ActionResult>;
  onSuccess?: () => void;
};

export function ProductForm({ initialData, brands, onSubmitAction, onSuccess }: Props) {
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
  } = useForm<ProductFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      brandId: initialData?.brandId ?? "",
      name: initialData?.name ?? "",
      slug: initialData?.slug ?? "",
      sku: initialData?.sku ?? "",
      category: initialData?.category ?? "",
      unitLabel: initialData?.unitLabel ?? "",
      status: (initialData?.status as ProductFormValues["status"]) ?? "ACTIVE",
    },
  });

  const nameValue = watch("name");

  useEffect(() => {
    if (!slugManuallyEdited && !initialData) {
      setValue("slug", slugify(nameValue ?? ""));
    }
  }, [nameValue, slugManuallyEdited, initialData, setValue]);

  const onSubmit = async (values: ProductFormValues) => {
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

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="name">
          Name <span className="text-destructive">*</span>
        </label>
        <Input id="name" {...register("name")} placeholder="Classic Cola 330ml" />
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
          placeholder="classic-cola-330ml"
          className="font-mono"
        />
        {errors.slug && (
          <p className="text-xs text-destructive">{errors.slug.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="sku">
          SKU
        </label>
        <Input id="sku" {...register("sku")} placeholder="SKU-001" className="font-mono" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="category">
          Category
        </label>
        <Input id="category" {...register("category")} placeholder="Beverages" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="unitLabel">
          Unit Label
        </label>
        <Input id="unitLabel" {...register("unitLabel")} placeholder="can, bottle, pack" />
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
        {initialData ? "Save Changes" : "Create Product"}
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

- [ ] **Step 3: Commit**

```bash
git add src/components/forms/product-form.tsx
git commit -m "feat: add product form component with brand select and auto-slug"
```

---

### Task 5: Products Client Component

**Files:**
- Create: `src/app/admin/products/products-client.tsx`

Receives `products: ProductRow[]` and `brands: BrandOption[]` from the server page. Owns the Sheet (create/edit) and AlertDialog (archive) state. Renders a table with 9 columns and an "Add Product" button.

- [ ] **Step 1: Write the client component**

```typescript
// src/app/admin/products/products-client.tsx
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
import { ProductForm } from "@/components/forms/product-form";
import {
  createProductAction,
  updateProductAction,
  archiveProductAction,
} from "@/app/admin/products/actions";
import type { ProductRow, BrandOption } from "@/server/services/products.service";
import type { ProductFormValues } from "@/lib/validators/product.validator";
import { formatDate, formatStatusLabel } from "@/lib/format";

type Props = {
  products: ProductRow[];
  brands: BrandOption[];
};

export function ProductsClient({ products, brands }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | undefined>(
    undefined
  );

  function openCreate() {
    setEditingProduct(undefined);
    setSheetOpen(true);
  }

  function openEdit(product: ProductRow) {
    setEditingProduct(product);
    setSheetOpen(true);
  }

  function handleSheetSuccess() {
    setSheetOpen(false);
  }

  async function handleArchive(product: ProductRow) {
    const result = await archiveProductAction(product.id);
    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error(result.error);
    }
  }

  function makeSubmitAction(product?: ProductRow) {
    return (values: ProductFormValues) =>
      product
        ? updateProductAction(product.id, values)
        : createProductAction(values);
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Product
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Unit Label</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-muted-foreground py-8"
                >
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.brandName}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">
                    {product.slug}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {product.sku ?? "—"}
                  </TableCell>
                  <TableCell>{product.category ?? "—"}</TableCell>
                  <TableCell>{product.unitLabel ?? "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        product.status === "ACTIVE"
                          ? "default"
                          : product.status === "ARCHIVED"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {formatStatusLabel(product.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(product.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(product)}
                        title="Edit product"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      {product.status !== "ARCHIVED" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Archive product"
                            >
                              <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="sr-only">Archive</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Archive product?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will set <strong>{product.name}</strong> to
                                Archived status. No data will be deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleArchive(product)}
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
              {editingProduct ? "Edit Product" : "Add Product"}
            </SheetTitle>
            <SheetDescription>
              {editingProduct
                ? "Update product details below."
                : "Fill in the details to create a new product."}
            </SheetDescription>
          </SheetHeader>
          <ProductForm
            key={editingProduct?.id ?? "create"}
            initialData={editingProduct}
            brands={brands}
            onSubmitAction={makeSubmitAction(editingProduct)}
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

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/products/products-client.tsx
git commit -m "feat: add products client component with sheet and archive dialog"
```

---

### Task 6: Update /admin/products Page

**Files:**
- Modify: `src/app/admin/products/page.tsx`

Replace the existing read-only page with a server component that calls `getAdminProductsPageData()` and renders `<ProductsClient>`. The page already exists as a read-only static version — rewrite it completely.

- [ ] **Step 1: Write the updated page**

```typescript
// src/app/admin/products/page.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminProductsPageData } from "@/server/services/products.service";
import { formatNumber } from "@/lib/format";
import { ProductsClient } from "@/app/admin/products/products-client";

export default async function ProductsPage() {
  const { products, brands, totalProducts, activeProducts } =
    await getAdminProductsPageData();

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
            <div className="text-2xl font-bold">
              {formatNumber(totalProducts)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(activeProducts)}
            </div>
          </CardContent>
        </Card>
      </div>

      <ProductsClient products={products} brands={brands} />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/products/page.tsx
git commit -m "feat: replace read-only products page with CRUD server component"
```

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

Expected: build succeeds. `/admin/products` appears as a dynamic (`ƒ`) route.

- [ ] **Step 3: Run grep for out-of-scope terms**

```bash
grep -R "CREATOR\|EXTERNAL\|role: \"USER\"\|creatorRequest\|brandRequest\|campaignUnlock\|lessonProgress\|qr-redemption\|points\|Shopify\|imageUrl\|isTemporary\|hasPendingApproval" src
```

Expected: no matches.

- [ ] **Step 4: Commit (if any fixes were needed)**

Only commit if fixes were required during validation.

```bash
git add -A
git commit -m "fix: address validation issues found during final check"
```
