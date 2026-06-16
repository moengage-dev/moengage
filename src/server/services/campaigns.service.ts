// src/server/services/campaigns.service.ts
import prisma from "@/lib/prisma";
import { RewardType, CampaignStatus } from "@prisma/client";
import { getAssignedCampaignIds } from "@/lib/auth/role-scope";
import { campaignSchema } from "@/lib/validators/campaign.validator";
import type { CampaignFormValues } from "@/lib/validators/campaign.validator";

export type ScopedUser = {
  id: string;
  role: string;
  brandId?: string | null;
  advertiserId?: string | null;
};

function toNull(v: string | undefined | null): string | null {
  if (!v || v.trim() === "") return null;
  return v;
}

function toDecimal(v: string | undefined | null): number | null {
  if (!v || v.trim() === "") return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function toDate(v: string | undefined | null): Date | null {
  if (!v || v.trim() === "") return null;
  return new Date(v);
}

export type CampaignRow = {
  id: string;
  brandId: string;
  brandName: string;
  advertiserId: string;
  advertiserName: string;
  productId: string | null;
  productName: string | null;
  name: string;
  slug: string;
  offerTitle: string;
  offerDescription: string | null;
  rewardType: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  fixedFeePerUnit: number | null;
  engagementFeePerScan: number | null;
  currency: string;
  maxClaimsPerMobile: number;
  createdAt: string;
};

export type BrandOption = {
  id: string;
  name: string;
};

export type AdvertiserOption = {
  id: string;
  name: string;
};

export type ProductOption = {
  id: string;
  name: string;
  brandId: string;
};

export type AdminCampaignsPageData = {
  campaigns: CampaignRow[];
  brands: BrandOption[];
  advertisers: AdvertiserOption[];
  products: ProductOption[];
  totalCampaigns: number;
  activeCampaigns: number;
  draftCampaigns: number;
  archivedCampaigns: number;
};

export type ServiceResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function toCampaignRow(c: {
  id: string;
  brandId: string;
  advertiserId: string;
  productId: string | null;
  name: string;
  slug: string;
  offerTitle: string;
  offerDescription: string | null;
  rewardType: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  fixedFeePerUnit: { toNumber(): number } | null;
  engagementFeePerScan: { toNumber(): number } | null;
  currency: string;
  maxClaimsPerMobile: number;
  createdAt: Date;
  brand: { name: string };
  advertiser: { name: string };
  product: { name: string } | null;
}): CampaignRow {
  return {
    id: c.id,
    brandId: c.brandId,
    brandName: c.brand.name,
    advertiserId: c.advertiserId,
    advertiserName: c.advertiser.name,
    productId: c.productId,
    productName: c.product?.name ?? null,
    name: c.name,
    slug: c.slug,
    offerTitle: c.offerTitle,
    offerDescription: c.offerDescription,
    rewardType: c.rewardType,
    status: c.status,
    startDate: c.startDate ? c.startDate.toISOString() : null,
    endDate: c.endDate ? c.endDate.toISOString() : null,
    fixedFeePerUnit: c.fixedFeePerUnit ? c.fixedFeePerUnit.toNumber() : null,
    engagementFeePerScan: c.engagementFeePerScan
      ? c.engagementFeePerScan.toNumber()
      : null,
    currency: c.currency,
    maxClaimsPerMobile: c.maxClaimsPerMobile,
    createdAt: c.createdAt.toISOString(),
  };
}

const campaignInclude = {
  brand: { select: { name: true } },
  advertiser: { select: { name: true } },
  product: { select: { name: true } },
} as const;

export async function getCampaignsPageData(user: ScopedUser): Promise<AdminCampaignsPageData> {
  const campaignFilter: any = {};
  if (user.role === "BRAND_ADMIN") {
    campaignFilter.brandId = user.brandId;
  } else if (user.role === "CAMPAIGN_MANAGER") {
    const assignedCampaignIds = await getAssignedCampaignIds(user.id);
    if (assignedCampaignIds.length === 0) {
      return {
        campaigns: [],
        brands: [],
        advertisers: [],
        products: [],
        totalCampaigns: 0,
        activeCampaigns: 0,
        draftCampaigns: 0,
        archivedCampaigns: 0,
      };
    }
    campaignFilter.id = { in: assignedCampaignIds };
  } else if (user.role === "ADVERTISER_VIEWER") {
    campaignFilter.advertiserId = user.advertiserId;
  }

  const brandFilter: any = { status: "ACTIVE" };
  if (user.role === "BRAND_ADMIN") {
    brandFilter.id = user.brandId;
  }

  const advertiserFilter: any = { status: "ACTIVE" };
  if (user.role === "ADVERTISER_VIEWER") {
    advertiserFilter.id = user.advertiserId;
  }

  const productFilter: any = { status: "ACTIVE" };
  if (user.role === "BRAND_ADMIN") {
    productFilter.brandId = user.brandId;
  }

  const [
    campaigns,
    brands,
    advertisers,
    products,
    totalCampaigns,
    activeCampaigns,
    draftCampaigns,
    archivedCampaigns,
  ] = await Promise.all([
    prisma.campaign.findMany({
      where: campaignFilter,
      include: campaignInclude,
      orderBy: { createdAt: "desc" },
    }),
    prisma.brand.findMany({
      where: brandFilter,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.advertiser.findMany({
      where: advertiserFilter,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: productFilter,
      select: { id: true, name: true, brandId: true },
      orderBy: { name: "asc" },
    }),
    prisma.campaign.count({ where: campaignFilter }),
    prisma.campaign.count({ where: { ...campaignFilter, status: "ACTIVE" } }),
    prisma.campaign.count({ where: { ...campaignFilter, status: "DRAFT" } }),
    prisma.campaign.count({ where: { ...campaignFilter, status: "ARCHIVED" } }),
  ]);

  return {
    campaigns: campaigns.map(toCampaignRow),
    brands: brands.map((b) => ({ id: b.id, name: b.name })),
    advertisers: advertisers.map((a) => ({ id: a.id, name: a.name })),
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      brandId: p.brandId,
    })),
    totalCampaigns,
    activeCampaigns,
    draftCampaigns,
    archivedCampaigns,
  };
}

export async function createCampaign(
  input: CampaignFormValues,
  user: ScopedUser
): Promise<ServiceResult<CampaignRow>> {
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  if (user.role === "CAMPAIGN_MANAGER") {
    return { ok: false, error: "Unauthorized: Campaign Managers cannot create campaigns" };
  }

  const {
    brandId,
    advertiserId,
    productId,
    name,
    slug,
    offerTitle,
    offerDescription,
    rewardType,
    status,
    startDate,
    endDate,
    fixedFeePerUnit,
    engagementFeePerScan,
    currency,
    maxClaimsPerMobile,
  } = parsed.data;

  if (user.role === "BRAND_ADMIN" && brandId !== user.brandId) {
    return { ok: false, error: "Unauthorized: Invalid brand mapping" };
  }
  if (user.role === "ADVERTISER_VIEWER" && advertiserId !== user.advertiserId) {
    return { ok: false, error: "Unauthorized: Invalid advertiser mapping" };
  }

  const existing = await prisma.campaign.findUnique({ where: { slug } });
  if (existing) {
    return { ok: false, error: `Slug "${slug}" is already taken` };
  }

  if (productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { brandId: true },
    });
    if (!product || product.brandId !== brandId) {
      return {
        ok: false,
        error: "Selected product does not belong to the selected brand",
      };
    }
  }

  const campaign = await prisma.campaign.create({
    data: {
      brandId,
      advertiserId,
      productId: productId ?? null,
      createdById: user.id,
      name,
      slug,
      offerTitle,
      offerDescription: toNull(offerDescription),
      rewardType: rewardType as RewardType,
      status: status as CampaignStatus,
      startDate: toDate(startDate),
      endDate: toDate(endDate),
      fixedFeePerUnit: toDecimal(fixedFeePerUnit),
      engagementFeePerScan: toDecimal(engagementFeePerScan),
      currency,
      maxClaimsPerMobile,
    },
    include: campaignInclude,
  });

  return { ok: true, data: toCampaignRow(campaign) };
}

export async function updateCampaign(
  id: string,
  input: CampaignFormValues,
  user: ScopedUser
): Promise<ServiceResult<CampaignRow>> {
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const {
    brandId,
    advertiserId,
    productId,
    name,
    slug,
    offerTitle,
    offerDescription,
    rewardType,
    status,
    startDate,
    endDate,
    fixedFeePerUnit,
    engagementFeePerScan,
    currency,
    maxClaimsPerMobile,
  } = parsed.data;

  if (user.role !== "ADMIN") {
    const existing = await prisma.campaign.findUnique({ where: { id }, select: { brandId: true, advertiserId: true } });
    if (!existing) return { ok: false, error: "Campaign not found" };
    if (user.role === "BRAND_ADMIN" && existing.brandId !== user.brandId) return { ok: false, error: "Unauthorized" };
    if (user.role === "ADVERTISER_VIEWER" && existing.advertiserId !== user.advertiserId) return { ok: false, error: "Unauthorized" };
    if (user.role === "CAMPAIGN_MANAGER") {
      const assignedCampaignIds = await getAssignedCampaignIds(user.id);
      if (!assignedCampaignIds.includes(id)) {
        return { ok: false, error: "Campaign not found" };
      }
      if (brandId !== existing.brandId) return { ok: false, error: "Unauthorized to change brand ownership" };
      if (advertiserId !== existing.advertiserId) return { ok: false, error: "Unauthorized to change advertiser ownership" };
    }
  }

  const slugConflict = await prisma.campaign.findFirst({
    where: { slug, NOT: { id } },
  });
  if (slugConflict) {
    return { ok: false, error: `Slug "${slug}" is already taken` };
  }

  if (productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { brandId: true },
    });
    if (!product || product.brandId !== brandId) {
      return {
        ok: false,
        error: "Selected product does not belong to the selected brand",
      };
    }
  }

  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      brandId,
      advertiserId,
      productId: productId ?? null,
      name,
      slug,
      offerTitle,
      offerDescription: toNull(offerDescription),
      rewardType: rewardType as RewardType,
      status: status as CampaignStatus,
      startDate: toDate(startDate),
      endDate: toDate(endDate),
      fixedFeePerUnit: toDecimal(fixedFeePerUnit),
      engagementFeePerScan: toDecimal(engagementFeePerScan),
      currency,
      maxClaimsPerMobile,
    },
    include: campaignInclude,
  });

  return { ok: true, data: toCampaignRow(campaign) };
}

export async function archiveCampaign(id: string, user: ScopedUser): Promise<ServiceResult> {
  if (user.role !== "ADMIN") {
    const existing = await prisma.campaign.findUnique({ where: { id }, select: { brandId: true, advertiserId: true } });
    if (!existing) return { ok: false, error: "Campaign not found" };
    if (user.role === "BRAND_ADMIN" && existing.brandId !== user.brandId) return { ok: false, error: "Unauthorized" };
    if (user.role === "ADVERTISER_VIEWER" && existing.advertiserId !== user.advertiserId) return { ok: false, error: "Unauthorized" };
    if (user.role === "CAMPAIGN_MANAGER") {
      const assignedCampaignIds = await getAssignedCampaignIds(user.id);
      if (!assignedCampaignIds.includes(id)) {
        return { ok: false, error: "Campaign not found" };
      }
    }
  }
  await prisma.campaign.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });
  return { ok: true, data: undefined };
}
