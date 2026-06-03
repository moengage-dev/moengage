// src/server/services/batches.service.ts
import prisma from "@/lib/prisma";
import { BatchStatus } from "@prisma/client";
import { batchSchema } from "@/lib/validators/batch.validator";
import type { BatchFormValues } from "@/lib/validators/batch.validator";

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

export async function getAdminBatchesPageData(): Promise<AdminBatchesPageData> {
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
      include: batchInclude,
      orderBy: { createdAt: "desc" },
    }),
    prisma.brand.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.campaign.findMany({
      where: { status: { in: ["ACTIVE", "DRAFT", "PAUSED"] } },
      select: { id: true, name: true, brandId: true, productId: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, brandId: true },
      orderBy: { name: "asc" },
    }),
    prisma.batch.count(),
    prisma.batch.count({ where: { status: "ACTIVE" } }),
    prisma.batch.count({ where: { status: "DELIVERING" } }),
    prisma.batch.count({ where: { status: "CLOSED" } }),
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
  input: BatchFormValues
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
  input: BatchFormValues
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

export async function closeBatch(id: string): Promise<ServiceResult> {
  await prisma.batch.update({
    where: { id },
    data: { status: "CLOSED" },
  });
  return { ok: true, data: undefined };
}
