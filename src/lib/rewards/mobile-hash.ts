// src/lib/rewards/mobile-hash.ts
import crypto from "crypto";

export function normalizeMobileNumber(mobileNumber: string): string {
  const trimmed = mobileNumber.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

export function hashMobileNumber(mobileNumber: string): string {
  const normalized = normalizeMobileNumber(mobileNumber);
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export function getMobileNumberLast4(mobileNumber: string): string {
  const normalized = normalizeMobileNumber(mobileNumber);
  return normalized.slice(-4);
}
