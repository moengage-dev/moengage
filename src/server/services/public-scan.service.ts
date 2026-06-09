// src/server/services/public-scan.service.ts
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { getOrCreateAnonymousVisitorId } from "@/lib/scans/anonymous-visitor";
import { parseUserAgent } from "@/lib/scans/device-parser";
import { getApproximateLocationFromHeaders } from "@/lib/scans/ip-location";
import { classifyConsumerScan } from "./scan-classification.service";
import { aggregateScanEvent } from "./scan-event-aggregation.service";

export async function getConsumerQRCodeByCode(code: string) {
  const qrCode = await prisma.qRCode.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      type: true,
      status: true,
      label: true,
      brandId: true,
      advertiserId: true,
      campaignId: true,
      productId: true,
      batchId: true,
      brand: { select: { name: true } },
      advertiser: { select: { name: true } },
      product: { select: { name: true } },
      campaign: {
        select: {
          id: true,
          name: true,
          offerTitle: true,
          offerDescription: true,
          rewardType: true,
          status: true,
          startDate: true,
          endDate: true,
        },
      },
    },
  });

  if (!qrCode) {
    return { status: "NOT_FOUND" as const, qrCode: null };
  }

  if (qrCode.type === "BATCH_DELIVERY") {
    return { status: "BATCH_DELIVERY" as const, qrCode };
  }

  if (qrCode.status !== "ACTIVE") {
    return { status: "INACTIVE" as const, qrCode };
  }

  // Valid consumer types are CONSUMER_CAMPAIGN, SAMPLE_LABEL, INTERNAL_TEST
  if (!["CONSUMER_CAMPAIGN", "SAMPLE_LABEL", "INTERNAL_TEST"].includes(qrCode.type)) {
    return { status: "WRONG_TYPE" as const, qrCode };
  }

  if (qrCode.type !== "INTERNAL_TEST") {
    const now = new Date();
    if (
      !qrCode.campaign ||
      qrCode.campaign.status !== "ACTIVE" ||
      (qrCode.campaign.startDate && qrCode.campaign.startDate > now) ||
      (qrCode.campaign.endDate && qrCode.campaign.endDate < now)
    ) {
      return { status: "INACTIVE" as const, qrCode };
    }
  }

  return { status: "VALID" as const, qrCode };
}

export async function logConsumerScan(qrCode: {
  id: string;
  brandId: string | null;
  advertiserId: string | null;
  campaignId: string | null;
  productId: string | null;
  batchId: string | null;
  type: string;
  status: string;
}) {
  const anonymousVisitorId = await getOrCreateAnonymousVisitorId();
  let requestHeaders;
  try {
    requestHeaders = await headers();
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
    // Non-request test calls get no inferred identity or geography.
    requestHeaders = new Headers();
  }
  const userAgent = requestHeaders.get("user-agent") || null;

  // Parse location and device metadata
  const location = getApproximateLocationFromHeaders(requestHeaders);
  const device = parseUserAgent(userAgent);

  // Extract raw client IP from request headers for classification
  let ipAddress: string | null = null;
  const xForwardedFor = requestHeaders.get("x-forwarded-for");
  if (xForwardedFor) {
    ipAddress = xForwardedFor.split(",")[0].trim();
  }
  if (!ipAddress) {
    ipAddress = requestHeaders.get("x-real-ip");
  }
  if (!ipAddress) {
    ipAddress = requestHeaders.get("cf-connecting-ip");
  }

  // Classify consumer scan
  const classification = await classifyConsumerScan({
    campaignId: qrCode.campaignId,
    qrCodeId: qrCode.id,
    qrCodeType: qrCode.type,
    visitorId: anonymousVisitorId,
    ipAddress,
    userAgent,
    now: new Date(),
  });

  const isInternalTest = qrCode.type === "INTERNAL_TEST";

  // Keep the aggregate event and denormalized QR total consistent.
  const scanResult = await prisma.$transaction(async (tx) => {
    const result = await aggregateScanEvent(
      {
        qrCodeId: qrCode.id,
        brandId: qrCode.brandId,
        advertiserId: qrCode.advertiserId,
        campaignId: qrCode.campaignId,
        productId: qrCode.productId,
        batchId: qrCode.batchId,
        anonymousVisitorId,
        sessionId: null,
        ipHash: location.ipHash,
        userAgent,
        deviceType: device.deviceType,
        os: device.os,
        browser: device.browser,
        country: location.country,
        region: location.region,
        city: location.city,
        suburb: location.suburb,
        latitude: location.latitude,
        longitude: location.longitude,
        locationSource: location.locationSource,
        isRepeatScan: classification.isRepeatScan,
        isSuspicious: classification.isSuspicious,
        suspiciousReason: classification.suspiciousReason,
        isBillable: classification.isBillable,
        isInternalTest,
      },
      tx,
    );

    await tx.qRCode.update({
      where: { id: qrCode.id },
      data: { scanCount: { increment: 1 } },
    });

    return result;
  });

  return {
    scanEventId: scanResult.id,
    isRepeatScan: scanResult.isRepeatScan,
    location,
  };
}
