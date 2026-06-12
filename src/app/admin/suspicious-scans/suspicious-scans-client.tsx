// src/app/admin/suspicious-scans/suspicious-scans-client.tsx
"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format";
import { toggleScanSuspicious } from "./actions";
import {
  ShieldAlert,
  ShieldCheck,
  Filter,
  FileText,
  User,
  Globe,
  Monitor,
} from "lucide-react";

type SuspiciousScanRow = {
  id: string;
  createdAt: Date;
  anonymousVisitorId: string | null;
  ipHash: string | null;
  userAgent: string | null;
  deviceType: string | null;
  os: string | null;
  browser: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  isRepeatScan: boolean;
  isSuspicious: boolean;
  suspiciousReason: string | null;
  isBillable: boolean;
  hitCount: number;
  suspiciousCount: number;
  billableCount: number;
  brand: { name: string } | null;
  advertiser: { name: string } | null;
  campaign: { name: string } | null;
  qrCode: { code: string };
};

type BrandOption = { id: string; name: string };
type AdvertiserOption = { id: string; name: string };
type CampaignOption = { id: string; name: string };

type PageData = {
  totalSuspicious: number;
  reasonGroups: { reason: string; count: number }[];
  recentScans: SuspiciousScanRow[];
  brands: BrandOption[];
  advertisers: AdvertiserOption[];
  campaigns: CampaignOption[];
};

function LocalTableSection({
  title,
  description,
  headers,
  children,
  hasData = true,
}: {
  title: string;
  description?: string;
  headers: string[];
  children: React.ReactNode;
  hasData?: boolean;
}) {
  return (
    <div className="bg-card rounded-2xl p-8 border border-border/50 shadow-sm flex flex-col justify-between h-full overflow-hidden">
      <div>
        <div className="pb-6">
          <h3 className="text-lg font-semibold tracking-tight text-[#2C2621]">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-1 leading-normal">
              {description}
            </p>
          )}
        </div>

        {!hasData ? (
          <div className="text-center py-10 text-xs text-muted-foreground/75 italic border border-border/30 rounded-xl bg-transparent">
            No suspicious scans logged matching the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[800px] text-left border-collapse text-xs bg-transparent">
              <thead>
                <tr>
                  {headers.map((header, idx) => (
                    <th
                      key={idx}
                      className={`text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 pb-4 border-b border-border/40 px-3 whitespace-nowrap ${
                        header.toLowerCase().includes("counts") ||
                        header.toLowerCase().includes("actions")
                          ? "text-right"
                          : "text-left"
                      }`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {children}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function SuspiciousScansClient({ data }: { data: PageData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Filters State
  const [brandId, setBrandId] = useState(searchParams.get("brandId") || "");
  const [advertiserId, setAdvertiserId] = useState(searchParams.get("advertiserId") || "");
  const [campaignId, setCampaignId] = useState(searchParams.get("campaignId") || "");
  const [suspiciousReason, setSuspiciousReason] = useState(searchParams.get("suspiciousReason") || "");
  const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");

  // Compute metrics from reason groups
  const getReasonCount = (reasonSubstring: string) => {
    return data.reasonGroups
      .filter((g) => g.reason.includes(reasonSubstring))
      .reduce((sum, g) => sum + g.count, 0);
  };

  const visitorAbuseCount = getReasonCount("HIGH_FREQUENCY_VISITOR");
  const ipAbuseCount = getReasonCount("HIGH_FREQUENCY_IP");
  const internalTestCount = getReasonCount("INTERNAL_TEST_QR");
  const deliveryScanCount = getReasonCount("BATCH_DELIVERY_QR");
  const manualFlaggedCount = getReasonCount("MANUALLY_FLAGGED");

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());

    if (brandId) params.set("brandId", brandId);
    else params.delete("brandId");

    if (advertiserId) params.set("advertiserId", advertiserId);
    else params.delete("advertiserId");

    if (campaignId) params.set("campaignId", campaignId);
    else params.delete("campaignId");

    if (suspiciousReason) params.set("suspiciousReason", suspiciousReason);
    else params.delete("suspiciousReason");

    if (startDate) params.set("startDate", startDate);
    else params.delete("startDate");

    if (endDate) params.set("endDate", endDate);
    else params.delete("endDate");

    startTransition(() => {
      router.push(`/admin/suspicious-scans?${params.toString()}`);
    });
  };

  const handleClear = () => {
    setBrandId("");
    setAdvertiserId("");
    setCampaignId("");
    setSuspiciousReason("");
    setStartDate("");
    setEndDate("");
    startTransition(() => {
      router.push("/admin/suspicious-scans");
    });
  };

  const handleToggleSuspicious = async (
    scanId: string,
    currentSuspicious: boolean,
    hitCount: number,
  ) => {
    const action = currentSuspicious
      ? "mark every hit in this aggregate bucket as safe"
      : "mark every hit in this aggregate bucket as suspicious";

    if (!window.confirm(`This will ${action} (${hitCount} total hits). Continue?`)) {
      return;
    }

    try {
      await toggleScanSuspicious(scanId, !currentSuspicious);
      toast.success("Aggregate scan bucket updated.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update aggregate scan bucket.");
    }
  };

  return (
    <div className="space-y-8">
      {/* Filters Card */}
      <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
        <div className="flex items-center gap-2 pb-4">
          <Filter className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-tight text-[#2C2621]">Abuse Filters</h3>
        </div>
        <form onSubmit={handleFilter} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Brand</label>
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All Brands</option>
              {data.brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Advertiser</label>
            <select
              value={advertiserId}
              onChange={(e) => setAdvertiserId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All Advertisers</option>
              {data.advertisers.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Campaign</label>
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All Campaigns</option>
              {data.campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Reason</label>
            <select
              value={suspiciousReason}
              onChange={(e) => setSuspiciousReason(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All Reasons</option>
              <option value="HIGH_FREQUENCY_VISITOR">Visitor frequency abuse</option>
              <option value="HIGH_FREQUENCY_IP">IP frequency abuse</option>
              <option value="INTERNAL_TEST_QR">Internal test QR code</option>
              <option value="BATCH_DELIVERY_QR">Batch delivery QR scanned</option>
              <option value="MANUALLY_FLAGGED">Manually flagged</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-background"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-background"
            />
          </div>

          <div className="flex gap-2 lg:col-span-3 xl:col-span-6 mt-2 justify-end">
            <Button type="button" variant="ghost" onClick={handleClear} disabled={isPending} className="text-muted-foreground hover:text-foreground">
              Clear Filters
            </Button>
            <Button type="submit" disabled={isPending} className="bg-[#1E5C5A] hover:bg-[#15413F] text-white">
              Apply Filters
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => router.push("/admin/reports")}
              className="gap-2 border-border/60 hover:bg-muted"
            >
              <FileText className="h-4 w-4" />
              Reports Dashboard
            </Button>
          </div>
        </form>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Card 1: Total Flagged */}
        <div className="bg-card text-card-foreground rounded-xl border border-border/40 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 flex flex-col justify-between relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-[#F48F68]">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Total Flagged</span>
            <span className="p-1.5 rounded-lg bg-[#F48F68]/10 text-[#F48F68]"><ShieldAlert className="h-4 w-4" /></span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[#E27E58] dark:text-[#F48F68] tracking-tight">
              {data.totalSuspicious}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium leading-relaxed">Matching current filters</p>
          </div>
        </div>

        {/* Card 2: Visitor Abuse */}
        <div className="bg-card text-card-foreground rounded-xl border border-border/40 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 flex flex-col justify-between relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-[#F48F68]">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Visitor Abuse</span>
            <span className="p-1.5 rounded-lg bg-[#F48F68]/10 text-[#F48F68]"><User className="h-4 w-4" /></span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[#E27E58] dark:text-[#F48F68] tracking-tight">
              {visitorAbuseCount}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium leading-relaxed">&gt; 10 scans / 5 min</p>
          </div>
        </div>

        {/* Card 3: IP Abuse */}
        <div className="bg-card text-card-foreground rounded-xl border border-border/40 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 flex flex-col justify-between relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-[#F48F68]">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">IP Abuse</span>
            <span className="p-1.5 rounded-lg bg-[#F48F68]/10 text-[#F48F68]"><Globe className="h-4 w-4" /></span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[#E27E58] dark:text-[#F48F68] tracking-tight">
              {ipAbuseCount}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium leading-relaxed">&gt; 20 scans / 10 min</p>
          </div>
        </div>

        {/* Card 4: Internal/Test QR */}
        <div className="bg-card text-card-foreground rounded-xl border border-border/40 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 flex flex-col justify-between relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-[#8BDFDD]">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Internal/Test</span>
            <span className="p-1.5 rounded-lg bg-[#8BDFDD]/15 text-[#156D6B] dark:text-[#8BDFDD]"><Monitor className="h-4 w-4" /></span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[#156D6B] dark:text-[#8BDFDD] tracking-tight">
              {internalTestCount + deliveryScanCount}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium leading-relaxed">Excluded from billing</p>
          </div>
        </div>

        {/* Card 5: Manually Flagged */}
        <div className="bg-card text-card-foreground rounded-xl border border-border/40 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 flex flex-col justify-between relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-[#FFE394]">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Manual Flags</span>
            <span className="p-1.5 rounded-lg bg-[#FFE394]/30 text-[#6B5215] dark:text-[#FFE394]"><ShieldAlert className="h-4 w-4" /></span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[#8B6B00] dark:text-[#FFE394] tracking-tight">
              {manualFlaggedCount}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium leading-relaxed">Admin overrides</p>
          </div>
        </div>
      </div>

      {/* Scans Table */}
      <LocalTableSection
        title="Recent Flagged Buckets"
        description="Showing last 100 aggregate scan buckets. Adjust filters above to see more."
        headers={["Date/Time", "Campaign / Brand", "QR Code", "Flag Reasons", "Visitor & IP Hash", "Location", "Device/Browser", "Hit Counts", "Actions"]}
        hasData={data.recentScans.length > 0}
      >
        {data.recentScans.map((scan) => (
          <tr key={scan.id} className="border-b border-border/30 last:border-0 hover:bg-[#F5EFE0]/40 transition-colors">
            <td className="py-4 px-3 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
              {formatDateTime(scan.createdAt)}
            </td>
            <td className="py-4 px-3">
              <div className="font-semibold text-[#2C2621] truncate max-w-[150px]" title={scan.campaign?.name || "—"}>
                {scan.campaign?.name || "—"}
              </div>
              <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                {scan.brand?.name || "—"} • {scan.advertiser?.name || "—"}
              </div>
            </td>
            <td className="py-4 px-3 font-mono text-[10px] text-muted-foreground">
              {scan.qrCode.code}
            </td>
            <td className="py-4 px-3">
              <div className="flex flex-wrap gap-1 max-w-[180px]">
                {scan.suspiciousReason
                  ? scan.suspiciousReason.split(", ").map((reason) => {
                      let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
                      if (reason.includes("FREQUENCY")) variant = "destructive";
                      else if (reason.includes("INTERNAL")) variant = "outline";
                      else if (reason.includes("DELIVERY")) variant = "secondary";
                      else if (reason.includes("MANUALLY")) variant = "default";
                      return (
                        <Badge key={reason} variant={variant} className={`text-[9px] font-semibold tracking-wider ${variant === "destructive" ? "bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200" : ""}`}>
                          {reason}
                        </Badge>
                      );
                    })
                  : (
                    <Badge variant="outline" className="text-[9px] text-muted-foreground">
                      None
                    </Badge>
                  )}
              </div>
            </td>
            <td className="py-4 px-3 text-xs text-muted-foreground">
              <div className="flex flex-col gap-0.5">
                <span className="truncate max-w-[120px]" title={scan.anonymousVisitorId || ""}>
                  Vis: {scan.anonymousVisitorId ? scan.anonymousVisitorId.slice(0, 8) + "..." : "—"}
                </span>
                <span className="font-mono truncate max-w-[120px]" title={scan.ipHash || ""}>
                  IP: {scan.ipHash ? scan.ipHash.slice(0, 8) + "..." : "—"}
                </span>
              </div>
            </td>
            <td className="py-4 px-3 text-xs text-[#2C2621]">
              <div className="flex flex-col gap-0.5">
                <span className="truncate max-w-[120px]">{scan.city || "—"}</span>
                <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                  {[scan.region, scan.country].filter(Boolean).join(", ") || "—"}
                </span>
              </div>
            </td>
            <td className="py-4 px-3 text-xs text-[#2C2621]">
              <div className="flex flex-col gap-0.5">
                <span className="truncate max-w-[120px]">
                  {scan.deviceType ? scan.deviceType.toUpperCase() : "—"}
                </span>
                <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                  {[scan.os, scan.browser].filter(Boolean).join(" / ") || "—"}
                </span>
              </div>
            </td>
            <td className="py-4 px-3 text-right">
              <div className="text-[11px] whitespace-nowrap">
                <div className="text-[#2C2621] font-medium">Total: {scan.hitCount}</div>
                <div className="text-rose-600 font-semibold">Susp: {scan.suspiciousCount}</div>
                <div className="text-emerald-600 font-semibold">Bill: {scan.billableCount}</div>
              </div>
            </td>
            <td className="py-4 px-3 text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleToggleSuspicious(
                    scan.id,
                    scan.isSuspicious,
                    scan.hitCount,
                  )
                }
                className="h-8 gap-1.5 text-[10px] uppercase font-bold tracking-wider hover:bg-muted"
              >
                {scan.isSuspicious ? (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Mark Safe</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                    <span className="text-rose-700">Flag</span>
                  </>
                )}
              </Button>
            </td>
          </tr>
        ))}
      </LocalTableSection>
    </div>
  );
}
