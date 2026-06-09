// src/app/admin/suspicious-scans/suspicious-scans-client.tsx
"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Calendar,
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
    <div className="space-y-6">
      {/* Filters Card */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
        <CardHeader className="py-4">
          <CardTitle className="text-lg flex items-center gap-2 text-slate-100">
            <Filter className="h-4 w-4 text-primary" />
            Abuse Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFilter} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Brand</label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-1 text-sm text-slate-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-700"
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
              <label className="text-xs font-semibold text-slate-400">Advertiser</label>
              <select
                value={advertiserId}
                onChange={(e) => setAdvertiserId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-1 text-sm text-slate-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-700"
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
              <label className="text-xs font-semibold text-slate-400">Campaign</label>
              <select
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-1 text-sm text-slate-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-700"
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
              <label className="text-xs font-semibold text-slate-400">Suspicious Reason</label>
              <select
                value={suspiciousReason}
                onChange={(e) => setSuspiciousReason(e.target.value)}
                className="flex h-9 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-1 text-sm text-slate-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-700"
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
              <label className="text-xs font-semibold text-slate-400">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-200"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-200"
              />
            </div>

            <div className="flex gap-2 lg:col-span-3 xl:col-span-6 mt-2 justify-end">
              <Button type="button" variant="ghost" onClick={handleClear} disabled={isPending} className="text-slate-400 hover:text-slate-200 hover:bg-slate-800">
                Clear Filters
              </Button>
              <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Apply Filters
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={() => router.push("/admin/reports")}
                className="gap-2 border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              >
                <FileText className="h-4 w-4" />
                Reports Dashboard
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
          <CardHeader className="py-3 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Flagged</CardTitle>
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{data.totalSuspicious}</div>
            <p className="text-[10px] text-slate-500 mt-1">Matching current filters</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
          <CardHeader className="py-3 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Visitor Abuse</CardTitle>
            <User className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{visitorAbuseCount}</div>
            <p className="text-[10px] text-slate-500 mt-1">&gt; 10 scans / 5 min</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
          <CardHeader className="py-3 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">IP Abuse</CardTitle>
            <Globe className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{ipAbuseCount}</div>
            <p className="text-[10px] text-slate-500 mt-1">&gt; 20 scans / 10 min</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
          <CardHeader className="py-3 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Internal/Test QR</CardTitle>
            <Monitor className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{internalTestCount + deliveryScanCount}</div>
            <p className="text-[10px] text-slate-500 mt-1">Excluded from consumer billing</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
          <CardHeader className="py-3 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Manually Flagged</CardTitle>
            <ShieldAlert className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">{manualFlaggedCount}</div>
            <p className="text-[10px] text-slate-500 mt-1">Admin manual overrides</p>
          </CardContent>
        </Card>
      </div>

      {/* Scans Table */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
        <CardHeader className="py-4">
          <CardTitle className="text-lg text-slate-100 flex items-center justify-between">
            <span>Recent Flagged Buckets</span>
            <span className="text-xs font-normal text-slate-400">Showing last 100 aggregate buckets</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <div className="rounded-md border border-slate-800 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-950/40">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-300">Date/Time</TableHead>
                  <TableHead className="text-slate-300">Campaign / Brand</TableHead>
                  <TableHead className="text-slate-300">QR Code</TableHead>
                  <TableHead className="text-slate-300">Flag Reasons</TableHead>
                  <TableHead className="text-slate-300">Visitor & IP Hash</TableHead>
                  <TableHead className="text-slate-300">Location</TableHead>
                  <TableHead className="text-slate-300">Device/Browser</TableHead>
                  <TableHead className="text-slate-300">Hit Counts</TableHead>
                  <TableHead className="text-slate-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentScans.length === 0 ? (
                  <TableRow className="border-slate-800">
                    <TableCell colSpan={9} className="h-32 text-center text-slate-500">
                      No suspicious scans logged matching the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.recentScans.map((scan) => (
                    <TableRow key={scan.id} className="border-slate-800 hover:bg-slate-800/20 transition-colors">
                      <TableCell className="font-mono text-xs text-slate-400 whitespace-nowrap">
                        {formatDateTime(scan.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-200">{scan.campaign?.name || "—"}</div>
                        <div className="text-xs text-slate-400">
                          {scan.brand?.name || "—"} • {scan.advertiser?.name || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-300">
                        {scan.qrCode.code}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {scan.suspiciousReason
                            ? scan.suspiciousReason.split(", ").map((reason) => {
                                let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
                                if (reason.includes("FREQUENCY")) variant = "destructive";
                                else if (reason.includes("INTERNAL")) variant = "outline";
                                else if (reason.includes("DELIVERY")) variant = "secondary";
                                else if (reason.includes("MANUALLY")) variant = "default";
                                return (
                                  <Badge key={reason} variant={variant} className="text-[10px]">
                                    {reason}
                                  </Badge>
                                );
                              })
                            : (
                              <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-700">
                                None
                              </Badge>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">
                        <div className="flex flex-col gap-0.5">
                          <span className="truncate max-w-[120px]" title={scan.anonymousVisitorId || ""}>
                            Visitor: {scan.anonymousVisitorId ? scan.anonymousVisitorId.slice(0, 8) + "..." : "—"}
                          </span>
                          <span className="font-mono text-slate-400 truncate max-w-[120px]" title={scan.ipHash || ""}>
                            IP: {scan.ipHash ? scan.ipHash.slice(0, 8) + "..." : "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">
                        <div className="flex flex-col gap-0.5">
                          <span>{scan.city || "—"}</span>
                          <span className="text-[10px] text-slate-400">
                            {[scan.region, scan.country].filter(Boolean).join(", ") || "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">
                        <div className="flex flex-col gap-0.5">
                          <span>
                            {scan.deviceType ? scan.deviceType.toUpperCase() : "—"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {[scan.os, scan.browser].filter(Boolean).join(" / ") || "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-slate-300 whitespace-nowrap">
                          <div>Total: {scan.hitCount}</div>
                          <div className="text-rose-400">Suspicious: {scan.suspiciousCount}</div>
                          <div className="text-emerald-400">Billable: {scan.billableCount}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
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
                          className="h-8 gap-1.5 text-xs border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-slate-100"
                        >
                          {scan.isSuspicious ? (
                            <>
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                              <span>Mark All Safe</span>
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                              <span>Flag All Hits</span>
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
