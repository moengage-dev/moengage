// src/lib/auth/role-scope.ts
import prisma from "@/lib/prisma";
import type { CurrentUser } from "@/lib/auth/get-current-user";

export type RoleScopeFilters = {
  brandId?: string;
  advertiserId?: string;
  campaignId?: { in: string[] };
};

export async function getRoleScopeFilters(user: CurrentUser): Promise<RoleScopeFilters | null> {
  if (user.role === "ADMIN") {
    return {};
  }

  if (user.role === "BRAND_ADMIN") {
    if (!user.brandId) return null;
    return { brandId: user.brandId };
  }

  if (user.role === "ADVERTISER_VIEWER") {
    if (!user.advertiserId) return null;
    return { advertiserId: user.advertiserId };
  }

  if (user.role === "CAMPAIGN_MANAGER") {
    const assignments = await prisma.campaignAssignment.findMany({
      where: { userId: user.id },
      select: { campaignId: true },
    });
    const campaignIds = assignments.map((a) => a.campaignId);
    if (campaignIds.length === 0) return null;
    return { campaignId: { in: campaignIds } };
  }

  return null;
}
