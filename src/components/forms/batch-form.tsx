// src/components/forms/batch-form.tsx
"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { useForm, Controller, type Resolver, useWatch } from "react-hook-form";
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
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BatchFormValues>({
    resolver: zodResolver(batchSchema) as Resolver<BatchFormValues>,
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

  const selectedBrandId = useWatch({ control, name: "brandId" });
  const selectedCampaignId = useWatch({ control, name: "campaignId" });
  const selectedProductId = useWatch({ control, name: "productId" });
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
