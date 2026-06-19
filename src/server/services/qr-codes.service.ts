// src/server/services/qr-codes.service.ts
import prisma from "@/lib/prisma";
import { QRCodeType, QRCodeStatus, Prisma } from "@prisma/client";
import { qrCodeSchema } from "@/lib/validators/qr-code.validator";
import type { QRCodeFormValues } from "@/lib/validators/qr-code.validator";
import { getAssignedCampaignIds } from "@/lib/auth/role-scope";
import {
  generateQrCodeDataUrl,
  generateQrCodeSvg,
  generateQrCodePngBuffer,
  generateQrCodePublicCode,
  buildQrDestinationUrl,
} from "@/lib/qr/generate-qr-code";

export type ScopedUser = {
  id: string;
  role: string;
  brandId?: string | null;
  advertiserId?: string | null;
};

export type QRCodeRow = {
  id: string;
  code: string;
  type: string;
  status: string;
  brandId: string | null;
  brandName: string | null;
  advertiserId: string | null;
  advertiserName: string | null;
  campaignId: string | null;
  campaignName: string | null;
  productId: string | null;
  productName: string | null;
  batchId: string | null;
  batchCode: string | null;
  destinationUrl: string | null;
  label: string | null;
  scanCount: number;
  createdAt: string;
};

export type BrandOption = { id: string; name: string };
export type AdvertiserOption = { id: string; name: string };
export type CampaignOption = {
  id: string;
  name: string;
  brandId: string;
  advertiserId: string;
  productId: string | null;
  advertiser: { name: string };
};
export type ProductOption = { id: string; name: string; brandId: string };
export type BatchOption = {
  id: string;
  batchCode: string;
  campaignId: string;
  brandId: string;
  productId: string | null;
  campaign: { name: string };
};

export type AdminQRCodesPageData = {
  qrCodes: QRCodeRow[];
  brands: BrandOption[];
  advertisers: AdvertiserOption[];
  campaigns: CampaignOption[];
  products: ProductOption[];
  batches: BatchOption[];
  totalQRCodes: number;
  activeQRCodes: number;
  consumerCampaignQRCodes: number;
  deliveryQRCodes: number;
  sampleLabelQRCodes: number;
  internalTestQRCodes: number;
};

export type ServiceResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type QRMutationScopeContext = {
  assignedCampaignIds?: string[];
};

type QRMutationTarget = {
  brandId: string | null | undefined;
  advertiserId: string | null | undefined;
  campaignId: string | null | undefined;
};

async function getQRMutationScopeContext(
  user: ScopedUser
): Promise<QRMutationScopeContext> {
  if (user.role !== "CAMPAIGN_MANAGER") {
    return {};
  }

  return {
    assignedCampaignIds: await getAssignedCampaignIds(user.id),
  };
}

function canMutateQRTarget(
  user: ScopedUser,
  target: QRMutationTarget,
  context: QRMutationScopeContext
): boolean {
  if (user.role === "ADMIN") {
    return true;
  }

  if (user.role === "BRAND_ADMIN") {
    return Boolean(user.brandId && target.brandId === user.brandId);
  }

  if (user.role === "CAMPAIGN_MANAGER") {
    if (target.campaignId) {
      return Boolean(context.assignedCampaignIds?.includes(target.campaignId));
    }

    // Sample-label QR codes have no campaign; scope them by the derived product brand.
    return Boolean(user.brandId && target.brandId === user.brandId);
  }

  // QR create/update mutations are not supported for advertiser or retail roles.
  return false;
}

function qrMutationDenied(user: ScopedUser): ServiceResult<never> {
  if (user.role === "CAMPAIGN_MANAGER") {
    return { ok: false, error: "QR Code not found" };
  }

  return { ok: false, error: "Unauthorized" };
}

const qrInclude = {
  brand: { select: { name: true } },
  advertiser: { select: { name: true } },
  campaign: { select: { name: true } },
  product: { select: { name: true } },
  batch: { select: { batchCode: true } },
} as const;

function toQRCodeRow(q: {
  id: string;
  code: string;
  type: string;
  status: string;
  brandId: string | null;
  advertiserId: string | null;
  campaignId: string | null;
  productId: string | null;
  batchId: string | null;
  destinationUrl: string | null;
  label: string | null;
  scanCount: number;
  createdAt: Date;
  brand: { name: string } | null;
  advertiser: { name: string } | null;
  campaign: { name: string } | null;
  product: { name: string } | null;
  batch: { batchCode: string } | null;
}): QRCodeRow {
  return {
    id: q.id,
    code: q.code,
    type: q.type,
    status: q.status,
    brandId: q.brandId,
    brandName: q.brand?.name ?? null,
    advertiserId: q.advertiserId,
    advertiserName: q.advertiser?.name ?? null,
    campaignId: q.campaignId,
    campaignName: q.campaign?.name ?? null,
    productId: q.productId,
    productName: q.product?.name ?? null,
    batchId: q.batchId,
    batchCode: q.batch?.batchCode ?? null,
    destinationUrl: q.destinationUrl,
    label: q.label,
    scanCount: q.scanCount,
    createdAt: q.createdAt.toISOString(),
  };
}

export async function getQRCodesPageData(user: ScopedUser): Promise<AdminQRCodesPageData> {
  const qrFilter: Prisma.QRCodeWhereInput = {};
  let assignedCampaignIds: string[] = [];

  if (user.role === "CAMPAIGN_MANAGER") {
    assignedCampaignIds = await getAssignedCampaignIds(user.id);
    if (assignedCampaignIds.length === 0) {
      return {
        qrCodes: [],
        brands: [],
        advertisers: [],
        campaigns: [],
        products: [],
        batches: [],
        totalQRCodes: 0,
        activeQRCodes: 0,
        consumerCampaignQRCodes: 0,
        deliveryQRCodes: 0,
        sampleLabelQRCodes: 0,
        internalTestQRCodes: 0,
      };
    }
    qrFilter.campaignId = { in: assignedCampaignIds };
  } else if (user.role === "BRAND_ADMIN") {
    qrFilter.brandId = user.brandId ?? "__NONE__";
  } else if (user.role === "ADVERTISER_VIEWER") {
    qrFilter.advertiserId = user.advertiserId ?? "__NONE__";
  }

  const brandFilter: Prisma.BrandWhereInput = { status: "ACTIVE" };
  if (user.role === "BRAND_ADMIN") {
    brandFilter.id = user.brandId ?? "__NONE__";
  }

  const advertiserFilter: Prisma.AdvertiserWhereInput = { status: "ACTIVE" };
  if (user.role === "ADVERTISER_VIEWER") {
    advertiserFilter.id = user.advertiserId ?? "__NONE__";
  }

  const campaignFilter: Prisma.CampaignWhereInput = { status: { in: ["ACTIVE", "DRAFT", "PAUSED"] } };
  if (user.role === "BRAND_ADMIN") {
    campaignFilter.brandId = user.brandId ?? "__NONE__";
  } else if (user.role === "CAMPAIGN_MANAGER") {
    campaignFilter.id = { in: assignedCampaignIds };
  } else if (user.role === "ADVERTISER_VIEWER") {
    campaignFilter.advertiserId = user.advertiserId ?? "__NONE__";
  }

  const productFilter: Prisma.ProductWhereInput = { status: "ACTIVE" };
  if (user.role === "BRAND_ADMIN") {
    productFilter.brandId = user.brandId ?? "__NONE__";
  }

  const batchFilter: Prisma.BatchWhereInput = { status: { in: ["CREATED", "ACTIVE", "DELIVERING", "DELIVERED"] } };
  if (user.role === "BRAND_ADMIN") {
    batchFilter.brandId = user.brandId ?? "__NONE__";
  } else if (user.role === "CAMPAIGN_MANAGER") {
    batchFilter.campaignId = { in: assignedCampaignIds };
  } else if (user.role === "ADVERTISER_VIEWER") {
    batchFilter.campaign = { advertiserId: user.advertiserId ?? "__NONE__" };
  }

  const [
    qrCodes,
    brands,
    advertisers,
    campaigns,
    products,
    batches,
    totalQRCodes,
    activeQRCodes,
    consumerCampaignQRCodes,
    deliveryQRCodes,
    sampleLabelQRCodes,
    internalTestQRCodes,
  ] = await Promise.all([
    prisma.qRCode.findMany({
      where: qrFilter,
      include: qrInclude,
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
    prisma.campaign.findMany({
      where: campaignFilter,
      select: {
        id: true,
        name: true,
        brandId: true,
        advertiserId: true,
        productId: true,
        advertiser: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: productFilter,
      select: { id: true, name: true, brandId: true },
      orderBy: { name: "asc" },
    }),
    prisma.batch.findMany({
      where: batchFilter,
      select: {
        id: true,
        batchCode: true,
        campaignId: true,
        brandId: true,
        productId: true,
        campaign: { select: { name: true } },
      },
      orderBy: { batchCode: "asc" },
    }),
    prisma.qRCode.count({ where: qrFilter }),
    prisma.qRCode.count({ where: { ...qrFilter, status: "ACTIVE" } }),
    prisma.qRCode.count({ where: { ...qrFilter, type: "CONSUMER_CAMPAIGN" } }),
    prisma.qRCode.count({ where: { ...qrFilter, type: "BATCH_DELIVERY" } }),
    prisma.qRCode.count({ where: { ...qrFilter, type: "SAMPLE_LABEL" } }),
    prisma.qRCode.count({ where: { ...qrFilter, type: "INTERNAL_TEST" } }),
  ]);

  return {
    qrCodes: qrCodes.map(toQRCodeRow),
    brands,
    advertisers,
    campaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      brandId: c.brandId,
      advertiserId: c.advertiserId,
      productId: c.productId,
      advertiser: c.advertiser,
    })),
    products,
    batches: batches.map((b) => ({
      id: b.id,
      batchCode: b.batchCode,
      campaignId: b.campaignId,
      brandId: b.brandId,
      productId: b.productId,
      campaign: b.campaign,
    })),
    totalQRCodes,
    activeQRCodes,
    consumerCampaignQRCodes,
    deliveryQRCodes,
    sampleLabelQRCodes,
    internalTestQRCodes,
  };
}

export async function createQRCode(
  input: QRCodeFormValues,
  user: ScopedUser
): Promise<ServiceResult<QRCodeRow>> {
  const parsed = qrCodeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const {
    type,
    status,
    label,
  } = parsed.data;
  let {
    code,
    brandId,
    advertiserId,
    campaignId,
    productId,
    batchId,
    destinationUrl,
  } = parsed.data;

  // Auto-generate code if empty
  if (!code) {
    let generated = true;
    let attempts = 0;
    while (generated && attempts < 10) {
      const candidate = generateQrCodePublicCode();
      const existingCode = await prisma.qRCode.findUnique({
        where: { code: candidate },
        select: { id: true },
      });
      if (!existingCode) {
        code = candidate;
        generated = false;
      }
      attempts++;
    }
    if (!code) {
      return { ok: false, error: "Failed to generate a unique QR code" };
    }
  } else {
    // Check duplicate code
    const existing = await prisma.qRCode.findUnique({
      where: { code },
      select: { id: true },
    });
    if (existing) {
      return { ok: false, error: `QR Code "${code}" is already registered` };
    }
  }

  // Strict derivations and validations based on QR Type
  if (type === "BATCH_DELIVERY") {
    if (!batchId) return { ok: false, error: "Batch is required for Batch Delivery QR codes" };
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: { brandId: true, campaignId: true, productId: true, campaign: { select: { advertiserId: true } } },
    });
    if (!batch) return { ok: false, error: "Selected batch does not exist" };
    if (brandId && brandId !== batch.brandId) return { ok: false, error: "Provided brand does not match the batch's brand" };
    if (campaignId && campaignId !== batch.campaignId) return { ok: false, error: "Provided campaign does not match the batch's campaign" };
    if (productId && productId !== batch.productId) return { ok: false, error: "Provided product does not match the batch's product" };
    if (advertiserId && advertiserId !== batch.campaign.advertiserId) return { ok: false, error: "Provided advertiser does not match the batch's advertiser" };
    brandId = batch.brandId;
    campaignId = batch.campaignId;
    productId = batch.productId;
    advertiserId = batch.campaign.advertiserId;
  } else if (type === "CONSUMER_CAMPAIGN" || type === "INTERNAL_TEST") {
    if (!campaignId) return { ok: false, error: "Campaign is required" };
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { brandId: true, advertiserId: true, productId: true },
    });
    if (!campaign) return { ok: false, error: "Selected campaign does not exist" };
    if (brandId && brandId !== campaign.brandId) return { ok: false, error: "Provided brand does not match the campaign's brand" };
    if (advertiserId && advertiserId !== campaign.advertiserId) return { ok: false, error: "Provided advertiser does not match the campaign's advertiser" };
    if (productId && productId !== campaign.productId) return { ok: false, error: "Provided product does not match the campaign's product" };
    brandId = campaign.brandId;
    advertiserId = campaign.advertiserId;
    productId = campaign.productId;
    batchId = null;
  } else if (type === "SAMPLE_LABEL") {
    if (!productId) return { ok: false, error: "Product is required for Sample Labels" };
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { brandId: true },
    });
    if (!product) return { ok: false, error: "Selected product does not exist" };
    if (brandId && brandId !== product.brandId) return { ok: false, error: "Provided brand does not match the product's brand" };
    brandId = product.brandId;
    advertiserId = null;
    campaignId = null;
    batchId = null;
  }

  const scopeContext = await getQRMutationScopeContext(user);
  if (
    !canMutateQRTarget(
      user,
      { brandId, advertiserId, campaignId },
      scopeContext
    )
  ) {
    return qrMutationDenied(user);
  }

  if (!destinationUrl) {
    destinationUrl = buildQrDestinationUrl(code, type);
  }

  const qrCode = await prisma.qRCode.create({
    data: {
      code,
      type: type as QRCodeType,
      status: status as QRCodeStatus,
      brandId: brandId ?? null,
      advertiserId: advertiserId ?? null,
      campaignId: campaignId ?? null,
      productId: productId ?? null,
      batchId: batchId ?? null,
      label: label ?? null,
      destinationUrl,
      createdById: user.id,
      scanCount: 0,
    },
    include: qrInclude,
  });

  return { ok: true, data: toQRCodeRow(qrCode) };
}

export async function updateQRCode(
  id: string,
  input: QRCodeFormValues,
  user: ScopedUser
): Promise<ServiceResult<QRCodeRow>> {
  const parsed = qrCodeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const {
    type,
    status,
    label,
  } = parsed.data;
  let {
    code,
    brandId,
    advertiserId,
    campaignId,
    productId,
    batchId,
    destinationUrl,
  } = parsed.data;

  const existing = await prisma.qRCode.findUnique({
    where: { id },
  });
  if (!existing) {
    return { ok: false, error: "QR Code not found" };
  }

  const scopeContext = await getQRMutationScopeContext(user);
  if (
    !canMutateQRTarget(
      user,
      {
        brandId: existing.brandId,
        advertiserId: existing.advertiserId,
        campaignId: existing.campaignId,
      },
      scopeContext
    )
  ) {
    return qrMutationDenied(user);
  }

  // Verify code uniqueness
  if (code) {
    const codeConflict = await prisma.qRCode.findFirst({
      where: { code, NOT: { id } },
      select: { id: true },
    });
    if (codeConflict) {
      return { ok: false, error: `QR Code "${code}" is already registered` };
    }
  } else {
    code = existing.code;
  }

  // Strict derivations and validations based on QR Type
  if (type === "BATCH_DELIVERY") {
    if (!batchId) return { ok: false, error: "Batch is required for Batch Delivery QR codes" };
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: { brandId: true, campaignId: true, productId: true, campaign: { select: { advertiserId: true } } },
    });
    if (!batch) return { ok: false, error: "Selected batch does not exist" };
    if (brandId && brandId !== batch.brandId) return { ok: false, error: "Provided brand does not match the batch's brand" };
    if (campaignId && campaignId !== batch.campaignId) return { ok: false, error: "Provided campaign does not match the batch's campaign" };
    if (productId && productId !== batch.productId) return { ok: false, error: "Provided product does not match the batch's product" };
    if (advertiserId && advertiserId !== batch.campaign.advertiserId) return { ok: false, error: "Provided advertiser does not match the batch's advertiser" };
    brandId = batch.brandId;
    campaignId = batch.campaignId;
    productId = batch.productId;
    advertiserId = batch.campaign.advertiserId;
  } else if (type === "CONSUMER_CAMPAIGN" || type === "INTERNAL_TEST") {
    if (!campaignId) return { ok: false, error: "Campaign is required" };
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { brandId: true, advertiserId: true, productId: true },
    });
    if (!campaign) return { ok: false, error: "Selected campaign does not exist" };
    if (brandId && brandId !== campaign.brandId) return { ok: false, error: "Provided brand does not match the campaign's brand" };
    if (advertiserId && advertiserId !== campaign.advertiserId) return { ok: false, error: "Provided advertiser does not match the campaign's advertiser" };
    if (productId && productId !== campaign.productId) return { ok: false, error: "Provided product does not match the campaign's product" };
    brandId = campaign.brandId;
    advertiserId = campaign.advertiserId;
    productId = campaign.productId;
    batchId = null;
  } else if (type === "SAMPLE_LABEL") {
    if (!productId) return { ok: false, error: "Product is required for Sample Labels" };
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { brandId: true },
    });
    if (!product) return { ok: false, error: "Selected product does not exist" };
    if (brandId && brandId !== product.brandId) return { ok: false, error: "Provided brand does not match the product's brand" };
    brandId = product.brandId;
    advertiserId = null;
    campaignId = null;
    batchId = null;
  }

  if (
    !canMutateQRTarget(
      user,
      { brandId, advertiserId, campaignId },
      scopeContext
    )
  ) {
    return qrMutationDenied(user);
  }

  // Re-generate destination URL if empty
  if (!destinationUrl && (existing.code !== code || existing.type !== type)) {
    destinationUrl = buildQrDestinationUrl(code, type);
  } else if (!destinationUrl) {
    destinationUrl = existing.destinationUrl;
  }

  const updated = await prisma.qRCode.update({
    where: { id },
    data: {
      code,
      type: type as QRCodeType,
      status: status as QRCodeStatus,
      brandId: brandId ?? null,
      advertiserId: advertiserId ?? null,
      campaignId: campaignId ?? null,
      productId: productId ?? null,
      batchId: batchId ?? null,
      label: label ?? null,
      destinationUrl,
    },
    include: qrInclude,
  });

  return { ok: true, data: toQRCodeRow(updated) };
}

export async function disableQRCode(id: string, user: ScopedUser): Promise<ServiceResult> {
  const existing = await prisma.qRCode.findUnique({
    where: { id },
    select: { id: true, brandId: true, advertiserId: true, campaignId: true },
  });
  if (!existing) {
    return { ok: false, error: "QR Code not found" };
  }

  if (user.role !== "ADMIN") {
    if (user.role === "BRAND_ADMIN" && existing.brandId !== user.brandId) return { ok: false, error: "Unauthorized" };
    if (user.role === "ADVERTISER_VIEWER" && existing.advertiserId !== user.advertiserId) return { ok: false, error: "Unauthorized" };
    if (user.role === "CAMPAIGN_MANAGER") {
      const assignedCampaignIds = await getAssignedCampaignIds(user.id);
      if (!existing.campaignId || !assignedCampaignIds.includes(existing.campaignId)) {
        return { ok: false, error: "QR Code not found" };
      }
    }
  }

  await prisma.qRCode.update({
    where: { id },
    data: { status: "DISABLED" },
  });
  return { ok: true, data: undefined };
}

export async function generateQRCodeDownloadData(
  id: string,
  format: "png" | "svg" | "dataUrl",
  user: ScopedUser
): Promise<ServiceResult<{ code: string; content: string | Buffer }>> {
  const qr = await prisma.qRCode.findUnique({
    where: { id },
    select: {
      code: true,
      destinationUrl: true,
      brandId: true,
      advertiserId: true,
      campaignId: true,
    },
  });
  if (!qr) {
    return { ok: false, error: "QR Code not found" };
  }

  let authorized = user.role === "ADMIN";

  if (user.role === "BRAND_ADMIN") {
    authorized = Boolean(user.brandId && qr.brandId === user.brandId);
  } else if (user.role === "ADVERTISER_VIEWER") {
    authorized = Boolean(
      user.advertiserId && qr.advertiserId === user.advertiserId
    );
  } else if (user.role === "CAMPAIGN_MANAGER" && qr.campaignId) {
    const assignedCampaignIds = await getAssignedCampaignIds(user.id);
    authorized = assignedCampaignIds.includes(qr.campaignId);
  }

  if (!authorized) {
    return { ok: false, error: "Unauthorized" };
  }

  const url = qr.destinationUrl;
  if (!url) {
    return { ok: false, error: "QR Code does not have a destination URL" };
  }

  try {
    let content: string | Buffer;
    if (format === "png") {
      content = await generateQrCodePngBuffer(url);
    } else if (format === "svg") {
      content = await generateQrCodeSvg(url);
    } else {
      content = await generateQrCodeDataUrl(url);
    }
    return { ok: true, data: { code: qr.code, content } };
  } catch {
    return { ok: false, error: "Failed to generate QR Code image" };
  }
}
