// src/components/forms/qr-code-form.tsx
"use client";

import React, { useEffect, useRef } from "react";
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
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<QRCodeFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(qrCodeSchema) as any,
    defaultValues,
  });

  const selectedType = watch("type");
  const selectedCampaignId = watch("campaignId");
  const selectedBatchId = watch("batchId");

  const isBatchDelivery = selectedType === "BATCH_DELIVERY";
  const isConsumerCampaign = selectedType === "CONSUMER_CAMPAIGN";

  // Auto-derive fields when campaign changes
  useEffect(() => {
    if (selectedCampaignId) {
      const camp = campaigns.find((c) => c.id === selectedCampaignId);
      if (camp) {
        setValue("brandId", camp.brandId);
        setValue("advertiserId", camp.advertiserId);
        if (camp.productId) {
          setValue("productId", camp.productId);
        }
      }
    }
  }, [selectedCampaignId, campaigns, setValue]);

  // Auto-derive fields when batch changes
  useEffect(() => {
    if (selectedBatchId) {
      const bat = batches.find((b) => b.id === selectedBatchId);
      if (bat) {
        setValue("brandId", bat.brandId);
        setValue("campaignId", bat.campaignId);
        if (bat.productId) {
          setValue("productId", bat.productId);
        }
      }
    }
  }, [selectedBatchId, batches, setValue]);

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

      {/* Campaign */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="campaignId">
          Campaign {isConsumerCampaign && <span className="text-destructive">*</span>}
        </label>
        <Controller
          name="campaignId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? ""}
              onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)}
            >
              <SelectTrigger id="campaignId">
                <SelectValue placeholder="Select campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.advertiser?.name ?? "No Advertiser"})
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

      {/* Batch */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="batchId">
          Batch {isBatchDelivery && <span className="text-destructive">*</span>}
        </label>
        <Controller
          name="batchId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? ""}
              onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)}
            >
              <SelectTrigger id="batchId">
                <SelectValue placeholder="Select batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.batchCode} ({b.campaign?.name ?? "No Campaign"})
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

      {/* Brand */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="brandId">
          Brand <span className="text-xs text-muted-foreground">(Optional / Auto-derived)</span>
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

      {/* Advertiser */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="advertiserId">
          Advertiser <span className="text-xs text-muted-foreground">(Optional / Auto-derived)</span>
        </label>
        <Controller
          name="advertiserId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? ""}
              onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)}
            >
              <SelectTrigger id="advertiserId">
                <SelectValue placeholder="Select advertiser" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {advertisers.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Product */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="productId">
          Product <span className="text-xs text-muted-foreground">(Optional / Auto-derived)</span>
        </label>
        <Controller
          name="productId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? ""}
              onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)}
            >
              <SelectTrigger id="productId">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
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
