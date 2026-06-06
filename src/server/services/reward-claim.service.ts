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

export type ServiceResult<T = any> =
  | { ok: true; status: string; data: T }
  | { ok: false; status: string; error: string };

export async function startRewardClaim(
  input: StartRewardClaimValues
): Promise<ServiceResult<{ otpVerificationId: string; devOtp?: string }>> {
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

  // 1. Prevent OTP resend loops via database-level cooldown check (60 seconds)
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

  // Verify scan event exists and matches campaign
  const scanEvent = await prisma.scanEvent.findUnique({
    where: { id: scanEventId },
    include: { campaign: true },
  });
  if (!scanEvent || scanEvent.campaignId !== campaignId) {
    console.warn("[startRewardClaim] Invalid scan event or campaign mismatch:", { scanEventId, campaignId });
    return {
      ok: false,
      status: "VERIFICATION_FAILED",
      error: "Verification failed. Please try again.",
    };
  }

  // Verify campaign is active
  if (!scanEvent.campaign || scanEvent.campaign.status !== "ACTIVE") {
    console.warn("[startRewardClaim] Inactive campaign attempted:", campaignId);
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

  // User Enumeration Prevention: Pretend we sent OTP for duplicate claims but create a failed OTP verification record
  if (existingApproved && existingApproved.status === "APPROVED") {
    console.warn(`[startRewardClaim] Duplicate approved claim attempt (silenced success response): phoneHash=${mobileNumberHash}`);
    const fakeVerification = await prisma.otpVerification.create({
      data: {
        mobileNumberHash,
        codeHash: "LOCKED_HASH_THAT_NEVER_MATCHES",
        status: "FAILED",
        isSimulated: true,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    return {
      ok: true,
      status: "OTP_SENT",
      data: {
        otpVerificationId: fakeVerification.id,
      },
    };
  }

  // Generate simulated OTP
  const otp = generateRewardOtp();
  const codeHash = hashRewardOtp(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

  // Log/Return dev OTP
  const devOtp = process.env.NODE_ENV === "development" ? otp : undefined;
  if (process.env.NODE_ENV === "development") {
    console.log(`[startRewardClaim] Dev OTP for ${normalizedMobile}: ${otp}`);
  }

  // Create OtpVerification
  const otpVerification = await prisma.otpVerification.create({
    data: {
      mobileNumberHash,
      codeHash,
      status: "PENDING",
      isSimulated: true,
      expiresAt,
    },
  });

  // Create or Update STARTED RewardClaim record
  if (existingApproved) {
    // If a claim exists but is not approved (e.g. STARTED, FAILED), reuse the row
    await prisma.rewardClaim.update({
      where: { id: existingApproved.id },
      data: {
        scanEventId,
        status: "STARTED",
        otpVerificationId: otpVerification.id,
      },
    });
  } else {
    // Create new STARTED claim row
    await prisma.rewardClaim.create({
      data: {
        scanEventId,
        campaignId,
        brandId: scanEvent.brandId,
        advertiserId: scanEvent.advertiserId,
        otpVerificationId: otpVerification.id,
        mobileNumberLast4: getMobileNumberLast4(normalizedMobile),
        mobileNumberHash,
        status: "STARTED",
        rewardType: scanEvent.campaign.rewardType,
        providerStatus: "SIMULATED",
      },
    });
  }

  return {
    ok: true,
    status: "OTP_SENT",
    data: {
      otpVerificationId: otpVerification.id,
      devOtp,
    },
  };
}

export async function verifyRewardOtpAndClaim(
  input: VerifyRewardOtpValues
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
    const nextAttempts = otpVerification.attemptCount + 1;
    const isFailed = nextAttempts >= MAX_OTP_ATTEMPTS;

    console.warn(`[verify] Incorrect OTP code for verificationId: ${otpVerificationId}, attempt: ${nextAttempts}`);

    // Increment attemptCount, and burn/fail the record if limit is reached
    await prisma.otpVerification.update({
      where: { id: otpVerificationId },
      data: { 
        attemptCount: { increment: 1 },
        status: isFailed ? "FAILED" : undefined
      },
    });

    return {
      ok: false,
      status: "VERIFICATION_FAILED",
      error: "Verification failed. Please try again.",
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Re-verify duplicate APPROVED claim inside transaction
      const approvedClaim = await tx.rewardClaim.findUnique({
        where: {
          campaignId_mobileNumberHash: {
            campaignId,
            mobileNumberHash,
          },
        },
      });

      if (approvedClaim && approvedClaim.status === "APPROVED") {
        return {
          status: "DUPLICATE" as const,
          error: "Duplicate claim detected inside transaction.",
        };
      }

      // Update OtpVerification
      await tx.otpVerification.update({
        where: { id: otpVerificationId },
        data: {
          status: "VERIFIED",
          verifiedAt: new Date(),
        },
      });

      if (approvedClaim) {
        // Update existing STARTED row to APPROVED
        const updatedClaim = await tx.rewardClaim.update({
          where: { id: approvedClaim.id },
          data: {
            status: "APPROVED",
            claimedAt: new Date(),
            providerStatus: "SIMULATED",
            providerResponse: { simulated: true, message: "Reward approved for demo." },
            otpVerificationId,
          },
        });
        return { status: "APPROVED" as const, rewardClaimId: updatedClaim.id };
      } else {
        // Fallback create APPROVED claim row
        const campaign = await tx.campaign.findUnique({
          where: { id: campaignId },
          select: { brandId: true, advertiserId: true, rewardType: true },
        });
        if (!campaign) {
          throw new Error("Campaign not found");
        }

        const newClaim = await tx.rewardClaim.create({
          data: {
            scanEventId,
            campaignId,
            brandId: campaign.brandId,
            advertiserId: campaign.advertiserId,
            otpVerificationId,
            mobileNumberLast4: getMobileNumberLast4(normalizedMobile),
            mobileNumberHash,
            status: "APPROVED",
            rewardType: campaign.rewardType,
            providerStatus: "SIMULATED",
            providerResponse: { simulated: true, message: "Reward approved for demo." },
            claimedAt: new Date(),
          },
        });
        return { status: "APPROVED" as const, rewardClaimId: newClaim.id };
      }
    });

    if (result.status === "DUPLICATE") {
      console.warn(`[verify] Duplicate approved claim inside transaction for phoneHash: ${mobileNumberHash}`);
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
  } catch (e: any) {
    if (e.code === "P2002") {
      console.warn(`[verify] Unique constraint duplicate claim error: ${e.message}`);
      return {
        ok: false,
        status: "VERIFICATION_FAILED",
        error: "Verification failed. Please try again.",
      };
    }
    console.error("[verifyRewardOtpAndClaim] Error:", e);
    return {
      ok: false,
      status: "VERIFICATION_FAILED",
      error: "Verification failed. Please try again.",
    };
  }
}
