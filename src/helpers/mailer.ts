// src/helpers/mailer.ts
import { Resend } from "resend";

export async function sendVerificationEmail(email: string, otpCode: string) {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[mailer] OTP for ${email}: ${otpCode}`);
      return;
    }

    throw new Error("RESEND_API_KEY is required.");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const fromEmail =
    process.env.RESEND_FROM_EMAIL || "MoEngage <onboarding@resend.dev>";

  return resend.emails.send({
    from: fromEmail,
    to: email,
    subject: "Verify your MoEngage account",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Verify your MoEngage account</h2>
        <p>Your verification code is:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${otpCode}</p>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  });
}
