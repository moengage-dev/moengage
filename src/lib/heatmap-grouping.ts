// src/lib/heatmap-grouping.ts
//
// Pure geographic grouping utilities for heatmap markers.
// No Prisma / DB imports — safe to import on the client or in tests.
//
// Grouping strategy: coordinates are rounded to GEO_PRECISION decimal places
// before building the group key.  At 3 decimal places each cell is ≈111 m
// wide (0.001° of latitude ≈ 111 m at the equator).  This is deliberately
// coarser than GPS accuracy but appropriate for city-level IP geolocation,
// where every scan from the same city returns the exact same coordinate.
//
// Grouping is performed in the service layer (server-side) so:
//  • The client receives one aggregated point per geographic cell — smaller
//    JSON payload, pure rendering responsibility in the browser.
//  • Grouping logic can be unit-tested without React or DB fixtures.

import type {
  ConsumerScanMarker,
  DeliveryMarker,
} from "@/server/services/heatmaps.service";

export const GEO_PRECISION = 3;

/** Safely decodes a URI-percent-encoded location string. */
export function decodeLabel(s: string): string {
  if (!s) return s;
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Canonical group key from a coordinate pair. */
export function geoKey(lat: number, lng: number): string {
  return `${lat.toFixed(GEO_PRECISION)},${lng.toFixed(GEO_PRECISION)}`;
}

// ─── Output types ─────────────────────────────────────────────────────────────

export interface AggregatedConsumerMarker {
  groupKey: string;
  latitude: number;
  longitude: number;
  /** Sum of hitCount across all ScanEvent rows in this cell. */
  totalHitCount: number;
  totalBillableCount: number;
  totalRepeatCount: number;
  totalSuspiciousCount: number;
  /** Number of raw ScanEvent rows aggregated into this point. */
  bucketCount: number;
  hasSuspicious: boolean;
  /** ISO 8601 string — safe to cross the server→client boundary. */
  earliestAt: string;
  /** ISO 8601 string — safe to cross the server→client boundary. */
  latestAt: string;
  campaigns: string[];
  products: string[];
  brands: string[];
  displayCity: string;
  displaySuburb: string;
  displayCountry: string;
}

export interface AggregatedDeliveryMarker {
  groupKey: string;
  latitude: number;
  longitude: number;
  totalCartonsDelivered: number;
  totalEstimatedUnitsDelivered: number;
  /** Number of DeliveryScan rows aggregated into this point. */
  dropCount: number;
  /** ISO 8601 string — safe to cross the server→client boundary. */
  earliestAt: string;
  /** ISO 8601 string — safe to cross the server→client boundary. */
  latestAt: string;
  campaigns: string[];
  brands: string[];
  retailers: string[];
  displayCity: string;
  displaySuburb: string;
  displayCountry: string;
}

/**
 * A single geographic cell that may carry consumer data, delivery data, or
 * both.  When both are present the map renders a combined marker and the
 * popup exposes both sections.
 */
export interface CombinedLocationMarker {
  groupKey: string;
  latitude: number;
  longitude: number;
  consumer: AggregatedConsumerMarker | null;
  delivery: AggregatedDeliveryMarker | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addUnique(arr: string[], val: string): void {
  if (val && val !== "—" && !arr.includes(val)) arr.push(val);
}

// ─── Grouping functions ───────────────────────────────────────────────────────

export function groupConsumerMarkers(
  markers: ConsumerScanMarker[]
): AggregatedConsumerMarker[] {
  const byKey = new Map<string, AggregatedConsumerMarker>();

  for (const m of markers) {
    if (m.latitude === null || m.longitude === null) continue;
    const key = geoKey(m.latitude, m.longitude);
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, {
        groupKey: key,
        latitude: m.latitude,
        longitude: m.longitude,
        totalHitCount: m.hitCount,
        totalBillableCount: m.billableCount,
        totalRepeatCount: m.repeatCount,
        totalSuspiciousCount: m.suspiciousCount,
        bucketCount: 1,
        hasSuspicious: m.isSuspicious,
        earliestAt: new Date(m.createdAt).toISOString(),
        latestAt: new Date(m.createdAt).toISOString(),
        campaigns: m.campaignName !== "—" ? [m.campaignName] : [],
        products: m.productName !== "—" ? [m.productName] : [],
        brands: m.brandName !== "—" ? [m.brandName] : [],
        displayCity: decodeLabel(m.city),
        displaySuburb: decodeLabel(m.suburb),
        displayCountry: decodeLabel(m.country),
      });
    } else {
      existing.totalHitCount += m.hitCount;
      existing.totalBillableCount += m.billableCount;
      existing.totalRepeatCount += m.repeatCount;
      existing.totalSuspiciousCount += m.suspiciousCount;
      existing.bucketCount += 1;
      existing.hasSuspicious = existing.hasSuspicious || m.isSuspicious;
      const atStr = new Date(m.createdAt).toISOString();
      if (atStr < existing.earliestAt) existing.earliestAt = atStr;
      if (atStr > existing.latestAt) existing.latestAt = atStr;
      addUnique(existing.campaigns, m.campaignName);
      addUnique(existing.products, m.productName);
      addUnique(existing.brands, m.brandName);
    }
  }

  return Array.from(byKey.values());
}

export function groupDeliveryMarkers(
  markers: DeliveryMarker[]
): AggregatedDeliveryMarker[] {
  const byKey = new Map<string, AggregatedDeliveryMarker>();

  for (const m of markers) {
    if (m.latitude === null || m.longitude === null) continue;
    const key = geoKey(m.latitude, m.longitude);
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, {
        groupKey: key,
        latitude: m.latitude,
        longitude: m.longitude,
        totalCartonsDelivered: m.cartonsDelivered,
        totalEstimatedUnitsDelivered: m.estimatedUnitsDelivered,
        dropCount: 1,
        earliestAt: new Date(m.createdAt).toISOString(),
        latestAt: new Date(m.createdAt).toISOString(),
        campaigns: m.campaignName !== "—" ? [m.campaignName] : [],
        brands: m.brandName !== "—" ? [m.brandName] : [],
        retailers: m.retailerName !== "—" ? [m.retailerName] : [],
        displayCity: decodeLabel(m.city),
        displaySuburb: decodeLabel(m.suburb),
        displayCountry: decodeLabel(m.country),
      });
    } else {
      existing.totalCartonsDelivered += m.cartonsDelivered;
      existing.totalEstimatedUnitsDelivered += m.estimatedUnitsDelivered;
      existing.dropCount += 1;
      const atStr = new Date(m.createdAt).toISOString();
      if (atStr < existing.earliestAt) existing.earliestAt = atStr;
      if (atStr > existing.latestAt) existing.latestAt = atStr;
      addUnique(existing.campaigns, m.campaignName);
      addUnique(existing.brands, m.brandName);
      addUnique(existing.retailers, m.retailerName);
    }
  }

  return Array.from(byKey.values());
}

/**
 * Merges consumer and delivery geographic groups into a single list.
 * Locations that appear in both datasets share one CombinedLocationMarker.
 */
export function mergeToCombinedLocations(
  consumerGroups: AggregatedConsumerMarker[],
  deliveryGroups: AggregatedDeliveryMarker[]
): CombinedLocationMarker[] {
  const byKey = new Map<string, CombinedLocationMarker>();

  for (const c of consumerGroups) {
    byKey.set(c.groupKey, {
      groupKey: c.groupKey,
      latitude: c.latitude,
      longitude: c.longitude,
      consumer: c,
      delivery: null,
    });
  }

  for (const d of deliveryGroups) {
    const existing = byKey.get(d.groupKey);
    if (existing) {
      existing.delivery = d;
    } else {
      byKey.set(d.groupKey, {
        groupKey: d.groupKey,
        latitude: d.latitude,
        longitude: d.longitude,
        consumer: null,
        delivery: d,
      });
    }
  }

  return Array.from(byKey.values());
}
