// src/app/api/public/rewards/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyRewardOtpAndClaim } from "@/server/services/reward-claim.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await verifyRewardOtpAndClaim(body);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, status: result.status, error: result.error },
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
      { ok: false, status: "ERROR", error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
