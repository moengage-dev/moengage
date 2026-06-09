// src/server/services/delivery-scan.service.ts
import prisma from "@/lib/prisma";
import { deliveryScanSchema } from "@/lib/validators/delivery-scan.validator";
import type { DeliveryScanFormValues } from "@/lib/validators/delivery-scan.validator";
import type { CurrentUser } from "@/lib/auth/get-current-user";

export type ServiceResult<T = any> =
  | { ok: true; status: string; data: T }
  | { ok: false; status: string; error: string };

export async function getDeliveryQRCodePageData(
  code: string,
  user: CurrentUser
): Promise<ServiceResult> {
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
): Promise<ServiceResult> {
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
          locationSource: "MANUAL",
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
  } catch (error: any) {
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
  const brandFilter =
    user.role === "RETAIL_OPERATIONS"
      ? user.brandId
        ? { brandId: user.brandId }
        : { id: "__no_retail_scope__" }
      : {};

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

export async function getRetailDeliveriesPageData(user: CurrentUser) {
  const brandFilter =
    user.role === "RETAIL_OPERATIONS"
      ? user.brandId
        ? { brandId: user.brandId }
        : { id: "__no_retail_scope__" }
      : {};

  const [
    deliveryScans,
    retailers,
    totalDeliveryScans,
    cartonsAggregate,
    unitsAggregate,
  ] = await Promise.all([
    prisma.deliveryScan.findMany({
      where: brandFilter,
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
    user.role === "RETAIL_OPERATIONS"
      ? user.brandId
        ? prisma.retailer.findMany({
            where: { brandId: user.brandId },
            orderBy: { name: "asc" },
          })
        : Promise.resolve([])
      : prisma.retailer.findMany({
          orderBy: { name: "asc" },
        }),
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
  ]);

  return {
    deliveryScans,
    retailers,
    totalDeliveryScans,
    totalCartonsDelivered: cartonsAggregate._sum.cartonsDelivered ?? 0,
    totalEstimatedUnitsDelivered: unitsAggregate._sum.estimatedUnitsDelivered ?? 0,
  };
}
