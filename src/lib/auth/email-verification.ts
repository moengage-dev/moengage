import crypto from "crypto";

function getEmailVerificationSecret(): string {
  const secret =
    process.env.EMAIL_VERIFICATION_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "EMAIL_VERIFICATION_SECRET or NEXTAUTH_SECRET is required in production.",
      );
    }
    return "dev-email-verification-secret-NOT-FOR-PRODUCTION";
  }

  return secret;
}

export function generateEmailVerificationOtp(): string {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashEmailVerificationOtp(email: string, otp: string): string {
  return crypto
    .createHmac("sha256", getEmailVerificationSecret())
    .update(`${email.trim().toLowerCase()}:${otp}`)
    .digest("hex");
}
