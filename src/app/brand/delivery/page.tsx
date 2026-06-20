import React from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { getBrandDeliveryPageData, DELIVERY_LIST_LIMIT } from "@/server/services/delivery-scan.service";
import { getBrandDeliveryFilterOptions } from "./actions";
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

export default async function BrandDeliveryPage({ searchParams }: PageProps) {
  const user = await requireRole(["BRAND_ADMIN"]);

  if (!user.brandId) {
    redirect("/brand");
  }

  const params = await searchParams;

  // brandId is always forced server-side from user.brandId — URL param is ignored
  const filters = {
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

  const [pageData, filterOptions] = await Promise.all([
    getBrandDeliveryPageData(user, filters),
    getBrandDeliveryFilterOptions(),
  ]);

  const {
    deliveryScans,
    retailers,
    totalDeliveryScans,
    totalCartonsDelivered,
    totalEstimatedUnitsDelivered,
    isTruncated,
    error,
  } = pageData;

  return (
    <div className="min-h-screen bg-background p-8 md:p-12 space-y-10">
      <DashboardSectionHeader
        title="Retailer Deliveries"
        description="Brand-scoped delivery logs. Read-only view of carton delivery events for your brand."
        badgeText="Brand Admin"
        badgeVariant="emerald"
      />

      <DeliveryFilters options={filterOptions} />

      {"error" in pageData && error && (
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card text-card-foreground rounded-xl border border-border/40 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 flex flex-col justify-between relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-brand-teal">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Total Delivery Scans</span>
            <span className="p-1.5 rounded-lg bg-brand-teal/15 text-foreground"><Truck className="h-4 w-4" /></span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-foreground tracking-tight">{formatNumber(totalDeliveryScans)}</div>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium leading-relaxed">Brand delivery scans logged</p>
          </div>
        </div>

        <div className="bg-card text-card-foreground rounded-xl border border-border/40 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 flex flex-col justify-between relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-brand-yellow">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Total Cartons Delivered</span>
            <span className="p-1.5 rounded-lg bg-brand-yellow/30 text-foreground"><Layers className="h-4 w-4" /></span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-foreground tracking-tight">{formatNumber(totalCartonsDelivered)}</div>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium leading-relaxed">Brand cartons dropped off</p>
          </div>
        </div>

        <div className="bg-card text-card-foreground rounded-xl border border-border/40 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 flex flex-col justify-between relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-primary">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Total Placed Units</span>
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary"><Archive className="h-4 w-4" /></span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-primary tracking-tight">{formatNumber(totalEstimatedUnitsDelivered)}</div>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium leading-relaxed">Estimated brand units in circulation</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-8 border border-border/50 shadow-sm flex flex-col justify-between h-full overflow-hidden">
        <div>
          <div className="pb-6">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Brand Delivery History</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-normal">
              Audit history of carton deliveries for your brand. Read-only.
            </p>
          </div>
          <AdminDeliveryTable deliveryScans={deliveryScans} retailers={retailers} readOnly />
        </div>
      </div>
    </div>
  );
}
