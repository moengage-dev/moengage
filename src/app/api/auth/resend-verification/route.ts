// src/app/api/auth/resend-verification/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { sendVerificationEmail } from "@/helpers/mailer";

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(otp: string) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

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
      return NextResponse.json(
        { error: "No account found for this email." },
        { status: 404 },
      );
    }

    if (user.isEmailVerified) {
      return NextResponse.json(
        { error: "Email is already verified." },
        { status: 400 },
      );
    }

    const otp = generateOtp();
    const tokenHash = hashOtp(otp);
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
        "[auth/resend-verification] OTP created but email sending failed:",
        mailError,
      );

      if (process.env.NODE_ENV === "development") {
        console.log(
          `[auth/resend-verification] Dev verification OTP for ${normalizedEmail}: ${otp}`,
        );
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Verification code resent.",
    });
  } catch (error) {
    console.error("[auth/resend-verification] Error:", error);

    return NextResponse.json(
      { error: "An error occurred while resending the verification code." },
      { status: 500 },
    );
  }
}
