// src/app/api/auth/send-email-verification/route.ts
// Alias route for /api/auth/resend-verification — the frontend calls this path
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendVerificationEmail } from "@/helpers/mailer";
import {
  generateEmailVerificationOtp,
  hashEmailVerificationOtp,
} from "@/lib/auth/email-verification";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const normalizedEmail = String(body?.email || "")
      .trim()
      .toLowerCase();

    if (!normalizedEmail) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Return success anyway to avoid email enumeration
      return NextResponse.json({
        ok: true,
        message: "If an account exists, a verification code has been sent.",
      });
    }

    if (user.isEmailVerified) {
      return NextResponse.json(
        { error: "Email is already verified." },
        { status: 400 },
      );
    }

    const otp = generateEmailVerificationOtp();
    const tokenHash = hashEmailVerificationOtp(normalizedEmail, otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.$transaction([
      prisma.emailVerificationToken.deleteMany({
        where: { userId: user.id },
      }),
      prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          email: normalizedEmail,
          token: tokenHash,
          expiresAt,
        },
      }),
    ]);

    try {
      await sendVerificationEmail(normalizedEmail, otp);
    } catch (mailError) {
      console.warn(
        "[auth/send-email-verification] OTP created but email sending failed:",
        mailError,
      );

      if (process.env.NODE_ENV === "development") {
        console.log(
          `[auth/send-email-verification] Dev OTP for ${normalizedEmail}: ${otp}`,
        );
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Verification code sent.",
    });
  } catch (error) {
    console.error("[auth/send-email-verification] Error:", error);

    return NextResponse.json(
      { error: "An error occurred while sending the verification code." },
      { status: 500 },
    );
  }
}
