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

// Keep in sync with brandRequiredRoles in src/lib/validators/user.validator.ts
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
      </div>

      <Button type="submit" disabled={isSubmitting} className="mt-2">
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isEdit ? "Save Changes" : "Create User"}
      </Button>
    </form>
  );
}
