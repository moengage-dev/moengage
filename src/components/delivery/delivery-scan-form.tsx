// src/components/delivery/delivery-scan-form.tsx
"use client";

import React, { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  MapPin,
  FileText,
  Building2,
  Calendar,
  Layers,
  ArrowLeft,
  Navigation,
} from "lucide-react";
import Link from "next/link";
import { createDeliveryScanAction } from "@/app/d/[code]/actions";

type RetailerOption = {
  id: string;
  name: string;
  type: string | null;
  city: string | null;
  suburb: string | null;
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
};

export function DeliveryScanForm({ qrCode, retailers }: Props) {
  const [isPending, startTransition] = useTransition();
  const [successData, setSuccessData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [retailerSelection, setRetailerSelection] = useState<string>("_NEW_");
  const [retailerName, setRetailerName] = useState("");
  const [retailerType, setRetailerType] = useState<string>("RETAILER");
  const [country, setCountry] = useState("Tanzania");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [suburb, setSuburb] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [cartonsDelivered, setCartonsDelivered] = useState("1");
  const [notes, setNotes] = useState("");

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
        retailerType: retailerSelection === "_NEW_" ? (retailerType as any) : null,
        country: retailerSelection === "_NEW_" ? country : null,
        region: retailerSelection === "_NEW_" ? region : null,
        city: retailerSelection === "_NEW_" ? city : null,
        suburb: retailerSelection === "_NEW_" ? suburb : null,
        address: retailerSelection === "_NEW_" ? address : null,
        latitude: retailerSelection === "_NEW_" ? (latitude ? Number(latitude) : null) : null,
        longitude: retailerSelection === "_NEW_" ? (longitude ? Number(longitude) : null) : null,
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
          notes: notes,
        });
      } else {
        setError(res.error);
      }
    });
  }

  if (successData) {
    return (
      <Card className="bg-slate-900/60 border-slate-800/80 backdrop-blur-xl shadow-2xl relative overflow-hidden rounded-2xl max-w-md w-full animate-in fade-in duration-300">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500 to-teal-500" />
        <CardHeader className="text-center pb-4">
          <div className="mx-auto bg-emerald-500/10 border border-emerald-500/20 w-12 h-12 rounded-full flex items-center justify-center text-emerald-400 mb-3 shadow-lg shadow-emerald-500/10">
            <CheckCircle className="h-6 w-6 animate-pulse" />
          </div>
          <CardTitle className="text-xl font-bold text-slate-100">Delivery Logged</CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Cartons successfully recorded in system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-slate-950/55 border border-slate-800/60 rounded-xl p-4 space-y-4">
            <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
              <span className="text-slate-400">Retailer</span>
              <span className="font-semibold text-slate-200">{successData.retailerName}</span>
            </div>
            {successData.city && (
              <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                <span className="text-slate-400">Location</span>
                <span className="font-medium text-slate-300">
                  {successData.suburb ? `${successData.suburb}, ` : ""}
                  {successData.city}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
              <span className="text-slate-400">Cartons Delivered</span>
              <Badge variant="secondary" className="font-mono bg-slate-800 text-slate-200">
                {successData.cartonsDelivered} cartons
              </Badge>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
              <span className="text-slate-400">Units Per Carton</span>
              <span className="font-medium text-slate-300">{unitsPerCarton} units</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-1">
              <span className="text-emerald-400 font-medium">Estimated Units</span>
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                {successData.estimatedUnits.toLocaleString()} units
              </Badge>
            </div>
          </div>

          {successData.notes && (
            <div className="space-y-1.5 bg-slate-950/20 border border-slate-850 p-3 rounded-lg">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-semibold">
                Delivery Notes
              </span>
              <p className="text-xs text-slate-300 leading-relaxed italic">&quot;{successData.notes}&quot;</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              asChild
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/50"
            >
              <Link href="/retail" className="flex items-center justify-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Return to Dashboard
              </Link>
            </Button>
            <Button
              onClick={() => setSuccessData(null)}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold"
            >
              Log Another Delivery
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/60 border-slate-800/80 backdrop-blur-xl shadow-2xl relative overflow-hidden rounded-2xl w-full max-w-lg">
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-500 via-teal-500 to-emerald-500" />
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2.5">
          <div className="bg-blue-500/10 border border-blue-500/20 w-10 h-10 rounded-xl flex items-center justify-center text-blue-400">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg md:text-xl font-bold text-slate-100">
              Log Retail Placement
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Confirm batch arrival and carton drop-off.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Campaign / Batch read-only metadata cards */}
        <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-950/40 border border-slate-800/60 rounded-xl p-3.5 text-xs">
          <div className="space-y-1">
            <span className="text-slate-500 uppercase tracking-widest block text-[9px] font-semibold">
              Campaign
            </span>
            <span className="font-semibold text-slate-200 block truncate">
              {qrCode.campaign?.name ?? "N/A"}
            </span>
            <span className="text-slate-400 truncate block">
              {qrCode.campaign?.offerTitle ?? ""}
            </span>
          </div>
          <div className="space-y-1 border-l border-slate-800 pl-3.5">
            <span className="text-slate-500 uppercase tracking-widest block text-[9px] font-semibold">
              Batch Code
            </span>
            <span className="font-semibold text-slate-200 block truncate">
              {qrCode.batch?.batchCode ?? "N/A"}
            </span>
            <span className="text-slate-400 block">
              Units/Carton: <span className="font-semibold text-slate-300">{unitsPerCarton}</span>
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Retailer Select */}
          <div className="space-y-2">
            <Label htmlFor="retailerSelect" className="text-xs font-semibold text-slate-300">
              Select Retailer / Outlet
            </Label>
            <Select value={retailerSelection} onValueChange={setRetailerSelection}>
              <SelectTrigger
                id="retailerSelect"
                className="bg-slate-950 border-slate-800 text-slate-200 focus:border-teal-500"
              >
                <SelectValue placeholder="Select Outlet" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-850 text-slate-200">
                <SelectItem value="_NEW_" className="font-bold text-teal-400">
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

          {/* Conditional form fields for NEW retailer */}
          {retailerSelection === "_NEW_" && (
            <div className="space-y-4 bg-slate-950/25 border border-dashed border-slate-800/80 rounded-xl p-4 animate-in slide-in-from-top-3 duration-250">
              <div className="flex items-center gap-1.5 text-xs font-bold text-teal-400 mb-1">
                <Building2 className="h-3.5 w-3.5" />
                New Retailer Profile
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="retailerName" className="text-[11px] font-semibold text-slate-400">
                  Retailer Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="retailerName"
                  value={retailerName}
                  onChange={(e) => setRetailerName(e.target.value)}
                  placeholder="e.g. Dar Supermarket"
                  className="bg-slate-950 border-slate-800 text-xs focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="retailerType"
                    className="text-[11px] font-semibold text-slate-400"
                  >
                    Outlet Type
                  </Label>
                  <Select value={retailerType} onValueChange={setRetailerType}>
                    <SelectTrigger
                      id="retailerType"
                      className="bg-slate-950 border-slate-800 text-xs text-slate-200 focus:border-teal-500"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-850 text-slate-200">
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
                  <Label htmlFor="country" className="text-[11px] font-semibold text-slate-400">
                    Country
                  </Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Tanzania"
                    className="bg-slate-950 border-slate-800 text-xs focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="region" className="text-[11px] font-semibold text-slate-400">
                    Region
                  </Label>
                  <Input
                    id="region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="Dar es Salaam"
                    className="bg-slate-950 border-slate-800 text-[11px] focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-[11px] font-semibold text-slate-400">
                    City
                  </Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Dar es Salaam"
                    className="bg-slate-950 border-slate-800 text-[11px] focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="suburb" className="text-[11px] font-semibold text-slate-400">
                    Suburb
                  </Label>
                  <Input
                    id="suburb"
                    value={suburb}
                    onChange={(e) => setSuburb(e.target.value)}
                    placeholder="Ilala"
                    className="bg-slate-950 border-slate-800 text-[11px] focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-[11px] font-semibold text-slate-400">
                  Street Address
                </Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="12 Morogoro Road"
                  className="bg-slate-950 border-slate-800 text-xs focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="latitude" className="text-[11px] font-semibold text-slate-400">
                    Latitude (GPS)
                  </Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="-6.8235"
                    className="bg-slate-950 border-slate-800 text-xs focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="longitude" className="text-[11px] font-semibold text-slate-400">
                    Longitude (GPS)
                  </Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="39.2695"
                    className="bg-slate-950 border-slate-800 text-xs focus:border-teal-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Cartons Delivered */}
          <div className="space-y-2">
            <Label htmlFor="cartonsDelivered" className="text-xs font-semibold text-slate-300">
              Cartons Delivered <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="cartonsDelivered"
                type="number"
                min="1"
                required
                value={cartonsDelivered}
                onChange={(e) => setCartonsDelivered(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-200 focus:border-teal-500 font-mono font-bold text-lg max-w-[120px]"
              />
              <div className="flex-1 bg-slate-950/45 border border-slate-850 p-2.5 rounded-lg text-xs space-y-1 text-slate-400">
                <div className="flex justify-between">
                  <span>Units per Carton:</span>
                  <span className="font-semibold text-slate-300">{unitsPerCarton}</span>
                </div>
                <div className="flex justify-between border-t border-slate-850/80 pt-1 text-emerald-400 font-semibold">
                  <span>Estimated Total Units:</span>
                  <span>{estimatedUnits.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> Notes / Comments
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter details on delivery state or carton conditions..."
              rows={3}
              className="bg-slate-950 border-slate-800 text-slate-200 focus:border-teal-500 text-xs"
            />
          </div>

          {/* Error Banner */}
          {error && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-555 text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <div>
                <AlertTitle className="text-xs font-bold">Failed to log scan</AlertTitle>
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </div>
            </Alert>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              asChild
              type="button"
              variant="outline"
              className="border-slate-800 hover:bg-slate-900 text-slate-300 flex-1 py-5 rounded-xl text-xs"
            >
              <Link href="/retail">Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-gradient-to-r from-blue-500 via-teal-500 to-emerald-500 hover:from-blue-600 hover:via-teal-600 hover:to-emerald-600 text-white font-bold py-5 rounded-xl transition-all duration-300 hover:scale-[1.01] flex-[2] text-xs"
            >
              {isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Log Carton Delivery
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
