# Admin Users CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full ADMIN-only CRUD (create, edit, deactivate/activate) for Users at `/admin/users`.

**Architecture:** Follows the established Brands/Batches/Campaigns CRUD pattern — async RSC page → `UsersClient` (client component) → Sheet for create/edit → AlertDialog for deactivate/activate. Two separate Zod schemas handle create vs. update (password optional on update). The service layer owns all DB logic including bcrypt hashing, duplicate-email checks, and last-admin guard.

**Tech Stack:** Next.js 16 App Router, Prisma 7, Zod v4, react-hook-form v7, bcryptjs ^3.0.3, shadcn/ui (Sheet, AlertDialog, Select, Input, Checkbox, Badge, Button, Table, Card), sonner v2, lucide-react

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/lib/validators/user.validator.ts` | Create | Two Zod schemas (`createUserSchema`, `updateUserSchema`) + exported types |
| `src/server/services/users.service.ts` | Create | DB queries, password hashing, duplicate-email checks, last-admin guard |
| `src/app/admin/users/actions.ts` | Create | Server actions gated by `requireRole(["ADMIN"])` |
| `src/components/forms/user-form.tsx` | Create | Create/edit form with conditional Brand/Advertiser dropdowns |
| `src/app/admin/users/users-client.tsx` | Create | 4 stat cards, 9-column table, Sheet + AlertDialog |
| `src/app/admin/users/page.tsx` | Modify | Replace read-only inline page with RSC calling service + `<UsersClient>` |

---

### Task 1: User Validator

**Files:**
- Create: `src/lib/validators/user.validator.ts`

- [ ] **Step 1: Write the validator file**

```typescript
// src/lib/validators/user.validator.ts
import { z } from "zod";

const optionalId = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v),
  z.string().nullable().optional()
);

export const USER_ROLES = [
  "ADMIN",
  "BRAND_ADMIN",
  "CAMPAIGN_MANAGER",
  "ADVERTISER_VIEWER",
  "RETAIL_OPERATIONS",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

const roleEnum = z.enum(USER_ROLES);

const brandRequiredRoles: UserRole[] = [
  "BRAND_ADMIN",
  "CAMPAIGN_MANAGER",
  "RETAIL_OPERATIONS",
];

export const createUserSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").trim(),
    email: z.string().email("Invalid email address").trim().toLowerCase(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: roleEnum,
    brandId: optionalId,
    advertiserId: optionalId,
    isActive: z.boolean(),
    isEmailVerified: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (
      brandRequiredRoles.includes(data.role as UserRole) &&
      !data.brandId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Brand is required for ${data.role} role`,
        path: ["brandId"],
      });
    }
    if (data.role === "ADVERTISER_VIEWER" && !data.advertiserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Advertiser is required for ADVERTISER_VIEWER role",
        path: ["advertiserId"],
      });
    }
  });

export const updateUserSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").trim(),
    email: z.string().email("Invalid email address").trim().toLowerCase(),
    password: z.preprocess(
      (v) =>
        v == null || (typeof v === "string" && v.trim() === "")
          ? undefined
          : v,
      z.string().min(8, "Password must be at least 8 characters").optional()
    ),
    role: roleEnum,
    brandId: optionalId,
    advertiserId: optionalId,
    isActive: z.boolean(),
    isEmailVerified: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (
      brandRequiredRoles.includes(data.role as UserRole) &&
      !data.brandId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Brand is required for ${data.role} role`,
        path: ["brandId"],
      });
    }
    if (data.role === "ADVERTISER_VIEWER" && !data.advertiserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Advertiser is required for ADVERTISER_VIEWER role",
        path: ["advertiserId"],
      });
    }
  });

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
export type UpdateUserFormValues = z.infer<typeof updateUserSchema>;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/sumedh/Documents/PersonalProjects/moengage
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (no errors).

---

### Task 2: Users Service

**Files:**
- Create: `src/server/services/users.service.ts`

- [ ] **Step 1: Write the service file**

```typescript
// src/server/services/users.service.ts
import prisma from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { UserRole } from "@prisma/client";
import { createUserSchema, updateUserSchema } from "@/lib/validators/user.validator";
import type { CreateUserFormValues, UpdateUserFormValues } from "@/lib/validators/user.validator";

export type UserRow = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  brandId: string | null;
  brandName: string | null;
  advertiserId: string | null;
  advertiserName: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
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

export type AdminUsersPageData = {
  users: UserRow[];
  brands: BrandOption[];
  advertisers: AdvertiserOption[];
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  inactiveUsers: number;
};

export type ServiceResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function toUserRow(u: {
  id: string;
  name: string | null;
  email: string;
  role: string;
  brandId: string | null;
  advertiserId: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: Date;
  brand: { name: string } | null;
  advertiser: { name: string } | null;
}): UserRow {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    brandId: u.brandId,
    brandName: u.brand?.name ?? null,
    advertiserId: u.advertiserId,
    advertiserName: u.advertiser?.name ?? null,
    isActive: u.isActive,
    isEmailVerified: u.isEmailVerified,
    createdAt: u.createdAt.toISOString(),
  };
}

const userInclude = {
  brand: { select: { name: true } },
  advertiser: { select: { name: true } },
} as const;

export async function getAdminUsersPageData(): Promise<AdminUsersPageData> {
  const [
    users,
    brands,
    advertisers,
    totalUsers,
    activeUsers,
    verifiedUsers,
    inactiveUsers,
  ] = await Promise.all([
    prisma.user.findMany({
      include: userInclude,
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
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isEmailVerified: true } }),
    prisma.user.count({ where: { isActive: false } }),
  ]);

  return {
    users: users.map(toUserRow),
    brands: brands.map((b) => ({ id: b.id, name: b.name })),
    advertisers: advertisers.map((a) => ({ id: a.id, name: a.name })),
    totalUsers,
    activeUsers,
    verifiedUsers,
    inactiveUsers,
  };
}

export async function createUser(
  input: CreateUserFormValues
): Promise<ServiceResult<UserRow>> {
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const {
    name,
    email,
    password,
    role,
    brandId,
    advertiserId,
    isActive,
    isEmailVerified,
  } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, error: `Email "${email}" is already registered` };
  }

  const passwordHash = await bcryptjs.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: role as UserRole,
      brandId: brandId ?? null,
      advertiserId: advertiserId ?? null,
      isActive,
      isEmailVerified,
      emailVerifiedAt: isEmailVerified ? new Date() : null,
    },
    include: userInclude,
  });

  return { ok: true, data: toUserRow(user) };
}

export async function updateUser(
  id: string,
  input: UpdateUserFormValues
): Promise<ServiceResult<UserRow>> {
  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const {
    name,
    email,
    password,
    role,
    brandId,
    advertiserId,
    isActive,
    isEmailVerified,
  } = parsed.data;

  const emailConflict = await prisma.user.findFirst({
    where: { email, NOT: { id } },
    select: { id: true },
  });
  if (emailConflict) {
    return { ok: false, error: `Email "${email}" is already registered` };
  }

  // Last-admin guard: if demoting away from ADMIN, ensure at least one other active ADMIN remains
  const existing = await prisma.user.findUnique({
    where: { id },
    select: { role: true, isEmailVerified: true, emailVerifiedAt: true },
  });
  if (!existing) {
    return { ok: false, error: "User not found" };
  }

  if (existing.role === "ADMIN" && role !== "ADMIN") {
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN", isActive: true, NOT: { id } },
    });
    if (adminCount === 0) {
      return {
        ok: false,
        error: "Cannot demote the only active admin. Promote another user to ADMIN first.",
      };
    }
  }

  const passwordHash = password
    ? await bcryptjs.hash(password, 10)
    : undefined;

  let emailVerifiedAt: Date | null | undefined = undefined;
  if (isEmailVerified && !existing.emailVerifiedAt) {
    emailVerifiedAt = new Date();
  } else if (!isEmailVerified) {
    emailVerifiedAt = null;
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      name,
      email,
      role: role as UserRole,
      brandId: brandId ?? null,
      advertiserId: advertiserId ?? null,
      isActive,
      isEmailVerified,
      ...(passwordHash !== undefined && { passwordHash }),
      ...(emailVerifiedAt !== undefined && { emailVerifiedAt }),
    },
    include: userInclude,
  });

  return { ok: true, data: toUserRow(user) };
}

export async function deactivateUser(id: string): Promise<ServiceResult> {
  // Last-admin guard
  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: true, isActive: true },
  });
  if (!user) return { ok: false, error: "User not found" };

  if (user.role === "ADMIN" && user.isActive) {
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN", isActive: true, NOT: { id } },
    });
    if (adminCount === 0) {
      return {
        ok: false,
        error: "Cannot deactivate the only active admin.",
      };
    }
  }

  await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });
  return { ok: true, data: undefined };
}

export async function activateUser(id: string): Promise<ServiceResult> {
  await prisma.user.update({
    where: { id },
    data: { isActive: true },
  });
  return { ok: true, data: undefined };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

---

### Task 3: Server Actions

**Files:**
- Create: `src/app/admin/users/actions.ts`

- [ ] **Step 1: Write the actions file**

```typescript
// src/app/admin/users/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import {
  createUser,
  updateUser,
  deactivateUser,
  activateUser,
} from "@/server/services/users.service";
import type { CreateUserFormValues, UpdateUserFormValues } from "@/lib/validators/user.validator";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function createUserAction(
  input: CreateUserFormValues
): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    const result = await createUser(input);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/users");
    return { ok: true, message: "User created successfully." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function updateUserAction(
  id: string,
  input: UpdateUserFormValues
): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    const result = await updateUser(id, input);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/users");
    return { ok: true, message: "User updated successfully." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function deactivateUserAction(id: string): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    const result = await deactivateUser(id);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/users");
    return { ok: true, message: "User deactivated." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function activateUserAction(id: string): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    const result = await activateUser(id);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/users");
    return { ok: true, message: "User activated." };
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

Expected: no output.

---

### Task 4: User Form Component

**Files:**
- Create: `src/components/forms/user-form.tsx`

Two modes: create (password required) and edit (password optional). Conditional dropdowns: Brand shown for BRAND_ADMIN/CAMPAIGN_MANAGER/RETAIL_OPERATIONS, Advertiser shown for ADVERTISER_VIEWER. Uses separate `createUserSchema` / `updateUserSchema` via the `mode` prop. Boolean fields (isActive, isEmailVerified) use shadcn `Checkbox`.

- [ ] **Step 1: Write the form component**

```typescript
// src/components/forms/user-form.tsx
"use client";

import React, { useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createUserSchema,
  updateUserSchema,
  USER_ROLES,
} from "@/lib/validators/user.validator";
import type {
  CreateUserFormValues,
  UpdateUserFormValues,
} from "@/lib/validators/user.validator";
import type {
  UserRow,
  BrandOption,
  AdvertiserOption,
} from "@/server/services/users.service";
import type { ActionResult } from "@/app/admin/users/actions";
import { formatStatusLabel } from "@/lib/format";

const BRAND_ROLES = ["BRAND_ADMIN", "CAMPAIGN_MANAGER", "RETAIL_OPERATIONS"];

type CreateProps = {
  mode: "create";
  initialData?: undefined;
  brands: BrandOption[];
  advertisers: AdvertiserOption[];
  onSubmitAction: (values: CreateUserFormValues) => Promise<ActionResult>;
  onSuccess?: () => void;
};

type EditProps = {
  mode: "edit";
  initialData: UserRow;
  brands: BrandOption[];
  advertisers: AdvertiserOption[];
  onSubmitAction: (values: UpdateUserFormValues) => Promise<ActionResult>;
  onSuccess?: () => void;
};

type Props = CreateProps | EditProps;

export function UserForm({
  mode,
  initialData,
  brands,
  advertisers,
  onSubmitAction,
  onSuccess,
}: Props) {
  const isEdit = mode === "edit";

  const schema = isEdit ? updateUserSchema : createUserSchema;

  const defaultValues = {
    name: initialData?.name ?? "",
    email: initialData?.email ?? "",
    password: "",
    role: (initialData?.role ?? "BRAND_ADMIN") as CreateUserFormValues["role"],
    brandId: initialData?.brandId ?? "",
    advertiserId: initialData?.advertiserId ?? "",
    isActive: initialData?.isActive ?? true,
    isEmailVerified: initialData?.isEmailVerified ?? false,
  };

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormValues | UpdateUserFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues,
  });

  const selectedRole = watch("role");
  const prevRole = useRef(defaultValues.role);

  // Clear irrelevant association fields when role changes
  useEffect(() => {
    if (selectedRole !== prevRole.current) {
      if (BRAND_ROLES.includes(selectedRole)) {
        setValue("advertiserId", "");
      } else if (selectedRole === "ADVERTISER_VIEWER") {
        setValue("brandId", "");
      } else {
        // ADMIN
        setValue("brandId", "");
        setValue("advertiserId", "");
      }
      prevRole.current = selectedRole;
    }
  }, [selectedRole, setValue]);

  const showBrand = BRAND_ROLES.includes(selectedRole);
  const showAdvertiser = selectedRole === "ADVERTISER_VIEWER";

  const onSubmit = async (values: CreateUserFormValues | UpdateUserFormValues) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (onSubmitAction as any)(values);
    if (result.ok) {
      toast.success(result.message);
      onSuccess?.();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-4">
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="name">
          Name <span className="text-destructive">*</span>
        </label>
        <Input id="name" {...register("name")} placeholder="Jane Doe" />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="email">
          Email <span className="text-destructive">*</span>
        </label>
        <Input
          id="email"
          type="email"
          {...register("email")}
          placeholder="jane@example.com"
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="password">
          Password{!isEdit && <span className="text-destructive"> *</span>}
        </label>
        <Input
          id="password"
          type="password"
          {...register("password")}
          placeholder={isEdit ? "Leave blank to keep existing" : "Min 8 characters"}
          autoComplete="new-password"
        />
        {isEdit && (
          <p className="text-xs text-muted-foreground">
            Leave blank to keep the existing password.
          </p>
        )}
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      {/* Role */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="role">
          Role <span className="text-destructive">*</span>
        </label>
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {formatStatusLabel(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.role && (
          <p className="text-xs text-destructive">{errors.role.message}</p>
        )}
      </div>

      {/* Brand (shown for BRAND_ADMIN, CAMPAIGN_MANAGER, RETAIL_OPERATIONS) */}
      {showBrand && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="brandId">
            Brand <span className="text-destructive">*</span>
          </label>
          <Controller
            name="brandId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? ""}
                onValueChange={(val) =>
                  field.onChange(val === "__none__" ? "" : val)
                }
              >
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
      )}

      {/* Advertiser (shown for ADVERTISER_VIEWER) */}
      {showAdvertiser && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="advertiserId">
            Advertiser <span className="text-destructive">*</span>
          </label>
          <Controller
            name="advertiserId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? ""}
                onValueChange={(val) =>
                  field.onChange(val === "__none__" ? "" : val)
                }
              >
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
      )}

      {/* isActive + isEmailVerified checkboxes */}
      <div className="flex flex-col gap-3">
        <Controller
          name="isActive"
          control={control}
          render={({ field }) => (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
              <span className="text-sm font-medium">Active</span>
            </label>
          )}
        />
        <Controller
          name="isEmailVerified"
          control={control}
          render={({ field }) => (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
              <span className="text-sm font-medium">Email Verified</span>
            </label>
          )}
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="mt-2">
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isEdit ? "Save Changes" : "Create User"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

---

### Task 5: Users Client Component

**Files:**
- Create: `src/app/admin/users/users-client.tsx`

4 stat cards (Total, Active, Verified, Inactive). 9-column table. Sheet for create/edit. AlertDialog for deactivate (with separate activate button for inactive rows). No hard delete. `UserForm` receives `mode="create"` or `mode="edit"` plus `onSubmitAction`.

- [ ] **Step 1: Write the client component**

```typescript
// src/app/admin/users/users-client.tsx
"use client";

import React, { useState } from "react";
import { Plus, Pencil, UserX, UserCheck } from "lucide-react";
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
import { UserForm } from "@/components/forms/user-form";
import {
  createUserAction,
  updateUserAction,
  deactivateUserAction,
  activateUserAction,
} from "@/app/admin/users/actions";
import type {
  UserRow,
  BrandOption,
  AdvertiserOption,
} from "@/server/services/users.service";
import { formatDate, formatStatusLabel, formatNumber } from "@/lib/format";

type Props = {
  users: UserRow[];
  brands: BrandOption[];
  advertisers: AdvertiserOption[];
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  inactiveUsers: number;
};

function roleVariant(
  role: string
): "default" | "secondary" | "destructive" | "outline" {
  if (role === "ADMIN") return "destructive";
  if (role === "BRAND_ADMIN") return "default";
  return "secondary";
}

export function UsersClient({
  users,
  brands,
  advertisers,
  totalUsers,
  activeUsers,
  verifiedUsers,
  inactiveUsers,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | undefined>(
    undefined
  );

  function openCreate() {
    setEditingUser(undefined);
    setSheetOpen(true);
  }

  function openEdit(user: UserRow) {
    setEditingUser(user);
    setSheetOpen(true);
  }

  function handleSheetSuccess() {
    setSheetOpen(false);
  }

  async function handleDeactivate(user: UserRow) {
    const result = await deactivateUserAction(user.id);
    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error(result.error);
    }
  }

  async function handleActivate(user: UserRow) {
    const result = await activateUserAction(user.id);
    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      {/* Summary Cards */}
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
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(activeUsers)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(verifiedUsers)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(inactiveUsers)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add User
        </Button>
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
              <TableHead>Verified</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-muted-foreground py-8"
                >
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant={roleVariant(user.role)}>
                      {formatStatusLabel(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.brandName ?? "—"}</TableCell>
                  <TableCell>{user.advertiserName ?? "—"}</TableCell>
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
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(user)}
                        title="Edit user"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>

                      {user.isActive ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Deactivate user"
                            >
                              <UserX className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="sr-only">Deactivate</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Deactivate user?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This will prevent{" "}
                                <strong>{user.name ?? user.email}</strong> from
                                logging in. No data will be deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeactivate(user)}
                              >
                                Deactivate
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Activate user"
                          onClick={() => handleActivate(user)}
                        >
                          <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="sr-only">Activate</span>
                        </Button>
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
            <SheetTitle>{editingUser ? "Edit User" : "Add User"}</SheetTitle>
            <SheetDescription>
              {editingUser
                ? "Update user details below."
                : "Fill in the details to create a new user."}
            </SheetDescription>
          </SheetHeader>
          {editingUser ? (
            <UserForm
              key={editingUser.id}
              mode="edit"
              initialData={editingUser}
              brands={brands}
              advertisers={advertisers}
              onSubmitAction={(values) =>
                updateUserAction(editingUser.id, values)
              }
              onSuccess={handleSheetSuccess}
            />
          ) : (
            <UserForm
              key="create"
              mode="create"
              brands={brands}
              advertisers={advertisers}
              onSubmitAction={createUserAction}
              onSuccess={handleSheetSuccess}
            />
          )}
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

Expected: no output.

---

### Task 6: Update /admin/users Page

**Files:**
- Modify: `src/app/admin/users/page.tsx`

Replace the existing read-only inline Prisma page with an async RSC that calls `getAdminUsersPageData()` and renders `<UsersClient>`.

- [ ] **Step 1: Write the updated page**

```typescript
// src/app/admin/users/page.tsx
import React from "react";
import { getAdminUsersPageData } from "@/server/services/users.service";
import { UsersClient } from "@/app/admin/users/users-client";

export default async function UsersPage() {
  const {
    users,
    brands,
    advertisers,
    totalUsers,
    activeUsers,
    verifiedUsers,
    inactiveUsers,
  } = await getAdminUsersPageData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          All platform users across roles, brands, and advertisers.
        </p>
      </div>

      <UsersClient
        users={users}
        brands={brands}
        advertisers={advertisers}
        totalUsers={totalUsers}
        activeUsers={activeUsers}
        verifiedUsers={verifiedUsers}
        inactiveUsers={inactiveUsers}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

---

### Task 7: Final Validation

**Files:** No changes — validation only.

- [ ] **Step 1: Run full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero output (no errors).

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: build succeeds. `/admin/users` appears as a dynamic (`ƒ`) route.

- [ ] **Step 3: Grep for out-of-scope and banned terms**

```bash
grep -R "CREATOR\|EXTERNAL\|role: \"USER\"\|creatorRequest\|brandRequest\|campaignUnlock\|lessonProgress\|qr-redemption\|points\|Shopify\|imageUrl\|isTemporary\|hasPendingApproval" src
```

Expected: no matches.
