// src/server/services/delivery-scan.service.ts
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { deliveryScanSchema } from "@/lib/validators/delivery-scan.validator";
import type { DeliveryScanFormValues } from "@/lib/validators/delivery-scan.validator";
import type { CurrentUser } from "@/lib/auth/get-current-user";
import { toDeliveryScanDTO, toRetailerDTO } from "@/lib/dtos/delivery.dto";


export type ServiceResult<T = unknown> =
  | { ok: true; status: string; data: T }
  | { ok: false; status: string; error: string };

type DeliveryQRCodePageData = {
  qrCode: {
    id: string;
    code: string;
    type: string;
    status: string;
    brandId: string | null;
    campaignId: string | null;
    productId: string | null;
    batchId: string | null;
    brand: { name: string } | null;
    campaign: { name: string; offerTitle: string } | null;
    product: { name: string } | null;
    batch: {
      id: string;
      batchCode: string;
      unitsPerCarton: number | null;
    } | null;
  };
};

type CreatedDeliveryScanData = {
  id: string;
};

export async function getDeliveryQRCodePageData(
  code: string,
  user: CurrentUser
): Promise<ServiceResult<DeliveryQRCodePageData>> {
  const qrCode = await prisma.qRCode.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      type: true,
      status: true,
      brandId: true,
      campaignId: true,
      productId: true,
      batchId: true,
      brand: { select: { name: true } },
      campaign: { select: { name: true, offerTitle: true } },
      product: { select: { name: true } },
      batch: {
        select: {
          id: true,
          batchCode: true,
          unitsPerCarton: true,
        },
      },
    },
  });

  if (!qrCode) {
    return {
      ok: false,
      status: "NOT_FOUND",
      error: "Delivery QR not found",
    };
  }

  if (qrCode.type !== "BATCH_DELIVERY") {
    return {
      ok: false,
      status: "WRONG_TYPE",
      error: "This QR code is not a delivery QR",
    };
  }

  if (qrCode.status !== "ACTIVE") {
    return {
      ok: false,
      status: "INACTIVE",
      error: "This delivery QR is not active",
    };
  }

  if (!qrCode.batch) {
    return {
      ok: false,
      status: "MISSING_BATCH",
      error: "This QR code is missing batch configuration",
    };
  }

  if (!qrCode.batch.unitsPerCarton || qrCode.batch.unitsPerCarton <= 0) {
    return {
      ok: false,
      status: "MISSING_CARTON_CONFIG",
      error: "This batch is missing carton configuration",
    };
  }

  // If user role is RETAIL_OPERATIONS, verify brandId matches
  if (
    user.role === "RETAIL_OPERATIONS" &&
    (!user.brandId || qrCode.brandId !== user.brandId)
  ) {
    return {
      ok: false,
      status: "UNAUTHORIZED",
      error: "You are not authorized to access this brand's QR codes",
    };
  }

  return {
    ok: true,
    status: "VALID",
    data: { qrCode },
  };
}

export async function createDeliveryScan(
  input: DeliveryScanFormValues,
  user: CurrentUser
): Promise<ServiceResult<CreatedDeliveryScanData>> {
  const parsed = deliveryScanSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      status: "INVALID_INPUT",
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const data = parsed.data;
  const scannedByUserId = user.id;

  // Load QRCode and Batch
  const qrCode = await prisma.qRCode.findUnique({
    where: { id: data.qrCodeId },
    include: { batch: true },
  });

  if (!qrCode) {
    return {
      ok: false,
      status: "QR_NOT_FOUND",
      error: "QR Code not found",
    };
  }

  if (qrCode.type !== "BATCH_DELIVERY") {
    return {
      ok: false,
      status: "WRONG_TYPE",
      error: "This QR code is not a delivery QR",
    };
  }

  // Enforce brand ownership: a RETAIL_OPERATIONS user may only log scans for
  // their own brand's delivery QR codes. ADMIN bypasses (mirrors page-load guard).
  if (
    user.role === "RETAIL_OPERATIONS" &&
    (!user.brandId || qrCode.brandId !== user.brandId)
  ) {
    return {
      ok: false,
      status: "UNAUTHORIZED",
      error: "You are not authorized to log deliveries for this brand's QR codes.",
    };
  }

  if (qrCode.status !== "ACTIVE") {
    return {
      ok: false,
      status: "INACTIVE",
      error: "This delivery QR is not active",
    };
  }

  if (!qrCode.batch) {
    return {
      ok: false,
      status: "MISSING_BATCH",
      error: "This QR code is missing batch configuration",
    };
  }

  const batch = qrCode.batch;
  const unitsPerCarton = batch.unitsPerCarton;

  if (data.batchId !== qrCode.batchId) {
    return {
      ok: false,
      status: "BATCH_MISMATCH",
      error: "The submitted batch does not match this delivery QR code.",
    };
  }

  if (!unitsPerCarton || unitsPerCarton <= 0) {
    return {
      ok: false,
      status: "MISSING_CARTON_CONFIG",
      error: "This batch is missing carton configuration",
    };
  }

  if (data.cartonsDelivered > 100000) {
    return {
      ok: false,
      status: "INVALID_INPUT",
      error: "Cartons delivered looks too large",
    };
  }

  const estimatedUnitsDelivered = data.cartonsDelivered * unitsPerCarton;

  try {
    const result = await prisma.$transaction(async (tx) => {
      let retailerId = data.retailerId;

      if (retailerId) {
        const retailer = await tx.retailer.findUnique({
          where: { id: retailerId },
          select: { brandId: true },
        });

        if (!retailer || retailer.brandId !== qrCode.brandId) {
          throw new Error("RETAILER_SCOPE_MISMATCH");
        }
      } else {
        // Create new Retailer
        const newRetailer = await tx.retailer.create({
          data: {
            brandId: qrCode.brandId,
            name: data.retailerName!,
            type: data.retailerType ?? null,
            country: data.country ?? null,
            region: data.region ?? null,
            city: data.city ?? null,
            suburb: data.suburb ?? null,
            address: data.address ?? null,
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
          },
        });
        retailerId = newRetailer.id;
      }

      // Create DeliveryScan record
      const deliveryScan = await tx.deliveryScan.create({
        data: {
          qrCodeId: data.qrCodeId,
          brandId: qrCode.brandId,
          campaignId: qrCode.campaignId,
          batchId: qrCode.batchId,
          retailerId,
          scannedByUserId,
          cartonsDelivered: data.cartonsDelivered,
          unitsPerCarton,
          estimatedUnitsDelivered,
          country: data.country ?? null,
          region: data.region ?? null,
          city: data.city ?? null,
          suburb: data.suburb ?? null,
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          locationSource: data.locationSource ?? "MANUAL",
          notes: data.notes ?? null,
        },
      });

      // Increment QRCode scan count
      await tx.qRCode.update({
        where: { id: qrCode.id },
        data: { scanCount: { increment: 1 } },
      });

      return deliveryScan;
    });

    return {
      ok: true,
      status: "CREATED",
      data: result,
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "RETAILER_SCOPE_MISMATCH") {
      return {
        ok: false,
        status: "UNAUTHORIZED_RETAILER",
        error: "The selected retailer is not available for this brand.",
      };
    }
    console.error("Error creating delivery scan:", error);
    return {
      ok: false,
      status: "DB_ERROR",
      error: "Failed to record the delivery scan.",
    };
  }
}

export async function getRetailOperationsDashboardData(user: CurrentUser) {
  if (user.role === "RETAIL_OPERATIONS" && !user.brandId) {
    return {
      totalDeliveryScans: 0,
      totalCartonsDelivered: 0,
      totalEstimatedUnitsDelivered: 0,
      recentDeliveryScans: [],
    };
  }

  const brandFilter = user.role === "RETAIL_OPERATIONS" ? { brandId: user.brandId! } : {};

  const [
    totalDeliveryScans,
    cartonsAggregate,
    unitsAggregate,
    recentDeliveryScans,
  ] = await Promise.all([
    prisma.deliveryScan.count({
      where: brandFilter,
    }),
    prisma.deliveryScan.aggregate({
      _sum: { cartonsDelivered: true },
      where: brandFilter,
    }),
    prisma.deliveryScan.aggregate({
      _sum: { estimatedUnitsDelivered: true },
      where: brandFilter,
    }),
    prisma.deliveryScan.findMany({
      where: brandFilter,
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        retailer: true,
        campaign: true,
        batch: true,
        brand: true,
        qrCode: {
          include: {
            product: true,
          },
        },
      },
    }),
  ]);

  return {
    totalDeliveryScans,
    totalCartonsDelivered: cartonsAggregate._sum.cartonsDelivered ?? 0,
    totalEstimatedUnitsDelivered: unitsAggregate._sum.estimatedUnitsDelivered ?? 0,
    recentDeliveryScans,
  };
}

/** Maximum rows returned by delivery list queries. Aggregation / KPI queries are unaffected. */
export const DELIVERY_LIST_LIMIT = 500;

export type DeliveryFilterParams = {
  brandId?: string;
  advertiserId?: string;
  campaignId?: string;
  productId?: string;
  batchId?: string;
  retailerId?: string;
  startDate?: string;
  endDate?: string;
  country?: string;
  region?: string;
  city?: string;
};

export async function getAdminDeliveryPageData(user: CurrentUser, filters: DeliveryFilterParams = {}) {
  if (user.role !== "ADMIN") {
    throw new Error("Unauthorized access to admin delivery logs.");
  }

  let startDate: Date;
  let endDate: Date;

  if (filters.startDate || filters.endDate) {
    if (!filters.startDate || !filters.endDate) {
      return {
        deliveryScans: [],
        retailers: [],
        totalDeliveryScans: 0,
        totalCartonsDelivered: 0,
        totalEstimatedUnitsDelivered: 0,
        error: "Both Start Date and End Date are required when filtering by a date range.",
      };
    }

    const startVal = new Date(filters.startDate);
    const endVal = new Date(filters.endDate);

    if (isNaN(startVal.getTime())) {
      return {
        deliveryScans: [],
        retailers: [],
        totalDeliveryScans: 0,
        totalCartonsDelivered: 0,
        totalEstimatedUnitsDelivered: 0,
        error: "Start Date is not a valid date.",
      };
    }

    if (isNaN(endVal.getTime())) {
      return {
        deliveryScans: [],
        retailers: [],
        totalDeliveryScans: 0,
        totalCartonsDelivered: 0,
        totalEstimatedUnitsDelivered: 0,
        error: "End Date is not a valid date.",
      };
    }

    if (startVal > endVal) {
      return {
        deliveryScans: [],
        retailers: [],
        totalDeliveryScans: 0,
        totalCartonsDelivered: 0,
        totalEstimatedUnitsDelivered: 0,
        error: "End Date cannot be before Start Date.",
      };
    }

    startDate = startVal;
    endDate = endVal;
  } else {
    // 90 days default
    endDate = new Date();
    startDate = new Date();
    startDate.setDate(endDate.getDate() - 90);
  }

  endDate.setHours(23, 59, 59, 999);

  const where: Prisma.DeliveryScanWhereInput = {};

  if (filters.brandId) {
    where.brandId = filters.brandId;
  }

  const campaignWhere: Prisma.CampaignWhereInput = {};
  let hasCampaignWhere = false;

  if (filters.advertiserId) {
    campaignWhere.advertiserId = filters.advertiserId;
    hasCampaignWhere = true;
  }

  if (filters.campaignId) {
    campaignWhere.id = filters.campaignId;
    hasCampaignWhere = true;
  }

  if (hasCampaignWhere) {
    where.campaign = campaignWhere;
  }

  if (filters.productId) {
    where.qrCode = { productId: filters.productId };
  }

  if (filters.batchId) {
    where.batchId = filters.batchId;
  }

  if (filters.retailerId) {
    where.retailerId = filters.retailerId;
  }

  if (filters.country) {
    where.country = { equals: filters.country, mode: "insensitive" };
  }

  if (filters.region) {
    where.region = { equals: filters.region, mode: "insensitive" };
  }

  if (filters.city) {
    where.city = { equals: filters.city, mode: "insensitive" };
  }

  where.createdAt = { gte: startDate, lte: endDate };

  const [
    scansRaw,
    retailers,
    totalDeliveryScans,
    cartonsAggregate,
    unitsAggregate,
  ] = await Promise.all([
    prisma.deliveryScan.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: DELIVERY_LIST_LIMIT + 1,
      include: {
        retailer: true,
        campaign: true,
        batch: true,
        brand: true,
        qrCode: {
          include: {
            product: true,
          },
        },
      },
    }),
    prisma.retailer.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.deliveryScan.count({
      where,
    }),
    prisma.deliveryScan.aggregate({
      _sum: { cartonsDelivered: true },
      where,
    }),
    prisma.deliveryScan.aggregate({
      _sum: { estimatedUnitsDelivered: true },
      where,
    }),
  ]);

  const isTruncated = scansRaw.length > DELIVERY_LIST_LIMIT;
  const deliveryScans = scansRaw.slice(0, DELIVERY_LIST_LIMIT).map(toDeliveryScanDTO);

  return {
    deliveryScans,
    retailers: retailers.map(toRetailerDTO),
    totalDeliveryScans,
    totalCartonsDelivered: cartonsAggregate._sum.cartonsDelivered ?? 0,
    totalEstimatedUnitsDelivered: unitsAggregate._sum.estimatedUnitsDelivered ?? 0,
    isTruncated,
    returnedCount: deliveryScans.length,
  };
}

export async function getBrandDeliveryPageData(user: CurrentUser, filters: DeliveryFilterParams = {}) {
  if (user.role !== "BRAND_ADMIN" || !user.brandId) {
    return {
      deliveryScans: [] as ReturnType<typeof toDeliveryScanDTO>[],
      retailers: [] as ReturnType<typeof toRetailerDTO>[],
      totalDeliveryScans: 0,
      totalCartonsDelivered: 0,
      totalEstimatedUnitsDelivered: 0,
      isTruncated: false,
      returnedCount: 0,
    };
  }

  let startDate: Date;
  let endDate: Date;

  if (filters.startDate || filters.endDate) {
    if (!filters.startDate || !filters.endDate) {
      return {
        deliveryScans: [] as ReturnType<typeof toDeliveryScanDTO>[],
        retailers: [] as ReturnType<typeof toRetailerDTO>[],
        totalDeliveryScans: 0,
        totalCartonsDelivered: 0,
        totalEstimatedUnitsDelivered: 0,
        isTruncated: false,
        returnedCount: 0,
        error: "Both Start Date and End Date are required when filtering by a date range.",
      };
    }
    const startVal = new Date(filters.startDate);
    const endVal = new Date(filters.endDate);
    if (isNaN(startVal.getTime()) || isNaN(endVal.getTime()) || startVal > endVal) {
      return {
        deliveryScans: [] as ReturnType<typeof toDeliveryScanDTO>[],
        retailers: [] as ReturnType<typeof toRetailerDTO>[],
        totalDeliveryScans: 0,
        totalCartonsDelivered: 0,
        totalEstimatedUnitsDelivered: 0,
        isTruncated: false,
        returnedCount: 0,
        error: "Invalid date range.",
      };
    }
    startDate = startVal;
    endDate = endVal;
  } else {
    endDate = new Date();
    startDate = new Date();
    startDate.setDate(endDate.getDate() - 90);
  }

  endDate.setHours(23, 59, 59, 999);

  // Always scope to the authenticated BRAND_ADMIN's brand — never accept brandId from URL
  const where: Prisma.DeliveryScanWhereInput = {
    brandId: user.brandId,
    createdAt: { gte: startDate, lte: endDate },
  };

  const campaignWhere: Prisma.CampaignWhereInput = {};
  let hasCampaignWhere = false;

  if (filters.campaignId) {
    campaignWhere.id = filters.campaignId;
    hasCampaignWhere = true;
  }

  if (filters.productId) {
    where.qrCode = { productId: filters.productId };
  }

  if (filters.batchId) {
    where.batchId = filters.batchId;
  }

  if (filters.retailerId) {
    where.retailerId = filters.retailerId;
  }

  if (filters.country) {
    where.country = filters.country;
  }

  if (filters.region) {
    where.region = filters.region;
  }

  if (filters.city) {
    where.city = filters.city;
  }

  if (hasCampaignWhere) {
    const matchingCampaigns = await prisma.campaign.findMany({
      where: { ...campaignWhere, brandId: user.brandId },
      select: { id: true },
    });
    const campaignIds = matchingCampaigns.map((c) => c.id);
    if (campaignIds.length === 0) {
      return {
        deliveryScans: [] as ReturnType<typeof toDeliveryScanDTO>[],
        retailers: [] as ReturnType<typeof toRetailerDTO>[],
        totalDeliveryScans: 0,
        totalCartonsDelivered: 0,
        totalEstimatedUnitsDelivered: 0,
        isTruncated: false,
        returnedCount: 0,
      };
    }
    where.campaignId = { in: campaignIds };
  }

  const [scansRaw, brandRetailers, totalDeliveryScans, cartonsAggregate, unitsAggregate] =
    await Promise.all([
      prisma.deliveryScan.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: DELIVERY_LIST_LIMIT + 1,
        include: {
          retailer: true,
          campaign: true,
          batch: true,
          brand: true,
          qrCode: { include: { product: true } },
        },
      }),
      prisma.retailer.findMany({
        where: { brandId: user.brandId },
        orderBy: { name: "asc" },
      }),
      prisma.deliveryScan.count({ where }),
      prisma.deliveryScan.aggregate({ _sum: { cartonsDelivered: true }, where }),
      prisma.deliveryScan.aggregate({ _sum: { estimatedUnitsDelivered: true }, where }),
    ]);

  const isTruncated = scansRaw.length > DELIVERY_LIST_LIMIT;
  const deliveryScans = scansRaw.slice(0, DELIVERY_LIST_LIMIT).map(toDeliveryScanDTO);

  return {
    deliveryScans,
    retailers: brandRetailers.map(toRetailerDTO),
    totalDeliveryScans,
    totalCartonsDelivered: cartonsAggregate._sum.cartonsDelivered ?? 0,
    totalEstimatedUnitsDelivered: unitsAggregate._sum.estimatedUnitsDelivered ?? 0,
    isTruncated,
    returnedCount: deliveryScans.length,
  };
}

export async function getRetailDeliveriesPageData(user: CurrentUser) {
  if (user.role === "RETAIL_OPERATIONS" && !user.brandId) {
    return {
      deliveryScans: [],
      retailers: [],
      totalDeliveryScans: 0,
      totalCartonsDelivered: 0,
      totalEstimatedUnitsDelivered: 0,
    };
  }

  const where: Prisma.DeliveryScanWhereInput = {};

  if (user.role === "RETAIL_OPERATIONS" && user.brandId) {
    where.brandId = user.brandId;
  }

  const [
    scansRaw,
    retailers,
    totalDeliveryScans,
    cartonsAggregate,
    unitsAggregate,
  ] = await Promise.all([
    prisma.deliveryScan.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: DELIVERY_LIST_LIMIT + 1,
      include: {
        retailer: true,
        campaign: true,
        batch: true,
        brand: true,
        qrCode: {
          include: {
            product: true,
          },
        },
      },
    }),
    user.role === "RETAIL_OPERATIONS"
      ? prisma.retailer.findMany({
          where: { brandId: user.brandId! },
          orderBy: { name: "asc" },
        })
      : prisma.retailer.findMany({
          orderBy: { name: "asc" },
        }),
    prisma.deliveryScan.count({
      where,
    }),
    prisma.deliveryScan.aggregate({
      _sum: { cartonsDelivered: true },
      where,
    }),
    prisma.deliveryScan.aggregate({
      _sum: { estimatedUnitsDelivered: true },
      where,
    }),
  ]);

  const isTruncated = scansRaw.length > DELIVERY_LIST_LIMIT;
  const deliveryScans = scansRaw.slice(0, DELIVERY_LIST_LIMIT);

  return {
    deliveryScans,
    retailers,
    totalDeliveryScans,
    totalCartonsDelivered: cartonsAggregate._sum.cartonsDelivered ?? 0,
    totalEstimatedUnitsDelivered: unitsAggregate._sum.estimatedUnitsDelivered ?? 0,
    isTruncated,
    returnedCount: deliveryScans.length,
  };
}
