// src/app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import crypto from "crypto";

function hashOtp(otp: string) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      email,
      code,
      otp,
    }: {
      email?: string;
      code?: string;
      otp?: string;
    } = body;

    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    // Accept `code` (new) or `otp` (legacy) field name
    const cleanOtp = String(code || otp || "").trim();

    if (!normalizedEmail || !cleanOtp) {
      return NextResponse.json(
        { error: "Email and verification code are required." },
        { status: 400 },
      );
    }

    const tokenHash = hashOtp(cleanOtp);

    const verificationToken = await prisma.emailVerificationToken.findFirst({
      where: {
        email: normalizedEmail,
        token: tokenHash,
      },
      include: {
        user: true,
      },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: "Invalid verification code." },
        { status: 400 },
      );
    }

    if (verificationToken.expiresAt < new Date()) {
      await prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id },
      });

      return NextResponse.json(
        { error: "Verification code has expired." },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.user.update({
        where: { id: verificationToken.userId },
        data: {
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });

      await tx.emailVerificationToken.deleteMany({
        where: {
          userId: verificationToken.userId,
        },
      });
    });

    return NextResponse.json({
      ok: true,
      message: "Email verified successfully.",
    });
  } catch (error) {
    console.error("[auth/verify-email] Error:", error);

    return NextResponse.json(
      { error: "An error occurred while verifying your email." },
      { status: 500 },
    );
  }
}
