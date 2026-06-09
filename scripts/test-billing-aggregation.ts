import "dotenv/config";
import prisma from "../src/lib/prisma";
import { aggregateScanEvent } from "../src/server/services/scan-event-aggregation.service";
import { generateCampaignBillingSummary } from "../src/server/services/billing.service";
import crypto from "crypto";

async function main() {
  if (process.env.ALLOW_MUTATING_DB_TESTS !== "true") {
    throw new Error(
      "Refusing to run a mutating database test. Set ALLOW_MUTATING_DB_TESTS=true only for a disposable database.",
    );
  }

  console.log("Starting billing aggregation validation test...");

  // 1. Setup test brand, advertiser, user, campaign, and QR code
  const suffix = crypto.randomUUID().slice(0, 8);
  const brandName = `Test Brand ${suffix}`;
  const advertiserName = `Test Advertiser ${suffix}`;
  const campaignName = `Test Campaign ${suffix}`;

  const brand = await prisma.brand.create({
    data: { 
      name: brandName,
      slug: brandName.toLowerCase().replace(/\s+/g, "-")
    },
  });

  const advertiser = await prisma.advertiser.create({
    data: { 
      name: advertiserName,
      slug: advertiserName.toLowerCase().replace(/\s+/g, "-")
    },
  });

  const campaign = await prisma.campaign.create({
    data: {
      name: campaignName,
      slug: campaignName.toLowerCase().replace(/\s+/g, "-"),
      brandId: brand.id,
      advertiserId: advertiser.id,
      offerTitle: "Test Offer",
      rewardType: "VOUCHER",
      status: "ACTIVE",
      engagementFeePerScan: 1.5, // $1.50 per scan
      fixedFeePerUnit: 0.1,
    },
  });

  const qrCode = await prisma.qRCode.create({
    data: {
      code: `TEST-${suffix}`,
      type: "CONSUMER_CAMPAIGN",
      status: "ACTIVE",
      brandId: brand.id,
      advertiserId: advertiser.id,
      campaignId: campaign.id,
    },
  });

  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: `test-${suffix}@moengage.com`,
        name: "Test User",
        role: "ADMIN",
        passwordHash: "dummy-hash",
      },
    });
  }

  const anonymousVisitorId = `visitor-${suffix}`;
  const now = new Date();

  // Bucket windowStartedAt to make sure we use a single window for the test
  const windowStartedAt = new Date(Math.floor(now.getTime() / 30000) * 30000);

  // 2. Fire 9 aggregateScanEvent calls in the same window (7 billable, 2 suspicious)
  console.log("Filing 9 scan events (7 billable, 2 suspicious)...");
  for (let i = 0; i < 9; i++) {
    const isSuspicious = i >= 7;
    const isBillable = !isSuspicious;

    await aggregateScanEvent({
      qrCodeId: qrCode.id,
      brandId: brand.id,
      advertiserId: advertiser.id,
      campaignId: campaign.id,
      productId: null,
      batchId: null,
      anonymousVisitorId,
      sessionId: null,
      ipHash: `ip-hash-${suffix}`,
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
      suspiciousReason: isSuspicious ? "FRAUD_TEST" : null,
      isBillable,
      isInternalTest: false,
      now,
    });
  }

  // Confirm the collapsed row is created
  const dbScanEvents = await prisma.scanEvent.findMany({
    where: {
      qrCodeId: qrCode.id,
      campaignId: campaign.id,
      windowStartedAt,
    },
  });

  if (dbScanEvents.length !== 1) {
    throw new Error(`Expected exactly 1 collapsed ScanEvent row, found ${dbScanEvents.length}`);
  }

  const collapsedRow = dbScanEvents[0];
  console.log("Collapsed ScanEvent Row in DB:");
  console.log(`- hitCount: ${collapsedRow.hitCount}`);
  console.log(`- billableCount: ${collapsedRow.billableCount}`);
  console.log(`- suspiciousCount: ${collapsedRow.suspiciousCount}`);
  console.log(`- isSuspicious: ${collapsedRow.isSuspicious}`);
  console.log(`- isBillable: ${collapsedRow.isBillable}`);

  if (
    collapsedRow.hitCount !== 9 ||
    collapsedRow.billableCount !== 7 ||
    collapsedRow.suspiciousCount !== 2 ||
    collapsedRow.isSuspicious !== true ||
    collapsedRow.isBillable !== true
  ) {
    throw new Error("Aggregation counter calculations failed.");
  }

  // 3. Generate Billing Summary
  console.log("Generating campaign billing summary...");
  await generateCampaignBillingSummary(campaign.id, user.id);

  // Retrieve billing summary
  const summary = await prisma.billingSummary.findFirst({
    where: { campaignId: campaign.id },
  });

  if (!summary) {
    throw new Error("Billing summary was not generated.");
  }

  if (!summary.engagementFeeTotal) {
    throw new Error("Billing summary engagementFeeTotal is null.");
  }

  console.log("------------------- BILLING RESULTS -------------------");
  console.log(`Expected totalScanCount: 9, Got: ${summary.totalScanCount}`);
  console.log(`Expected billableScanCount: 7, Got: ${summary.billableScanCount}`);
  console.log(`Expected suspiciousScanCount: 2, Got: ${summary.suspiciousScanCount}`);
  console.log(`Expected engagementFeeTotal: 10.50, Got: ${summary.engagementFeeTotal.toNumber()}`);

  let testPassed = true;

  if (summary.totalScanCount !== 9) {
    console.error("FAIL: totalScanCount is incorrect!");
    testPassed = false;
  }
  if (summary.billableScanCount !== 7) {
    console.error("FAIL: billableScanCount is incorrect!");
    testPassed = false;
  }
  if (summary.suspiciousScanCount !== 2) {
    console.error("FAIL: suspiciousScanCount is incorrect!");
    testPassed = false;
  }
  if (summary.engagementFeeTotal.toNumber() !== 10.5) {
    console.error("FAIL: engagementFeeTotal is incorrect!");
    testPassed = false;
  }

  // 4. Cleanup
  console.log("Cleaning up test data...");
  await prisma.billingSummary.delete({ where: { id: summary.id } });
  await prisma.scanEvent.delete({ where: { id: collapsedRow.id } });
  await prisma.qRCode.delete({ where: { id: qrCode.id } });
  await prisma.campaign.delete({ where: { id: campaign.id } });
  await prisma.advertiser.delete({ where: { id: advertiser.id } });
  await prisma.brand.delete({ where: { id: brand.id } });
  if (user.email.startsWith("test-")) {
    await prisma.user.delete({ where: { id: user.id } });
  }

  console.log("Cleanup completed.");

  if (!testPassed) {
    throw new Error("Billing summary calculations failed verification.");
  }

  console.log("SUCCESS: Billing summary correctly calculated and matched expected counts!");
}

main()
  .catch((e) => {
    console.error("Test failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
