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
      <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
        <CardContent className="flex flex-col items-center justify-center min-h-[420px] text-center p-8">
          <div className="p-4 bg-slate-950 rounded-full border border-slate-850 mb-4 text-amber-500/90 animate-pulse">
            <AlertTriangle className="h-10 w-10" />
          </div>
          <h3 className="text-xl font-semibold text-slate-200 tracking-tight">Map Tiles Not Configured</h3>
          <p className="text-slate-400 text-sm max-w-lg mt-3 leading-relaxed">
            The interactive map layer is disabled because the MapTiler key is not configured in your environment.
            To enable base map tiles, please set the <code className="px-1.5 py-0.5 bg-slate-950 rounded text-amber-400 text-xs font-mono font-bold">NEXT_PUBLIC_MAPTILER_KEY</code> environment variable.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 justify-center bg-slate-950 border border-slate-850 rounded-lg p-4 max-w-md w-full">
            <div className="text-left text-xs text-slate-350 space-y-1 w-full">
              <span className="font-semibold text-slate-400 block mb-1.5 uppercase tracking-wider text-[10px]">Unmapped Coordinates (Seed Data):</span>
              <div className="flex justify-between border-b border-slate-900 pb-1">
                <span>Consumer Scan Markers:</span>
                <span className="font-semibold text-indigo-400">{validScanMarkers.length} Mapped</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Drops:</span>
                <span className="font-semibold text-emerald-400">{validDeliveryMarkers.length} Mapped</span>
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
    <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 shadow-xl h-[500px] w-full">
      {/* CSS Overrides to style Maplibre Popups darkly */}
      <style jsx global>{`
        .maplibregl-popup-content {
          background-color: #0f172a !important; /* slate-900 */
          color: #f1f5f9 !important; /* slate-100 */
          border: 1px solid #1e293b !important; /* slate-800 */
          border-radius: 0.5rem !important;
          padding: 0 !important;
          box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.5) !important;
        }
        .maplibregl-popup-anchor-top .maplibregl-popup-tip {
          border-bottom-color: #1e293b !important;
        }
        .maplibregl-popup-anchor-bottom .maplibregl-popup-tip {
          border-top-color: #1e293b !important;
        }
        .maplibregl-popup-anchor-left .maplibregl-popup-tip {
          border-right-color: #1e293b !important;
        }
        .maplibregl-popup-anchor-right .maplibregl-popup-tip {
          border-left-color: #1e293b !important;
        }
        .maplibregl-popup-close-button {
          color: #94a3b8 !important; /* slate-400 */
          padding: 4px 8px !important;
          font-size: 14px !important;
          outline: none !important;
        }
        .maplibregl-popup-close-button:hover {
          color: #f1f5f9 !important;
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
            <div className="p-4 space-y-2 text-xs w-[240px]">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span
                  className={`font-semibold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                    selectedMarker.type === "SCAN"
                      ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  }`}
                >
                  {selectedMarker.type === "SCAN" ? "Consumer Scan" : "Delivery"}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(selectedMarker.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Campaign:</span>
                  <span className="font-medium text-slate-200 text-right truncate max-w-[140px]" title={selectedMarker.campaignName}>
                    {selectedMarker.campaignName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Product:</span>
                  <span className="font-medium text-slate-200 text-right truncate max-w-[145px]" title={selectedMarker.productName}>
                    {selectedMarker.productName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Batch Code:</span>
                  <span className="font-mono text-[10px] text-slate-200">{selectedMarker.batchCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Location:</span>
                  <span className="font-medium text-slate-200 text-right">
                    {[selectedMarker.suburb, selectedMarker.city].filter(Boolean).join(", ") || "Unknown"}
                  </span>
                </div>

                {selectedMarker.type === "SCAN" ? (
                  <div className="border-t border-slate-800 pt-2 mt-2 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Scan Hits:</span>
                      <span className="font-mono text-slate-200">
                        {(selectedMarker as ConsumerScanMarker).hitCount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Billable Hits:</span>
                      <span className="font-mono font-semibold text-emerald-400">
                        {(selectedMarker as ConsumerScanMarker).billableCount}
                      </span>
                    </div>
                    {(selectedMarker as ConsumerScanMarker).isSuspicious && (
                      <div className="flex items-center gap-1 text-rose-400 font-semibold mt-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Suspicious Activity</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border-t border-slate-800 pt-2 mt-2 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Retailer:</span>
                      <span className="font-medium text-slate-200 truncate max-w-[140px]" title={(selectedMarker as DeliveryMarker).retailerName}>
                        {(selectedMarker as DeliveryMarker).retailerName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Cartons:</span>
                      <span className="font-mono text-slate-250">
                        {(selectedMarker as DeliveryMarker).cartonsDelivered}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Est. Units:</span>
                      <span className="font-mono font-semibold text-teal-400">
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
      <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg p-3 text-[11px] text-slate-300 shadow-xl space-y-2 pointer-events-none">
        <span className="font-semibold text-slate-200 uppercase tracking-wider text-[9px] block border-b border-slate-800 pb-1 mb-1.5">Legend</span>
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
