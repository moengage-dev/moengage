// src/components/heatmaps/heatmap-data-tables.tsx
"use client";

import React from "react";
import { ConsumerScanMarker, DeliveryMarker } from "@/server/services/heatmaps.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber, formatDateTime } from "@/lib/format";
import { Scan, Truck, MapPin } from "lucide-react";

interface HeatmapDataTablesProps {
  scanMarkers: ConsumerScanMarker[];
  deliveryMarkers: DeliveryMarker[];
}

export function HeatmapDataTables({ scanMarkers, deliveryMarkers }: HeatmapDataTablesProps) {
  const formatCoordinates = (lat: number | null, lng: number | null) => {
    if (lat === null || lng === null) {
      return <span className="text-muted-foreground italic text-[10px]">No GPS</span>;
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border/40 font-mono">
        <MapPin className="h-3 w-3 text-muted-foreground/70" />
        {lat.toFixed(5)}, {lng.toFixed(5)}
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      {/* Consumer Scan Markers Table */}
      <Card className="bg-card border-border/50 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/40 pb-4">
          <div className="flex items-center gap-2">
            <Scan className="h-4 w-4 text-indigo-600" />
            <CardTitle className="text-md font-semibold text-foreground">Consumer Engagement Scans</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground text-xs mt-1">
            Geographic log of 30-second scan buckets matching the current filters.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-muted/30 border-b border-border/50 sticky top-0 z-10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-semibold text-xs py-3 px-4">Date</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs py-3 px-4">Campaign</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs py-3 px-4">Product</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs py-3 px-4">Location</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs py-3 px-4 text-right">Hits</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs py-3 px-4 text-right">Repeat</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs py-3 px-4 text-right">Suspicious</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs py-3 px-4 text-right">Billable</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs py-3 px-4">Coordinates</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scanMarkers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
                      No scan events found.
                    </TableCell>
                  </TableRow>
                ) : (
                  scanMarkers.map((marker) => (
                    <TableRow key={marker.id} className="border-b border-border/40 hover:bg-muted/20">
                      <TableCell className="py-2.5 px-4 font-mono text-[10px] text-muted-foreground">
                        {formatDateTime(marker.createdAt)}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 font-medium text-foreground truncate max-w-[120px]" title={marker.campaignName}>
                        {marker.campaignName}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-muted-foreground truncate max-w-[100px]" title={marker.productName}>
                        {marker.productName}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-muted-foreground truncate max-w-[120px]" title={[marker.suburb, marker.city, marker.country].filter(Boolean).join(", ")}>
                        {[marker.suburb, marker.city].filter(Boolean).join(", ") || "Unknown"}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-right font-mono">{formatNumber(marker.hitCount)}</TableCell>
                      <TableCell className="py-2.5 px-4 text-right font-mono">{formatNumber(marker.repeatCount)}</TableCell>
                      <TableCell className="py-2.5 px-4 text-right font-mono">{formatNumber(marker.suspiciousCount)}</TableCell>
                      <TableCell className="py-2.5 px-4 text-right font-mono text-emerald-600 font-medium">{formatNumber(marker.billableCount)}</TableCell>
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
      <Card className="bg-card border-border/50 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/40 pb-4">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-emerald-600" />
            <CardTitle className="text-md font-semibold text-foreground">Delivery Distribution drops</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground text-xs mt-1">
            Geographic log of retail distribution drops matching the current filters.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-muted/30 border-b border-border/50 sticky top-0 z-10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-semibold text-xs py-3 px-4">Date</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs py-3 px-4">Retailer</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs py-3 px-4">Campaign</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs py-3 px-4">Product</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs py-3 px-4 text-right">Cartons</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs py-3 px-4 text-right">Est. Units</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs py-3 px-4">Coordinates</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveryMarkers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                      No delivery events found.
                    </TableCell>
                  </TableRow>
                ) : (
                  deliveryMarkers.map((marker) => (
                    <TableRow key={marker.id} className="border-b border-border/40 hover:bg-muted/20">
                      <TableCell className="py-2.5 px-4 font-mono text-[10px] text-muted-foreground">
                        {formatDateTime(marker.createdAt)}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 font-semibold text-foreground truncate max-w-[120px]" title={marker.retailerName}>
                        {marker.retailerName}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-muted-foreground truncate max-w-[100px]" title={marker.campaignName}>
                        {marker.campaignName}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-muted-foreground truncate max-w-[100px]" title={marker.productName}>
                        {marker.productName}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-right font-mono font-medium text-muted-foreground">
                        {marker.cartonsDelivered}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-right font-mono font-semibold text-teal-600">
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
