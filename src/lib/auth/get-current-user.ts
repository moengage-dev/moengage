// src/lib/auth/get-current-user.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import type { AppRole } from "@/lib/auth/role-redirect";

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: AppRole;
  isEmailVerified: boolean;
  brandId: string | null;
  advertiserId: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as CurrentUser;
}
