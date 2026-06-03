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
      status: "INVALID_INPUT",
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { scanEventId, campaignId, mobileNumber } = parsed.data;

  // Verify scan event exists and matches campaign
  const scanEvent = await prisma.scanEvent.findUnique({
    where: { id: scanEventId },
    include: { campaign: true },
  });
  if (!scanEvent || scanEvent.campaignId !== campaignId) {
    return {
      ok: false,
      status: "INVALID_SCAN",
      error: "Scan event not found or campaign mismatch.",
    };
  }

  // Verify campaign is active
  if (!scanEvent.campaign || scanEvent.campaign.status !== "ACTIVE") {
    return {
      ok: false,
      status: "INACTIVE_CAMPAIGN",
      error: "This campaign is not currently active.",
    };
  }

  const mobileNumberHash = hashMobileNumber(mobileNumber);

  // Check duplicate APPROVED claim
  const existingApproved = await prisma.rewardClaim.findUnique({
    where: {
      campaignId_mobileNumberHash: {
        campaignId,
        mobileNumberHash,
      },
    },
  });

  if (existingApproved && existingApproved.status === "APPROVED") {
    return {
      ok: false,
      status: "DUPLICATE",
      error: "This mobile number has already claimed this campaign reward.",
    };
  }

  // Generate simulated OTP
  const otp = generateRewardOtp();
  const codeHash = hashRewardOtp(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

  // Log/Return dev OTP
  const devOtp = process.env.NODE_ENV === "development" ? otp : undefined;
  if (process.env.NODE_ENV === "development") {
    console.log(`[startRewardClaim] Dev OTP for ${mobileNumber}: ${otp}`);
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
        mobileNumberLast4: getMobileNumberLast4(mobileNumber),
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
      status: "INVALID_INPUT",
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { otpVerificationId, scanEventId, campaignId, mobileNumber, otp } = parsed.data;

  // Retrieve OTP verification
  const otpVerification = await prisma.otpVerification.findUnique({
    where: { id: otpVerificationId },
  });
  if (!otpVerification) {
    return {
      ok: false,
      status: "INVALID_OTP",
      error: "OTP verification record not found.",
    };
  }

  // Check expired
  if (new Date() > otpVerification.expiresAt) {
    return {
      ok: false,
      status: "EXPIRED_OTP",
      error: "The OTP verification code has expired.",
    };
  }

  // Verify OTP code hash
  if (!otpVerification.codeHash || !verifyRewardOtpHash(otp, otpVerification.codeHash)) {
    // Increment attempts
    await prisma.otpVerification.update({
      where: { id: otpVerificationId },
      data: { attemptCount: { increment: 1 } },
    });
    return {
      ok: false,
      status: "INVALID_OTP",
      error: "Invalid OTP code. Please try again.",
    };
  }

  const mobileNumberHash = hashMobileNumber(mobileNumber);

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
          error: "This mobile number has already claimed this campaign reward.",
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
            mobileNumberLast4: getMobileNumberLast4(mobileNumber),
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
      return {
        ok: false,
        status: "DUPLICATE",
        error: result.error,
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
      return {
        ok: false,
        status: "DUPLICATE",
        error: "This mobile number has already claimed this campaign reward.",
      };
    }
    console.error("[verifyRewardOtpAndClaim] Error:", e);
    return {
      ok: false,
      status: "FAILED",
      error: "An unexpected error occurred during verification.",
    };
  }
}
