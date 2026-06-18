// src/components/forms/retailer-form.tsx
"use client";

import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Map, { Marker, NavigationControl } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";
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
    watch,
    setValue,
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

  const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  const [isGeocoding, setIsGeocoding] = React.useState(false);
  const [mapCenter, setMapCenter] = React.useState<{ latitude: number; longitude: number; zoom: number } | null>(null);

  const latValue = watch("latitude");
  const lngValue = watch("longitude");

  const [precision, setPrecision] = React.useState<string>(initialData?.latitude ? "Saved coordinates" : "");
  const [formattedAddress, setFormattedAddress] = React.useState<string>(
    initialData?.latitude
      ? [initialData.address, initialData.suburb, initialData.city, initialData.region, initialData.country]
          .filter(Boolean)
          .join(", ")
      : ""
  );

  // Initialize map center if coordinates exist
  React.useEffect(() => {
    if (latValue && lngValue && !mapCenter) {
      setMapCenter({ latitude: latValue, longitude: lngValue, zoom: 12 });
    }
  }, [latValue, lngValue, mapCenter]);

  const getCountryCode = (countryName: string): string | undefined => {
    const mapping: Record<string, string> = {
      "nigeria": "NG",
      "ng": "NG",
      "united states": "US",
      "usa": "US",
      "united kingdom": "GB",
      "uk": "GB",
      "canada": "CA",
      "ca": "CA",
      "south africa": "ZA",
      "za": "ZA",
      "ghana": "GH",
      "gh": "GH",
      "kenya": "KE",
      "ke": "KE",
      "germany": "DE",
      "de": "DE",
      "france": "FR",
      "fr": "FR",
      "india": "IN",
      "in": "IN",
    };
    return mapping[countryName.toLowerCase().trim()];
  };

  const handleReverseGeocode = async (lat: number, lng: number) => {
    if (!maptilerKey) return;
    try {
      const res = await fetch(`https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${maptilerKey}`);
      if (!res.ok) throw new Error("Reverse geocoding failed");
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        setFormattedAddress(data.features[0].place_name || data.features[0].text || "");
      } else {
        setFormattedAddress(`Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
      setPrecision("Manually positioned");
    } catch (e) {
      console.error("Error in reverse geocoding:", e);
      setFormattedAddress(`Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      setPrecision("Manually positioned");
    }
  };

  const handleGeocode = async () => {
    if (!maptilerKey) {
      toast.error("MapTiler key is missing from environment variables.");
      return;
    }
    const country = watch("country") || "";
    const region = watch("region") || "";
    const city = watch("city") || "";
    const suburb = watch("suburb") || "";
    const address = watch("address") || "";

    const buildQuery = (parts: (string | undefined | null)[]) => {
      return parts.filter(Boolean).map(s => s!.trim()).join(", ");
    };

    const attempts = [
      // 1. Full exact address (address, suburb, city, region, country)
      buildQuery([address, suburb, city, region, country]),
      // 2. Street address + city + region + country
      buildQuery([address, city, region, country]),
      // 3. Suburb + city + region + country
      buildQuery([suburb, city, region, country]),
      // 4. City + region + country
      buildQuery([city, region, country]),
    ];

    // Remove duplicates or empty queries
    const uniqueAttempts = Array.from(new Set(attempts)).filter(Boolean);

    if (uniqueAttempts.length === 0) {
      toast.error("Please enter an address to search.");
      return;
    }

    setIsGeocoding(true);
    let foundFeature: any = null;
    let foundPrecision: string = "";

    try {
      // First pass: look for high-precision results (address, building, poi)
      for (const attemptQuery of uniqueAttempts) {
        if (!attemptQuery) continue;
        const url = new URL(`https://api.maptiler.com/geocoding/${encodeURIComponent(attemptQuery)}.json`);
        url.searchParams.append("key", maptilerKey);

        const countryCode = getCountryCode(country);
        if (countryCode) {
          url.searchParams.append("country", countryCode.toLowerCase());
        }

        if (mapCenter) {
          url.searchParams.append("proximity", `${mapCenter.longitude},${mapCenter.latitude}`);
        }

        const res = await fetch(url.toString());
        if (!res.ok) continue;
        const data = await res.json();

        if (data.features && data.features.length > 0) {
          const highPrecision = data.features.find((f: any) => {
            const types = f.place_type || [];
            return types.includes("address") || types.includes("building") || types.includes("poi");
          });

          if (highPrecision) {
            foundFeature = highPrecision;
            const primaryType = highPrecision.place_type?.[0] || "address";
            foundPrecision = primaryType === "address" ? "Exact match" : "Building/POI";
            break;
          }
        }
      }

      // Second pass: if no high-precision feature was found, find the first available centroid result
      if (!foundFeature) {
        for (const attemptQuery of uniqueAttempts) {
          if (!attemptQuery) continue;
          const url = new URL(`https://api.maptiler.com/geocoding/${encodeURIComponent(attemptQuery)}.json`);
          url.searchParams.append("key", maptilerKey);

          const countryCode = getCountryCode(country);
          if (countryCode) {
            url.searchParams.append("country", countryCode.toLowerCase());
          }

          if (mapCenter) {
            url.searchParams.append("proximity", `${mapCenter.longitude},${mapCenter.latitude}`);
          }

          const res = await fetch(url.toString());
          if (!res.ok) continue;
          const data = await res.json();

          if (data.features && data.features.length > 0) {
            foundFeature = data.features[0];
            const primaryType = foundFeature.place_type?.[0] || "centroid";
            foundPrecision = `${primaryType.charAt(0).toUpperCase() + primaryType.slice(1)} centroid`;
            break;
          }
        }
      }

      if (foundFeature) {
        const [lng, lat] = foundFeature.geometry.coordinates;
        const cleanLat = Number(lat.toFixed(7));
        const cleanLng = Number(lng.toFixed(7));
        setValue("latitude", cleanLat, { shouldValidate: true });
        setValue("longitude", cleanLng, { shouldValidate: true });
        setMapCenter({ latitude: lat, longitude: lng, zoom: 14 });
        setPrecision(foundPrecision);
        setFormattedAddress(foundFeature.place_name || foundFeature.text || "");
        toast.success(`Location found (${foundPrecision})`);
      } else {
        toast.error("Address not found. Please place the pin manually.", { duration: 4000 });
        setPrecision("");
        setFormattedAddress("");
        if (!latValue && !lngValue) {
          setMapCenter({ latitude: 6.5244, longitude: 3.3792, zoom: 6 });
        }
      }
    } catch (e) {
      toast.error("Error connecting to geocoding service.");
    } finally {
      setIsGeocoding(false);
    }
  };

  const onMarkerDragEnd = (event: any) => {
    const lat = event.lngLat.lat;
    const lng = event.lngLat.lng;
    const cleanLat = Number(lat.toFixed(7));
    const cleanLng = Number(lng.toFixed(7));
    setValue("latitude", cleanLat, { shouldValidate: true });
    setValue("longitude", cleanLng, { shouldValidate: true });
    handleReverseGeocode(cleanLat, cleanLng);
  };

  const onMapClick = (event: any) => {
    const lat = event.lngLat.lat;
    const lng = event.lngLat.lng;
    const cleanLat = Number(lat.toFixed(7));
    const cleanLng = Number(lng.toFixed(7));
    setValue("latitude", cleanLat, { shouldValidate: true });
    setValue("longitude", cleanLng, { shouldValidate: true });
    handleReverseGeocode(cleanLat, cleanLng);
  };

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

      <div className="flex justify-end">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleGeocode}
          disabled={isGeocoding || !maptilerKey}
          className="w-fit"
        >
          {isGeocoding ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="mr-2 h-4 w-4" />
          )}
          Find on Map
        </Button>
      </div>

      {maptilerKey && mapCenter && (
        <div className="relative mt-2 h-[300px] w-full rounded-xl border border-border/50 overflow-hidden shadow-sm">
          <Map
            initialViewState={mapCenter}
            mapStyle={`https://api.maptiler.com/maps/streets-v2/style.json?key=${maptilerKey}`}
            mapLib={maplibregl}
            style={{ width: "100%", height: "100%" }}
            onClick={onMapClick}
          >
            <NavigationControl position="top-right" />
            {(latValue !== undefined && lngValue !== undefined) && (
              <Marker
                latitude={latValue}
                longitude={lngValue}
                draggable={true}
                onDragEnd={onMarkerDragEnd}
                color="#f43f5e"
              />
            )}
          </Map>
        </div>
      )}

      {precision && (
        <div className="rounded-xl border border-border bg-card/50 p-4 backdrop-blur-xs flex flex-col gap-2 shadow-xs transition-all duration-300 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Location Precision
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                precision === "Exact match" || precision === "Building/POI" || precision === "Saved coordinates"
                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                  : precision === "Manually positioned"
                  ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                  : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
              )}
            >
              {precision}
            </span>
          </div>
          {formattedAddress && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-muted-foreground">Resolved Address</span>
              <p className="text-sm font-medium text-foreground">{formattedAddress}</p>
            </div>
          )}
          {(precision &&
            precision !== "Exact match" &&
            precision !== "Building/POI" &&
            precision !== "Saved coordinates" &&
            precision !== "Manually positioned") && (
            <div className="mt-1 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2 animate-pulse">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                The exact address was not found. The pin is currently placed at an approximate city location. Drag the pin to the correct outlet position.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Coordinates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="latitude">
            Latitude <span className="text-destructive">*</span>
          </label>
          <Input
            id="latitude"
            type="number"
            step="any"
            {...register("latitude")}
            placeholder="6.5244"
            readOnly={!!maptilerKey}
            className={maptilerKey ? "bg-muted cursor-not-allowed" : ""}
          />
          {errors.latitude && (
            <p className="text-xs text-destructive">{errors.latitude.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="longitude">
            Longitude <span className="text-destructive">*</span>
          </label>
          <Input
            id="longitude"
            type="number"
            step="any"
            {...register("longitude")}
            placeholder="3.3792"
            readOnly={!!maptilerKey}
            className={maptilerKey ? "bg-muted cursor-not-allowed" : ""}
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
