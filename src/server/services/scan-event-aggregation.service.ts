// src/server/services/scan-event-aggregation.service.ts
import prisma from "@/lib/prisma";
import crypto from "crypto";

export type AggregateScanInput = {
  qrCodeId: string;
  brandId: string | null;
  advertiserId: string | null;
  campaignId: string | null;
  productId: string | null;
  batchId: string | null;
  anonymousVisitorId: string | null;
  sessionId: string | null;
  ipHash: string | null;
  userAgent: string | null;
  deviceType: string | null;
  os: string | null;
  browser: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  suburb: string | null;
  latitude: number | null;
  longitude: number | null;
  locationSource: string;
  isRepeatScan: boolean;
  isSuspicious: boolean;
  suspiciousReason: string | null;
  isBillable: boolean;
  isInternalTest: boolean;
  now?: Date;
};

export async function aggregateScanEvent(input: AggregateScanInput) {
  const now = input.now || new Date();

  // 1. Compute windowStartedAt using a fixed 30-second bucket
  const windowStartedAt = new Date(Math.floor(now.getTime() / 30000) * 30000);

  // 2. Compute fingerprintKey
  let fingerprintKey: string;
  if (input.anonymousVisitorId) {
    fingerprintKey = `visitor:${input.anonymousVisitorId}`;
  } else if (input.ipHash) {
    fingerprintKey = `ip:${input.ipHash}`;
  } else {
    fingerprintKey = `unknown:${crypto.randomUUID()}`;
  }

  // 3. Generate primary key ID for possible insert path
  const id = crypto.randomUUID();

  // 4. Initial counters
  const hitCount = 1;
  const repeatCount = input.isRepeatScan ? 1 : 0;
  const suspiciousCount = input.isSuspicious ? 1 : 0;
  const billableCount = input.isBillable ? 1 : 0;

  // 5. Parameterized SQL insert using prisma.$queryRaw
  const result = await prisma.$queryRaw<Array<{ id: string; isRepeatScan: boolean }>>`
    INSERT INTO "ScanEvent" (
      "id",
      "qrCodeId",
      "brandId",
      "advertiserId",
      "campaignId",
      "productId",
      "batchId",
      "anonymousVisitorId",
      "sessionId",
      "ipHash",
      "userAgent",
      "deviceType",
      "os",
      "browser",
      "country",
      "region",
      "city",
      "suburb",
      "latitude",
      "longitude",
      "locationSource",
      "isRepeatScan",
      "isSuspicious",
      "suspiciousReason",
      "isBillable",
      "isInternalTest",
      "createdAt",
      "fingerprintKey",
      "windowStartedAt",
      "firstScanAt",
      "lastScanAt",
      "hitCount",
      "repeatCount",
      "suspiciousCount",
      "billableCount"
    ) VALUES (
      ${id},
      ${input.qrCodeId},
      ${input.brandId},
      ${input.advertiserId},
      ${input.campaignId},
      ${input.productId},
      ${input.batchId},
      ${input.anonymousVisitorId},
      ${input.sessionId},
      ${input.ipHash},
      ${input.userAgent},
      ${input.deviceType},
      ${input.os},
      ${input.browser},
      ${input.country},
      ${input.region},
      ${input.city},
      ${input.suburb},
      ${input.latitude},
      ${input.longitude},
      ${input.locationSource}::"LocationSource",
      ${input.isRepeatScan},
      ${input.isSuspicious},
      ${input.suspiciousReason},
      ${input.isBillable},
      ${input.isInternalTest},
      ${now},
      ${fingerprintKey},
      ${windowStartedAt},
      ${now},
      ${now},
      ${hitCount},
      ${repeatCount},
      ${suspiciousCount},
      ${billableCount}
    )
    ON CONFLICT ("qrCodeId", "fingerprintKey", "windowStartedAt")
    DO UPDATE SET
      "hitCount" = "ScanEvent"."hitCount" + 1,
      "repeatCount" = "ScanEvent"."repeatCount" + EXCLUDED."repeatCount",
      "suspiciousCount" = "ScanEvent"."suspiciousCount" + EXCLUDED."suspiciousCount",
      "billableCount" = "ScanEvent"."billableCount" + EXCLUDED."billableCount",
      "lastScanAt" = GREATEST("ScanEvent"."lastScanAt", EXCLUDED."lastScanAt"),
      "isRepeatScan" = "ScanEvent"."isRepeatScan" OR EXCLUDED."isRepeatScan",
      "isSuspicious" = "ScanEvent"."isSuspicious" OR EXCLUDED."isSuspicious",
      "isBillable" = (("ScanEvent"."billableCount" + EXCLUDED."billableCount") > 0),
      "suspiciousReason" = COALESCE("ScanEvent"."suspiciousReason", EXCLUDED."suspiciousReason")
    RETURNING "id", "isRepeatScan";
  `;

  return result[0];
}
