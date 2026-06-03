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
  await requireRole(["ADMIN"]);

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
  const data = await getAdminHeatmapData(validatedFilters);
  const { filterOptions, consumerEngagementMarkers, deliveryDistributionMarkers, summaryCounts } = data;

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        title="Heatmaps"
        description="Compare consumer engagement scans and delivery distribution activity."
        badgeText="Admin Analytics"
        badgeVariant="blue"
      />

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <AnalyticsStatCard
          title="Scan Locations"
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
      <HeatmapMap scanMarkers={consumerEngagementMarkers} deliveryMarkers={deliveryDistributionMarkers} />

      {/* Details Tables */}
      <HeatmapDataTables scanMarkers={consumerEngagementMarkers} deliveryMarkers={deliveryDistributionMarkers} />
    </div>
  );
}
