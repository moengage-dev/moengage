// src/app/admin/heatmaps/page.tsx
import React from "react";
import { requireRole } from "@/lib/auth/require-role";
import { getAdminHeatmapData } from "@/server/services/heatmaps.service";
import { heatmapFilterSchema } from "@/lib/validators/heatmap-filter.validator";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";
import { AnalyticsStatCard } from "@/components/dashboard/analytics-stat-card";
import { HeatmapFilters } from "@/components/heatmaps/heatmap-filters";
import { HeatmapMap } from "@/components/heatmaps/heatmap-map";
import { HeatmapDataTables } from "@/components/heatmaps/heatmap-data-tables";
import { formatNumber } from "@/lib/format";
import { Scan, Truck, ShieldCheck, AlertCircle, Layers, Archive } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

export default async function HeatmapsPage({ searchParams }: PageProps) {
  // Enforce ADMIN role
  const user = await requireRole(["ADMIN"]);

  // Resolve searchParams whether it is a Promise or a direct object
  const resolvedSearchParams = searchParams instanceof Promise 
    ? await searchParams 
    : searchParams;

  // Normalize search params to simple strings
  const rawFilters: Record<string, string | undefined> = {};
  if (resolvedSearchParams) {
    for (const [key, value] of Object.entries(resolvedSearchParams)) {
      if (typeof value === "string") {
        rawFilters[key] = value;
      } else if (Array.isArray(value) && value.length > 0) {
        rawFilters[key] = value[0];
      }
    }
  }

  // Validate filters using validator
  const validatedFilters = heatmapFilterSchema.parse(rawFilters);

  // Fetch heatmap data
  const data = await getAdminHeatmapData(validatedFilters, user);
  const {
    filterOptions,
    consumerEngagementMarkers,
    deliveryDistributionMarkers,
    combinedLocationMarkers,
    summaryCounts,
    metadata,
  } = data;

  return (
    <div className="min-h-screen bg-background p-8 md:p-12 space-y-10">
      <DashboardSectionHeader
        title="Heatmaps"
        description="Compare consumer engagement scans and delivery distribution activity."
        badgeText="Admin Analytics"
        badgeVariant="blue"
      />

      {/* Truncation Notice */}
      {(metadata.isConsumerDataTruncated || metadata.isDeliveryDataTruncated) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-800 shadow-sm">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            Showing the most recent 2,000 mapped records. Narrow the filters to view a more specific area.
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        <AnalyticsStatCard
          title="Consumer Scans"
          value={formatNumber(summaryCounts.totalScanCount)}
          description="Total matched consumer scans"
          icon={<Scan className="h-4 w-4" />}
          accentColor="indigo"
        />
        <AnalyticsStatCard
          title="Delivery Locations"
          value={formatNumber(summaryCounts.totalDeliveryCount)}
          description="Total matched deliveries"
          icon={<Truck className="h-4 w-4" />}
          accentColor="emerald"
        />
        <AnalyticsStatCard
          title="Billable Scans"
          value={formatNumber(summaryCounts.totalBillableScans)}
          description="Legitimate consumer scans"
          icon={<ShieldCheck className="h-4 w-4" />}
          accentColor="emerald"
        />
        <AnalyticsStatCard
          title="Repeat Scans"
          value={formatNumber(summaryCounts.totalRepeatScans)}
          description="Subsequent consumer scans"
          icon={<AlertCircle className="h-4 w-4" />}
          accentColor="amber"
        />
        <AnalyticsStatCard
          title="Cartons Placed"
          value={formatNumber(summaryCounts.totalCartonsDelivered)}
          description="Total cartons placed in retail"
          icon={<Layers className="h-4 w-4" />}
          accentColor="indigo"
        />
        <AnalyticsStatCard
          title="Est. Units Placed"
          value={formatNumber(summaryCounts.totalEstimatedUnitsDelivered)}
          description="Total units delivered"
          icon={<Archive className="h-4 w-4" />}
          accentColor="teal"
        />
      </div>

      {/* Heatmap Filters */}
      <HeatmapFilters options={filterOptions} initialFilters={rawFilters} />

      {/* Map Component */}
      <HeatmapMap locationMarkers={combinedLocationMarkers} />

      {/* Details Tables */}
      <HeatmapDataTables scanMarkers={consumerEngagementMarkers} deliveryMarkers={deliveryDistributionMarkers} />
    </div>
  );
}
