// src/components/heatmaps/heatmap-data-tables.tsx
"use client";

import React from "react";
import { ConsumerScanMarker, DeliveryMarker } from "@/server/services/heatmaps.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatDateTime } from "@/lib/format";
import { Scan, Truck, MapPin } from "lucide-react";

interface HeatmapDataTablesProps {
  scanMarkers: ConsumerScanMarker[];
  deliveryMarkers: DeliveryMarker[];
}

export function HeatmapDataTables({ scanMarkers, deliveryMarkers }: HeatmapDataTablesProps) {
  const formatCoordinates = (lat: number | null, lng: number | null) => {
    if (lat === null || lng === null) {
      return <span className="text-slate-550 italic text-[10px]">No GPS</span>;
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-slate-350 bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-900 font-mono">
        <MapPin className="h-3 w-3 text-slate-500" />
        {lat.toFixed(5)}, {lng.toFixed(5)}
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      {/* Consumer Scan Markers Table */}
      <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-slate-800/60 pb-4">
          <div className="flex items-center gap-2">
            <Scan className="h-4 w-4 text-indigo-400" />
            <CardTitle className="text-md font-semibold text-slate-200">Consumer Engagement Scans</CardTitle>
          </div>
          <CardDescription className="text-slate-400 text-xs mt-1">
            Geographic log of individual consumer scans matching the current filters.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-slate-950/60 border-b border-slate-800/80 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="text-slate-300 font-semibold text-xs py-3 px-4">Date</TableHead>
                  <TableHead className="text-slate-300 font-semibold text-xs py-3 px-4">Campaign</TableHead>
                  <TableHead className="text-slate-300 font-semibold text-xs py-3 px-4">Product</TableHead>
                  <TableHead className="text-slate-300 font-semibold text-xs py-3 px-4">Location</TableHead>
                  <TableHead className="text-slate-300 font-semibold text-xs py-3 px-4">Type</TableHead>
                  <TableHead className="text-slate-300 font-semibold text-xs py-3 px-4">Billable</TableHead>
                  <TableHead className="text-slate-300 font-semibold text-xs py-3 px-4">Coordinates</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scanMarkers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500 text-sm">
                      No scan events found.
                    </TableCell>
                  </TableRow>
                ) : (
                  scanMarkers.map((marker) => (
                    <TableRow key={marker.id} className="border-b border-slate-800/40 hover:bg-slate-850/20">
                      <TableCell className="py-2.5 px-4 font-mono text-[10px] text-slate-400">
                        {formatDateTime(marker.createdAt)}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 font-medium text-slate-250 truncate max-w-[120px]" title={marker.campaignName}>
                        {marker.campaignName}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-slate-400 truncate max-w-[100px]" title={marker.productName}>
                        {marker.productName}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-slate-400 truncate max-w-[120px]" title={[marker.suburb, marker.city, marker.country].filter(Boolean).join(", ")}>
                        {[marker.suburb, marker.city].filter(Boolean).join(", ") || "Unknown"}
                      </TableCell>
                      <TableCell className="py-2.5 px-4">
                        <Badge variant={marker.isRepeatScan ? "secondary" : "outline"} className="text-[9px] px-1 py-0 h-4 leading-none">
                          {marker.isRepeatScan ? "Repeat" : "First"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5 px-4">
                        <Badge className={`text-[9px] px-1 py-0 h-4 leading-none ${marker.isBillable ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-800 text-slate-450 border-slate-700"}`}>
                          {marker.isBillable ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5 px-4">
                        {formatCoordinates(marker.latitude, marker.longitude)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Markers Table */}
      <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-slate-800/60 pb-4">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-emerald-450" />
            <CardTitle className="text-md font-semibold text-slate-200">Delivery Distribution drops</CardTitle>
          </div>
          <CardDescription className="text-slate-400 text-xs mt-1">
            Geographic log of retail distribution drops matching the current filters.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-slate-950/60 border-b border-slate-800/80 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="text-slate-300 font-semibold text-xs py-3 px-4">Date</TableHead>
                  <TableHead className="text-slate-300 font-semibold text-xs py-3 px-4">Retailer</TableHead>
                  <TableHead className="text-slate-300 font-semibold text-xs py-3 px-4">Campaign</TableHead>
                  <TableHead className="text-slate-300 font-semibold text-xs py-3 px-4">Product</TableHead>
                  <TableHead className="text-slate-300 font-semibold text-xs py-3 px-4 text-right">Cartons</TableHead>
                  <TableHead className="text-slate-300 font-semibold text-xs py-3 px-4 text-right">Est. Units</TableHead>
                  <TableHead className="text-slate-300 font-semibold text-xs py-3 px-4">Coordinates</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveryMarkers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500 text-sm">
                      No delivery events found.
                    </TableCell>
                  </TableRow>
                ) : (
                  deliveryMarkers.map((marker) => (
                    <TableRow key={marker.id} className="border-b border-slate-800/40 hover:bg-slate-850/20">
                      <TableCell className="py-2.5 px-4 font-mono text-[10px] text-slate-400">
                        {formatDateTime(marker.createdAt)}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 font-semibold text-slate-250 truncate max-w-[120px]" title={marker.retailerName}>
                        {marker.retailerName}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-slate-400 truncate max-w-[100px]" title={marker.campaignName}>
                        {marker.campaignName}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-slate-400 truncate max-w-[100px]" title={marker.productName}>
                        {marker.productName}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-right font-mono font-medium text-slate-250">
                        {marker.cartonsDelivered}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-right font-mono font-semibold text-teal-400">
                        {formatNumber(marker.estimatedUnitsDelivered)}
                      </TableCell>
                      <TableCell className="py-2.5 px-4">
                        {formatCoordinates(marker.latitude, marker.longitude)}
                      </TableCell>
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
