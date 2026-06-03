// src/app/retail/deliveries/page.tsx
import React from "react";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { getDashboardForRole } from "@/lib/auth/role-redirect";
import { getRetailDeliveriesPageData } from "@/server/services/delivery-scan.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatDate, formatNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Truck, Layers, Archive, Calendar, MapPin, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function RetailDeliveriesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (user.role !== "RETAIL_OPERATIONS" && user.role !== "ADMIN") {
    redirect(getDashboardForRole(user.role));
  }

  const {
    deliveryScans,
    totalDeliveryScans,
    totalCartonsDelivered,
    totalEstimatedUnitsDelivered,
  } = await getRetailDeliveriesPageData(user);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/retail"
              className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Drop-off History</h1>
          <p className="text-muted-foreground">
            Review detailed logs of completed batch carton deliveries and locations.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-slate-900/40 border-slate-850">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Scans</CardTitle>
            <Truck className="h-4.5 w-4.5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-slate-100">{formatNumber(totalDeliveryScans)}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-850">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Cartons</CardTitle>
            <Layers className="h-4.5 w-4.5 text-teal-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-slate-100">{formatNumber(totalCartonsDelivered)}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-850">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Estimated Placements</CardTitle>
            <Archive className="h-4.5 w-4.5 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-slate-100">
              {formatNumber(totalEstimatedUnitsDelivered)} units
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Table Card */}
      <Card className="bg-slate-900/40 border-slate-850">
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-200">Delivery Scan Audit Logs</CardTitle>
          <CardDescription className="text-xs text-slate-400">
            A comprehensive history of distribution drop-offs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deliveryScans.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500">
              No historical delivery scans found.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold">
                    <th className="py-3.5 px-3">Date</th>
                    <th className="py-3.5 px-3">Retailer</th>
                    <th className="py-3.5 px-3">Campaign</th>
                    <th className="py-3.5 px-3">Product</th>
                    <th className="py-3.5 px-3">Batch Code</th>
                    <th className="py-3.5 px-3 text-right">Cartons</th>
                    <th className="py-3.5 px-3 text-right">Units/Carton</th>
                    <th className="py-3.5 px-3 text-right">Est. Units</th>
                    <th className="py-3.5 px-3">City / Suburb</th>
                    <th className="py-3.5 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {deliveryScans.map((scan) => (
                    <tr key={scan.id} className="hover:bg-slate-850/40 transition-colors">
                      <td className="py-3.5 px-3 whitespace-nowrap text-slate-400">
                        <span className="flex items-center gap-1.5 font-mono text-[11px]">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(scan.createdAt)}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-200 block">
                          {scan.retailer?.name ?? "—"}
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                          {scan.retailer?.type ?? "—"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 max-w-[140px] truncate">
                        {scan.campaign?.name ?? "—"}
                      </td>
                      <td className="py-3.5 px-3 max-w-[120px] truncate">
                        {scan.qrCode?.product?.name ?? "—"}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[10px]">
                        {scan.batch?.batchCode ?? "—"}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-medium">
                        {scan.cartonsDelivered}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-slate-400">
                        {scan.unitsPerCarton}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-emerald-400">
                        {formatNumber(scan.estimatedUnitsDelivered)}
                      </td>
                      <td className="py-3.5 px-3">
                        {scan.city ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-slate-500" />
                            {scan.suburb ? `${scan.suburb}, ` : ""}
                            {scan.city}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 max-w-[180px] truncate italic text-slate-400" title={scan.notes ?? undefined}>
                        {scan.notes ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
