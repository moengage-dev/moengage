/**
 * Disposable-database test: concurrent billing generation for one campaign
 * produces exactly one BillingSummary with correct totals.
 *
 * Usage (disposable DB only):
 *   ALLOW_MUTATING_DB_TESTS=true DATABASE_URL=... npx tsx scripts/test-billing-summary-uniqueness.ts
 */
import "dotenv/config";
import prisma from "../src/lib/prisma";
import { generateCampaignBillingSummary } from "../src/server/services/billing.service";
import crypto from "crypto";

async function main() {
  if (process.env.ALLOW_MUTATING_DB_TESTS !== "true") {
    throw new Error(
      "Refusing to run a mutating database test. Set ALLOW_MUTATING_DB_TESTS=true only for a disposable database.",
    );
  }

  console.log("Starting billing summary uniqueness / concurrency test...");

  const suffix = crypto.randomUUID().slice(0, 8);

  const brand = await prisma.brand.create({
    data: {
      name: `BillingUniq Brand ${suffix}`,
      slug: `billing-uniq-brand-${suffix}`,
    },
  });

  const advertiser = await prisma.advertiser.create({
    data: {
      name: `BillingUniq Advertiser ${suffix}`,
      slug: `billing-uniq-adv-${suffix}`,
    },
  });

  const campaign = await prisma.campaign.create({
    data: {
      name: `BillingUniq Campaign ${suffix}`,
      slug: `billing-uniq-camp-${suffix}`,
      brandId: brand.id,
      advertiserId: advertiser.id,
      offerTitle: "Test Offer",
      rewardType: "VOUCHER",
      status: "ACTIVE",
      engagementFeePerScan: 2.0,
      fixedFeePerUnit: 0.5,
    },
  });

  let user = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: `billing-uniq-${suffix}@test.internal`,
        name: "Test Admin",
        role: "ADMIN",
        passwordHash: "dummy",
      },
    });
  }

  // Verify no summary exists before the test
  const beforeCount = await prisma.billingSummary.count({ where: { campaignId: campaign.id } });
  if (beforeCount !== 0) {
    throw new Error(`Expected 0 summaries before test, found ${beforeCount}`);
  }

  // Fire 5 concurrent billing generation calls for the same campaign.
  // The unique constraint + upsert semantics must ensure exactly one row survives.
  console.log("Firing 5 concurrent generateCampaignBillingSummary calls...");
  const results = await Promise.allSettled(
    Array.from({ length: 5 }, () => generateCampaignBillingSummary(campaign.id, user!.id)),
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;
  console.log(`  Succeeded: ${succeeded}, Failed (expected under contention): ${failed}`);

  // Exactly one BillingSummary must exist
  const summaries = await prisma.billingSummary.findMany({ where: { campaignId: campaign.id } });
  if (summaries.length !== 1) {
    throw new Error(`Expected exactly 1 BillingSummary, found ${summaries.length}`);
  }

  const summary = summaries[0];
  console.log(`  BillingSummary id: ${summary.id}`);
  console.log(`  totalScanCount: ${summary.totalScanCount} (expect 0 — no scan events created)`);
  console.log(`  totalAmount: ${summary.totalAmount}`);

  // With no scan events created, billable and total scans must be 0
  if (summary.totalScanCount !== 0) {
    throw new Error(`Expected totalScanCount=0, got ${summary.totalScanCount}`);
  }
  if (summary.billableScanCount !== 0) {
    throw new Error(`Expected billableScanCount=0, got ${summary.billableScanCount}`);
  }

  // Cleanup
  console.log("Cleaning up...");
  await prisma.auditLog.deleteMany({ where: { entityType: "BillingSummary", entityId: summary.id } });
  await prisma.billingSummary.delete({ where: { id: summary.id } });
  await prisma.campaign.delete({ where: { id: campaign.id } });
  await prisma.advertiser.delete({ where: { id: advertiser.id } });
  await prisma.brand.delete({ where: { id: brand.id } });
  if (user.email.startsWith("billing-uniq-")) {
    await prisma.user.delete({ where: { id: user.id } });
  }

  console.log("SUCCESS: Exactly one BillingSummary produced under concurrent generation.");
}

main()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
