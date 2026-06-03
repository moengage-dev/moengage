// src/app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcryptjs from "bcryptjs";
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

    const {
      name,
      email,
      password,
    }: {
      name?: string;
      email?: string;
      password?: string;
    } = body;

    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    const cleanName = String(name || "").trim();
    const cleanPassword = String(password || "");

    if (!cleanName) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    if (!normalizedEmail || !cleanPassword) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    if (cleanPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email is already registered." },
        { status: 409 },
      );
    }

    const passwordHash = await bcryptjs.hash(cleanPassword, 10);

    const otp = generateOtp();
    const tokenHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const createdUser = await prisma.user.create({
      data: {
        name: cleanName,
        email: normalizedEmail,
        passwordHash,
        role: "ADVERTISER_VIEWER",
        isEmailVerified: false,
        isActive: true,
        emailVerificationTokens: {
          create: {
            email: normalizedEmail,
            token: tokenHash,
            expiresAt,
          },
        },
      },
    });

    try {
      await sendVerificationEmail(normalizedEmail, otp);
    } catch (mailError) {
      console.warn(
        "[auth/signup] OTP created but email sending failed:",
        mailError,
      );

      if (process.env.NODE_ENV === "development") {
        console.log(
          `[auth/signup] Dev verification OTP for ${normalizedEmail}: ${otp}`,
        );
      }
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Signup successful. Please verify your email.",
        email: createdUser.email,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[auth/signup] Error:", error);

    return NextResponse.json(
      { error: "An error occurred during signup." },
      { status: 500 },
    );
  }
}
