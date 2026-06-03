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
