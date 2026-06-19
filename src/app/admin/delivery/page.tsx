// src/app/admin/delivery/page.tsx
import React from "react";
import { requireRole } from "@/lib/auth/require-role";
import { getAdminDeliveryPageData, DELIVERY_LIST_LIMIT } from "@/server/services/delivery-scan.service";
import { getDeliveryFilterOptions } from "@/app/admin/delivery/actions";
import { formatNumber } from "@/lib/format";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";
import { DeliveryFilters } from "@/components/dashboard/delivery-filters";
import { AdminDeliveryTable } from "@/components/dashboard/admin-delivery-table";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Truck, Layers, Archive, AlertTriangle, Info } from "lucide-react";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminDeliveryPage({
  searchParams,
}: PageProps) {
  const user = await requireRole(["ADMIN"]);

  const params = await searchParams;

  const filters = {
    brandId: typeof params.brandId === "string" ? params.brandId : undefined,
    advertiserId: typeof params.advertiserId === "string" ? params.advertiserId : undefined,
    campaignId: typeof params.campaignId === "string" ? params.campaignId : undefined,
    productId: typeof params.productId === "string" ? params.productId : undefined,
    batchId: typeof params.batchId === "string" ? params.batchId : undefined,
    retailerId: typeof params.retailerId === "string" ? params.retailerId : undefined,
    startDate: typeof params.startDate === "string" ? params.startDate : undefined,
    endDate: typeof params.endDate === "string" ? params.endDate : undefined,
    country: typeof params.country === "string" ? params.country : undefined,
    region: typeof params.region === "string" ? params.region : undefined,
    city: typeof params.city === "string" ? params.city : undefined,
  };

  const {
    deliveryScans,
    retailers,
    totalDeliveryScans,
    totalCartonsDelivered,
    totalEstimatedUnitsDelivered,
    isTruncated,
    error,
  } = await getAdminDeliveryPageData(user, filters);

  const filterOptions = await getDeliveryFilterOptions();

  return (
    <div className="min-h-screen bg-background p-8 md:p-12 space-y-10">
      <DashboardSectionHeader
        title="Delivery Operations"
        description="Monitor supply chain carton delivery logs and distribution metrics across all registered brands."
        badgeText="Supply Chain"
        badgeVariant="emerald"
      />

      <DeliveryFilters options={filterOptions} />

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Filter Validation Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isTruncated && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Results capped at {DELIVERY_LIST_LIMIT} rows</AlertTitle>
          <AlertDescription>
            {formatNumber(totalDeliveryScans)} delivery scans match these filters. Showing the most recent {formatNumber(DELIVERY_LIST_LIMIT)}. Apply additional filters to narrow results.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card text-card-foreground rounded-xl border border-border/40 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 flex flex-col justify-between relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-brand-teal">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Total Delivery Scans</span>
            <span className="p-1.5 rounded-lg bg-brand-teal/15 text-foreground"><Truck className="h-4 w-4" /></span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-foreground tracking-tight">
              {formatNumber(totalDeliveryScans)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium leading-relaxed">Platform-wide logged deliveries</p>
          </div>
        </div>

        <div className="bg-card text-card-foreground rounded-xl border border-border/40 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 flex flex-col justify-between relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-brand-yellow">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Total Cartons Delivered</span>
            <span className="p-1.5 rounded-lg bg-brand-yellow/30 text-foreground"><Layers className="h-4 w-4" /></span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-foreground tracking-tight">
              {formatNumber(totalCartonsDelivered)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium leading-relaxed">Platform-wide cartons dropped off</p>
          </div>
        </div>

        <div className="bg-card text-card-foreground rounded-xl border border-border/40 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 flex flex-col justify-between relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-primary">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Total Placed Units</span>
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary"><Archive className="h-4 w-4" /></span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-primary tracking-tight">
              {formatNumber(totalEstimatedUnitsDelivered)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium leading-relaxed">Estimated product units in circulation</p>
          </div>
        </div>
      </div>

      {/* Audit History Table */}
      <div className="bg-card rounded-2xl p-8 border border-border/50 shadow-sm flex flex-col justify-between h-full overflow-hidden">
        <div>
          <div className="pb-6">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Global Supply Chain History</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-normal">
              Audit history of logged cartons and placements.
            </p>
          </div>
          <AdminDeliveryTable deliveryScans={deliveryScans} retailers={retailers} />
        </div>
      </div>
    </div>
  );
}
