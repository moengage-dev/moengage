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
    <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
      <div className="flex items-center gap-2 pb-4">
        <Filter className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold tracking-tight text-foreground">Heatmap Filters</h3>
      </div>
      <form onSubmit={handleApply} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 items-end">
        
        {/* Brand Filter */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Brand</Label>
          <Select value={brandId} onValueChange={setBrandId}>
            <SelectTrigger className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <SelectValue placeholder="All Brands" />
            </SelectTrigger>
            <SelectContent>
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
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Advertiser</Label>
          <Select value={advertiserId} onValueChange={setAdvertiserId}>
            <SelectTrigger className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <SelectValue placeholder="All Advertisers" />
            </SelectTrigger>
            <SelectContent>
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
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Campaign</Label>
          <Select value={campaignId} onValueChange={setCampaignId}>
            <SelectTrigger className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <SelectValue placeholder="All Campaigns" />
            </SelectTrigger>
            <SelectContent>
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
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Product</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <SelectValue placeholder="All Products" />
            </SelectTrigger>
            <SelectContent>
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
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Batch</Label>
          <Select value={batchId} onValueChange={setBatchId}>
            <SelectTrigger className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <SelectValue placeholder="All Batches" />
            </SelectTrigger>
            <SelectContent>
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startDate" className="text-xs font-semibold text-muted-foreground">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-background border-input text-foreground h-9 focus-visible:ring-ring"
          />
        </div>

        {/* End Date */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="endDate" className="text-xs font-semibold text-muted-foreground">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-background border-input text-foreground h-9 focus-visible:ring-ring"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 lg:col-span-3 xl:col-span-7 mt-2 justify-end pt-2 border-t border-border/40">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground h-9"
          >
            <X className="mr-2 h-4 w-4" />
            Clear
          </Button>
          <Button
            type="submit"
            className="h-9"
          >
            <Filter className="mr-2 h-4 w-4" />
            Apply Filters
          </Button>
        </div>
      </form>
    </div>
  );
}
