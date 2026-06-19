// src/server/services/public-scan.service.ts
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { headers, cookies } from "next/headers";
import { parseUserAgent } from "@/lib/scans/device-parser";
import { getApproximateLocationFromHeaders } from "@/lib/scans/ip-location";
import { classifyConsumerScanTx } from "./scan-classification.service";
import { aggregateScanEvent } from "./scan-event-aggregation.service";

function getErrorCode(error: unknown): string | undefined {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
    ? error.code
    : undefined;
}

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
  let anonymousVisitorId = null;
  try {
    const cookieStore = await cookies();
    anonymousVisitorId = cookieStore.get("moengage_visitor_id")?.value ?? null;
  } catch {
    // Ignore error outside request context
  }
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

  // ── All non-DB work is performed BEFORE opening the transaction ────────
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

  const ipHash = location.ipHash ?? deriveIpHash(ipAddress);

  const scanResult = await processConsumerScan({
    qrCode,
    visitorId: anonymousVisitorId,
    ipAddress,
    ipHash,
    userAgent,
    location,
    device,
    now: new Date(),
  });

  return {
    scanEventId: scanResult.scanEventId,
    isRepeatScan: scanResult.isRepeatScan,
    location,
  };
}

export type ConsumerScanContext = {
  qrCode: {
    id: string;
    brandId: string | null;
    advertiserId: string | null;
    campaignId: string | null;
    productId: string | null;
    batchId: string | null;
    type: string;
    status: string;
  };
  visitorId: string | null;
  ipAddress: string | null;
  ipHash: string | null;
  userAgent: string | null;
  location: {
    country: string | null;
    region: string | null;
    city: string | null;
    suburb: string | null;
    latitude: number | null;
    longitude: number | null;
    locationSource: string;
  };
  device: {
    deviceType: string;
    os: string;
    browser: string;
  };
  now: Date;
};

/**
 * processConsumerScan
 * Executes the atomic transaction to lock, classify, aggregate, and increment scan counts.
 *
 * Lock scope mapping to queries:
 * 1. Visitor Lock:
 *    - Query: Rule B counts scans by `visitorId` and `campaignId` (if present) or `qrCodeId`.
 *    - Lock scope: `visitor:${visitorId}:${campaignId ?? qrCodeId}` matches this exactly.
 * 2. IP Lock:
 *    - Query: Rule B counts scans by `ipHash` and `campaignId` (if present).
 *             Rule C counts scans by `ipHash` and `campaignId` (if present) or `qrCodeId`.
 *             IP Footprint query (Rule A) counts by `ipHash` and `qrCodeId`.
 *    - Lock scope: `ip:${ipHash}:${campaignId ?? qrCodeId}` safely covers all these queries.
 *      Specifically, if `campaignId` is present, it serializes all concurrent scans from the
 *      same IP targeting any QR code within the same campaign, which protects the campaign-level
 *      IP aggregation query in Rule B and Rule C.
 */
export async function processConsumerScan(
  ctx: ConsumerScanContext
): Promise<{ scanEventId: string; isRepeatScan: boolean }> {
  const { qrCode, visitorId, ipAddress, ipHash, userAgent, location, device, now } = ctx;

  const isInternalTest = qrCode.type === "INTERNAL_TEST";

  const classificationInput = {
    campaignId: qrCode.campaignId,
    qrCodeId: qrCode.id,
    qrCodeType: qrCode.type,
    visitorId,
    ipAddress,
    ipHash,
    userAgent,
    now,
  };

  const lockKeys = buildAdvisoryLockKeys({
    visitorId,
    ipHash,
    campaignId: qrCode.campaignId,
    qrCodeId: qrCode.id,
  });

  const scanResult = await runWithRetry(async () => {
    return await prisma.$transaction(async (tx) => {
      // Acquire transaction-scoped advisory locks in sorted order.
      // Avoid raw void output by returning boolean using SELECT true FROM (SELECT pg_advisory_xact_lock(...)) AS lock_call
      for (const key of lockKeys) {
        await tx.$queryRaw`
          SELECT true AS "acquired"
          FROM (
            SELECT pg_advisory_xact_lock(${key}::bigint)
          ) AS lock_call
        `;
      }

      // Classification now runs INSIDE the locked transaction so all reads see
      // the committed state that no concurrent transaction for the same identity
      // has modified yet.
      const classification = await classifyConsumerScanTx(classificationInput, tx);

      const result = await aggregateScanEvent(
        {
          qrCodeId: qrCode.id,
          brandId: qrCode.brandId,
          advertiserId: qrCode.advertiserId,
          campaignId: qrCode.campaignId,
          productId: qrCode.productId,
          batchId: qrCode.batchId,
          anonymousVisitorId: visitorId,
          sessionId: null,
          ipHash,
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
          now,
        },
        tx,
      );

      await tx.qRCode.update({
        where: { id: qrCode.id },
        data: { scanCount: { increment: 1 } },
      });

      return result;
    }, {
      maxWait: 15000,
      timeout: 20000,
    });
  });

  return {
    scanEventId: scanResult.id,
    isRepeatScan: scanResult.isRepeatScan,
  };
}

// ---------------------------------------------------------------------------
// Advisory-lock helpers (internal, not exported)
// ---------------------------------------------------------------------------

async function runWithRetry<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  let attempts = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: unknown) {
      attempts++;
      const errorCode = getErrorCode(error);
      const isRetryable = errorCode === "P2034" || errorCode === "P2028";

      if (isRetryable && attempts <= maxRetries) {
        // Jittered short backoff (e.g. 100ms - 300ms)
        const delay = Math.floor(Math.random() * 200) + 100 * attempts;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

/**
 * Builds a sorted, deduplicated list of 64-bit PostgreSQL advisory lock keys.
 *
 * Key construction:
 *   "visitor:<visitorId>:<scope>"   where scope = campaignId ?? qrCodeId
 *   "ip:<ipHash>:<scope>"           where scope = campaignId ?? qrCodeId
 *
 * The scope exactly mirrors the predicate used in Rules B and C so that two
 * requests sharing the same classification query also share the same lock key
 * and therefore serialise.  Different identities use different keys and
 * proceed concurrently.
 *
 * Keys are derived from the first 8 bytes of SHA-256(text), interpreted as
 * a two's-complement signed int64 so PostgreSQL accepts them.
 */
function buildAdvisoryLockKeys({
  visitorId,
  ipHash,
  campaignId,
  qrCodeId,
}: {
  visitorId: string | null;
  ipHash: string | null;
  campaignId: string | null;
  qrCodeId: string;
}): bigint[] {
  // Scope must match the classification predicate (Rule B): campaign when
  // campaignId is present, QR code otherwise.
  const scope = campaignId ?? qrCodeId;
  const rawKeys: bigint[] = [];

  if (visitorId) {
    rawKeys.push(scopeToLockKey(`visitor:${visitorId}:${scope}`));
  }
  if (ipHash) {
    rawKeys.push(scopeToLockKey(`ip:${ipHash}:${scope}`));
  }

  // Deduplicate (unlikely but defensive) and sort ascending so all callers
  // always acquire in the same order — eliminates deadlocks.
  const unique = [...new Set(rawKeys.map(String))].map(BigInt);
  unique.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return unique;
}

/**
 * Converts a human-readable scope string into a signed 64-bit integer for
 * pg_advisory_xact_lock.  Takes the first 8 bytes of SHA-256 and re-interprets
 * them as a two's-complement int64.
 */
function scopeToLockKey(text: string): bigint {
  const buf = crypto.createHash("sha256").update(text).digest();
  const unsigned = buf.readBigUInt64BE(0);
  const INT64_MAX = BigInt("0x7fffffffffffffff");
  const UINT64_WRAP = BigInt("0x10000000000000000");
  return unsigned > INT64_MAX ? unsigned - UINT64_WRAP : unsigned;
}

/**
 * Derives an IP hash for lock-key construction when location.ipHash is not
 * available (e.g. no geolocation header was present).
 */
export function deriveIpHash(ipAddress: string | null): string | null {
  if (!ipAddress) return null;
  return crypto.createHash("sha256").update(ipAddress).digest("hex");
}
