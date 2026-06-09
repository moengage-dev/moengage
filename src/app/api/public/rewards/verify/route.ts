// src/app/api/public/rewards/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyRewardOtpAndClaim } from "@/server/services/reward-claim.service";
import { normalizeMobileNumber } from "@/lib/rewards/mobile-hash";
import { getRewardRequestMetadata } from "@/lib/rewards/request-metadata";

const mobileRegex = /^\+?[1-9]\d{6,14}$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Strict route-level validation
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, status: "VERIFICATION_FAILED", error: "Verification failed. Please try again." },
        { status: 400 }
      );
    }

    const { otpVerificationId, scanEventId, campaignId, mobileNumber, otp } = body;
    if (
      typeof otpVerificationId !== "string" ||
      typeof scanEventId !== "string" ||
      typeof campaignId !== "string" ||
      typeof mobileNumber !== "string" ||
      typeof otp !== "string" ||
      !mobileRegex.test(mobileNumber.trim()) ||
      otp.trim().length !== 6 ||
      !/^\d{6}$/.test(otp.trim())
    ) {
      console.warn("[api/public/rewards/verify] Route-level validation failed");
      return NextResponse.json(
        { ok: false, status: "VERIFICATION_FAILED", error: "Verification failed. Please try again." },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizeMobileNumber(mobileNumber);
    const result = await verifyRewardOtpAndClaim(
      {
        otpVerificationId,
        scanEventId,
        campaignId,
        mobileNumber: normalizedPhone,
        otp: otp.trim(),
      },
      getRewardRequestMetadata(request),
    );

    if (!result.ok) {
      return NextResponse.json(
        { 
          ok: false, 
          status: result.status, 
          error: result.error, 
          message: result.error 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      status: result.status,
      rewardClaimId: result.data.rewardClaimId,
    });
  } catch (e) {
    console.error("[api/public/rewards/verify] Error:", e);
    return NextResponse.json(
      { ok: false, status: "VERIFICATION_FAILED", error: "Verification failed. Please try again." },
      { status: 500 }
    );
  }
}
