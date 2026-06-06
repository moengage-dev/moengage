// src/lib/rewards/otp.ts
import crypto from "crypto";

export const MAX_OTP_ATTEMPTS = 3;

/**
 * Generate a cryptographically secure 6-digit OTP.
 * Uses crypto.randomInt (CSPRNG) instead of Math.random.
 */
export function generateRewardOtp(): string {
  // randomInt(min, max) exclusive of max → range 100000–999999 (6 digits guaranteed).
  return String(crypto.randomInt(100000, 1000000));
}

/**
 * Hash an OTP using HMAC-SHA256 with a server-side secret (REWARD_OTP_SECRET).
 * Requires the env var in production; uses a clearly-labeled dev fallback otherwise.
 */
export function hashRewardOtp(otp: string): string {
  const secret = process.env.REWARD_OTP_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[otp] REWARD_OTP_SECRET environment variable is required in production."
      );
    }
    // Dev/test only — never reaches production.
    const devKey = "dev-otp-secret-NOT-FOR-PRODUCTION";
    return crypto.createHmac("sha256", devKey).update(otp).digest("hex");
  }

  return crypto.createHmac("sha256", secret).update(otp).digest("hex");
}

/**
 * Verify an OTP against its stored hash using a timing-safe comparison
 * to prevent timing-side-channel attacks.
 */
export function verifyRewardOtpHash(otp: string, codeHash: string): boolean {
  try {
    const hash = hashRewardOtp(otp);
    // Both are HMAC-SHA256 hex strings (always 64 chars) — safe to compare length.
    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(codeHash, "hex")
    );
  } catch {
    return false;
  }
}
