import { requireRole } from "@/lib/auth/require-role";
import { getAdminHeatmapData } from "@/server/services/heatmaps.service";
import { heatmapFilterSchema } from "@/lib/validators/heatmap-filter.validator";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";
import { AnalyticsStatCard } from "@/components/dashboard/analytics-stat-card";
import { HeatmapFilters } from "@/components/heatmaps/heatmap-filters";
import { HeatmapMap } from "@/components/heatmaps/heatmap-map";
import { HeatmapDataTables } from "@/components/heatmaps/heatmap-data-tables";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import { Scan, Truck, ShieldCheck, AlertCircle, Layers, Archive, Map } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

export default async function AdvertiserHeatmapsPage({ searchParams }: PageProps) {
  const user = await requireRole(["ADVERTISER_VIEWER", "ADMIN"]);

  // Fail closed: Advertiser Viewer must have an advertiserId
  if (user.role === "ADVERTISER_VIEWER" && !user.advertiserId) {
    return (
      <div className="min-h-screen bg-background p-8 md:p-12 space-y-10">
        <DashboardSectionHeader
          title="Heatmaps"
          description="Geographic scan engagement for your campaigns."
          badgeText="Advertiser"
          badgeVariant="blue"
        />
        <Card className="py-12">
          <CardContent className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-muted border border-border text-muted-foreground rounded-full flex items-center justify-center">
              <Map className="h-6 w-6" />
            </div>
            <p className="text-sm text-muted-foreground">
              Your account is not linked to an advertiser. Contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const resolvedSearchParams = searchParams instanceof Promise
    ? await searchParams
    : searchParams;

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

  // Strip advertiser/brand — scope enforced server-side via the authenticated user's advertiserId
  const STRIPPED = new Set(["advertiserId", "brandId"]);
  const safeRawFilters = Object.fromEntries(
    Object.entries(rawFilters).filter(([k]) => !STRIPPED.has(k))
  );

  const validatedFilters = heatmapFilterSchema.parse(safeRawFilters);
  const data = await getAdminHeatmapData(validatedFilters, user);
  const { filterOptions, consumerEngagementMarkers, deliveryDistributionMarkers, combinedLocationMarkers, summaryCounts, metadata } = data;

  const isEmpty = combinedLocationMarkers.length === 0 && !metadata.isConsumerDataTruncated && !metadata.isDeliveryDataTruncated;

  return (
    <div className="min-h-screen bg-background p-8 md:p-12 space-y-10">
      <DashboardSectionHeader
        title="Heatmaps"
        description="Geographic scan engagement and delivery distribution for your campaigns."
        badgeText="Advertiser"
        badgeVariant="blue"
      />

      {(metadata.isConsumerDataTruncated || metadata.isDeliveryDataTruncated) && (
        <div className="bg-muted border border-border rounded-xl p-4 flex items-start gap-3 text-foreground shadow-sm">
          <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-sm">
            Showing the most recent 2,000 mapped records. Narrow the filters to view a more specific area.
          </div>
        </div>
      )}

      {isEmpty ? (
        <Card className="py-12">
          <CardContent className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-muted border border-border text-muted-foreground rounded-full flex items-center justify-center">
              <Map className="h-6 w-6" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h2 className="text-lg font-bold text-foreground">No Map Data</h2>
              <p className="text-sm text-muted-foreground">
                No scan or delivery events with location data exist for your campaigns in the selected date range.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            <AnalyticsStatCard title="Consumer Scans" value={formatNumber(summaryCounts.totalScanCount)} description="Total matched consumer scans" icon={<Scan className="h-4 w-4" />} accentColor="indigo" />
            <AnalyticsStatCard title="Delivery Locations" value={formatNumber(summaryCounts.totalDeliveryCount)} description="Total matched deliveries" icon={<Truck className="h-4 w-4" />} accentColor="emerald" />
            <AnalyticsStatCard title="Billable Scans" value={formatNumber(summaryCounts.totalBillableScans)} description="Legitimate consumer scans" icon={<ShieldCheck className="h-4 w-4" />} accentColor="emerald" />
            <AnalyticsStatCard title="Repeat Scans" value={formatNumber(summaryCounts.totalRepeatScans)} description="Subsequent consumer scans" icon={<AlertCircle className="h-4 w-4" />} accentColor="amber" />
            <AnalyticsStatCard title="Cartons Placed" value={formatNumber(summaryCounts.totalCartonsDelivered)} description="Total cartons placed in retail" icon={<Layers className="h-4 w-4" />} accentColor="indigo" />
            <AnalyticsStatCard title="Est. Units Placed" value={formatNumber(summaryCounts.totalEstimatedUnitsDelivered)} description="Total units delivered" icon={<Archive className="h-4 w-4" />} accentColor="teal" />
          </div>

          <HeatmapFilters options={filterOptions} initialFilters={safeRawFilters} />
          <HeatmapMap locationMarkers={combinedLocationMarkers} />
          <HeatmapDataTables scanMarkers={consumerEngagementMarkers} deliveryMarkers={deliveryDistributionMarkers} />
        </>
      )}
    </div>
  );
}
