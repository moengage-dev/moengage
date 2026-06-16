/**
 * scripts/test-classification-concurrency.ts
 *
 * Exercises the combined classification + aggregation path under concurrency to
 * verify that advisory locks prevent threshold-crossing scans from being
 * under-classified as billable.
 *
 * Guard: ALLOW_MUTATING_DB_TESTS=true must be set (disposable DB only).
 *
 * Run:
 *   ALLOW_MUTATING_DB_TESTS=true npx tsx scripts/test-classification-concurrency.ts
 *
 * Do NOT run this against a production database.
 */

import "dotenv/config";
import prisma from "../src/lib/prisma";
import crypto from "crypto";
import { processConsumerScan, deriveIpHash } from "../src/server/services/public-scan.service";

// ---------------------------------------------------------------------------
// Safety guard
// ---------------------------------------------------------------------------
if (process.env.ALLOW_MUTATING_DB_TESTS !== "true") {
  console.error(
    "ERROR: Refusing to run a mutating database test.\n" +
      "Set ALLOW_MUTATING_DB_TESTS=true only for a disposable database.",
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Global Cleanups Tracker (Failure-Safe Cleanup)
// ---------------------------------------------------------------------------
const cleanups = {
  brandIds: [] as string[],
  advertiserIds: [] as string[],
  campaignIds: [] as string[],
  qrCodeIds: [] as string[],
};

// ---------------------------------------------------------------------------
// One "scan request" that delegates to the production processConsumerScan function
// ---------------------------------------------------------------------------
async function simulateScan(opts: {
  qrCodeId: string;
  brandId: string;
  advertiserId: string;
  campaignId: string;
  visitorId: string;
  ipHash: string;
  now: Date;
}) {
  const { qrCodeId, brandId, advertiserId, campaignId, visitorId, ipHash, now } = opts;
  return processConsumerScan({
    qrCode: {
      id: qrCodeId,
      brandId,
      advertiserId,
      campaignId,
      productId: null,
      batchId: null,
      type: "CONSUMER_CAMPAIGN",
      status: "ACTIVE",
    },
    visitorId,
    ipAddress: null,
    ipHash,
    userAgent: "TestAgent/1.0",
    location: {
      country: "TZ",
      region: "Dar es Salaam",
      city: "Dar es Salaam",
      suburb: "Central",
      latitude: null,
      longitude: null,
      locationSource: "IP",
    },
    device: {
      deviceType: "Desktop",
      os: "macOS",
      browser: "Chrome",
    },
    now,
  });
}

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------
async function runVisitorThresholdTest() {
  console.log("\n══ TEST 1: visitor threshold (≥10 scans/5 min → suspicious) ══");

  // Create minimal disposable entities and immediately register them for cleanup
  const brand = await prisma.brand.create({
    data: {
      name: `TestBrand-${crypto.randomUUID()}`,
      slug: `test-brand-${crypto.randomUUID()}`,
    },
  });
  cleanups.brandIds.push(brand.id);

  const advertiser = await prisma.advertiser.create({
    data: {
      name: `TestAdv-${crypto.randomUUID()}`,
      slug: `test-adv-${crypto.randomUUID()}`,
    },
  });
  cleanups.advertiserIds.push(advertiser.id);

  const campaign = await prisma.campaign.create({
    data: {
      name: `TestCampaign-${crypto.randomUUID()}`,
      slug: `test-campaign-${crypto.randomUUID()}`,
      offerTitle: "Test Offer",
      brandId: brand.id,
      advertiserId: advertiser.id,
      status: "ACTIVE",
      rewardType: "FREE_DATA",
      currency: "USD",
    },
  });
  cleanups.campaignIds.push(campaign.id);

  const qrCode = await prisma.qRCode.create({
    data: {
      code: `TEST-${crypto.randomUUID()}`,
      type: "CONSUMER_CAMPAIGN",
      status: "ACTIVE",
      campaignId: campaign.id,
      brandId: brand.id,
      advertiserId: advertiser.id,
    },
  });
  cleanups.qrCodeIds.push(qrCode.id);

  const visitorId = `test-visitor-${crypto.randomUUID()}`;
  const ipHash = deriveIpHash(`192.168.1.${Math.floor(Math.random() * 254) + 1}`)!;

  // All scans share the same 30-second window so they collapse into one bucket.
  const now = new Date();
  const TOTAL_SCANS = 20; // well above the ≥10 threshold

  console.log(`  Firing ${TOTAL_SCANS} concurrent scans for visitor ${visitorId}`);
  console.log(`  Visitor threshold: 10 scans / 5 min → scans 10+ should be suspicious`);

  const promises = Array.from({ length: TOTAL_SCANS }, () =>
    simulateScan({
      qrCodeId: qrCode.id,
      brandId: brand.id,
      advertiserId: advertiser.id,
      campaignId: campaign.id,
      visitorId,
      ipHash,
      now,
    }),
  );

  const results = await Promise.allSettled(promises);
  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    for (const f of failed) {
      if (f.status === "rejected") console.error("  Scan promise rejected:", f.reason);
    }
    throw new Error(`${failed.length} scan(s) failed unexpectedly`);
  }

  // Verify DB state
  const rows = await prisma.scanEvent.findMany({
    where: {
      qrCodeId: qrCode.id,
      anonymousVisitorId: visitorId,
    },
  });

  console.log(`  Expected row count : 1 (all hits collapsed into one bucket)`);
  console.log(`  Actual row count   : ${rows.length}`);

  if (rows.length !== 1) {
    throw new Error(`Expected exactly 1 ScanEvent bucket row, got ${rows.length}`);
  }

  const row = rows[0];
  const expectedHitCount = TOTAL_SCANS;

  console.log(`  Expected hitCount  : ${expectedHitCount}`);
  console.log(`  Actual hitCount    : ${row.hitCount}`);
  console.log(`  Expected billable  : 10 (scans 1 to 10 are billable)`);
  console.log(`  Actual billable    : ${row.billableCount}`);
  console.log(`  Expected suspicious: 10 (scans 11 to 20 are suspicious)`);
  console.log(`  Actual suspicious  : ${row.suspiciousCount}`);
  console.log(`  Expected repeat    : 19 (scans 2 to 20 are repeat scans)`);
  console.log(`  Actual repeat      : ${row.repeatCount}`);

  if (row.hitCount !== expectedHitCount) {
    throw new Error(`hitCount mismatch: expected ${expectedHitCount}, got ${row.hitCount}`);
  }
  if (row.billableCount !== 10) {
    throw new Error(`billableCount mismatch: expected 10, got ${row.billableCount}`);
  }
  if (row.suspiciousCount !== 10) {
    throw new Error(`suspiciousCount mismatch: expected 10, got ${row.suspiciousCount}`);
  }
  if (row.repeatCount !== 19) {
    throw new Error(`repeatCount mismatch: expected 19, got ${row.repeatCount}`);
  }
  if (row.isRepeatScan !== true) {
    throw new Error(`isRepeatScan mismatch: expected true, got ${row.isRepeatScan}`);
  }
  if (row.isSuspicious !== true) {
    throw new Error(`isSuspicious mismatch: expected true, got ${row.isSuspicious}`);
  }
  if (row.isBillable !== true) {
    throw new Error(`isBillable mismatch: expected true, got ${row.isBillable}`);
  }

  console.log("  PASS: visitor threshold-crossing scans correctly classified and aggregated.");
}

async function runIpThresholdTest() {
  console.log("\n══ TEST 2: IP+campaign threshold (≥10 scans/5 min → suspicious) ══");

  // Create minimal disposable entities and immediately register them for cleanup
  const brand = await prisma.brand.create({
    data: {
      name: `TestBrand-${crypto.randomUUID()}`,
      slug: `test-brand-${crypto.randomUUID()}`,
    },
  });
  cleanups.brandIds.push(brand.id);

  const advertiser = await prisma.advertiser.create({
    data: {
      name: `TestAdv-${crypto.randomUUID()}`,
      slug: `test-adv-${crypto.randomUUID()}`,
    },
  });
  cleanups.advertiserIds.push(advertiser.id);

  const campaign = await prisma.campaign.create({
    data: {
      name: `TestCampaign-${crypto.randomUUID()}`,
      slug: `test-campaign-${crypto.randomUUID()}`,
      offerTitle: "Test Offer",
      brandId: brand.id,
      advertiserId: advertiser.id,
      status: "ACTIVE",
      rewardType: "FREE_DATA",
      currency: "USD",
    },
  });
  cleanups.campaignIds.push(campaign.id);

  const qrCode = await prisma.qRCode.create({
    data: {
      code: `TEST-${crypto.randomUUID()}`,
      type: "CONSUMER_CAMPAIGN",
      status: "ACTIVE",
      campaignId: campaign.id,
      brandId: brand.id,
      advertiserId: advertiser.id,
    },
  });
  cleanups.qrCodeIds.push(qrCode.id);

  // No shared visitorId — only IP identity (forces Rule B IP branch, then Rule C)
  const ipHash = deriveIpHash(`10.0.0.${Math.floor(Math.random() * 254) + 1}`)!;
  const now = new Date();
  const TOTAL_SCANS = 15; // crosses ≥10 IP+campaign threshold

  console.log(`  Firing ${TOTAL_SCANS} concurrent scans from same IP on same campaign with different visitor IDs`);

  const promises = Array.from({ length: TOTAL_SCANS }, () =>
    simulateScan({
      qrCodeId: qrCode.id,
      brandId: brand.id,
      advertiserId: advertiser.id,
      campaignId: campaign.id,
      visitorId: `anon-${crypto.randomUUID()}`,
      ipHash,
      now,
    }),
  );

  const results = await Promise.allSettled(promises);
  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    for (const f of failed) {
      if (f.status === "rejected") console.error("  Scan promise rejected:", f.reason);
    }
    throw new Error(`${failed.length} scan(s) failed unexpectedly`);
  }

  // Each unique visitorId gets its own bucket; query by ipHash across all
  const rows = await prisma.scanEvent.findMany({
    where: { qrCodeId: qrCode.id, ipHash },
  });

  const totalHits = rows.reduce((s, r) => s + r.hitCount, 0);
  const totalSuspicious = rows.reduce((s, r) => s + r.suspiciousCount, 0);
  const totalBillable = rows.reduce((s, r) => s + r.billableCount, 0);
  const totalRepeat = rows.reduce((s, r) => s + r.repeatCount, 0);

  console.log(`  Expected row count : 15 (one bucket per unique visitor ID)`);
  console.log(`  Actual row count   : ${rows.length}`);
  console.log(`  Total hits         : ${totalHits} (expected ${TOTAL_SCANS})`);
  console.log(`  Total billable     : ${totalBillable} (expected 10)`);
  console.log(`  Total suspicious   : ${totalSuspicious} (expected 5)`);
  console.log(`  Total repeat       : ${totalRepeat} (expected 14)`);

  if (rows.length !== TOTAL_SCANS) {
    throw new Error(`Expected exactly ${TOTAL_SCANS} ScanEvent rows, got ${rows.length}`);
  }
  if (totalHits !== TOTAL_SCANS) {
    throw new Error(`Total hitCount mismatch: expected ${TOTAL_SCANS}, got ${totalHits}`);
  }
  if (totalBillable !== 10) {
    throw new Error(`Total billableCount mismatch: expected 10, got ${totalBillable}`);
  }
  if (totalSuspicious !== 5) {
    throw new Error(`Total suspiciousCount mismatch: expected 5, got ${totalSuspicious}`);
  }
  if (totalRepeat !== 14) {
    throw new Error(`Total repeatCount mismatch: expected 14, got ${totalRepeat}`);
  }

  console.log("  PASS: IP threshold-crossing scans correctly classified and aggregated.");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== Classification Concurrency Test ===");
  console.log("Verifies advisory locks prevent stale-read race on threshold checks.\n");

  try {
    await runVisitorThresholdTest();
    await runIpThresholdTest();

    console.log("\n✅ All classification concurrency tests PASSED.");
  } finally {
    console.log("\nCleaning up test data…");
    // 1. Delete scan events first (since they foreign key reference qrCode and campaign)
    if (cleanups.qrCodeIds.length > 0) {
      await prisma.scanEvent.deleteMany({
        where: { qrCodeId: { in: cleanups.qrCodeIds } },
      });
    }
    // 2. Delete qr codes (references campaigns, brands, advertisers)
    if (cleanups.qrCodeIds.length > 0) {
      await prisma.qRCode.deleteMany({
        where: { id: { in: cleanups.qrCodeIds } },
      });
    }
    // 3. Delete campaigns (references brands, advertisers)
    if (cleanups.campaignIds.length > 0) {
      await prisma.campaign.deleteMany({
        where: { id: { in: cleanups.campaignIds } },
      });
    }
    // 4. Delete advertisers
    if (cleanups.advertiserIds.length > 0) {
      await prisma.advertiser.deleteMany({
        where: { id: { in: cleanups.advertiserIds } },
      });
    }
    // 5. Delete brands
    if (cleanups.brandIds.length > 0) {
      await prisma.brand.deleteMany({
        where: { id: { in: cleanups.brandIds } },
      });
    }
    console.log("Cleanup complete.");
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("\n❌ Classification concurrency test FAILED:", e.message ?? e);
  process.exit(1);
});
