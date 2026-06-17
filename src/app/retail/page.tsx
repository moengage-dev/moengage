// src/app/retail/page.tsx
import React from "react";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { getDashboardForRole } from "@/lib/auth/role-redirect";
import { getRetailOperationsDashboardData } from "@/server/services/delivery-scan.service";
import { formatDate, formatNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, Archive, Layers, Calendar, MapPin, ClipboardList, Scan } from "lucide-react";
import Link from "next/link";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";

export const dynamic = "force-dynamic";

export default async function RetailDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "RETAIL_OPERATIONS" && user.role !== "ADMIN") {
    redirect(getDashboardForRole(user.role));
  }

  const {
    totalDeliveryScans,
    totalCartonsDelivered,
    totalEstimatedUnitsDelivered,
    recentDeliveryScans,
  } = await getRetailOperationsDashboardData(user);

  return (
    <div className="min-h-screen bg-[#FFF6DE] p-6 md:p-10 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <DashboardSectionHeader
          title="Retail Operations"
          description="Monitor product drop-offs, track active distribution, and verify carton counts."
          badgeText="Field Operations"
          badgeVariant="emerald"
        />
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button asChild size="sm" variant="outline">
            <Link href="/retail/deliveries" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              View History
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/retail/scan" className="flex items-center gap-2">
              <Scan className="h-4 w-4" />
              Scan Delivery QR
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6 flex flex-col gap-3 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-[#1E5C5A]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Total Delivery Scans</span>
            <Truck className="h-4 w-4 text-[#1E5C5A]" />
          </div>
          <div className="text-3xl font-extrabold text-[#2C2621] tracking-tight">{formatNumber(totalDeliveryScans)}</div>
          <p className="text-[10px] text-muted-foreground font-medium">Logged drop-offs at distribution sites</p>
        </div>

        <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6 flex flex-col gap-3 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-[#F48F68]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Total Cartons Delivered</span>
            <Layers className="h-4 w-4 text-[#F48F68]" />
          </div>
          <div className="text-3xl font-extrabold text-[#2C2621] tracking-tight">{formatNumber(totalCartonsDelivered)}</div>
          <p className="text-[10px] text-muted-foreground font-medium">Physical carton count drop-offs</p>
        </div>

        <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6 flex flex-col gap-3 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Estimated Placed Units</span>
            <Archive className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-[#2C2621] tracking-tight">{formatNumber(totalEstimatedUnitsDelivered)}</div>
          <p className="text-[10px] text-muted-foreground font-medium">Calculated individual units in circulation</p>
        </div>
      </div>

      {/* Recent Deliveries Table */}
      <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="p-6 pb-0">
          <h3 className="text-base font-semibold text-[#2C2621]">Recent Deliveries</h3>
          <p className="text-xs text-muted-foreground mt-1">Latest supply chain delivery scans logged by operators.</p>
        </div>

        <div className="p-6">
          {recentDeliveryScans.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground border border-dashed border-border/50 rounded-xl">
              No delivery scans logged yet. Start by scanning a delivery QR code.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/40">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/30">
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Retailer</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Campaign</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Batch</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Cartons</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Est. Units</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {recentDeliveryScans.map((scan) => (
                    <tr key={scan.id} className="hover:bg-[#F5EFE0]/40 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                          {formatDate(scan.createdAt)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-[#2C2621] block">{scan.retailer?.name ?? "—"}</span>
                        {scan.retailer?.type && (
                          <Badge variant="outline" className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider">
                            {scan.retailer.type}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-[150px] truncate text-[#2C2621]">
                        {scan.campaign?.name ?? "—"}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[10px] text-muted-foreground">
                        {scan.batch?.batchCode ?? "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-[#2C2621]">
                        {scan.cartonsDelivered}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-600">
                        {formatNumber(scan.estimatedUnitsDelivered)}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        <span className="inline-flex items-center gap-1 text-[10px]">
                          <MapPin className="h-3 w-3 text-muted-foreground/60" />
                          {scan.city ? scan.city : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
