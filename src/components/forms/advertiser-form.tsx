// src/components/forms/advertiser-form.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
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
    resolver: zodResolver(advertiserSchema) as Resolver<AdvertiserFormValues>,
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
