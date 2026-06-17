// src/components/heatmaps/heatmap-map.tsx
"use client";

import React, { useState } from "react";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { CombinedLocationMarker } from "@/lib/heatmap-grouping";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Scan, Truck } from "lucide-react";
import { formatNumber, formatDateTime } from "@/lib/format";

interface HeatmapMapProps {
  locationMarkers: CombinedLocationMarker[];
}

type PopupTab = "consumer" | "delivery";

function locationLabel(city: string, suburb: string, country: string): string {
  return [suburb, city, country].filter(Boolean).join(", ") || "Unknown location";
}

export function HeatmapMap({ locationMarkers }: HeatmapMapProps) {
  const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;

  const [selectedLocation, setSelectedLocation] =
    useState<CombinedLocationMarker | null>(null);
  const [popupTab, setPopupTab] = useState<PopupTab>("consumer");

  const totalMappedScanHits = locationMarkers.reduce(
    (sum, loc) => sum + (loc.consumer?.totalHitCount ?? 0),
    0
  );
  const totalDeliveryDrops = locationMarkers.reduce(
    (sum, loc) => sum + (loc.delivery?.dropCount ?? 0),
    0
  );
  const totalValidMarkers = locationMarkers.length;

  // ── MapTiler key missing ────────────────────────────────────────────────────
  if (!maptilerKey) {
    const consumerPoints = locationMarkers.filter((l) => l.consumer).length;
    const deliveryPoints = locationMarkers.filter((l) => l.delivery).length;
    return (
      <Card className="bg-card border-border/50 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="flex flex-col items-center justify-center min-h-[420px] text-center p-8 bg-gradient-to-b from-transparent to-muted/20">
          <div className="p-4 bg-muted/50 rounded-full border border-border/60 mb-4 text-[#F48F68] animate-pulse">
            <AlertTriangle className="h-10 w-10" />
          </div>
          <h3 className="text-xl font-semibold text-[#2C2621] tracking-tight">
            Map Tiles Not Configured
          </h3>
          <p className="text-muted-foreground text-sm max-w-lg mt-3 leading-relaxed">
            The interactive map layer is disabled because the MapTiler key is not
            configured in your environment. Set{" "}
            <code className="px-1.5 py-0.5 bg-muted rounded text-[#1E5C5A] text-xs font-mono font-bold">
              NEXT_PUBLIC_MAPTILER_KEY
            </code>{" "}
            to enable map tiles.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 justify-center bg-card border border-border/50 rounded-xl p-5 max-w-md w-full shadow-sm">
            <div className="text-left text-xs text-muted-foreground space-y-1.5 w-full">
              <span className="font-semibold text-[#2C2621] block mb-2 uppercase tracking-wider text-[10px]">
                Aggregated Location Points:
              </span>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span>Consumer scan locations:</span>
                <span className="font-semibold text-indigo-600">{consumerPoints}</span>
              </div>
              <div className="flex justify-between pt-0.5">
                <span>Delivery drop locations:</span>
                <span className="font-semibold text-emerald-600">{deliveryPoints}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Map center ──────────────────────────────────────────────────────────────
  const defaultCenter = { latitude: -6.7924, longitude: 39.2083, zoom: 9 };
  const initialViewState =
    totalValidMarkers > 0
      ? {
          latitude:
            locationMarkers.reduce((acc, m) => acc + m.latitude, 0) /
            totalValidMarkers,
          longitude:
            locationMarkers.reduce((acc, m) => acc + m.longitude, 0) /
            totalValidMarkers,
          zoom: 4,
        }
      : defaultCenter;

  const mapStyleUrl = `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${maptilerKey}`;

  function openPopup(loc: CombinedLocationMarker) {
    setSelectedLocation(loc);
    setPopupTab(loc.consumer ? "consumer" : "delivery");
  }

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-background shadow-sm h-[500px] w-full">
      {/* MapLibre popup style overrides */}
      <style jsx global>{`
        .maplibregl-popup-content {
          background-color: #ffffff !important;
          color: #1e293b !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 0.75rem !important;
          padding: 0 !important;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1),
            0 4px 6px -4px rgb(0 0 0 / 0.1) !important;
          max-width: 300px !important;
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
          border-radius: 0.5rem;
        }
        .maplibregl-popup-close-button:hover {
          color: #0f172a !important;
          background: #f1f5f9 !important;
        }
        .maplibregl-popup-close-button:focus-visible {
          outline: 2px solid #6366f1 !important;
          outline-offset: 1px !important;
        }
      `}</style>

      <Map
        initialViewState={initialViewState}
        mapStyle={mapStyleUrl}
        mapLib={maplibregl}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" />

        {/* ── Markers ─────────────────────────────────────────────────────── */}
        {locationMarkers.map((loc) => {
          const hasConsumer = loc.consumer !== null;
          const hasDelivery = loc.delivery !== null;
          const hasBoth = hasConsumer && hasDelivery;

          // Size based on dominant data
          const consumerHits = loc.consumer?.totalHitCount ?? 0;
          const deliveryUnits = loc.delivery?.totalEstimatedUnitsDelivered ?? 0;
          const outerSize = hasBoth
            ? Math.min(44, 20 + Math.log2(consumerHits + deliveryUnits + 1) * 4)
            : hasConsumer
            ? Math.min(38, 18 + Math.log2(consumerHits + 1) * 5)
            : Math.min(42, 18 + Math.log2(deliveryUnits + 1) * 2.5);

          const title = [
            hasConsumer ? `${formatNumber(consumerHits)} scan hits` : null,
            hasDelivery
              ? `${formatNumber(loc.delivery!.totalEstimatedUnitsDelivered)} units delivered`
              : null,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <Marker
              key={loc.groupKey}
              latitude={loc.latitude}
              longitude={loc.longitude}
              onClick={(e: any) => {
                e.originalEvent.stopPropagation();
                openPopup(loc);
              }}
            >
              {hasBoth ? (
                // ── Combined marker: outer indigo + inner emerald ──────────
                <div
                  className="relative flex items-center justify-center cursor-pointer hover:scale-125 transition-all"
                  style={{ width: outerSize, height: outerSize }}
                  title={title}
                  role="button"
                  aria-label={`Combined location: ${title}`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") openPopup(loc);
                  }}
                >
                  {/* Outer indigo ring */}
                  <div className="absolute inset-0 rounded-full bg-indigo-500/15 border-2 border-indigo-500" />
                  {/* Inner emerald ring */}
                  <div
                    className="absolute rounded-full bg-emerald-500/15 border-2 border-emerald-500"
                    style={{ inset: "5px" }}
                  />
                  {/* Center dot: split gradient */}
                  <span className="relative z-10 h-2 w-2 rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500" />
                </div>
              ) : hasConsumer ? (
                // ── Consumer-only marker ────────────────────────────────────
                <div
                  className="relative flex items-center justify-center rounded-full bg-indigo-500/20 border-2 border-indigo-500 cursor-pointer hover:scale-125 transition-all"
                  style={{ width: outerSize, height: outerSize }}
                  title={title}
                  role="button"
                  aria-label={`Consumer scan location: ${title}`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") openPopup(loc);
                  }}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse" />
                </div>
              ) : (
                // ── Delivery-only marker ────────────────────────────────────
                <div
                  className="relative flex items-center justify-center rounded-full bg-emerald-500/20 border-2 border-emerald-500 cursor-pointer hover:scale-125 transition-all"
                  style={{ width: outerSize, height: outerSize }}
                  title={title}
                  role="button"
                  aria-label={`Delivery location: ${title}`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") openPopup(loc);
                  }}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              )}
            </Marker>
          );
        })}

        {/* ── Popup ───────────────────────────────────────────────────────── */}
        {selectedLocation && (
          <Popup
            latitude={selectedLocation.latitude}
            longitude={selectedLocation.longitude}
            anchor="top"
            offset={14}
            onClose={() => setSelectedLocation(null)}
            closeButton
            closeOnClick={false}
          >
            <div className="text-xs bg-white rounded-xl overflow-hidden w-[280px]">
              {/* Location header */}
              <div className="px-4 pt-4 pb-2 border-b border-slate-100">
                <p className="font-semibold text-slate-800 text-[11px] leading-tight">
                  {locationLabel(
                    selectedLocation.consumer?.displayCity ??
                      selectedLocation.delivery?.displayCity ??
                      "",
                    selectedLocation.consumer?.displaySuburb ??
                      selectedLocation.delivery?.displaySuburb ??
                      "",
                    selectedLocation.consumer?.displayCountry ??
                      selectedLocation.delivery?.displayCountry ??
                      ""
                  )}
                </p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {selectedLocation.latitude.toFixed(5)},{" "}
                  {selectedLocation.longitude.toFixed(5)}
                </p>
              </div>

              {/* Tab bar — only shown when both types are present */}
              {selectedLocation.consumer && selectedLocation.delivery && (
                <div className="flex gap-1 px-4 pt-2.5 pb-0">
                  <button
                    onClick={() => setPopupTab("consumer")}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-colors ${
                      popupTab === "consumer"
                        ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                        : "text-slate-500 hover:bg-slate-50 border border-transparent"
                    }`}
                    aria-pressed={popupTab === "consumer"}
                  >
                    <Scan className="h-3 w-3" />
                    Consumer Scans
                  </button>
                  <button
                    onClick={() => setPopupTab("delivery")}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-colors ${
                      popupTab === "delivery"
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        : "text-slate-500 hover:bg-slate-50 border border-transparent"
                    }`}
                    aria-pressed={popupTab === "delivery"}>
                    <Truck className="h-3 w-3" />
                    Deliveries
                  </button>
                </div>
              )}

              {/* Content area */}
              <div className="px-4 pb-4 pt-2 max-h-[300px] overflow-y-auto space-y-1.5">
                {/* ── Consumer section ── */}
                {selectedLocation.consumer &&
                  (!selectedLocation.delivery || popupTab === "consumer") && (
                    <>
                      {!selectedLocation.delivery && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <Scan className="h-3 w-3 text-indigo-600" />
                          <span className="font-semibold text-indigo-700 text-[10px] uppercase tracking-wider">
                            Consumer Scans
                          </span>
                        </div>
                      )}
                      <Row
                        label="Scan Hits"
                        value={formatNumber(selectedLocation.consumer.totalHitCount)}
                        highlight="indigo"
                      />
                      <Row
                        label="Billable Hits"
                        value={formatNumber(selectedLocation.consumer.totalBillableCount)}
                        highlight="emerald"
                      />
                      <Row
                        label="Repeat Hits"
                        value={formatNumber(selectedLocation.consumer.totalRepeatCount)}
                      />
                      <Row
                        label="Suspicious"
                        value={formatNumber(selectedLocation.consumer.totalSuspiciousCount)}
                        highlight={
                          selectedLocation.consumer.totalSuspiciousCount > 0 ? "rose" : undefined
                        }
                      />
                      <Row
                        label="Scan Buckets"
                        value={formatNumber(selectedLocation.consumer.bucketCount)}
                        dimmed
                      />
                      <div className="border-t border-slate-100 mt-1.5 pt-1.5 space-y-1.5">
                        <MultiRow
                          label="Campaigns"
                          items={selectedLocation.consumer.campaigns}
                        />
                        <MultiRow
                          label="Products"
                          items={selectedLocation.consumer.products}
                        />
                        <Row
                          label="First seen"
                          value={formatDateTime(selectedLocation.consumer.earliestAt)}
                          dimmed
                        />
                        {selectedLocation.consumer.latestAt >
                          selectedLocation.consumer.earliestAt && (
                          <Row
                            label="Last seen"
                            value={formatDateTime(selectedLocation.consumer.latestAt)}
                            dimmed
                          />
                        )}
                      </div>
                    </>
                  )}

                {/* ── Delivery section ── */}
                {selectedLocation.delivery &&
                  (!selectedLocation.consumer || popupTab === "delivery") && (
                    <>
                      {!selectedLocation.consumer && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <Truck className="h-3 w-3 text-emerald-600" />
                          <span className="font-semibold text-emerald-700 text-[10px] uppercase tracking-wider">
                            Deliveries
                          </span>
                        </div>
                      )}
                      <Row
                        label="Drop Events"
                        value={formatNumber(selectedLocation.delivery.dropCount)}
                        highlight="emerald"
                      />
                      <Row
                        label="Total Cartons"
                        value={formatNumber(selectedLocation.delivery.totalCartonsDelivered)}
                      />
                      <Row
                        label="Est. Units"
                        value={formatNumber(
                          selectedLocation.delivery.totalEstimatedUnitsDelivered
                        )}
                        highlight="teal"
                      />
                      <div className="border-t border-slate-100 mt-1.5 pt-1.5 space-y-1.5">
                        <MultiRow
                          label="Retailers"
                          items={selectedLocation.delivery.retailers}
                        />
                        <MultiRow
                          label="Campaigns"
                          items={selectedLocation.delivery.campaigns}
                        />
                        <Row
                          label="First drop"
                          value={formatDateTime(selectedLocation.delivery.earliestAt)}
                          dimmed
                        />
                        {selectedLocation.delivery.latestAt >
                          selectedLocation.delivery.earliestAt && (
                          <Row
                            label="Last drop"
                            value={formatDateTime(selectedLocation.delivery.latestAt)}
                            dimmed
                          />
                        )}
                      </div>
                    </>
                  )}
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* ── Legend ──────────────────────────────────────────────────────────── */}
      <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-md border border-border/50 rounded-xl p-3.5 text-xs text-muted-foreground shadow-sm space-y-2 pointer-events-none">
        <span className="font-semibold text-[#2C2621] uppercase tracking-wider text-[10px] block border-b border-border/40 pb-1.5 mb-2">
          Legend
        </span>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-indigo-500 border border-indigo-400 shrink-0" />
          <span>Consumer Scans ({formatNumber(totalMappedScanHits)} hits)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-500 border border-emerald-400 shrink-0" />
          <span>Deliveries ({formatNumber(totalDeliveryDrops)} drops)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative h-3 w-3 shrink-0">
            <span className="absolute inset-0 rounded-full border-2 border-indigo-500" />
            <span className="absolute inset-[3px] rounded-full border border-emerald-500" />
          </span>
          <span>Both at same location</span>
        </div>
      </div>
    </div>
  );
}

// ── Small popup sub-components ────────────────────────────────────────────────

function Row({
  label,
  value,
  highlight,
  dimmed,
}: {
  label: string;
  value: string;
  highlight?: "indigo" | "emerald" | "teal" | "rose";
  dimmed?: boolean;
}) {
  const valueClass =
    highlight === "indigo"
      ? "font-mono font-semibold text-indigo-700"
      : highlight === "emerald"
      ? "font-mono font-semibold text-emerald-600"
      : highlight === "teal"
      ? "font-mono font-semibold text-teal-600"
      : highlight === "rose"
      ? "font-mono font-semibold text-rose-600"
      : dimmed
      ? "font-mono text-slate-400"
      : "font-mono text-slate-800";

  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500 shrink-0">{label}:</span>
      <span className={`${valueClass} text-right truncate max-w-[160px]`} title={value}>
        {value}
      </span>
    </div>
  );
}

function MultiRow({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  if (items.length === 1) {
    return (
      <div className="flex justify-between gap-3">
        <span className="text-slate-500 shrink-0">{label}:</span>
        <span className="text-slate-800 text-right truncate max-w-[160px]" title={items[0]}>
          {items[0]}
        </span>
      </div>
    );
  }
  return (
    <div>
      <span className="text-slate-500">{label}:</span>
      <ul className="mt-0.5 ml-2 space-y-0.5">
        {items.map((item) => (
          <li
            key={item}
            className="text-slate-800 truncate max-w-[220px]"
            title={item}
          >
            · {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
