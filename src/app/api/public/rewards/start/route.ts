// src/app/api/public/rewards/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { startRewardClaim } from "@/server/services/reward-claim.service";
import { normalizeMobileNumber } from "@/lib/rewards/mobile-hash";

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

    const { mobileNumber, campaignId, scanEventId } = body;
    if (
      typeof mobileNumber !== "string" ||
      typeof campaignId !== "string" ||
      typeof scanEventId !== "string" ||
      !mobileRegex.test(mobileNumber.trim())
    ) {
      console.warn("[api/public/rewards/start] Route-level validation failed");
      return NextResponse.json(
        { ok: false, status: "VERIFICATION_FAILED", error: "Verification failed. Please try again." },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizeMobileNumber(mobileNumber);
    const result = await startRewardClaim({
      scanEventId,
      campaignId,
      mobileNumber: normalizedPhone,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, status: result.status, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      status: result.status,
      otpVerificationId: result.data.otpVerificationId,
      devOtp: result.data.devOtp,
    });
  } catch (e) {
    console.error("[api/public/rewards/start] Error:", e);
    return NextResponse.json(
      { ok: false, status: "VERIFICATION_FAILED", error: "Verification failed. Please try again." },
      { status: 500 }
    );
  }
}
