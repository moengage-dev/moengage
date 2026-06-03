// src/lib/validators/reward-claim.validator.ts
import { z } from "zod";

const mobileRegex = /^\+?[1-9]\d{6,14}$/;

export const startRewardClaimSchema = z.object({
  scanEventId: z.string().min(1, "Scan Event ID is required"),
  campaignId: z.string().min(1, "Campaign ID is required"),
  mobileNumber: z
    .string()
    .trim()
    .min(7, "Mobile number must be at least 7 digits")
    .max(15, "Mobile number must be at most 15 digits")
    .regex(mobileRegex, "Invalid mobile number format. Must start with optional + and contain only digits."),
});

export const verifyRewardOtpSchema = z.object({
  otpVerificationId: z.string().min(1, "OTP Verification ID is required"),
  scanEventId: z.string().min(1, "Scan Event ID is required"),
  campaignId: z.string().min(1, "Campaign ID is required"),
  mobileNumber: z
    .string()
    .trim()
    .min(7, "Mobile number must be at least 7 digits")
    .max(15, "Mobile number must be at most 15 digits")
    .regex(mobileRegex, "Invalid mobile number format."),
  otp: z
    .string()
    .trim()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only digits"),
});

export type StartRewardClaimValues = z.infer<typeof startRewardClaimSchema>;
export type VerifyRewardOtpValues = z.infer<typeof verifyRewardOtpSchema>;
