// src/app/api/public/rewards/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { startRewardClaim } from "@/server/services/reward-claim.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await startRewardClaim(body);
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
      { ok: false, status: "ERROR", error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
