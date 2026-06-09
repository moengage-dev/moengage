// src/lib/auth/get-current-user.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import type { AppRole } from "@/lib/auth/role-redirect";
import prisma from "@/lib/prisma";

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
  if (!session?.user?.id) return null;

  // JWT claims can outlive role, tenant, or activation changes. Re-read the
  // authoritative user record so deactivation and scope changes take effect
  // immediately on every server-side authorization check.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      isEmailVerified: true,
      brandId: true,
      advertiserId: true,
    },
  });

  if (!user?.isActive || !user.isEmailVerified) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as AppRole,
    isEmailVerified: user.isEmailVerified,
    brandId: user.brandId,
    advertiserId: user.advertiserId,
  };
}
