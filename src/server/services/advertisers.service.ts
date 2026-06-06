// src/server/services/advertisers.service.ts
import prisma from "@/lib/prisma";
import { advertiserSchema } from "@/lib/validators/advertiser.validator";
import type { AdvertiserFormValues } from "@/lib/validators/advertiser.validator";

function toNull(v: string | undefined | null): string | null {
  if (!v || v.trim() === "") return null;
  return v;
}

export type AdvertiserRow = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  contactName: string | null;
  contactEmail: string | null;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  createdAt: string;
  primaryUserId: string | null;
  primaryUserName: string | null;
  primaryUserEmail: string | null;
};

export type AdminAdvertisersPageData = {
  advertisers: AdvertiserRow[];
  totalAdvertisers: number;
  activeAdvertisers: number;
};

export async function getAdminAdvertisersPageData(): Promise<AdminAdvertisersPageData> {
  const [advertisers, totalAdvertisers, activeAdvertisers] = await Promise.all([
    prisma.advertiser.findMany({
      include: {
        users: {
          where: { role: { in: ["CAMPAIGN_MANAGER", "ADVERTISER_VIEWER"] } },
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.advertiser.count(),
    prisma.advertiser.count({ where: { status: "ACTIVE" } }),
  ]);

  return {
    advertisers: advertisers.map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      industry: a.industry,
      websiteUrl: a.websiteUrl,
      logoUrl: a.logoUrl,
      contactName: a.contactName,
      contactEmail: a.contactEmail,
      status: a.status as "ACTIVE" | "PAUSED" | "ARCHIVED",
      createdAt: a.createdAt.toISOString(),
      primaryUserId: a.users[0]?.id ?? null,
      primaryUserName: a.users[0]?.name ?? null,
      primaryUserEmail: a.users[0]?.email ?? null,
    })),
    totalAdvertisers,
    activeAdvertisers,
  };
}

export type ServiceResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function createAdvertiser(
  input: AdvertiserFormValues
): Promise<ServiceResult<AdvertiserRow>> {
  const parsed = advertiserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, slug, industry, websiteUrl, logoUrl, status, primaryUserId } =
    parsed.data;

  const existing = await prisma.advertiser.findUnique({ where: { slug } });
  if (existing) {
    return { ok: false, error: `Slug "${slug}" is already taken` };
  }

  const advertiser = await prisma.advertiser.create({
    data: {
      name,
      slug,
      industry: toNull(industry),
      websiteUrl: toNull(websiteUrl),
      logoUrl: toNull(logoUrl),
      contactName: null,
      contactEmail: null,
      status,
    },
  });

  let primaryUserName: string | null = null;
  let primaryUserEmail: string | null = null;

  if (primaryUserId) {
    const updatedUser = await prisma.user.update({
      where: { id: primaryUserId },
      data: { advertiserId: advertiser.id },
      select: { name: true, email: true },
    });
    primaryUserName = updatedUser.name;
    primaryUserEmail = updatedUser.email;
  }

  return {
    ok: true,
    data: {
      id: advertiser.id,
      name: advertiser.name,
      slug: advertiser.slug,
      industry: advertiser.industry,
      websiteUrl: advertiser.websiteUrl,
      logoUrl: advertiser.logoUrl,
      contactName: advertiser.contactName,
      contactEmail: advertiser.contactEmail,
      status: advertiser.status as "ACTIVE" | "PAUSED" | "ARCHIVED",
      createdAt: advertiser.createdAt.toISOString(),
      primaryUserId: primaryUserId ?? null,
      primaryUserName,
      primaryUserEmail,
    },
  };
}

export async function updateAdvertiser(
  id: string,
  input: AdvertiserFormValues
): Promise<ServiceResult<AdvertiserRow>> {
  const parsed = advertiserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, slug, industry, websiteUrl, logoUrl, status, primaryUserId } =
    parsed.data;

  const slugConflict = await prisma.advertiser.findFirst({
    where: { slug, NOT: { id } },
  });
  if (slugConflict) {
    return { ok: false, error: `Slug "${slug}" is already taken` };
  }

  const advertiser = await prisma.advertiser.update({
    where: { id },
    data: {
      name,
      slug,
      industry: toNull(industry),
      websiteUrl: toNull(websiteUrl),
      logoUrl: toNull(logoUrl),
      contactName: null,
      contactEmail: null,
      status,
    },
  });

  // Clear existing links
  await prisma.user.updateMany({
    where: { advertiserId: id },
    data: { advertiserId: null },
  });

  let primaryUserName: string | null = null;
  let primaryUserEmail: string | null = null;

  if (primaryUserId) {
    const updatedUser = await prisma.user.update({
      where: { id: primaryUserId },
      data: { advertiserId: id },
      select: { name: true, email: true },
    });
    primaryUserName = updatedUser.name;
    primaryUserEmail = updatedUser.email;
  }

  return {
    ok: true,
    data: {
      id: advertiser.id,
      name: advertiser.name,
      slug: advertiser.slug,
      industry: advertiser.industry,
      websiteUrl: advertiser.websiteUrl,
      logoUrl: advertiser.logoUrl,
      contactName: advertiser.contactName,
      contactEmail: advertiser.contactEmail,
      status: advertiser.status as "ACTIVE" | "PAUSED" | "ARCHIVED",
      createdAt: advertiser.createdAt.toISOString(),
      primaryUserId: primaryUserId ?? null,
      primaryUserName,
      primaryUserEmail,
    },
  };
}

export async function archiveAdvertiser(id: string): Promise<ServiceResult> {
  await prisma.advertiser.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });
  return { ok: true, data: undefined };
}
