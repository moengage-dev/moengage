// src/types/next-auth.d.ts
import type { DefaultSession } from "next-auth";

export type AppRole =
  | "ADMIN"
  | "BRAND_ADMIN"
  | "CAMPAIGN_MANAGER"
  | "ADVERTISER_VIEWER"
  | "RETAIL_OPERATIONS";

declare module "next-auth" {
  interface User {
    id: string;
    email?: string | null;
    name?: string | null;
    role: AppRole;
    isEmailVerified: boolean;
    brandId?: string | null;
    advertiserId?: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: AppRole;
      isEmailVerified: boolean;
      email?: string | null;
      brandId?: string | null;
      advertiserId?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    email?: string | null;
    name?: string | null;
    role?: AppRole;
    isEmailVerified?: boolean;
    brandId?: string | null;
    advertiserId?: string | null;
  }
}
