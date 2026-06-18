"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Search, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { CampaignOptionDTO, RetailerOptionDTO } from "@/lib/dtos/delivery.dto";

type FilterOptions = {
  brands: { id: string; name: string }[];
  advertisers: { id: string; name: string }[];
  campaigns: CampaignOptionDTO[];
  products: { id: string; name: string; brandId: string }[];
  batches: { id: string; batchCode: string; campaignId: string; productId: string | null }[];
  retailers: RetailerOptionDTO[];
  brandAdvertiserIds: Record<string, string[]>;
  locations: { country: string; region: string | null; city: string | null }[];
};

export function DeliveryFilters({ options }: { options: FilterOptions }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Compute initial state — auto-fill upstream fields from URL to keep cascade valid ──
  const urlBrandId     = searchParams.get("brandId")     || "all";
  const urlAdvertiserId = searchParams.get("advertiserId") || "all";
  const urlCampaignId  = searchParams.get("campaignId")  || "all";
  const urlBatchId     = searchParams.get("batchId")     || "all";

  // If batch is in URL but campaign is not, derive campaign from batch
  const derivedCampaignId = urlCampaignId !== "all"
    ? urlCampaignId
    : (urlBatchId !== "all"
        ? options.batches.find(b => b.id === urlBatchId)?.campaignId ?? "all"
        : "all");

  // If campaign is resolved but brand/advertiser are missing, derive from campaign
  const derivedCamp = derivedCampaignId !== "all"
    ? options.campaigns.find(c => c.id === derivedCampaignId) ?? null
    : null;
  const derivedBrandId      = urlBrandId      !== "all" ? urlBrandId      : (derivedCamp?.brandId      ?? "all");
  const derivedAdvertiserId = urlAdvertiserId !== "all" ? urlAdvertiserId : (derivedCamp?.advertiserId ?? "all");

  const [brandId,     setBrandId]     = useState(derivedBrandId);
  const [advertiserId, setAdvertiserId] = useState(derivedAdvertiserId);
  const [campaignId,  setCampaignId]  = useState(derivedCampaignId);
  const [productId,   setProductId]   = useState(searchParams.get("productId")  || "all");
  const [batchId,     setBatchId]     = useState(urlBatchId);
  const [retailerId,  setRetailerId]  = useState(searchParams.get("retailerId") || "all");
  const [startDate,   setStartDate]   = useState(searchParams.get("startDate")  || "");
  const [endDate,     setEndDate]     = useState(searchParams.get("endDate")    || "");
  const [country,     setCountry]     = useState(searchParams.get("country")    || "all");
  const [region,      setRegion]      = useState(searchParams.get("region")     || "all");
  const [city,        setCity]        = useState(searchParams.get("city")       || "all");

  // ── Disabled rules ──
  const advertiserDisabled = brandId === "all";
  const campaignDisabled   = brandId === "all" || advertiserId === "all";
  const productDisabled    = campaignId === "all";
  const batchDisabled      = campaignId === "all";
  const retailerDisabled   = brandId === "all";
  const regionDisabled     = country === "all";
  const cityDisabled       = region  === "all";

  // ── Derived filtered options ──
  const filteredAdvertisers = useMemo(() => {
    if (brandId === "all") return [];
    const allowed = options.brandAdvertiserIds[brandId] ?? [];
    return options.advertisers.filter(a => allowed.includes(a.id));
  }, [brandId, options.advertisers, options.brandAdvertiserIds]);

  const filteredCampaigns = useMemo(() => {
    if (brandId === "all" || advertiserId === "all") return [];
    return options.campaigns.filter(c =>
      c.brandId === brandId && c.advertiserId === advertiserId
    );
  }, [brandId, advertiserId, options.campaigns]);

  const filteredProducts = useMemo(() => {
    if (campaignId === "all") return [];
    const ids = new Set<string>();
    // From campaign's own productId
    const camp = options.campaigns.find(c => c.id === campaignId);
    if (camp?.productId) ids.add(camp.productId);
    // From batches belonging to this campaign
    for (const b of options.batches) {
      if (b.campaignId === campaignId && b.productId) ids.add(b.productId);
    }
    return options.products.filter(p => ids.has(p.id));
  }, [campaignId, options.campaigns, options.batches, options.products]);

  const filteredBatches = useMemo(() => {
    if (campaignId === "all") return [];
    return options.batches.filter(b => {
      if (b.campaignId !== campaignId) return false;
      if (productId !== "all" && b.productId !== productId) return false;
      return true;
    });
  }, [campaignId, productId, options.batches]);

  const filteredRetailers = useMemo(() => {
    if (brandId === "all") return [];
    return options.retailers.filter(r => !r.brandId || r.brandId === brandId);
  }, [brandId, options.retailers]);

  const countries = useMemo(() =>
    [...new Set(options.locations.map(l => l.country))].sort(),
    [options.locations]
  );

  const regions = useMemo(() => {
    if (country === "all") return [];
    return [...new Set(
      options.locations.filter(l => l.country === country && l.region).map(l => l.region!)
    )].sort();
  }, [country, options.locations]);

  const cities = useMemo(() => {
    if (country === "all" || region === "all") return [];
    return [...new Set(
      options.locations
        .filter(l => l.country === country && l.region === region && l.city)
        .map(l => l.city!)
    )].sort();
  }, [country, region, options.locations]);

  // ── Cascade handlers — upstream change resets all downstream to "all" ──
  const handleBrandChange = (val: string) => {
    setBrandId(val);
    setAdvertiserId("all");
    setCampaignId("all");
    setProductId("all");
    setBatchId("all");
    setRetailerId("all");
  };

  const handleAdvertiserChange = (val: string) => {
    setAdvertiserId(val);
    setCampaignId("all");
    setProductId("all");
    setBatchId("all");
  };

  const handleCampaignChange = (val: string) => {
    setCampaignId(val);
    setProductId("all");
    setBatchId("all");
  };

  const handleProductChange = (val: string) => {
    setProductId(val);
    setBatchId("all");
  };

  const handleCountryChange = (val: string) => {
    setCountry(val);
    setRegion("all");
    setCity("all");
  };

  const handleRegionChange = (val: string) => {
    setRegion(val);
    setCity("all");
  };

  // ── Apply / Clear ──
  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (brandId      !== "all") params.set("brandId",      brandId);
    if (advertiserId !== "all") params.set("advertiserId", advertiserId);
    if (campaignId   !== "all") params.set("campaignId",   campaignId);
    if (productId    !== "all") params.set("productId",    productId);
    if (batchId      !== "all") params.set("batchId",      batchId);
    if (retailerId   !== "all") params.set("retailerId",   retailerId);
    if (startDate)               params.set("startDate",    startDate);
    if (endDate)                 params.set("endDate",      endDate);
    if (country !== "all")       params.set("country",      country);
    if (region  !== "all")       params.set("region",       region);
    if (city    !== "all")       params.set("city",         city);
    router.push(`${pathname}?${params.toString()}`);
  }, [brandId, advertiserId, campaignId, productId, batchId, retailerId,
      startDate, endDate, country, region, city, pathname, router]);

  const clearFilters = () => {
    setBrandId("all");
    setAdvertiserId("all");
    setCampaignId("all");
    setProductId("all");
    setBatchId("all");
    setRetailerId("all");
    setStartDate("");
    setEndDate("");
    setCountry("all");
    setRegion("all");
    setCity("all");
    router.push(pathname);
  };

  return (
    <div className="bg-card rounded-xl border border-border/50 p-4 mb-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-foreground">
        <Filter className="w-4 h-4" /> Filters
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">

        {/* Brand — always enabled */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Brand</label>
          <Select value={brandId} onValueChange={handleBrandChange}>
            <SelectTrigger><SelectValue placeholder="All Brands" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {options.brands.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Advertiser — disabled until Brand selected */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Advertiser</label>
          <Select
            value={advertiserDisabled ? "" : advertiserId}
            onValueChange={handleAdvertiserChange}
            disabled={advertiserDisabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={advertiserDisabled ? "Select a Brand first…" : "All Advertisers"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Advertisers</SelectItem>
              {filteredAdvertisers.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Campaign — disabled until Brand + Advertiser selected */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Campaign</label>
          <Select
            value={campaignDisabled ? "" : campaignId}
            onValueChange={handleCampaignChange}
            disabled={campaignDisabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={
                brandId      === "all" ? "Select a Brand first…"
              : advertiserId === "all" ? "Select an Advertiser first…"
              : "All Campaigns"
              } />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {filteredCampaigns.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Product — disabled until Campaign selected */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Product</label>
          <Select
            value={productDisabled ? "" : productId}
            onValueChange={handleProductChange}
            disabled={productDisabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={productDisabled ? "Select a Campaign first…" : "All Products"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              {filteredProducts.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Batch — disabled until Campaign selected */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Batch</label>
          <Select
            value={batchDisabled ? "" : batchId}
            onValueChange={setBatchId}
            disabled={batchDisabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={batchDisabled ? "Select a Campaign first…" : "All Batches"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {filteredBatches.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.batchCode}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Retailer — disabled until Brand selected */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Retailer</label>
          <Select
            value={retailerDisabled ? "" : retailerId}
            onValueChange={setRetailerId}
            disabled={retailerDisabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={retailerDisabled ? "Select a Brand first…" : "All Retailers"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Retailers</SelectItem>
              {filteredRetailers.map(r => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Country — always enabled; populated from delivery records */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Country</label>
          <Select value={country} onValueChange={handleCountryChange}>
            <SelectTrigger><SelectValue placeholder="All Countries" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {countries.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Region — disabled until Country selected */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Region</label>
          <Select
            value={regionDisabled ? "" : region}
            onValueChange={handleRegionChange}
            disabled={regionDisabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={regionDisabled ? "Select a Country first…" : "All Regions"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {regions.map(r => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* City — disabled until Region selected */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">City</label>
          <Select
            value={cityDisabled ? "" : city}
            onValueChange={setCity}
            disabled={cityDisabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={cityDisabled ? "Select a Region first…" : "All Cities"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Start Date</label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">End Date</label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={clearFilters}>
          <X className="w-4 h-4 mr-2" /> Clear
        </Button>
        <Button size="sm" onClick={applyFilters}>
          <Search className="w-4 h-4 mr-2" /> Apply Filters
        </Button>
      </div>
    </div>
  );
}
