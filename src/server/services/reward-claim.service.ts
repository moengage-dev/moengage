// src/server/services/reward-claim.service.ts
import prisma from "@/lib/prisma";
import {
  startRewardClaimSchema,
  verifyRewardOtpSchema,
} from "@/lib/validators/reward-claim.validator";
import type {
  StartRewardClaimValues,
  VerifyRewardOtpValues,
} from "@/lib/validators/reward-claim.validator";
import {
  hashMobileNumber,
  getMobileNumberLast4,
  normalizeMobileNumber,
} from "@/lib/rewards/mobile-hash";
import {
  generateRewardOtp,
  hashRewardOtp,
  verifyRewardOtpHash,
  MAX_OTP_ATTEMPTS,
} from "@/lib/rewards/otp";
import type { RewardRequestMetadata } from "@/lib/rewards/request-metadata";

export type ServiceResult<T = unknown> =
  | { ok: true; status: string; data: T }
  | { ok: false; status: string; error: string };

export async function startRewardClaim(
  input: StartRewardClaimValues,
  requestMetadata: RewardRequestMetadata = {
    ipHash: null,
    userAgent: null,
  },
): Promise<ServiceResult<{ otpVerificationId: string; demoOtp?: string }>> {
  const parsed = startRewardClaimSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      status: "VERIFICATION_FAILED",
      error: "Verification failed. Please try again.",
    };
  }

  const { scanEventId, campaignId, mobileNumber } = parsed.data;
  const normalizedMobile = normalizeMobileNumber(mobileNumber);
  const mobileNumberHash = hashMobileNumber(normalizedMobile);

  // Verify scan event exists and matches campaign
  const scanEvent = await prisma.scanEvent.findUnique({
    where: { id: scanEventId },
    select: {
      brandId: true,
      advertiserId: true,
      campaignId: true,
      campaign: {
        select: {
          status: true,
          startDate: true,
          endDate: true,
          rewardType: true,
        },
      },
      qrCode: {
        select: {
          status: true,
          type: true,
        },
      },
    },
  });
  if (!scanEvent || scanEvent.campaignId !== campaignId) {
    console.warn("[startRewardClaim] Invalid scan event or campaign mismatch:", { scanEventId, campaignId });
    return {
      ok: false,
      status: "VERIFICATION_FAILED",
      error: "Verification failed. Please try again.",
    };
  }

  const now = new Date();
  const campaign = scanEvent.campaign;
  const campaignIsEligible =
    campaign?.status === "ACTIVE" &&
    (!campaign.startDate || campaign.startDate <= now) &&
    (!campaign.endDate || campaign.endDate >= now);
  const qrIsEligible =
    scanEvent.qrCode.status === "ACTIVE" &&
    (scanEvent.qrCode.type === "CONSUMER_CAMPAIGN" ||
      scanEvent.qrCode.type === "SAMPLE_LABEL");

  if (!campaign || !campaignIsEligible || !qrIsEligible) {
    console.warn("[startRewardClaim] Ineligible campaign or QR");
    return {
      ok: false,
      status: "VERIFICATION_FAILED",
      error: "Verification failed. Please try again.",
    };
  }

  // Check duplicate APPROVED claim
  const existingApproved = await prisma.rewardClaim.findUnique({
    where: {
      campaignId_mobileNumberHash: {
        campaignId,
        mobileNumberHash,
      },
    },
  });

  // Record the duplicate as an analytics event, not as a second RewardClaim.
  // No OTP is created because this mobile is not eligible for another claim.
  if (existingApproved && existingApproved.status === "APPROVED") {
    console.warn(
      `[startRewardClaim] Duplicate approved claim attempt: phoneHash=${mobileNumberHash}`,
    );
    await prisma.rewardClaimAttempt.create({
      data: {
        campaignId,
        brandId: scanEvent.brandId,
        advertiserId: scanEvent.advertiserId,
        scanEventId,
        mobileNumberHash,
        mobileNumberLast4: getMobileNumberLast4(normalizedMobile),
        status: "DECLINED_DUPLICATE",
        failureReason:
          "A reward was already approved for this campaign and mobile number.",
        ipHash: requestMetadata.ipHash,
        userAgent: requestMetadata.userAgent,
      },
    });

    return {
      ok: false,
      status: "DUPLICATE_CLAIM",
      error:
        "This mobile number is not eligible for another claim on this campaign.",
    };
  }

  // Prevent OTP resend loops for claims that have not already been approved.
  // Duplicate attempts that reach this service are recorded above instead of
  // being hidden by the resend cooldown.
  const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
  const recentVerification = await prisma.otpVerification.findFirst({
    where: {
      mobileNumberHash,
      createdAt: { gte: sixtySecondsAgo },
    },
    orderBy: { createdAt: "desc" },
  });

  if (recentVerification) {
    console.warn(`[startRewardClaim] Cooldown block for phoneHash: ${mobileNumberHash}`);
    return {
      ok: false,
      status: "COOLDOWN_ACTIVE",
      error: "Please wait 60 seconds before requesting a new verification code.",
    };
  }

  // Generate simulated OTP
  const otp = generateRewardOtp();
  const codeHash = hashRewardOtp(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

  // The OTP is simulated — there is no real SMS provider in this MVP. To allow the
  // reward flow to be completed during a hosted client demo (where NODE_ENV is
  // "production"), the OTP may be echoed back ONLY when DEMO_OTP_ECHO is explicitly
  // set to "true". It is always echoed in local development. This flag defaults to
  // off so a real production deployment never leaks the code.
  const echoOtp =
    process.env.NODE_ENV === "development" ||
    process.env.DEMO_OTP_ECHO === "true";
  const demoOtp = echoOtp ? otp : undefined;
  if (process.env.NODE_ENV === "development") {
    console.log(`[startRewardClaim] Dev OTP for ${normalizedMobile}: ${otp}`);
  }

  let otpVerification: { id: string };
  try {
    otpVerification = await prisma.$transaction(async (tx) => {
      const verification = await tx.otpVerification.create({
        data: {
          mobileNumberHash,
          codeHash,
          status: "PENDING",
          isSimulated: true,
          expiresAt,
        },
        select: { id: true },
      });

      if (existingApproved) {
        const claimUpdate = await tx.rewardClaim.updateMany({
          where: {
            id: existingApproved.id,
            status: { not: "APPROVED" },
          },
          data: {
            scanEventId,
            status: "STARTED",
            otpVerificationId: verification.id,
          },
        });

        if (claimUpdate.count !== 1) {
          throw new Error("Reward claim state changed during OTP issuance");
        }
      } else {
        await tx.rewardClaim.create({
          data: {
            scanEventId,
            campaignId,
            brandId: scanEvent.brandId,
            advertiserId: scanEvent.advertiserId,
            otpVerificationId: verification.id,
            mobileNumberLast4: getMobileNumberLast4(normalizedMobile),
            mobileNumberHash,
            status: "STARTED",
            rewardType: campaign.rewardType,
            providerStatus: "SIMULATED",
          },
        });
      }

      return verification;
    });
  } catch (error) {
    console.error("[startRewardClaim] Could not create reward claim:", error);
    return {
      ok: false,
      status: "VERIFICATION_FAILED",
      error: "Verification failed. Please try again.",
    };
  }

  return {
    ok: true,
    status: "OTP_SENT",
    data: {
      otpVerificationId: otpVerification.id,
      demoOtp,
    },
  };
}

export async function verifyRewardOtpAndClaim(
  input: VerifyRewardOtpValues,
  requestMetadata: RewardRequestMetadata = {
    ipHash: null,
    userAgent: null,
  },
): Promise<ServiceResult<{ rewardClaimId: string }>> {
  const parsed = verifyRewardOtpSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      status: "VERIFICATION_FAILED",
      error: "Verification failed. Please try again.",
    };
  }

  const { otpVerificationId, scanEventId, campaignId, mobileNumber, otp } = parsed.data;
  const normalizedMobile = normalizeMobileNumber(mobileNumber);
  const mobileNumberHash = hashMobileNumber(normalizedMobile);

  // Retrieve OTP verification
  const otpVerification = await prisma.otpVerification.findUnique({
    where: { id: otpVerificationId },
  });
  if (!otpVerification) {
    console.warn("[verify] OTP verification record not found:", otpVerificationId);
    return {
      ok: false,
      status: "VERIFICATION_FAILED",
      error: "Verification failed. Please try again.",
    };
  }

  // Bind caller-controlled IDs to the STARTED claim created for this exact OTP.
  // Without this check, an OTP issued for one scan/campaign could be replayed
  // against a different campaign by changing request fields.
  const pendingClaim = await prisma.rewardClaim.findUnique({
    where: {
      campaignId_mobileNumberHash: {
        campaignId,
        mobileNumberHash,
      },
    },
    select: {
      id: true,
      scanEventId: true,
      otpVerificationId: true,
      status: true,
      brandId: true,
      advertiserId: true,
      mobileNumberLast4: true,
    },
  });

  if (
    !pendingClaim ||
    pendingClaim.status !== "STARTED" ||
    pendingClaim.scanEventId !== scanEventId ||
    pendingClaim.otpVerificationId !== otpVerificationId
  ) {
    console.warn("[verify] OTP/claim binding mismatch");
    return {
      ok: false,
      status: "VERIFICATION_FAILED",
      error: "Verification failed. Please try again.",
    };
  }

  // Pre-flight Guard: Check if locked due to too many failed attempts
  if (otpVerification.status === "FAILED" || otpVerification.attemptCount >= MAX_OTP_ATTEMPTS) {
    console.warn("[verify] OTP verification locked or max attempts reached:", otpVerificationId);
    return {
      ok: false,
      status: "VERIFICATION_FAILED",
      error: "Verification failed. Please try again.",
    };
  }

  // Pre-flight Guard: Check if already verified/burned
  if (otpVerification.status !== "PENDING") {
    console.warn("[verify] OTP verification already verified or not pending:", otpVerificationId);
    return {
      ok: false,
      status: "VERIFICATION_FAILED",
      error: "Verification failed. Please try again.",
    };
  }

  // Check expired
  if (new Date() > otpVerification.expiresAt) {
    console.warn("[verify] OTP verification expired:", otpVerificationId);
    await prisma.otpVerification.updateMany({
      where: { id: otpVerificationId, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
    return {
      ok: false,
      status: "VERIFICATION_FAILED",
      error: "Verification failed. Please try again.",
    };
  }

  // Bind the OTP to the mobile number it was issued for
  if (otpVerification.mobileNumberHash !== mobileNumberHash) {
    console.warn("[verify] Phone number hash mismatch:", { expected: otpVerification.mobileNumberHash, actual: mobileNumberHash });
    return {
      ok: false,
      status: "VERIFICATION_FAILED",
      error: "Verification failed. Please try again.",
    };
  }

  // Verify OTP code hash
  if (!otpVerification.codeHash || !verifyRewardOtpHash(otp, otpVerification.codeHash)) {
    const attemptUpdate = await prisma.otpVerification.updateMany({
      where: {
        id: otpVerificationId,
        status: "PENDING",
        attemptCount: { lt: MAX_OTP_ATTEMPTS },
      },
      data: {
        attemptCount: { increment: 1 },
      },
    });

    if (attemptUpdate.count === 1) {
      const updatedVerification = await prisma.otpVerification.findUnique({
        where: { id: otpVerificationId },
        select: { attemptCount: true },
      });

      if ((updatedVerification?.attemptCount ?? MAX_OTP_ATTEMPTS) >= MAX_OTP_ATTEMPTS) {
        await prisma.otpVerification.updateMany({
          where: { id: otpVerificationId, status: "PENDING" },
          data: { status: "FAILED" },
        });
      }
    }

    console.warn("[verify] Incorrect OTP code");
    return {
      ok: false,
      status: "VERIFICATION_FAILED",
      error: "Verification failed. Please try again.",
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Atomically burn the OTP. Concurrent verification requests cannot both
      // transition the same PENDING record to VERIFIED.
      const verificationUpdate = await tx.otpVerification.updateMany({
        where: {
          id: otpVerificationId,
          mobileNumberHash,
          status: "PENDING",
          attemptCount: { lt: MAX_OTP_ATTEMPTS },
          expiresAt: { gt: new Date() },
        },
        data: {
          status: "VERIFIED",
          verifiedAt: new Date(),
        },
      });

      if (verificationUpdate.count !== 1) {
        return {
          status: "INVALID" as const,
        };
      }

      const claimUpdate = await tx.rewardClaim.updateMany({
        where: {
          id: pendingClaim.id,
          campaignId,
          mobileNumberHash,
          scanEventId,
          otpVerificationId,
          status: "STARTED",
        },
        data: {
          status: "APPROVED",
          claimedAt: new Date(),
          providerStatus: "SIMULATED",
          providerResponse: { simulated: true, message: "Reward approved for demo." },
        },
      });

      if (claimUpdate.count !== 1) {
        throw new Error("Reward claim state changed during verification");
      }

      await tx.rewardClaimAttempt.create({
        data: {
          campaignId,
          brandId: pendingClaim.brandId,
          advertiserId: pendingClaim.advertiserId,
          scanEventId,
          mobileNumberHash,
          mobileNumberLast4:
            pendingClaim.mobileNumberLast4 ??
            getMobileNumberLast4(normalizedMobile),
          status: "APPROVED",
          ipHash: requestMetadata.ipHash,
          userAgent: requestMetadata.userAgent,
        },
      });

      return { status: "APPROVED" as const, rewardClaimId: pendingClaim.id };
    });

    if (result.status === "INVALID") {
      return {
        ok: false,
        status: "VERIFICATION_FAILED",
        error: "Verification failed. Please try again.",
      };
    }

    return {
      ok: true,
      status: "APPROVED",
      data: {
        rewardClaimId: result.rewardClaimId,
      },
    };
  } catch (e: unknown) {
    console.error("[verifyRewardOtpAndClaim] Error:", e);
    return {
      ok: false,
      status: "VERIFICATION_FAILED",
      error: "Verification failed. Please try again.",
    };
  }
}
