// src/components/delivery/delivery-scan-form.tsx
"use client";

import React, { useState, useTransition, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Truck,
  CheckCircle,
  AlertTriangle,
  Loader2,
  FileText,
  Building2,
  Navigation,
  RefreshCw,
  WifiOff,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { createDeliveryScanAction } from "@/app/d/[code]/actions";
import type { RetailerType } from "@/lib/validators/delivery-scan.validator";

type RetailerOption = {
  id: string;
  name: string;
  type: string | null;
  city: string | null;
  suburb: string | null;
};

type IpLocationData = {
  latitude: number | null;
  longitude: number | null;
  country: string | null;
  region: string | null;
  city: string | null;
};

type LocationState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "gps"; lat: number; lng: number }
  | { status: "ip"; lat: number | null; lng: number | null }
  | { status: "unavailable" };

type DeliveryScanSuccessData = {
  cartonsDelivered: number;
  estimatedUnits: number;
  retailerName: string | undefined;
  city: string | null | undefined;
  suburb: string | null | undefined;
  notes: string;
};

type Props = {
  qrCode: {
    id: string;
    code: string;
    brandId: string | null;
    brand?: { name: string } | null;
    campaignId: string | null;
    campaign?: { name: string; offerTitle: string } | null;
    productId: string | null;
    product?: { name: string } | null;
    batchId: string | null;
    batch?: { batchCode: string; unitsPerCarton: number | null } | null;
  };
  retailers: RetailerOption[];
  ipLocation?: IpLocationData;
};

function locationLabel(state: LocationState): string {
  if (state.status === "gps") return "Precise device location";
  if (state.status === "ip") return state.lat !== null ? "Approximate IP location" : "Location unavailable";
  if (state.status === "unavailable") return "Location unavailable";
  return "Requesting location…";
}

export function DeliveryScanForm({ qrCode, retailers, ipLocation }: Props) {
  const [isPending, startTransition] = useTransition();
  const [successData, setSuccessData] = useState<DeliveryScanSuccessData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [retailerSelection, setRetailerSelection] = useState<string>("_NEW_");
  const [retailerName, setRetailerName] = useState("");
  const [retailerType, setRetailerType] = useState<RetailerType>("RETAILER");
  const [country, setCountry] = useState(ipLocation?.country ?? "Tanzania");
  const [region, setRegion] = useState(ipLocation?.region ?? "");
  const [city, setCity] = useState(ipLocation?.city ?? "");
  const [suburb, setSuburb] = useState("");
  const [address, setAddress] = useState("");
  const [cartonsDelivered, setCartonsDelivered] = useState("1");
  const [notes, setNotes] = useState("");

  // Location state
  const [locationState, setLocationState] = useState<LocationState>({ status: "idle" });
  const geoRequested = useRef(false);

  // Request geolocation on mount (once only)
  useEffect(() => {
    if (geoRequested.current) return;
    geoRequested.current = true;
    requestGeolocation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function requestGeolocation() {
    if (!navigator.geolocation) {
      // Fall back to IP immediately
      applyIpFallback();
      return;
    }
    setLocationState({ status: "requesting" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationState({
          status: "gps",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        applyIpFallback();
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }

  function applyIpFallback() {
    if (ipLocation?.latitude != null || ipLocation?.longitude != null) {
      setLocationState({
        status: "ip",
        lat: ipLocation?.latitude ?? null,
        lng: ipLocation?.longitude ?? null,
      });
    } else {
      setLocationState({ status: "unavailable" });
    }
  }

  const coordLat =
    locationState.status === "gps"
      ? locationState.lat
      : locationState.status === "ip"
      ? locationState.lat
      : null;
  const coordLng =
    locationState.status === "gps"
      ? locationState.lng
      : locationState.status === "ip"
      ? locationState.lng
      : null;

  const locationSource: "GPS" | "IP" | "MANUAL" =
    locationState.status === "gps"
      ? "GPS"
      : locationState.status === "ip" && coordLat !== null
      ? "IP"
      : "MANUAL";

  const unitsPerCarton = qrCode.batch?.unitsPerCarton ?? 0;
  const cartonsNum = Number.parseInt(cartonsDelivered, 10) || 0;
  const estimatedUnits = cartonsNum * unitsPerCarton;

  const selectedRetailerObject = retailers.find((r) => r.id === retailerSelection);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cartons = Number.parseInt(cartonsDelivered, 10);
    if (Number.isNaN(cartons) || cartons <= 0) {
      setError("Please enter a valid positive number of cartons.");
      return;
    }
    if (retailerSelection === "_NEW_" && !retailerName.trim()) {
      setError("Retailer name is required for new retailers.");
      return;
    }

    startTransition(async () => {
      const payload = {
        qrCodeId: qrCode.id,
        batchId: qrCode.batchId!,
        retailerId: retailerSelection === "_NEW_" ? null : retailerSelection,
        retailerName: retailerSelection === "_NEW_" ? retailerName : null,
        retailerType: retailerSelection === "_NEW_" ? retailerType : null,
        country: retailerSelection === "_NEW_" ? country : null,
        region: retailerSelection === "_NEW_" ? region : null,
        city: retailerSelection === "_NEW_" ? city : null,
        suburb: retailerSelection === "_NEW_" ? suburb : null,
        address: retailerSelection === "_NEW_" ? address : null,
        latitude: coordLat,
        longitude: coordLng,
        locationSource,
        cartonsDelivered: cartons,
        notes: notes || null,
      };

      const res = await createDeliveryScanAction(payload);
      if (res.ok) {
        setSuccessData({
          cartonsDelivered: cartons,
          estimatedUnits,
          retailerName: retailerSelection === "_NEW_" ? retailerName : selectedRetailerObject?.name,
          city: retailerSelection === "_NEW_" ? city : selectedRetailerObject?.city,
          suburb: retailerSelection === "_NEW_" ? suburb : selectedRetailerObject?.suburb,
          notes,
        });
      } else {
        setError(res.error);
      }
    });
  }

  // Success screen
  if (successData) {
    return (
      <Card className="public-card overflow-hidden">
        <div className="h-1.5 bg-brand-teal w-full" />
        <CardHeader className="text-center pb-4">
          <div className="mx-auto bg-brand-teal/15 border border-brand-teal/30 w-12 h-12 rounded-2xl flex items-center justify-center text-foreground mb-3">
            <CheckCircle className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold text-foreground">Delivery Logged</CardTitle>
          <CardDescription className="text-muted-foreground text-xs">
            Cartons successfully recorded in system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="bg-muted/30 border border-border/40 rounded-xl p-4 space-y-3 text-sm">
            <div className="flex justify-between border-b border-border/30 pb-2">
              <span className="text-muted-foreground">Retailer</span>
              <span className="font-semibold text-foreground">{successData.retailerName}</span>
            </div>
            {successData.city && (
              <div className="flex justify-between border-b border-border/30 pb-2">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium">
                  {successData.suburb ? `${successData.suburb}, ` : ""}
                  {successData.city}
                </span>
              </div>
            )}
            <div className="flex justify-between border-b border-border/30 pb-2">
              <span className="text-muted-foreground">Cartons Delivered</span>
              <Badge variant="secondary" className="font-mono">{successData.cartonsDelivered} cartons</Badge>
            </div>
            <div className="flex justify-between border-b border-border/30 pb-2">
              <span className="text-muted-foreground">Units Per Carton</span>
              <span className="font-medium">{unitsPerCarton} units</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-foreground font-medium">Estimated Units</span>
              <Badge className="bg-brand-teal/15 text-foreground border border-brand-teal/30 font-bold">
                {successData.estimatedUnits.toLocaleString()} units
              </Badge>
            </div>
          </div>

          {successData.notes && (
            <div className="space-y-1 bg-muted/20 border border-border/30 p-3 rounded-lg">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest block font-semibold">Delivery Notes</span>
              <p className="text-xs text-muted-foreground italic">&quot;{successData.notes}&quot;</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button asChild variant="outline" className="w-full">
              <Link href="/retail" className="flex items-center justify-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Return to Dashboard
              </Link>
            </Button>
            <Button
              onClick={() => {
                setSuccessData(null);
                setLocationState({ status: "idle" });
                geoRequested.current = false;
                // Re-request location for the next scan
                setTimeout(requestGeolocation, 100);
              }}
              className="w-full"
            >
              Log Another Delivery
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="public-card overflow-hidden w-full">
      <div className="h-1.5 bg-gradient-to-r from-brand-teal via-primary to-brand-yellow w-full" />
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-brand-teal/10 border border-brand-teal/20 w-10 h-10 rounded-xl flex items-center justify-center text-foreground">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-foreground">Log Retail Placement</CardTitle>
            <CardDescription className="text-xs">Confirm batch arrival and carton drop-off.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Campaign metadata */}
        <div className="grid grid-cols-2 gap-3 mb-6 bg-muted/30 border border-border/40 rounded-xl p-4 text-xs">
          <div className="space-y-1">
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold block">Campaign</span>
            <span className="font-semibold text-foreground block truncate">{qrCode.campaign?.name ?? "N/A"}</span>
            <span className="text-muted-foreground truncate block">{qrCode.campaign?.offerTitle ?? ""}</span>
          </div>
          <div className="space-y-1 border-l border-border/40 pl-4">
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold block">Batch Code</span>
            <span className="font-semibold text-foreground block truncate">{qrCode.batch?.batchCode ?? "N/A"}</span>
            <span className="text-muted-foreground block">
              Units/Carton: <span className="font-semibold text-foreground">{unitsPerCarton}</span>
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Retailer Select */}
          <div className="space-y-2">
            <Label htmlFor="retailerSelect" className="text-xs font-semibold text-foreground">
              Select Retailer / Outlet
            </Label>
            <Select value={retailerSelection} onValueChange={setRetailerSelection}>
              <SelectTrigger id="retailerSelect">
                <SelectValue placeholder="Select Outlet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_NEW_" className="font-bold text-foreground">
                  + Add New Retailer
                </SelectItem>
                {retailers.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} {r.city ? `(${r.city}${r.suburb ? `, ${r.suburb}` : ""})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* New retailer fields */}
          {retailerSelection === "_NEW_" && (
            <div className="space-y-4 bg-muted/20 border border-dashed border-border/60 rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Building2 className="h-3.5 w-3.5" />
                New Retailer Profile
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="retailerName" className="text-[11px] font-semibold text-muted-foreground">
                  Retailer Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="retailerName"
                  value={retailerName}
                  onChange={(e) => setRetailerName(e.target.value)}
                  placeholder="e.g. Dar Supermarket"
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="retailerType" className="text-[11px] font-semibold text-muted-foreground">
                    Outlet Type
                  </Label>
                  <Select
                    value={retailerType}
                    onValueChange={(value) => setRetailerType(value as RetailerType)}
                  >
                    <SelectTrigger id="retailerType" className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RETAILER">Retailer</SelectItem>
                      <SelectItem value="DISTRIBUTOR">Distributor</SelectItem>
                      <SelectItem value="KIOSK">Kiosk</SelectItem>
                      <SelectItem value="SUPERMARKET">Supermarket</SelectItem>
                      <SelectItem value="WHOLESALER">Wholesaler</SelectItem>
                      <SelectItem value="OUTLET">Outlet</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="country" className="text-[11px] font-semibold text-muted-foreground">
                    Country
                  </Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Tanzania"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="region" className="text-[11px] font-semibold text-muted-foreground">Region</Label>
                  <Input id="region" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Dar es Salaam" className="text-[11px]" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-[11px] font-semibold text-muted-foreground">City</Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Dar es Salaam" className="text-[11px]" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="suburb" className="text-[11px] font-semibold text-muted-foreground">Suburb</Label>
                  <Input id="suburb" value={suburb} onChange={(e) => setSuburb(e.target.value)} placeholder="Ilala" className="text-[11px]" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-[11px] font-semibold text-muted-foreground">Street Address</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="12 Morogoro Road" className="text-xs" />
              </div>
            </div>
          )}

          {/* Location Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Navigation className="h-3.5 w-3.5 text-foreground" />
                Device Location
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  geoRequested.current = false;
                  requestGeolocation();
                }}
                disabled={locationState.status === "requesting"}
                className="text-xs text-muted-foreground h-7 px-2"
                aria-label="Retry location detection"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${locationState.status === "requesting" ? "animate-spin" : ""}`} />
                {locationState.status === "requesting" ? "Detecting…" : "Retry"}
              </Button>
            </div>

            {/* Location status badge */}
            <div className="flex items-center gap-2 text-xs py-1">
              {locationState.status === "requesting" && (
                <span className="flex items-center gap-1.5 text-primary">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Requesting device location…
                </span>
              )}
              {locationState.status === "gps" && (
                <span className="sr-only">
                  Precise device location
                </span>
              )}
              {locationState.status === "ip" && (
                <span className="sr-only">
                  {locationState.lat !== null ? "Approximate IP location" : "Location unavailable"}
                </span>
              )}
              {(locationState.status === "unavailable" || locationState.status === "idle") && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <WifiOff className="h-3.5 w-3.5" />
                  Location unavailable
                </span>
              )}
            </div>

            {/* Read-only coordinate display */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lat-display" className="text-[11px] font-semibold text-muted-foreground">
                  Latitude
                </Label>
                <Input
                  id="lat-display"
                  readOnly
                  disabled
                  value={coordLat !== null ? coordLat.toFixed(6) : ""}
                  placeholder="—"
                  className="text-xs bg-muted/30 cursor-not-allowed"
                  aria-label={`Latitude: ${locationLabel(locationState)}`}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lng-display" className="text-[11px] font-semibold text-muted-foreground">
                  Longitude
                </Label>
                <Input
                  id="lng-display"
                  readOnly
                  disabled
                  value={coordLng !== null ? coordLng.toFixed(6) : ""}
                  placeholder="—"
                  className="text-xs bg-muted/30 cursor-not-allowed"
                  aria-label={`Longitude: ${locationLabel(locationState)}`}
                />
              </div>
            </div>

            {locationState.status === "unavailable" && (
              <p className="text-xs text-primary flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                No location available — delivery will be recorded without coordinates.
              </p>
            )}
          </div>

          {/* Cartons Delivered */}
          <div className="space-y-2">
            <Label htmlFor="cartonsDelivered" className="text-xs font-semibold text-foreground">
              Cartons Delivered <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="cartonsDelivered"
                type="number"
                min="1"
                max="100000"
                required
                value={cartonsDelivered}
                onChange={(e) => setCartonsDelivered(e.target.value)}
                className="font-mono font-bold text-lg max-w-[120px]"
              />
              <div className="flex-1 bg-muted/30 border border-border/40 p-2.5 rounded-lg text-xs space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Units per Carton:</span>
                  <span className="font-semibold text-foreground">{unitsPerCarton}</span>
                </div>
                <div className="flex justify-between border-t border-border/30 pt-1 text-foreground font-semibold">
                  <span>Estimated Total Units:</span>
                  <span>{estimatedUnits.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-xs font-semibold text-foreground flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              Notes / Comments
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter details on delivery state or carton conditions…"
              rows={3}
              className="text-xs"
            />
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <div>
                <AlertTitle className="text-xs font-bold">Failed to log scan</AlertTitle>
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </div>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button asChild type="button" variant="outline" className="flex-1">
              <Link href="/retail">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isPending} className="flex-[2]">
              {isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Log Carton Delivery
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
