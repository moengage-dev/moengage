// src/components/heatmaps/heatmap-map.tsx
"use client";

import React, { useState } from "react";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ConsumerScanMarker, DeliveryMarker } from "@/server/services/heatmaps.service";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Info, AlertTriangle } from "lucide-react";

interface HeatmapMapProps {
  scanMarkers: ConsumerScanMarker[];
  deliveryMarkers: DeliveryMarker[];
}

export function HeatmapMap({ scanMarkers, deliveryMarkers }: HeatmapMapProps) {
  const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  const [selectedMarker, setSelectedMarker] = useState<ConsumerScanMarker | DeliveryMarker | null>(null);

  // Filter out records without coordinates
  const validScanMarkers = scanMarkers.filter((m) => m.latitude !== null && m.longitude !== null);
  const validDeliveryMarkers = deliveryMarkers.filter((m) => m.latitude !== null && m.longitude !== null);
  const totalValidMarkers = validScanMarkers.length + validDeliveryMarkers.length;
  const totalMappedScanHits = validScanMarkers.reduce((sum, marker) => sum + marker.hitCount, 0);

  // Render graceful fallback if key is missing
  if (!maptilerKey) {
    return (
      <Card className="bg-card border-border/50 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="flex flex-col items-center justify-center min-h-[420px] text-center p-8 bg-gradient-to-b from-transparent to-muted/20">
          <div className="p-4 bg-muted/50 rounded-full border border-border/60 mb-4 text-[#F48F68] animate-pulse">
            <AlertTriangle className="h-10 w-10" />
          </div>
          <h3 className="text-xl font-semibold text-[#2C2621] tracking-tight">Map Tiles Not Configured</h3>
          <p className="text-muted-foreground text-sm max-w-lg mt-3 leading-relaxed">
            The interactive map layer is disabled because the MapTiler key is not configured in your environment.
            To enable base map tiles, please set the <code className="px-1.5 py-0.5 bg-muted rounded text-[#1E5C5A] text-xs font-mono font-bold">NEXT_PUBLIC_MAPTILER_KEY</code> environment variable.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 justify-center bg-card border border-border/50 rounded-xl p-5 max-w-md w-full shadow-sm">
            <div className="text-left text-xs text-muted-foreground space-y-1.5 w-full">
              <span className="font-semibold text-[#2C2621] block mb-2 uppercase tracking-wider text-[10px]">Unmapped Coordinates (Seed Data):</span>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span>Consumer Scan Markers:</span>
                <span className="font-semibold text-indigo-600">{validScanMarkers.length} Mapped</span>
              </div>
              <div className="flex justify-between pt-0.5">
                <span>Delivery Drops:</span>
                <span className="font-semibold text-emerald-600">{validDeliveryMarkers.length} Mapped</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate center of all valid markers or center on Dar es Salaam
  const defaultCenter = {
    latitude: -6.7924,
    longitude: 39.2083,
    zoom: 9,
  };

  const initialViewState = totalValidMarkers > 0
    ? {
        latitude:
          [...validScanMarkers, ...validDeliveryMarkers].reduce((acc, m) => acc + (m.latitude ?? 0), 0) /
          totalValidMarkers,
        longitude:
          [...validScanMarkers, ...validDeliveryMarkers].reduce((acc, m) => acc + (m.longitude ?? 0), 0) /
          totalValidMarkers,
        zoom: 10,
      }
    : defaultCenter;

  const mapStyleUrl = `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${maptilerKey}`;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-background shadow-sm h-[500px] w-full">
      {/* CSS Overrides to style Maplibre Popups cleanly */}
      <style jsx global>{`
        .maplibregl-popup-content {
          background-color: #ffffff !important;
          color: #1e293b !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 0.75rem !important;
          padding: 0 !important;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important;
        }
        .maplibregl-popup-anchor-top .maplibregl-popup-tip {
          border-bottom-color: #e2e8f0 !important;
        }
        .maplibregl-popup-anchor-bottom .maplibregl-popup-tip {
          border-top-color: #e2e8f0 !important;
        }
        .maplibregl-popup-anchor-left .maplibregl-popup-tip {
          border-right-color: #e2e8f0 !important;
        }
        .maplibregl-popup-anchor-right .maplibregl-popup-tip {
          border-left-color: #e2e8f0 !important;
        }
        .maplibregl-popup-close-button {
          color: #94a3b8 !important;
          padding: 4px 8px !important;
          font-size: 14px !important;
          outline: none !important;
        }
        .maplibregl-popup-close-button:hover {
          color: #0f172a !important;
          background: transparent !important;
        }
      `}</style>

      <Map
        initialViewState={initialViewState}
        mapStyle={mapStyleUrl}
        mapLib={maplibregl}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" />

        {/* Consumer Scan Markers (Indigo) */}
        {validScanMarkers.map((marker) => {
          const size = Math.min(38, 18 + Math.log2(marker.hitCount + 1) * 5);
          return (
            <Marker
              key={marker.id}
              latitude={marker.latitude!}
              longitude={marker.longitude!}
              onClick={(e: any) => {
                e.originalEvent.stopPropagation();
                setSelectedMarker(marker);
              }}
            >
              <div
                className="group relative flex items-center justify-center rounded-full bg-indigo-500/20 border-2 border-indigo-500 cursor-pointer hover:scale-125 transition-all"
                style={{ width: size, height: size }}
                title={`${marker.hitCount} scan hits`}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse" />
                <div className="absolute inset-0 scale-150" />
              </div>
            </Marker>
          );
        })}

        {/* Delivery Scan Markers (Emerald) */}
        {validDeliveryMarkers.map((marker) => {
          const size = Math.min(
            42,
            18 + Math.log2(marker.estimatedUnitsDelivered + 1) * 2.5,
          );
          return (
            <Marker
              key={marker.id}
              latitude={marker.latitude!}
              longitude={marker.longitude!}
              onClick={(e: any) => {
                e.originalEvent.stopPropagation();
                setSelectedMarker(marker);
              }}
            >
              <div
                className="group relative flex items-center justify-center rounded-full bg-emerald-500/20 border-2 border-emerald-500 cursor-pointer hover:scale-125 transition-all"
                style={{ width: size, height: size }}
                title={`${marker.estimatedUnitsDelivered} estimated units delivered`}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <div className="absolute inset-0 scale-150" />
              </div>
            </Marker>
          );
        })}

        {/* Selected Marker Popup Details */}
        {selectedMarker && (
          <Popup
            latitude={selectedMarker.latitude!}
            longitude={selectedMarker.longitude!}
            anchor="top"
            offset={12}
            onClose={() => setSelectedMarker(null)}
          >
            <div className="p-4 space-y-2 text-xs w-[240px] bg-white rounded-xl">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <span
                  className={`font-semibold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                    selectedMarker.type === "SCAN"
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}
                >
                  {selectedMarker.type === "SCAN" ? "Consumer Scan" : "Delivery"}
                </span>
                <span className="text-[10px] text-slate-500">
                  {new Date(selectedMarker.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-500">Campaign:</span>
                  <span className="font-medium text-slate-900 text-right truncate max-w-[140px]" title={selectedMarker.campaignName}>
                    {selectedMarker.campaignName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Product:</span>
                  <span className="font-medium text-slate-900 text-right truncate max-w-[145px]" title={selectedMarker.productName}>
                    {selectedMarker.productName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Batch Code:</span>
                  <span className="font-mono text-[10px] text-slate-900">{selectedMarker.batchCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Location:</span>
                  <span className="font-medium text-slate-900 text-right">
                    {[selectedMarker.suburb, selectedMarker.city].filter(Boolean).join(", ") || "Unknown"}
                  </span>
                </div>

                {selectedMarker.type === "SCAN" ? (
                  <div className="border-t border-slate-200 pt-2 mt-2 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Scan Hits:</span>
                      <span className="font-mono text-slate-900">
                        {(selectedMarker as ConsumerScanMarker).hitCount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Billable Hits:</span>
                      <span className="font-mono font-semibold text-emerald-600">
                        {(selectedMarker as ConsumerScanMarker).billableCount}
                      </span>
                    </div>
                    {(selectedMarker as ConsumerScanMarker).isSuspicious && (
                      <div className="flex items-center gap-1 text-rose-600 font-semibold mt-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Suspicious Activity</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border-t border-slate-200 pt-2 mt-2 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Retailer:</span>
                      <span className="font-medium text-slate-900 truncate max-w-[140px]" title={(selectedMarker as DeliveryMarker).retailerName}>
                        {(selectedMarker as DeliveryMarker).retailerName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cartons:</span>
                      <span className="font-mono text-slate-900">
                        {(selectedMarker as DeliveryMarker).cartonsDelivered}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Est. Units:</span>
                      <span className="font-mono font-semibold text-teal-600">
                        {(selectedMarker as DeliveryMarker).estimatedUnitsDelivered}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-md border border-border/50 rounded-xl p-3.5 text-xs text-muted-foreground shadow-sm space-y-2 pointer-events-none">
        <span className="font-semibold text-[#2C2621] uppercase tracking-wider text-[10px] block border-b border-border/40 pb-1.5 mb-2">Legend</span>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-indigo-500 border border-indigo-400" />
          <span>Consumer Scans ({totalMappedScanHits} hits)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-500 border border-emerald-400" />
          <span>Deliveries ({validDeliveryMarkers.length})</span>
        </div>
      </div>
    </div>
  );
}
