// src/components/forms/qr-code-form.tsx
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
import {
  qrCodeSchema,
  QR_CODE_TYPES,
  QR_CODE_STATUSES,
} from "@/lib/validators/qr-code.validator";
import type { QRCodeFormValues } from "@/lib/validators/qr-code.validator";
import type {
  QRCodeRow,
  BrandOption,
  AdvertiserOption,
  CampaignOption,
  ProductOption,
  BatchOption,
} from "@/server/services/qr-codes.service";
import type { ActionResult } from "@/app/admin/qr-codes/actions";
import { formatStatusLabel } from "@/lib/format";

type CreateProps = {
  mode: "create";
  initialData?: undefined;
  brands: BrandOption[];
  advertisers: AdvertiserOption[];
  campaigns: CampaignOption[];
  products: ProductOption[];
  batches: BatchOption[];
  onSubmitAction: (values: QRCodeFormValues) => Promise<ActionResult>;
  onSuccess?: () => void;
};

type EditProps = {
  mode: "edit";
  initialData: QRCodeRow;
  brands: BrandOption[];
  advertisers: AdvertiserOption[];
  campaigns: CampaignOption[];
  products: ProductOption[];
  batches: BatchOption[];
  onSubmitAction: (values: QRCodeFormValues) => Promise<ActionResult>;
  onSuccess?: () => void;
};

type Props = CreateProps | EditProps;

export function QRCodeForm({
  mode,
  initialData,
  brands,
  advertisers,
  campaigns,
  products,
  batches,
  onSubmitAction,
  onSuccess,
}: Props) {
  const isEdit = mode === "edit";

  const defaultValues = {
    code: initialData?.code ?? "",
    type: (initialData?.type ?? "CONSUMER_CAMPAIGN") as QRCodeFormValues["type"],
    status: (initialData?.status ?? "ACTIVE") as QRCodeFormValues["status"],
    brandId: initialData?.brandId ?? "",
    advertiserId: initialData?.advertiserId ?? "",
    campaignId: initialData?.campaignId ?? "",
    productId: initialData?.productId ?? "",
    batchId: initialData?.batchId ?? "",
    label: initialData?.label ?? "",
    destinationUrl: initialData?.destinationUrl ?? "",
  };

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<QRCodeFormValues>({
    resolver: zodResolver(qrCodeSchema) as Resolver<QRCodeFormValues>,
    defaultValues,
  });

  const selectedType = useWatch({ control, name: "type" });
  const selectedBrandId = useWatch({ control, name: "brandId" });
  const selectedAdvertiserId = useWatch({ control, name: "advertiserId" });
  const selectedCampaignId = useWatch({ control, name: "campaignId" });
  const selectedProductId = useWatch({ control, name: "productId" });

  const isBatchDelivery = selectedType === "BATCH_DELIVERY";
  const isConsumerCampaign = selectedType === "CONSUMER_CAMPAIGN";
  const isSampleLabel = selectedType === "SAMPLE_LABEL";
  const isInternalTest = selectedType === "INTERNAL_TEST";

  const brandRequired = isConsumerCampaign || isSampleLabel;
  const advertiserRequired = isConsumerCampaign;
  const campaignRequired = isConsumerCampaign || isInternalTest;
  const productRequired = isSampleLabel;
  const batchRequired = isBatchDelivery;

  // --- Reactive Reset Cascades ---

  // 1. Reset advertiser and below when brand changes
  const lastBrandIdRef = useRef<string | null | undefined>(defaultValues.brandId);
  useEffect(() => {
    if (selectedBrandId !== lastBrandIdRef.current) {
      lastBrandIdRef.current = selectedBrandId;
      setValue("advertiserId", "");
      setValue("campaignId", "");
      setValue("productId", "");
      setValue("batchId", "");
    }
  }, [selectedBrandId, setValue]);

  // 2. Reset campaign and below when advertiser changes
  const lastAdvertiserIdRef = useRef<string | null | undefined>(defaultValues.advertiserId);
  useEffect(() => {
    if (selectedAdvertiserId !== lastAdvertiserIdRef.current) {
      lastAdvertiserIdRef.current = selectedAdvertiserId;
      setValue("campaignId", "");
      setValue("productId", "");
      setValue("batchId", "");
    }
  }, [selectedAdvertiserId, setValue]);

  // 3. Reset product and below when campaign changes, pre-populating campaign product if available
  const lastCampaignIdRef = useRef<string | null | undefined>(defaultValues.campaignId);
  useEffect(() => {
    if (selectedCampaignId !== lastCampaignIdRef.current) {
      lastCampaignIdRef.current = selectedCampaignId;
      const campaign = campaigns.find((c) => c.id === selectedCampaignId);
      setValue("productId", campaign?.productId ?? "");
      setValue("batchId", "");
    }
  }, [selectedCampaignId, campaigns, setValue]);

  // 4. Reset batch when product changes
  const lastProductIdRef = useRef<string | null | undefined>(defaultValues.productId);
  useEffect(() => {
    if (selectedProductId !== lastProductIdRef.current) {
      lastProductIdRef.current = selectedProductId;
      setValue("batchId", "");
    }
  }, [selectedProductId, setValue]);

  // --- Optimized Options Filtering ---

  // 1. Advertisers: belong to brand if there's campaigns linking them
  const filteredAdvertisers = useMemo(() => {
    if (!selectedBrandId) return [];
    const brandCampaigns = campaigns.filter((c) => c.brandId === selectedBrandId);
    const advertiserIds = new Set(brandCampaigns.map((c) => c.advertiserId));
    return advertisers.filter((a) => advertiserIds.has(a.id));
  }, [selectedBrandId, advertisers, campaigns]);

  // 2. Campaigns: belong to selected brand and advertiser
  const filteredCampaigns = useMemo(() => {
    if (!selectedBrandId || !selectedAdvertiserId) return [];
    return campaigns.filter(
      (c) => c.brandId === selectedBrandId && c.advertiserId === selectedAdvertiserId
    );
  }, [selectedBrandId, selectedAdvertiserId, campaigns]);

  // 3. Products: match active brandId
  const filteredProducts = useMemo(() => {
    if (!selectedBrandId || !selectedCampaignId) return [];
    return products.filter((p) => p.brandId === selectedBrandId);
  }, [selectedBrandId, selectedCampaignId, products]);

  // 4. Batches: match active brandId, campaignId, and productId
  const filteredBatches = useMemo(() => {
    if (!selectedBrandId || !selectedCampaignId || !selectedProductId) return [];
    return batches.filter(
      (b) =>
        b.brandId === selectedBrandId &&
        b.campaignId === selectedCampaignId &&
        b.productId === selectedProductId
    );
  }, [selectedBrandId, selectedCampaignId, selectedProductId, batches]);

  const onSubmit = async (values: QRCodeFormValues) => {
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
      {/* Type */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="type">
          QR Type <span className="text-destructive">*</span>
        </label>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {QR_CODE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {formatStatusLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.type && (
          <p className="text-xs text-destructive">{errors.type.message}</p>
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
                {QR_CODE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {formatStatusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.status && (
          <p className="text-xs text-destructive">{errors.status.message}</p>
        )}
      </div>

      {/* Code */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="code">
          Code {!isEdit && <span className="text-xs text-muted-foreground">(Optional)</span>}
        </label>
        <Input
          id="code"
          disabled={isEdit}
          {...register("code")}
          placeholder={isEdit ? initialData.code : "Leave blank to auto-generate"}
        />
        {!isEdit && (
          <p className="text-xs text-muted-foreground">
            Leave blank to auto-generate. Must be URL-safe if custom input is provided.
          </p>
        )}
        {errors.code && (
          <p className="text-xs text-destructive">{errors.code.message}</p>
        )}
      </div>

      {/* Label */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="label">
          Label <span className="text-xs text-muted-foreground">(Optional)</span>
        </label>
        <Input id="label" {...register("label")} placeholder="Investor Demo Pack Label" />
        {errors.label && (
          <p className="text-xs text-destructive">{errors.label.message}</p>
        )}
      </div>

      {/* 1. Brand Dropdown */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="brandId">
          Brand {brandRequired ? <span className="text-destructive">*</span> : <span className="text-xs text-muted-foreground">(Optional)</span>}
        </label>
        <Controller
          name="brandId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? ""}
              onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)}
            >
              <SelectTrigger id="brandId">
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* 2. Advertiser Dropdown */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="advertiserId">
          Advertiser {advertiserRequired ? <span className="text-destructive">*</span> : <span className="text-xs text-muted-foreground">(Optional)</span>}
        </label>
        <Controller
          name="advertiserId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? ""}
              onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)}
            >
              <SelectTrigger id="advertiserId" disabled={!selectedBrandId}>
                <SelectValue placeholder={selectedBrandId ? "Select advertiser" : "Select a Brand first..."} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {filteredAdvertisers.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* 3. Campaign Dropdown */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="campaignId">
          Campaign {campaignRequired ? <span className="text-destructive">*</span> : <span className="text-xs text-muted-foreground">(Optional)</span>}
        </label>
        <Controller
          name="campaignId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? ""}
              onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)}
            >
              <SelectTrigger id="campaignId" disabled={!selectedAdvertiserId}>
                <SelectValue placeholder={selectedAdvertiserId ? "Select campaign" : "Select an Advertiser first..."} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
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
          <p className="text-xs text-destructive">{errors.campaignId.message}</p>
        )}
      </div>

      {/* 4. Product Dropdown */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="productId">
          Product {productRequired ? <span className="text-destructive">*</span> : <span className="text-xs text-muted-foreground">(Optional)</span>}
        </label>
        <Controller
          name="productId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? ""}
              onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)}
            >
              <SelectTrigger id="productId" disabled={!selectedCampaignId}>
                <SelectValue placeholder={selectedCampaignId ? "Select product" : "Select a Campaign first..."} />
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

      {/* 5. Batch Dropdown */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="batchId">
          Batch {batchRequired ? <span className="text-destructive">*</span> : <span className="text-xs text-muted-foreground">(Optional)</span>}
        </label>
        <Controller
          name="batchId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? ""}
              onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)}
            >
              <SelectTrigger id="batchId" disabled={!selectedProductId}>
                <SelectValue placeholder={selectedProductId ? "Select batch" : "Select a Product first..."} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {filteredBatches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.batchCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.batchId && (
          <p className="text-xs text-destructive">{errors.batchId.message}</p>
        )}
      </div>

      {/* Destination URL */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="destinationUrl">
          Destination URL <span className="text-xs text-muted-foreground">(Optional)</span>
        </label>
        <Input
          id="destinationUrl"
          {...register("destinationUrl")}
          placeholder="Leave blank to auto-generate from QR type"
        />
        <p className="text-xs text-muted-foreground">
          Leave blank to auto-generate from the QR type (e.g., http://.../q/[code] or http://.../d/[code]).
        </p>
        {errors.destinationUrl && (
          <p className="text-xs text-destructive">{errors.destinationUrl.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="mt-2">
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isEdit ? "Save Changes" : "Create QR Code"}
      </Button>
    </form>
  );
}
