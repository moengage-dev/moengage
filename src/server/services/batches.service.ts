// src/server/services/batches.service.ts
import prisma from "@/lib/prisma";
import { BatchStatus } from "@prisma/client";
import { batchSchema } from "@/lib/validators/batch.validator";
import type { BatchFormValues } from "@/lib/validators/batch.validator";

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

function toInt(v: number | undefined | null): number | null {
  if (v == null) return null;
  return Math.floor(v);
}

export type BatchRow = {
  id: string;
  brandId: string;
  brandName: string;
  campaignId: string;
  campaignName: string;
  productId: string | null;
  productName: string | null;
  batchCode: string;
  region: string | null;
  city: string | null;
  estimatedUnitCount: number | null;
  unitsPerCarton: number | null;
  status: string;
  createdAt: string;
};

export type BrandOption = {
  id: string;
  name: string;
};

export type CampaignOption = {
  id: string;
  name: string;
  brandId: string;
  productId: string | null;
};

export type ProductOption = {
  id: string;
  name: string;
  brandId: string;
};

export type AdminBatchesPageData = {
  batches: BatchRow[];
  brands: BrandOption[];
  campaigns: CampaignOption[];
  products: ProductOption[];
  totalBatches: number;
  activeBatches: number;
  deliveringBatches: number;
  closedBatches: number;
};

export type ServiceResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function toBatchRow(b: {
  id: string;
  brandId: string;
  campaignId: string;
  productId: string | null;
  batchCode: string;
  region: string | null;
  city: string | null;
  estimatedUnitCount: number | null;
  unitsPerCarton: number | null;
  status: string;
  createdAt: Date;
  brand: { name: string };
  campaign: { name: string };
  product: { name: string } | null;
}): BatchRow {
  return {
    id: b.id,
    brandId: b.brandId,
    brandName: b.brand.name,
    campaignId: b.campaignId,
    campaignName: b.campaign.name,
    productId: b.productId,
    productName: b.product?.name ?? null,
    batchCode: b.batchCode,
    region: b.region,
    city: b.city,
    estimatedUnitCount: b.estimatedUnitCount,
    unitsPerCarton: b.unitsPerCarton,
    status: b.status,
    createdAt: b.createdAt.toISOString(),
  };
}

const batchInclude = {
  brand: { select: { name: true } },
  campaign: { select: { name: true } },
  product: { select: { name: true } },
} as const;

export async function getBatchesPageData(user: ScopedUser): Promise<AdminBatchesPageData> {
  const batchFilter: any = {};
  if (user.role === "BRAND_ADMIN") {
    batchFilter.brandId = user.brandId;
  } else if (user.role === "CAMPAIGN_MANAGER" || user.role === "ADVERTISER_VIEWER") {
    batchFilter.campaign = { advertiserId: user.advertiserId };
  }

  const brandFilter: any = { status: "ACTIVE" };
  if (user.role === "BRAND_ADMIN") {
    brandFilter.id = user.brandId;
  }

  const campaignFilter: any = { status: { in: ["ACTIVE", "DRAFT", "PAUSED"] } };
  if (user.role === "BRAND_ADMIN") {
    campaignFilter.brandId = user.brandId;
  } else if (user.role === "CAMPAIGN_MANAGER" || user.role === "ADVERTISER_VIEWER") {
    campaignFilter.advertiserId = user.advertiserId;
  }

  const productFilter: any = { status: "ACTIVE" };
  if (user.role === "BRAND_ADMIN") {
    productFilter.brandId = user.brandId;
  }

  const [
    batches,
    brands,
    campaigns,
    products,
    totalBatches,
    activeBatches,
    deliveringBatches,
    closedBatches,
  ] = await Promise.all([
    prisma.batch.findMany({
      where: batchFilter,
      include: batchInclude,
      orderBy: { createdAt: "desc" },
    }),
    prisma.brand.findMany({
      where: brandFilter,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.campaign.findMany({
      where: campaignFilter,
      select: { id: true, name: true, brandId: true, productId: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: productFilter,
      select: { id: true, name: true, brandId: true },
      orderBy: { name: "asc" },
    }),
    prisma.batch.count({ where: batchFilter }),
    prisma.batch.count({ where: { ...batchFilter, status: "ACTIVE" } }),
    prisma.batch.count({ where: { ...batchFilter, status: "DELIVERING" } }),
    prisma.batch.count({ where: { ...batchFilter, status: "CLOSED" } }),
  ]);

  return {
    batches: batches.map(toBatchRow),
    brands: brands.map((b) => ({ id: b.id, name: b.name })),
    campaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      brandId: c.brandId,
      productId: c.productId,
    })),
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      brandId: p.brandId,
    })),
    totalBatches,
    activeBatches,
    deliveringBatches,
    closedBatches,
  };
}

export async function createBatch(
  input: BatchFormValues,
  user: ScopedUser
): Promise<ServiceResult<BatchRow>> {
  const parsed = batchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const {
    brandId,
    campaignId,
    productId,
    batchCode,
    region,
    city,
    estimatedUnitCount,
    unitsPerCarton,
    status,
  } = parsed.data;

  if (user.role === "BRAND_ADMIN" && brandId !== user.brandId) {
    return { ok: false, error: "Unauthorized: Invalid brand mapping" };
  }
  
  if (user.role === "CAMPAIGN_MANAGER" || user.role === "ADVERTISER_VIEWER") {
    const checkCampaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { advertiserId: true } });
    if (!checkCampaign || checkCampaign.advertiserId !== user.advertiserId) {
       return { ok: false, error: "Unauthorized to create batch for this campaign" };
    }
  }

  const existing = await prisma.batch.findUnique({ where: { batchCode } });
  if (existing) {
    return { ok: false, error: `Batch code "${batchCode}" is already taken` };
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { brandId: true, productId: true },
  });
  if (!campaign || campaign.brandId !== brandId) {
    return {
      ok: false,
      error: "Selected campaign does not belong to the selected brand",
    };
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

  const batch = await prisma.batch.create({
    data: {
      brandId,
      campaignId,
      productId: productId ?? null,
      batchCode,
      region: toNull(region),
      city: toNull(city),
      estimatedUnitCount: toInt(estimatedUnitCount),
      unitsPerCarton: toInt(unitsPerCarton),
      status: status as BatchStatus,
    },
    include: batchInclude,
  });

  return { ok: true, data: toBatchRow(batch) };
}

export async function updateBatch(
  id: string,
  input: BatchFormValues,
  user: ScopedUser
): Promise<ServiceResult<BatchRow>> {
  const parsed = batchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const {
    brandId,
    campaignId,
    productId,
    batchCode,
    region,
    city,
    estimatedUnitCount,
    unitsPerCarton,
    status,
  } = parsed.data;

  if (user.role !== "ADMIN") {
    const existingBatch = await prisma.batch.findUnique({
      where: { id },
      include: { campaign: { select: { advertiserId: true } } }
    });
    if (!existingBatch) return { ok: false, error: "Batch not found" };
    if (user.role === "BRAND_ADMIN" && existingBatch.brandId !== user.brandId) return { ok: false, error: "Unauthorized" };
    if ((user.role === "CAMPAIGN_MANAGER" || user.role === "ADVERTISER_VIEWER") && existingBatch.campaign?.advertiserId !== user.advertiserId) return { ok: false, error: "Unauthorized" };
    if (user.role === "BRAND_ADMIN" && brandId !== existingBatch.brandId) return { ok: false, error: "Unauthorized to change brand ownership" };
  }

  const codeConflict = await prisma.batch.findFirst({
    where: { batchCode, NOT: { id } },
  });
  if (codeConflict) {
    return { ok: false, error: `Batch code "${batchCode}" is already taken` };
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { brandId: true },
  });
  if (!campaign || campaign.brandId !== brandId) {
    return {
      ok: false,
      error: "Selected campaign does not belong to the selected brand",
    };
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

  const batch = await prisma.batch.update({
    where: { id },
    data: {
      brandId,
      campaignId,
      productId: productId ?? null,
      batchCode,
      region: toNull(region),
      city: toNull(city),
      estimatedUnitCount: toInt(estimatedUnitCount),
      unitsPerCarton: toInt(unitsPerCarton),
      status: status as BatchStatus,
    },
    include: batchInclude,
  });

  return { ok: true, data: toBatchRow(batch) };
}

export async function closeBatch(id: string, user: ScopedUser): Promise<ServiceResult> {
  if (user.role !== "ADMIN") {
    const existingBatch = await prisma.batch.findUnique({
      where: { id },
      include: { campaign: { select: { advertiserId: true } } }
    });
    if (!existingBatch) return { ok: false, error: "Batch not found" };
    if (user.role === "BRAND_ADMIN" && existingBatch.brandId !== user.brandId) return { ok: false, error: "Unauthorized" };
    if ((user.role === "CAMPAIGN_MANAGER" || user.role === "ADVERTISER_VIEWER") && existingBatch.campaign?.advertiserId !== user.advertiserId) return { ok: false, error: "Unauthorized" };
  }

  await prisma.batch.update({
    where: { id },
    data: { status: "CLOSED" },
  });
  return { ok: true, data: undefined };
}
