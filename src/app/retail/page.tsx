// src/app/retail/page.tsx
import React from "react";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { getDashboardForRole } from "@/lib/auth/role-redirect";
import { getRetailOperationsDashboardData } from "@/server/services/delivery-scan.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatDate, formatNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Truck, Archive, Layers, Calendar, MapPin, ClipboardList, Scan } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function RetailDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

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
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Retail Operations Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor product drop-offs, track active distribution, and verify carton counts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="border-slate-800">
            <Link href="/retail/deliveries" className="flex items-center gap-2 text-xs">
              <ClipboardList className="h-4 w-4" /> View History
            </Link>
          </Button>
          <Button asChild size="sm" className="bg-gradient-to-r from-blue-500 to-teal-600 hover:from-blue-600 hover:to-teal-700">
            <Link href="/retail/scan" className="flex items-center gap-2 text-xs">
              <Scan className="h-4 w-4" /> Scan Delivery Code
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-slate-900/40 border-slate-850">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Delivery Scans</CardTitle>
            <Truck className="h-4.5 w-4.5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-slate-100">{formatNumber(totalDeliveryScans)}</div>
            <p className="text-[10px] text-slate-500 mt-1">Logged drop-offs at distribution sites</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-850">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Cartons Delivered</CardTitle>
            <Layers className="h-4.5 w-4.5 text-teal-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-slate-100">{formatNumber(totalCartonsDelivered)}</div>
            <p className="text-[10px] text-slate-500 mt-1">Physical carton count drop-offs</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-850">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Estimated Placed Units</CardTitle>
            <Archive className="h-4.5 w-4.5 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-slate-100">{formatNumber(totalEstimatedUnitsDelivered)}</div>
            <p className="text-[10px] text-slate-500 mt-1">Calculated individual units in circulation</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Deliveries Table */}
      <Card className="bg-slate-900/40 border-slate-850">
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-200">Recent Deliveries</CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Latest supply chain delivery scans logged by operators.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentDeliveryScans.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No delivery scans logged yet. Start by scanning a delivery QR code.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="py-3 px-2">Date</th>
                    <th className="py-3 px-2">Retailer</th>
                    <th className="py-3 px-2">Campaign</th>
                    <th className="py-3 px-2">Batch</th>
                    <th className="py-3 px-2 text-right">Cartons</th>
                    <th className="py-3 px-2 text-right">Est. Units</th>
                    <th className="py-3 px-2 text-right">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {recentDeliveryScans.map((scan) => (
                    <tr key={scan.id} className="hover:bg-slate-850/40 transition-colors">
                      <td className="py-3 px-2 whitespace-nowrap text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(scan.createdAt)}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="font-semibold text-slate-200 block">
                          {scan.retailer?.name ?? "—"}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {scan.retailer?.type ?? "—"}
                        </span>
                      </td>
                      <td className="py-3 px-2 max-w-[150px] truncate">
                        {scan.campaign?.name ?? "—"}
                      </td>
                      <td className="py-3 px-2 font-mono text-[10px]">
                        {scan.batch?.batchCode ?? "—"}
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-medium">
                        {scan.cartonsDelivered}
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-semibold text-emerald-400">
                        {formatNumber(scan.estimatedUnitsDelivered)}
                      </td>
                      <td className="py-3 px-2 text-right text-slate-400">
                        <span className="inline-flex items-center gap-1 text-[10px]">
                          <MapPin className="h-3 w-3 text-slate-500" />
                          {scan.city ? `${scan.city}` : "Manual Entry"}
                        </span>
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
