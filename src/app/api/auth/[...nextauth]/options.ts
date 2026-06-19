// src/app/api/auth/[...nextauth]/options.ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

type AppRole =
  | "ADMIN"
  | "BRAND_ADMIN"
  | "CAMPAIGN_MANAGER"
  | "ADVERTISER_VIEWER"
  | "RETAIL_OPERATIONS";

type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  role: AppRole;
  isEmailVerified: boolean;
  brandId: string | null;
  advertiserId: string | null;
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "admin@moengage.local",
        },
        password: {
          label: "Password",
          type: "password",
          placeholder: "Password",
        },
      },

      async authorize(credentials) {
        const email = String(credentials?.email || "")
          .trim()
          .toLowerCase();

        const password = String(credentials?.password || "");

        if (!email || !password) {
          throw new Error("Email and password are required.");
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) {
          throw new Error("Invalid email or password.");
        }

        if (!user.isActive) {
          throw new Error("This account is inactive.");
        }

        if (!user.isEmailVerified) {
          throw new Error("Please verify your email address first.");
        }

        const isPasswordCorrect = await bcrypt.compare(
          password,
          user.passwordHash,
        );

        if (!isPasswordCorrect) {
          throw new Error("Invalid email or password.");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          brandId: user.brandId,
          advertiserId: user.advertiserId,
        } satisfies AuthUser;
      },
    }),
  ],

  pages: {
    signIn: "/login",
    newUser: "/",
  },

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as AuthUser;

        token.id = authUser.id;
        token.role = authUser.role;
        token.isEmailVerified = authUser.isEmailVerified;
        token.email = authUser.email;
        token.name = authUser.name;
        token.brandId = authUser.brandId;
        token.advertiserId = authUser.advertiserId;
        token.lastChecked = Date.now();
      } else if (token.id) {
        const now = Date.now();
        const lastChecked = (token.lastChecked as number) || 0;

        // Revalidate every 5 minutes
        if (now - lastChecked > 5 * 60 * 1000) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: token.id as string },
              select: { isActive: true, role: true, brandId: true, advertiserId: true },
            });

            if (!dbUser || !dbUser.isActive) {
              token.error = "InactiveUser";
            } else {
              token.role = dbUser.role;
              token.brandId = dbUser.brandId;
              token.advertiserId = dbUser.advertiserId;
              token.lastChecked = now;
            }
          } catch (err) {
            console.error("JWT revalidation error:", err);
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token.error === "InactiveUser") {
        // Return an empty object so the session is invalidated
        return {} as typeof session;
      }

      if (!session.user) {
        return session;
      }

      session.user.id = token.id ?? "";
      session.user.role = (token.role ?? "ADVERTISER_VIEWER") as AppRole;
      session.user.isEmailVerified = Boolean(token.isEmailVerified);
      session.user.email = token.email ?? null;
      session.user.name = token.name ?? null;
      session.user.brandId = token.brandId ?? null;
      session.user.advertiserId = token.advertiserId ?? null;

      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
