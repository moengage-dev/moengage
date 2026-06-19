import "dotenv/config";
import prisma from "../src/lib/prisma";
import { aggregateScanEvent } from "../src/server/services/scan-event-aggregation.service";
import crypto from "crypto";

async function main() {
  if (process.env.ALLOW_MUTATING_DB_TESTS !== "true") {
    throw new Error(
      "Refusing to run a mutating database test. Set ALLOW_MUTATING_DB_TESTS=true only for a disposable database.",
    );
  }

  console.log("Starting concurrency test for scan aggregations...");

  // 1. Fetch an existing QR code or create a dummy one
  let qrCode = await prisma.qRCode.findFirst({
    where: { status: "ACTIVE" },
  });

  if (!qrCode) {
    console.log("No active QR code found, creating a test QR code...");
    qrCode = await prisma.qRCode.create({
      data: {
        code: `TEST-${crypto.randomUUID()}`,
        type: "CONSUMER_CAMPAIGN",
        status: "ACTIVE",
      },
    });
  }

  const qrCodeId = qrCode.id;
  const brandId = qrCode.brandId;
  const advertiserId = qrCode.advertiserId;
  const campaignId = qrCode.campaignId;
  const productId = qrCode.productId;
  const batchId = qrCode.batchId;

  const anonymousVisitorId = `visitor-${crypto.randomUUID()}`;
  const now = new Date();

  // Bucket windowStartedAt to make sure we use a single window for all 100 scans
  const windowStartedAt = new Date(Math.floor(now.getTime() / 30000) * 30000);
  console.log(`Using windowStartedAt: ${windowStartedAt.toISOString()} for visitor: ${anonymousVisitorId}`);

  // Create 100 inputs (70 billable, 30 suspicious)
  const promises: Array<ReturnType<typeof aggregateScanEvent>> = [];
  for (let i = 0; i < 100; i++) {
    const isBillable = i < 70;
    const isSuspicious = !isBillable;

    promises.push(
      aggregateScanEvent({
        qrCodeId,
        brandId,
        advertiserId,
        campaignId,
        productId,
        batchId,
        anonymousVisitorId,
        sessionId: null,
        ipHash: "test-ip-hash",
        userAgent: "TestAgent",
        deviceType: "Desktop",
        os: "macOS",
        browser: "Chrome",
        country: "TZ",
        region: "Dar es Salaam",
        city: "Dar es Salaam",
        suburb: "Central",
        latitude: null,
        longitude: null,
        locationSource: "IP",
        isRepeatScan: false,
        isSuspicious,
        suspiciousReason: isSuspicious ? "CONCURRENT_TEST" : null,
        isBillable,
        isInternalTest: false,
        now,
      })
    );
  }

  console.log("Firing 100 concurrent aggregateScanEvent requests...");
  const results = await Promise.all(promises);
  console.log(`Successfully completed 100 concurrent requests. Returned ids count: ${results.length}`);

  // Verify database
  const scanEvents = await prisma.scanEvent.findMany({
    where: {
      qrCodeId,
      anonymousVisitorId,
      windowStartedAt,
    },
  });

  console.log("------------------- RESULTS -------------------");
  console.log(`Expected ScanEvent rows in database: 1`);
  console.log(`Actual ScanEvent rows in database: ${scanEvents.length}`);

  let testPassed = true;

  if (scanEvents.length !== 1) {
    console.error("FAIL: ScanEvent was not collapsed into exactly 1 row!");
    testPassed = false;
  } else {
    const row = scanEvents[0];
    console.log(`Expected hitCount: 100`);
    console.log(`Actual hitCount: ${row.hitCount}`);

    console.log(`Expected billableCount: 70`);
    console.log(`Actual billableCount: ${row.billableCount}`);

    console.log(`Expected suspiciousCount: 30`);
    console.log(`Actual suspiciousCount: ${row.suspiciousCount}`);

    if (row.hitCount === 100 && row.billableCount === 70 && row.suspiciousCount === 30) {
      console.log("SUCCESS: Collapsing and counter math match expected outcomes exactly!");
    } else {
      console.error("FAIL: Counter aggregation math is incorrect!");
      testPassed = false;
    }

    // Cleanup scan event row
    await prisma.scanEvent.delete({
      where: { id: row.id },
    });
    console.log("Test row cleaned up.");
  }

  // Cleanup test QR code if we created it
  if (qrCode.code.startsWith("TEST-")) {
    await prisma.qRCode.delete({
      where: { id: qrCode.id },
    });
    console.log("Test QR code cleaned up.");
  }

  if (!testPassed) {
    throw new Error("Concurrency test failed.");
  }
}

main()
  .catch((e) => {
    console.error("Error running test:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
