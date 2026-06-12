// src/app/admin/delivery/page.tsx
import React from "react";
import { requireRole } from "@/lib/auth/require-role";
import { getRetailDeliveriesPageData } from "@/server/services/delivery-scan.service";
import { formatDateTime, formatNumber } from "@/lib/format";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";
import { Truck, Layers, Archive, MapPin, Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

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
            No delivery scan logs recorded yet.
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
                        header.toLowerCase().includes("cartons") ||
                        header.toLowerCase().includes("units") ||
                        header.toLowerCase().includes("est.")
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

export default async function AdminDeliveryPage() {
  // Enforce admin permission
  const user = await requireRole(["ADMIN"]);

  // Fetch all delivery data across all brands
  const {
    deliveryScans,
    totalDeliveryScans,
    totalCartonsDelivered,
    totalEstimatedUnitsDelivered,
  } = await getRetailDeliveriesPageData(user);

  return (
    <div className="min-h-screen bg-[#FFF6DE] p-8 md:p-12 space-y-10">
      <DashboardSectionHeader
        title="Delivery Operations"
        description="Monitor supply chain carton delivery logs and distribution metrics across all registered brands."
        badgeText="Supply Chain"
        badgeVariant="emerald"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Delivery Scans */}
        <div className="bg-card text-card-foreground rounded-xl border border-border/40 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 flex flex-col justify-between relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-[#8BDFDD]">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Total Delivery Scans</span>
            <span className="p-1.5 rounded-lg bg-[#8BDFDD]/15 text-[#156D6B] dark:text-[#8BDFDD]"><Truck className="h-4 w-4" /></span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[#156D6B] dark:text-[#8BDFDD] tracking-tight">
              {formatNumber(totalDeliveryScans)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium leading-relaxed">Platform-wide logged deliveries</p>
          </div>
        </div>

        {/* Card 2: Total Cartons Delivered */}
        <div className="bg-card text-card-foreground rounded-xl border border-border/40 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 flex flex-col justify-between relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-[#FFE394]">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Total Cartons Delivered</span>
            <span className="p-1.5 rounded-lg bg-[#FFE394]/30 text-[#6B5215] dark:text-[#FFE394]"><Layers className="h-4 w-4" /></span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[#8B6B00] dark:text-[#FFE394] tracking-tight">
              {formatNumber(totalCartonsDelivered)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium leading-relaxed">Platform-wide cartons dropped off</p>
          </div>
        </div>

        {/* Card 3: Total Placed Units */}
        <div className="bg-card text-card-foreground rounded-xl border border-border/40 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 flex flex-col justify-between relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-[#F48F68]">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Total Placed Units</span>
            <span className="p-1.5 rounded-lg bg-[#F48F68]/10 text-[#F48F68]"><Archive className="h-4 w-4" /></span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[#E27E58] dark:text-[#F48F68] tracking-tight">
              {formatNumber(totalEstimatedUnitsDelivered)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium leading-relaxed">Estimated product units in circulation</p>
          </div>
        </div>
      </div>

      {/* Audit History Table */}
      <LocalTableSection
        title="Global Supply Chain History"
        description="Audit history of logged cartons and placements."
        headers={["Date", "Brand", "Retailer", "Campaign", "Product", "Batch Code", "Cartons", "Units/Carton", "Est. Units", "City / Suburb", "Notes"]}
        hasData={deliveryScans.length > 0}
      >
        {deliveryScans.map((scan) => (
          <tr key={scan.id} className="border-b border-border/30 last:border-0 hover:bg-[#F5EFE0]/40 transition-colors">
            <td className="py-4 px-3 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
              {formatDateTime(scan.createdAt)}
            </td>
            <td className="py-4 px-3 font-medium text-[#2C2621] whitespace-nowrap">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                {scan.brand?.name ?? "—"}
              </span>
            </td>
            <td className="py-4 px-3 whitespace-nowrap">
              <span className="font-semibold text-[#2C2621] block">
                {scan.retailer?.name ?? "—"}
              </span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider block mt-0.5">
                {scan.retailer?.type ?? "—"}
              </span>
            </td>
            <td className="py-4 px-3 max-w-[120px] truncate text-muted-foreground" title={scan.campaign?.name ?? undefined}>
              {scan.campaign?.name ?? "—"}
            </td>
            <td className="py-4 px-3 max-w-[120px] truncate text-muted-foreground" title={scan.qrCode?.product?.name ?? undefined}>
              {scan.qrCode?.product?.name ?? "—"}
            </td>
            <td className="py-4 px-3 font-mono text-[10px] text-muted-foreground">
              {scan.batch?.batchCode ?? "—"}
            </td>
            <td className="py-4 px-3 text-right font-medium text-[#2C2621]">
              {formatNumber(scan.cartonsDelivered)}
            </td>
            <td className="py-4 px-3 text-right font-mono text-muted-foreground">
              {scan.unitsPerCarton}
            </td>
            <td className="py-4 px-3 text-right font-semibold text-[#156D6B] dark:text-brand-teal">
              {formatNumber(scan.estimatedUnitsDelivered)}
            </td>
            <td className="py-4 px-3 whitespace-nowrap">
              {scan.city ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{scan.suburb ? `${scan.suburb}, ` : ""}{scan.city}</span>
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </td>
            <td className="py-4 px-3 max-w-[150px] truncate italic text-muted-foreground" title={scan.notes ?? undefined}>
              {scan.notes ?? "—"}
            </td>
          </tr>
        ))}
      </LocalTableSection>
    </div>
  );
}
