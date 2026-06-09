import crypto from "crypto";
import type { NextRequest } from "next/server";

export type RewardRequestMetadata = {
  ipHash: string | null;
  userAgent: string | null;
};

export function getRewardRequestMetadata(
  request: NextRequest,
): RewardRequestMetadata {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip");

  return {
    ipHash: ipAddress
      ? crypto.createHash("sha256").update(ipAddress).digest("hex")
      : null,
    userAgent: request.headers.get("user-agent"),
  };
}
