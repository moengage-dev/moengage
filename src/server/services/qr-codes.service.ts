// src/server/services/qr-codes.service.ts
import prisma from "@/lib/prisma";
import { QRCodeType, QRCodeStatus } from "@prisma/client";
import { qrCodeSchema } from "@/lib/validators/qr-code.validator";
import type { QRCodeFormValues } from "@/lib/validators/qr-code.validator";
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
  const qrFilter: any = {};
  if (user.role === "BRAND_ADMIN") {
    qrFilter.brandId = user.brandId;
  } else if (user.role === "CAMPAIGN_MANAGER" || user.role === "ADVERTISER_VIEWER") {
    qrFilter.advertiserId = user.advertiserId;
  }

  const brandFilter: any = { status: "ACTIVE" };
  if (user.role === "BRAND_ADMIN") {
    brandFilter.id = user.brandId;
  }

  const advertiserFilter: any = { status: "ACTIVE" };
  if (user.role === "CAMPAIGN_MANAGER" || user.role === "ADVERTISER_VIEWER") {
    advertiserFilter.id = user.advertiserId;
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

  const batchFilter: any = { status: { in: ["CREATED", "ACTIVE", "DELIVERING", "DELIVERED"] } };
  if (user.role === "BRAND_ADMIN") {
    batchFilter.brandId = user.brandId;
  } else if (user.role === "CAMPAIGN_MANAGER" || user.role === "ADVERTISER_VIEWER") {
    batchFilter.campaign = { advertiserId: user.advertiserId };
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

  let {
    code,
    type,
    status,
    brandId,
    advertiserId,
    campaignId,
    productId,
    batchId,
    label,
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

  // Derive from Campaign
  if (campaignId) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { brandId: true, advertiserId: true, productId: true },
    });
    if (!campaign) {
      return { ok: false, error: "Selected campaign does not exist" };
    }
    if (!brandId) brandId = campaign.brandId;
    if (!advertiserId) advertiserId = campaign.advertiserId;
    if (!productId) productId = campaign.productId;
  }

  // Derive from Batch
  if (batchId) {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: { brandId: true, campaignId: true, productId: true },
    });
    if (!batch) {
      return { ok: false, error: "Selected batch does not exist" };
    }
    if (!brandId) brandId = batch.brandId;
    if (!campaignId) campaignId = batch.campaignId;
    if (!productId) productId = batch.productId;
  }

  // Tenant authorization
  if (user.role === "BRAND_ADMIN" && brandId !== user.brandId) {
    return { ok: false, error: "Unauthorized: Invalid brand mapping" };
  }
  if ((user.role === "CAMPAIGN_MANAGER" || user.role === "ADVERTISER_VIEWER") && advertiserId !== user.advertiserId) {
    return { ok: false, error: "Unauthorized: Invalid advertiser mapping" };
  }

  // Relationship consistency checks
  if (campaignId && brandId) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { brandId: true, advertiserId: true },
    });
    if (campaign?.brandId !== brandId) {
      return { ok: false, error: "The selected campaign does not belong to the selected brand" };
    }
    if (advertiserId && campaign?.advertiserId !== advertiserId) {
      return { ok: false, error: "The selected campaign advertiser does not match the selected advertiser" };
    }
  }

  if (batchId) {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: { brandId: true, campaignId: true },
    });
    if (batch?.brandId !== brandId) {
      return { ok: false, error: "The selected batch does not belong to the selected brand" };
    }
    if (campaignId && batch?.campaignId !== campaignId) {
      return { ok: false, error: "The selected batch does not belong to the selected campaign" };
    }
  }

  if (productId && brandId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { brandId: true },
    });
    if (product?.brandId !== brandId) {
      return { ok: false, error: "The selected product does not belong to the selected brand" };
    }
  }

  // Auto-generate destination URL if empty
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

  let {
    code,
    type,
    status,
    brandId,
    advertiserId,
    campaignId,
    productId,
    batchId,
    label,
    destinationUrl,
  } = parsed.data;

  const existing = await prisma.qRCode.findUnique({
    where: { id },
  });
  if (!existing) {
    return { ok: false, error: "QR Code not found" };
  }

  if (user.role !== "ADMIN") {
    if (user.role === "BRAND_ADMIN" && existing.brandId !== user.brandId) return { ok: false, error: "Unauthorized" };
    if ((user.role === "CAMPAIGN_MANAGER" || user.role === "ADVERTISER_VIEWER") && existing.advertiserId !== user.advertiserId) return { ok: false, error: "Unauthorized" };
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

  // Derive from Campaign
  if (campaignId) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { brandId: true, advertiserId: true, productId: true },
    });
    if (!campaign) {
      return { ok: false, error: "Selected campaign does not exist" };
    }
    if (!brandId) brandId = campaign.brandId;
    if (!advertiserId) advertiserId = campaign.advertiserId;
    if (!productId) productId = campaign.productId;
  }

  // Derive from Batch
  if (batchId) {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: { brandId: true, campaignId: true, productId: true },
    });
    if (!batch) {
      return { ok: false, error: "Selected batch does not exist" };
    }
    if (!brandId) brandId = batch.brandId;
    if (!campaignId) campaignId = batch.campaignId;
    if (!productId) productId = batch.productId;
  }

  if (user.role !== "ADMIN") {
    if (user.role === "BRAND_ADMIN" && brandId !== user.brandId) return { ok: false, error: "Unauthorized: Invalid brand mapping" };
    if ((user.role === "CAMPAIGN_MANAGER" || user.role === "ADVERTISER_VIEWER") && advertiserId !== user.advertiserId) return { ok: false, error: "Unauthorized: Invalid advertiser mapping" };
  }

  // Relationship consistency checks
  if (campaignId && brandId) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { brandId: true, advertiserId: true },
    });
    if (campaign?.brandId !== brandId) {
      return { ok: false, error: "The selected campaign does not belong to the selected brand" };
    }
    if (advertiserId && campaign?.advertiserId !== advertiserId) {
      return { ok: false, error: "The selected campaign advertiser does not match the selected advertiser" };
    }
  }

  if (batchId) {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: { brandId: true, campaignId: true },
    });
    if (batch?.brandId !== brandId) {
      return { ok: false, error: "The selected batch does not belong to the selected brand" };
    }
    if (campaignId && batch?.campaignId !== campaignId) {
      return { ok: false, error: "The selected batch does not belong to the selected campaign" };
    }
  }

  if (productId && brandId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { brandId: true },
    });
    if (product?.brandId !== brandId) {
      return { ok: false, error: "The selected product does not belong to the selected brand" };
    }
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
    select: { id: true, brandId: true, advertiserId: true },
  });
  if (!existing) {
    return { ok: false, error: "QR Code not found" };
  }

  if (user.role !== "ADMIN") {
    if (user.role === "BRAND_ADMIN" && existing.brandId !== user.brandId) return { ok: false, error: "Unauthorized" };
    if ((user.role === "CAMPAIGN_MANAGER" || user.role === "ADVERTISER_VIEWER") && existing.advertiserId !== user.advertiserId) return { ok: false, error: "Unauthorized" };
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
    const assignment = await prisma.campaignAssignment.findUnique({
      where: {
        campaignId_userId: {
          campaignId: qr.campaignId,
          userId: user.id,
        },
      },
      select: { id: true },
    });
    authorized = Boolean(assignment);
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
  } catch (e) {
    return { ok: false, error: "Failed to generate QR Code image" };
  }
}
