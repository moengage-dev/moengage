/**
 * src/lib/__tests__/heatmap-grouping.test.ts
 *
 * Non-destructive unit tests for the heatmap geographic grouping utilities.
 * No DB, no React, no seed mutations.
 *
 * Run with:  npx tsx src/lib/__tests__/heatmap-grouping.test.ts
 */

import assert from "node:assert/strict";
import {
  decodeLabel,
  geoKey,
  groupConsumerMarkers,
  groupDeliveryMarkers,
  mergeToCombinedLocations,
  GEO_PRECISION,
} from "../heatmap-grouping.js";

// ─── helpers ──────────────────────────────────────────────────────────────────

function pass(name: string) {
  console.log(`  ✓ ${name}`);
}

function suite(name: string, fn: () => void) {
  console.log(`\n${name}`);
  fn();
}

// ─── Stub factory ─────────────────────────────────────────────────────────────
// Build plain objects that match the ConsumerScanMarker / DeliveryMarker shape
// without importing from the service (which would pull in Prisma at runtime).

function makeScanBucket(overrides: {
  id?: string;
  latitude: number;
  longitude: number;
  hitCount: number;
  billableCount?: number;
  repeatCount?: number;
  suspiciousCount?: number;
  isSuspicious?: boolean;
  campaignName?: string;
  productName?: string;
  city?: string;
  suburb?: string;
  country?: string;
}) {
  return {
    id: overrides.id ?? "scan-1",
    type: "SCAN" as const,
    createdAt: new Date("2024-06-01T10:00:00Z"),
    brandName: "Brand A",
    advertiserName: "Adv A",
    campaignName: overrides.campaignName ?? "Campaign A",
    productName: overrides.productName ?? "Product X",
    batchCode: "BATCH-001",
    city: overrides.city ?? "Nairobi",
    suburb: overrides.suburb ?? "",
    country: overrides.country ?? "KE",
    latitude: overrides.latitude,
    longitude: overrides.longitude,
    hitCount: overrides.hitCount,
    repeatCount: overrides.repeatCount ?? 0,
    suspiciousCount: overrides.suspiciousCount ?? 0,
    billableCount: overrides.billableCount ?? overrides.hitCount,
    isRepeatScan: false,
    isBillable: true,
    isSuspicious: overrides.isSuspicious ?? false,
  };
}

function makeDelivery(overrides: {
  id?: string;
  latitude: number;
  longitude: number;
  cartonsDelivered?: number;
  estimatedUnitsDelivered?: number;
  campaignName?: string;
  retailerName?: string;
  city?: string;
}) {
  return {
    id: overrides.id ?? "del-1",
    type: "DELIVERY" as const,
    createdAt: new Date("2024-06-01T12:00:00Z"),
    brandName: "Brand A",
    campaignName: overrides.campaignName ?? "Campaign A",
    productName: "Product X",
    batchCode: "BATCH-001",
    retailerName: overrides.retailerName ?? "Shop A",
    city: overrides.city ?? "Nairobi",
    suburb: "",
    country: "KE",
    latitude: overrides.latitude,
    longitude: overrides.longitude,
    cartonsDelivered: overrides.cartonsDelivered ?? 2,
    estimatedUnitsDelivered: overrides.estimatedUnitsDelivered ?? 48,
  };
}

// ─── Test 1: Multiple scan buckets → correct hitCount sum ─────────────────────
suite("Multiple ScanEvent buckets at the same coordinate", () => {
  const LAT = -1.2921;
  const LNG = 36.8219;
  const buckets = [
    makeScanBucket({ id: "a", latitude: LAT, longitude: LNG, hitCount: 49 }),
    makeScanBucket({ id: "b", latitude: LAT, longitude: LNG, hitCount: 1 }),
    makeScanBucket({ id: "c", latitude: LAT, longitude: LNG, hitCount: 5 }),
  ];

  const groups = groupConsumerMarkers(buckets);

  assert.equal(groups.length, 1, "should collapse to one geographic group");
  assert.equal(groups[0].totalHitCount, 55, "totalHitCount must equal 49 + 1 + 5 = 55");
  assert.equal(groups[0].bucketCount, 3, "bucketCount must equal number of raw rows");
  // earliestAt / latestAt must be ISO strings (not Date objects) so they
  // cross the server→client serialization boundary without corruption.
  assert.equal(typeof groups[0].earliestAt, "string", "earliestAt must be an ISO string");
  assert.equal(typeof groups[0].latestAt, "string", "latestAt must be an ISO string");
  assert.ok(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(groups[0].earliestAt),
    "earliestAt must match ISO 8601 format"
  );
  pass("three buckets with hitCounts 49, 1, 5 → totalHitCount = 55");
  pass("bucketCount = 3");
  pass("single geographic group at the coordinate");
  pass("earliestAt is ISO string");
  pass("latestAt is ISO string");
});

// ─── Test 2: Consumer and delivery at the same coordinate ─────────────────────
suite("Consumer + delivery records at the same coordinate", () => {
  const LAT = -1.2921;
  const LNG = 36.8219;
  const scans = [makeScanBucket({ id: "s1", latitude: LAT, longitude: LNG, hitCount: 10 })];
  const deliveries = [makeDelivery({ id: "d1", latitude: LAT, longitude: LNG })];

  const combined = mergeToCombinedLocations(
    groupConsumerMarkers(scans),
    groupDeliveryMarkers(deliveries)
  );

  assert.equal(combined.length, 1, "should merge into one combined location");
  assert.ok(combined[0].consumer !== null, "consumer section must be present");
  assert.ok(combined[0].delivery !== null, "delivery section must be present");
  assert.equal(combined[0].consumer!.totalHitCount, 10, "consumer hits correct");
  assert.equal(combined[0].delivery!.dropCount, 1, "delivery drop count correct");
  pass("single CombinedLocationMarker with both consumer and delivery sections");
  pass("consumer.totalHitCount = 10");
  pass("delivery.dropCount = 1");
});

// ─── Test 3: Two campaigns at one coordinate ──────────────────────────────────
suite("Two campaigns at the same coordinate", () => {
  const LAT = 38.981;
  const LNG = -76.937;
  const scans = [
    makeScanBucket({
      id: "s1",
      latitude: LAT,
      longitude: LNG,
      hitCount: 20,
      campaignName: "Summer Promo",
    }),
    makeScanBucket({
      id: "s2",
      latitude: LAT,
      longitude: LNG,
      hitCount: 15,
      campaignName: "Winter Promo",
    }),
  ];

  const groups = groupConsumerMarkers(scans);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].campaigns.length, 2, "both campaigns must be listed");
  assert.ok(groups[0].campaigns.includes("Summer Promo"), "Summer Promo present");
  assert.ok(groups[0].campaigns.includes("Winter Promo"), "Winter Promo present");
  assert.equal(groups[0].totalHitCount, 35, "hits summed across both campaigns");
  pass("both campaigns preserved in the groups[0].campaigns array");
  pass("neither campaign silently discarded");
  pass("totalHitCount = 20 + 15 = 35");
});

// ─── Test 4: Encoded location labels decoded ──────────────────────────────────
suite("Encoded location labels", () => {
  assert.equal(decodeLabel("College%20Park"), "College Park");
  assert.equal(decodeLabel("S%C3%A3o%20Paulo"), "São Paulo");
  assert.equal(decodeLabel("Dar%20es%20Salaam"), "Dar es Salaam");
  // Malformed percent encoding must not throw
  assert.equal(decodeLabel("Bad%GG"), "Bad%GG");
  assert.equal(decodeLabel(""), "");
  pass("College%20Park → 'College Park'");
  pass("São Paulo encoded string decoded correctly");
  pass("malformed percent encoding returns original string (no throw)");
  pass("empty string passes through unchanged");
});

// ─── Test 5: Markers without coordinates are excluded ─────────────────────────
suite("Markers without coordinates are excluded from grouping", () => {
  const markerWithoutCoordinates: Omit<
    ReturnType<typeof makeScanBucket>,
    "latitude" | "longitude"
  > & {
    latitude: null;
    longitude: null;
  } = {
    ...makeScanBucket({ id: "no-coords", latitude: 0, longitude: 0, hitCount: 3 }),
    latitude: null,
    longitude: null,
  };
  const scans = [
    makeScanBucket({ id: "valid", latitude: 1.0, longitude: 2.0, hitCount: 5 }),
    markerWithoutCoordinates,
  ];
  const groups = groupConsumerMarkers(scans);
  // Only the valid marker should appear
  assert.equal(groups.length, 1);
  assert.equal(groups[0].totalHitCount, 5);
  pass("null-coordinate markers are excluded from geographic groups");
});

// ─── Test 6: earliestAt / latestAt date-range tracking ────────────────────────
suite("earliestAt and latestAt track the min and max timestamps as ISO strings", () => {
  const LAT = 1.0;
  const LNG = 2.0;

  // Three buckets at the same coordinate with different timestamps
  const EARLY = "2024-01-15T08:00:00.000Z";
  const MID   = "2024-06-01T10:00:00.000Z";
  const LATE  = "2024-12-31T23:59:59.000Z";

  function makeBucketAt(id: string, isoDate: string) {
    const b = makeScanBucket({ id, latitude: LAT, longitude: LNG, hitCount: 1 });
    return { ...b, createdAt: new Date(isoDate) };
  }

  const groups = groupConsumerMarkers([
    makeBucketAt("mid",   MID),
    makeBucketAt("early", EARLY),
    makeBucketAt("late",  LATE),
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].earliestAt, EARLY, "earliestAt must be the oldest timestamp");
  assert.equal(groups[0].latestAt,   LATE,  "latestAt must be the newest timestamp");
  // latestAt > earliestAt must hold for ISO strings (lexicographic order matches
  // chronological order for ISO 8601 — this is the comparison used by HeatmapMap).
  assert.ok(groups[0].latestAt > groups[0].earliestAt, "latestAt > earliestAt as strings");
  pass("earliestAt = min ISO timestamp across all buckets");
  pass("latestAt = max ISO timestamp across all buckets");
  pass("ISO string comparison mirrors chronological comparison");

  // Same verification for delivery markers
  function makeDeliveryAt(id: string, isoDate: string) {
    const d = makeDelivery({ id, latitude: LAT, longitude: LNG });
    return { ...d, createdAt: new Date(isoDate) };
  }

  const dGroups = groupDeliveryMarkers([
    makeDeliveryAt("d-mid",   MID),
    makeDeliveryAt("d-early", EARLY),
    makeDeliveryAt("d-late",  LATE),
  ]);

  assert.equal(dGroups.length, 1);
  assert.equal(dGroups[0].earliestAt, EARLY, "delivery earliestAt must be the oldest");
  assert.equal(dGroups[0].latestAt,   LATE,  "delivery latestAt must be the newest");
  assert.equal(typeof dGroups[0].earliestAt, "string", "delivery earliestAt is ISO string");
  pass("delivery earliestAt and latestAt are correct ISO strings");
});

// ─── Test 7: geoKey precision ─────────────────────────────────────────────────
suite("Geographic key precision", () => {
  assert.equal(GEO_PRECISION, 3, "GEO_PRECISION should be 3 decimal places");
  // Two coordinates that round to the same 3 d.p. cell
  assert.equal(geoKey(38.9811, -76.9371), geoKey(38.9815, -76.9374));
  // Two coordinates in different 3 d.p. cells
  assert.notEqual(geoKey(38.981, -76.937), geoKey(38.982, -76.937));
  pass("GEO_PRECISION = 3 (≈ 111 m grid cells)");
  pass("coordinates within the same 3 d.p. cell produce the same key");
  pass("coordinates in adjacent 3 d.p. cells produce different keys");
});

console.log("\n✅ All heatmap-grouping tests passed.\n");
