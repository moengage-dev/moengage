"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { formatCurrency, formatNumber, formatDateTime } from "@/lib/format";
import type { BillingDashboardData } from "@/server/services/billing.service";
import { Coins, Filter, FileText, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { 
  generateCampaignBillingSummaryAction, 
  regenerateAllBillingSummariesAction 
} from "@/app/admin/billing/actions";

export function BillingClient({
  data,
  basePath = "/admin/billing",
  isAdmin = false,
}: {
  data: BillingDashboardData;
  basePath?: string;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      toast.error("End date cannot be before start date");
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    if (startDate) params.set("startDate", startDate);
    else params.delete("startDate");

    if (endDate) params.set("endDate", endDate);
    else params.delete("endDate");

    router.push(`${basePath}?${params.toString()}`);
  };

  const handleClear = () => {
    setStartDate("");
    setEndDate("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("startDate");
    params.delete("endDate");
    router.push(`${basePath}?${params.toString()}`);
  };

  const handleRefreshAll = () => {
    startTransition(async () => {
      setActionLoadingId("all");
      const res = await regenerateAllBillingSummariesAction();
      setActionLoadingId(null);
      if (res.ok) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleRecalculateCampaign = (campaignId: string) => {
    startTransition(async () => {
      setActionLoadingId(campaignId);
      const res = await generateCampaignBillingSummaryAction(campaignId);
      setActionLoadingId(null);
      if (res.ok) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-lg flex items-center justify-between w-full flex-wrap gap-2">
            <span className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </span>
            {isAdmin && (
              <Button 
                onClick={handleRefreshAll} 
                disabled={isPending && actionLoadingId === "all"}
                size="sm"
                className="gap-1.5 bg-brand-coral text-white hover:bg-brand-coral/90 rounded-full px-4"
              >
                {isPending && actionLoadingId === "all" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Generate / Refresh Billing
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFilter} className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <Button type="submit">Apply</Button>
            <Button type="button" variant="ghost" onClick={handleClear}>
              Clear
            </Button>
            
            <div className="ml-auto flex items-center gap-2">
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => router.push(basePath.replace("/billing", "/reports"))}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Export Reports
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Units Placed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(data.totals.estimatedUnitsPlaced)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Estimated delivered
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Billable Scans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(data.totals.billableScans)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Excl. suspicious & test
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fixed Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(data.totals.fixedFees)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(data.totals.engagementFees)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Rewards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatNumber(data.totals.approvedRewards)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Billing</CardTitle>
            <Coins className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(data.totals.totalAmount)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[1500px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Advertiser</TableHead>
                  <TableHead className="text-right">Est. Units</TableHead>
                  <TableHead className="text-right">Fixed Fee / Unit</TableHead>
                  <TableHead className="text-right">Fixed Fee Total</TableHead>
                  <TableHead className="text-right">Total Scans</TableHead>
                  <TableHead className="text-right">Billable Scans</TableHead>
                  <TableHead className="text-right">Eng. Fee / Scan</TableHead>
                  <TableHead className="text-right">Eng. Fee Total</TableHead>
                  <TableHead className="text-right">Approved Rewards</TableHead>
                  <TableHead className="text-right">Duplicate Declines</TableHead>
                  <TableHead className="text-right font-bold">Total Amount</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Last Updated</TableHead>
                  {isAdmin && <TableHead className="text-center">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.summaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 16 : 15} className="h-24 text-center text-muted-foreground">
                      No data found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.summaries.map((row) => (
                    <TableRow key={row.campaignId}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {row.campaignName}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{row.brandName}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.advertiserName}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(row.estimatedUnitsPlaced)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatCurrency(row.fixedFeePerUnit, row.currency)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(row.fixedFeeTotal, row.currency)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatNumber(row.totalScans)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <div className="flex flex-col items-end gap-0.5">
                          <span>{formatNumber(row.billableScanCount)}</span>
                          {row.nonBillableScanCount > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              (+{row.nonBillableScanCount} non-billable)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatCurrency(row.engagementFeePerScan, row.currency)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(row.engagementFeeTotal, row.currency)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-600">
                        {formatNumber(row.rewardClaimsApproved)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-amber-600">
                        {formatNumber(row.duplicateRewardClaimsDeclined)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">
                        {formatCurrency(row.totalAmount, row.currency)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.currency}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(row.generatedAt)}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-center whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="xs"
                            disabled={isPending && actionLoadingId === row.campaignId}
                            onClick={() => handleRecalculateCampaign(row.campaignId)}
                            className="text-xs rounded-full border-brand-coral/30 hover:border-brand-coral text-brand-coral bg-brand-coral/[0.04] hover:bg-brand-coral/[0.08]"
                          >
                            {isPending && actionLoadingId === row.campaignId ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <RefreshCw className="h-3 w-3 mr-1" />
                            )}
                            Recalculate
                          </Button>
                        </TableCell>
                      )}
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
