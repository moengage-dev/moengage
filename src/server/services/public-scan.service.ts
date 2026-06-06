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
    include: {
      brand: true,
      advertiser: true,
      campaign: true,
      product: true,
      batch: true,
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
  } catch (e) {
    if (process.env.NODE_ENV === "production") {
      // In production, headers() must always be available within a request context.
      // If it throws, something is fundamentally wrong — re-throw so the caller's
      // try/catch in the page suppresses the error and the scan is simply not logged.
      throw e;
    }
    // Dev/test only: use stub headers to allow running outside a request context.
    requestHeaders = new Headers({
      "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
      "x-forwarded-for": "192.168.1.1",
      "x-vercel-ip-country": "TZ",
      "x-vercel-ip-city": "Dar es Salaam",
      "x-vercel-ip-latitude": "-6.8235",
      "x-vercel-ip-longitude": "39.2695",
    });
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

  // Create scan event using PostgreSQL ON CONFLICT DO UPDATE aggregation query
  const scanResult = await aggregateScanEvent({
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
  });

  // Increment QRCode scan count
  await prisma.qRCode.update({
    where: { id: qrCode.id },
    data: { scanCount: { increment: 1 } },
  });

  return {
    scanEventId: scanResult.id,
    isRepeatScan: scanResult.isRepeatScan,
    location,
  };
}
