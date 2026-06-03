// src/components/heatmaps/heatmap-filters.tsx
"use client";

import React, { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Filter } from "lucide-react";

interface Option {
  id: string;
  name: string;
}

interface HeatmapFiltersProps {
  options: {
    brands: Option[];
    advertisers: Option[];
    campaigns: Option[];
    products: Option[];
    batches: Option[];
  };
  initialFilters: {
    brandId?: string;
    advertiserId?: string;
    campaignId?: string;
    productId?: string;
    batchId?: string;
    startDate?: string;
    endDate?: string;
  };
}

export function HeatmapFilters({ options, initialFilters }: HeatmapFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [brandId, setBrandId] = useState(initialFilters.brandId ?? "all");
  const [advertiserId, setAdvertiserId] = useState(initialFilters.advertiserId ?? "all");
  const [campaignId, setCampaignId] = useState(initialFilters.campaignId ?? "all");
  const [productId, setProductId] = useState(initialFilters.productId ?? "all");
  const [batchId, setBatchId] = useState(initialFilters.batchId ?? "all");
  const [startDate, setStartDate] = useState(initialFilters.startDate ?? "");
  const [endDate, setEndDate] = useState(initialFilters.endDate ?? "");

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());

    if (brandId && brandId !== "all") params.set("brandId", brandId);
    else params.delete("brandId");

    if (advertiserId && advertiserId !== "all") params.set("advertiserId", advertiserId);
    else params.delete("advertiserId");

    if (campaignId && campaignId !== "all") params.set("campaignId", campaignId);
    else params.delete("campaignId");

    if (productId && productId !== "all") params.set("productId", productId);
    else params.delete("productId");

    if (batchId && batchId !== "all") params.set("batchId", batchId);
    else params.delete("batchId");

    if (startDate) params.set("startDate", startDate);
    else params.delete("startDate");

    if (endDate) params.set("endDate", endDate);
    else params.delete("endDate");

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClear = () => {
    setBrandId("all");
    setAdvertiserId("all");
    setCampaignId("all");
    setProductId("all");
    setBatchId("all");
    setStartDate("");
    setEndDate("");
    router.push(pathname);
  };

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="pt-6">
        <form onSubmit={handleApply} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            
            {/* Brand Filter */}
            <div className="space-y-2">
              <Label className="text-slate-350 text-xs">Brand</Label>
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200 h-9">
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-slate-800 text-slate-200">
                  <SelectItem value="all">All Brands</SelectItem>
                  {options.brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Advertiser Filter */}
            <div className="space-y-2">
              <Label className="text-slate-350 text-xs">Advertiser</Label>
              <Select value={advertiserId} onValueChange={setAdvertiserId}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200 h-9">
                  <SelectValue placeholder="All Advertisers" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-slate-800 text-slate-200">
                  <SelectItem value="all">All Advertisers</SelectItem>
                  {options.advertisers.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campaign Filter */}
            <div className="space-y-2">
              <Label className="text-slate-350 text-xs">Campaign</Label>
              <Select value={campaignId} onValueChange={setCampaignId}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200 h-9">
                  <SelectValue placeholder="All Campaigns" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-slate-800 text-slate-200">
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {options.campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product Filter */}
            <div className="space-y-2">
              <Label className="text-slate-350 text-xs">Product</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200 h-9">
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-slate-800 text-slate-200">
                  <SelectItem value="all">All Products</SelectItem>
                  {options.products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Batch Filter */}
            <div className="space-y-2">
              <Label className="text-slate-350 text-xs">Batch</Label>
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200 h-9">
                  <SelectValue placeholder="All Batches" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-slate-800 text-slate-200">
                  <SelectItem value="all">All Batches</SelectItem>
                  {options.batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-slate-355 text-xs">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-955 border-slate-800 text-slate-200 h-9 focus-visible:ring-indigo-500"
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-slate-355 text-xs">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-955 border-slate-800 text-slate-200 h-9 focus-visible:ring-indigo-500"
              />
            </div>

          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/60">
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              className="border-slate-850 hover:bg-slate-850 text-slate-400 hover:text-slate-200 h-9"
            >
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-550 text-white h-9"
            >
              <Filter className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
