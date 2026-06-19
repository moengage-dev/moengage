// src/components/forms/campaign-form.tsx
"use client";

import React, { useEffect, useRef, useMemo, useState } from "react";
import { useForm, Controller, type Resolver, useWatch } from "react-hook-form";
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
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema) as Resolver<CampaignFormValues>,
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

  const nameValue = useWatch({ control, name: "name" });
  const selectedBrandId = useWatch({ control, name: "brandId" });
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
          <p className="text-xs text-destructive">
            {errors.offerTitle.message}
          </p>
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
          <p className="text-xs text-destructive">
            {errors.rewardType.message}
          </p>
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
            <p className="text-xs text-destructive">
              {errors.currency.message}
            </p>
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
