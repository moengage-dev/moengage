// src/components/forms/retailer-form.tsx
"use client";

import React from "react";
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
import { retailerSchema } from "@/lib/validators/retailer.validator";
import type { RetailerFormValues } from "@/lib/validators/retailer.validator";
import type { RetailerRow } from "@/server/services/retailers.service";
import type { ActionResult } from "@/app/admin/retailers/actions";

const RETAILER_TYPES = [
  "RETAILER",
  "DISTRIBUTOR",
  "KIOSK",
  "SUPERMARKET",
  "WHOLESALER",
  "OUTLET",
  "OTHER",
] as const;

type BrandOption = { id: string; name: string };

type Props = {
  initialData?: RetailerRow;
  brands: BrandOption[];
  onSubmitAction: (values: RetailerFormValues) => Promise<ActionResult>;
  onSuccess?: () => void;
};

export function RetailerForm({ initialData, brands, onSubmitAction, onSuccess }: Props) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RetailerFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(retailerSchema) as any,
    defaultValues: {
      brandId: initialData?.brandId ?? undefined,
      name: initialData?.name ?? "",
      type: (initialData?.type as RetailerFormValues["type"]) ?? undefined,
      country: initialData?.country ?? "",
      region: initialData?.region ?? "",
      city: initialData?.city ?? "",
      suburb: initialData?.suburb ?? "",
      address: initialData?.address ?? "",
      latitude: initialData?.latitude ?? undefined,
      longitude: initialData?.longitude ?? undefined,
    },
  });

  const onSubmit = async (values: RetailerFormValues) => {
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
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="name">
          Retailer Name <span className="text-destructive">*</span>
        </label>
        <Input
          id="name"
          {...register("name")}
          placeholder="e.g. Fresh Mart Lagos"
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Brand */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="brandId">
          Brand <span className="text-muted-foreground text-xs font-normal">(optional)</span>
        </label>
        <Controller
          name="brandId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? "__none__"}
              onValueChange={(val) => field.onChange(val === "__none__" ? undefined : val)}
            >
              <SelectTrigger id="brandId">
                <SelectValue placeholder="None (unassigned)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None (unassigned)</SelectItem>
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

      {/* Outlet Type */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="type">
          Outlet Type
        </label>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? "__none__"}
              onValueChange={(val) => field.onChange(val === "__none__" ? undefined : val)}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Select type (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {RETAILER_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Country / Region */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="country">
            Country
          </label>
          <Input id="country" {...register("country")} placeholder="Nigeria" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="region">
            State / Region
          </label>
          <Input id="region" {...register("region")} placeholder="Lagos" />
        </div>
      </div>

      {/* City / Suburb */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="city">
            City
          </label>
          <Input id="city" {...register("city")} placeholder="Ikeja" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="suburb">
            Suburb
          </label>
          <Input id="suburb" {...register("suburb")} placeholder="Allen Ave" />
        </div>
      </div>

      {/* Address */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="address">
          Street Address
        </label>
        <Input
          id="address"
          {...register("address")}
          placeholder="12 Commerce Street"
        />
      </div>

      {/* Coordinates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="latitude">
            Latitude
          </label>
          <Input
            id="latitude"
            type="number"
            step="any"
            {...register("latitude")}
            placeholder="6.5244"
          />
          {errors.latitude && (
            <p className="text-xs text-destructive">{errors.latitude.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="longitude">
            Longitude
          </label>
          <Input
            id="longitude"
            type="number"
            step="any"
            {...register("longitude")}
            placeholder="3.3792"
          />
          {errors.longitude && (
            <p className="text-xs text-destructive">{errors.longitude.message}</p>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        GPS coordinates enable this retailer to appear on delivery heatmaps.
      </p>

      <Button type="submit" disabled={isSubmitting} className="mt-2">
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {initialData ? "Save Changes" : "Add Retailer"}
      </Button>
    </form>
  );
}
