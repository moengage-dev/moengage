import "dotenv/config";
import crypto from "crypto";
import prisma from "../src/lib/prisma";
import { hashMobileNumber } from "../src/lib/rewards/mobile-hash";
import { startRewardClaim } from "../src/server/services/reward-claim.service";

async function main() {
  if (process.env.ALLOW_MUTATING_DB_TESTS !== "true") {
    throw new Error(
      "Refusing to run a mutating database test. Set ALLOW_MUTATING_DB_TESTS=true only for a disposable database.",
    );
  }

  const suffix = crypto.randomUUID().slice(0, 8);
  const mobileNumber = `+1555${crypto.randomInt(1000000, 9999999)}`;
  const mobileNumberHash = hashMobileNumber(mobileNumber);

  let brandId: string | null = null;
  let advertiserId: string | null = null;
  let campaignId: string | null = null;
  let qrCodeId: string | null = null;
  let scanEventId: string | null = null;

  try {
    const brand = await prisma.brand.create({
      data: {
        name: `Duplicate Claim Test Brand ${suffix}`,
        slug: `duplicate-claim-test-brand-${suffix}`,
      },
    });
    brandId = brand.id;

    const advertiser = await prisma.advertiser.create({
      data: {
        name: `Duplicate Claim Test Advertiser ${suffix}`,
        slug: `duplicate-claim-test-advertiser-${suffix}`,
      },
    });
    advertiserId = advertiser.id;

    const campaign = await prisma.campaign.create({
      data: {
        brandId,
        advertiserId,
        name: `Duplicate Claim Test Campaign ${suffix}`,
        slug: `duplicate-claim-test-campaign-${suffix}`,
        offerTitle: "Duplicate claim integration test",
        rewardType: "VOUCHER",
        status: "ACTIVE",
      },
    });
    campaignId = campaign.id;

    const qrCode = await prisma.qRCode.create({
      data: {
        code: `duplicate-claim-test-${suffix}`,
        type: "CONSUMER_CAMPAIGN",
        status: "ACTIVE",
        brandId,
        advertiserId,
        campaignId,
      },
    });
    qrCodeId = qrCode.id;

    const now = new Date();
    const scanEvent = await prisma.scanEvent.create({
      data: {
        qrCodeId,
        brandId,
        advertiserId,
        campaignId,
        anonymousVisitorId: `duplicate-claim-test-visitor-${suffix}`,
        fingerprintKey: `visitor:duplicate-claim-test-visitor-${suffix}`,
        windowStartedAt: new Date(
          Math.floor(now.getTime() / 30_000) * 30_000,
        ),
        firstScanAt: now,
        lastScanAt: now,
        hitCount: 1,
        repeatCount: 0,
        suspiciousCount: 0,
        billableCount: 1,
      },
    });
    scanEventId = scanEvent.id;

    await prisma.$transaction([
      prisma.rewardClaim.create({
        data: {
          scanEventId,
          campaignId,
          brandId,
          advertiserId,
          mobileNumberHash,
          mobileNumberLast4: mobileNumber.slice(-4),
          status: "APPROVED",
          rewardType: "VOUCHER",
          providerStatus: "SIMULATED",
          claimedAt: now,
        },
      }),
      prisma.rewardClaimAttempt.create({
        data: {
          scanEventId,
          campaignId,
          brandId,
          advertiserId,
          mobileNumberHash,
          mobileNumberLast4: mobileNumber.slice(-4),
          status: "APPROVED",
          ipHash: crypto
            .createHash("sha256")
            .update("duplicate-claim-test-approved-ip")
            .digest("hex"),
          userAgent: "Duplicate Claim Integration Test",
        },
      }),
    ]);

    const duplicateResult = await startRewardClaim(
      {
        scanEventId,
        campaignId,
        mobileNumber,
      },
      {
        ipHash: crypto
          .createHash("sha256")
          .update("duplicate-claim-test-duplicate-ip")
          .digest("hex"),
        userAgent: "Duplicate Claim Integration Test",
      },
    );

    if (
      duplicateResult.ok ||
      duplicateResult.status !== "DUPLICATE_CLAIM"
    ) {
      throw new Error(
        "Duplicate attempt did not return the expected DUPLICATE_CLAIM response.",
      );
    }

    const [claimCount, duplicateAttemptCount] = await Promise.all([
      prisma.rewardClaim.count({
        where: { campaignId, mobileNumberHash },
      }),
      prisma.rewardClaimAttempt.count({
        where: {
          campaignId,
          mobileNumberHash,
          status: "DECLINED_DUPLICATE",
        },
      }),
    ]);

    if (claimCount !== 1) {
      throw new Error(`Expected one RewardClaim, found ${claimCount}.`);
    }

    if (duplicateAttemptCount !== 1) {
      throw new Error(
        `Expected one declined duplicate RewardClaimAttempt, found ${duplicateAttemptCount}.`,
      );
    }

    console.log(
      "PASS: one canonical RewardClaim remains and one DECLINED_DUPLICATE attempt was recorded.",
    );
  } finally {
    await prisma.otpVerification.deleteMany({
      where: { mobileNumberHash },
    });

    if (campaignId) {
      await prisma.rewardClaimAttempt.deleteMany({ where: { campaignId } });
      await prisma.rewardClaim.deleteMany({ where: { campaignId } });
    }
    if (scanEventId) {
      await prisma.scanEvent.deleteMany({ where: { id: scanEventId } });
    }
    if (qrCodeId) {
      await prisma.qRCode.deleteMany({ where: { id: qrCodeId } });
    }
    if (campaignId) {
      await prisma.campaign.deleteMany({ where: { id: campaignId } });
    }
    if (advertiserId) {
      await prisma.advertiser.deleteMany({ where: { id: advertiserId } });
    }
    if (brandId) {
      await prisma.brand.deleteMany({ where: { id: brandId } });
    }

    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Duplicate claim attempt test failed:", error);
  process.exit(1);
});
