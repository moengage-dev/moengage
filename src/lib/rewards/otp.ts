// src/lib/rewards/otp.ts
import crypto from "crypto";

export function generateRewardOtp(): string {
  const val = Math.floor(100000 + Math.random() * 900000);
  return String(val);
}

export function hashRewardOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export function verifyRewardOtpHash(otp: string, codeHash: string): boolean {
  const hash = hashRewardOtp(otp);
  return hash === codeHash;
}
