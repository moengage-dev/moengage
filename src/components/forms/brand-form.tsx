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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(brandSchema) as any,
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
