// src/server/services/scan-classification.service.ts
import prisma from "@/lib/prisma";
import crypto from "crypto";
import type { Prisma } from "@prisma/client";

export type ClassificationInput = {
  campaignId: string | null;
  qrCodeId: string;
  qrCodeType: string;
  visitorId: string | null;
  ipAddress?: string | null;
  ipHash?: string | null;
  userAgent: string | null;
  now: Date;
};

export type ClassificationResult = {
  isRepeatScan: boolean;
  isSuspicious: boolean;
  suspiciousReason: string | null;
  isBillable: boolean;
  /** Derived IP hash, forwarded so callers can include it in the aggregation input. */
  ipHash: string | null;
};

// ---------------------------------------------------------------------------
// Public entry point — no transaction client (backward-compatible, used by
// any caller that does NOT need serialised classification).
// ---------------------------------------------------------------------------
export async function classifyConsumerScan(
  input: ClassificationInput
): Promise<ClassificationResult> {
  return _classifyWithClient(input, prisma as unknown as Prisma.TransactionClient);
}

// ---------------------------------------------------------------------------
// Transactional entry point — used inside an advisory-locked Prisma
// transaction so that all DB reads participate in the same snapshot.
// ---------------------------------------------------------------------------
export async function classifyConsumerScanTx(
  input: ClassificationInput,
  tx: Prisma.TransactionClient,
): Promise<ClassificationResult> {
  return _classifyWithClient(input, tx);
}

// ---------------------------------------------------------------------------
// Shared implementation
// ---------------------------------------------------------------------------
async function _classifyWithClient(
  input: ClassificationInput,
  db: Prisma.TransactionClient,
): Promise<ClassificationResult> {
  const {
    campaignId,
    qrCodeId,
    qrCodeType,
    visitorId,
    ipAddress,
    ipHash: precomputedIpHash,
    now,
  } = input;

  let isRepeatScan = false;
  let isSuspicious = false;
  let suspiciousReason: string | null = null;
  let isBillable = true;

  // Rule E: Invalid/non-consumer QR exclusion
  if (qrCodeType === "BATCH_DELIVERY") {
    return {
      isRepeatScan: false,
      isSuspicious: false,
      suspiciousReason: "BATCH_DELIVERY_QR",
      isBillable: false,
      ipHash: null,
    };
  }

  // Use precomputed ipHash or derive it from ipAddress
  const ipHash = precomputedIpHash || (ipAddress
    ? crypto.createHash("sha256").update(ipAddress).digest("hex")
    : null);

  // ── Rule A: Repeat Scan Detection ──────────────────────────────────────
  if (visitorId) {
    if (campaignId) {
      const previous = await db.scanEvent.findFirst({
        where: { anonymousVisitorId: visitorId, campaignId },
        select: { id: true },
      });
      isRepeatScan = !!previous;
    } else {
      const previous = await db.scanEvent.findFirst({
        where: { anonymousVisitorId: visitorId, qrCodeId },
        select: { id: true },
      });
      isRepeatScan = !!previous;
    }
  }

  // Active IP Footprint (30-minute session window) repeat-scan check
  if (!isRepeatScan && ipHash) {
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const previousByIp = await db.scanEvent.findFirst({
      where: { ipHash, qrCodeId, createdAt: { gte: thirtyMinutesAgo } },
      select: { id: true },
    });
    if (previousByIp) isRepeatScan = true;
  }

  // ── Rule B: High-Frequency Visitor Abuse (≥10 scans / 5 min) ──────────
  // Scope matches the classification query: campaign-scoped when campaignId
  // is present, qrCode-scoped otherwise. Lock keys must reflect the same scope.
  let visitorOrIpCampaignAbuse = false;

  if (visitorId) {
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const agg = await db.scanEvent.aggregate({
      _sum: { hitCount: true },
      where: {
        anonymousVisitorId: visitorId,
        ...(campaignId ? { campaignId } : { qrCodeId }),
        createdAt: { gte: fiveMinutesAgo },
      },
    });
    if ((agg._sum.hitCount ?? 0) >= 10) visitorOrIpCampaignAbuse = true;
  }

  if (!visitorOrIpCampaignAbuse && ipHash && campaignId) {
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const agg = await db.scanEvent.aggregate({
      _sum: { hitCount: true },
      where: {
        ipHash,
        campaignId,
        createdAt: { gte: fiveMinutesAgo },
      },
    });
    if ((agg._sum.hitCount ?? 0) >= 10) visitorOrIpCampaignAbuse = true;
  }

  if (visitorOrIpCampaignAbuse) {
    isSuspicious = true;
    suspiciousReason = "HIGH_FREQUENCY_VISITOR";
    isBillable = false;
  }

  // ── Rule C: IP frequency abuse (≥20 scans / 10 min) ──────────────────
  if (ipHash) {
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const agg = await db.scanEvent.aggregate({
      _sum: { hitCount: true },
      where: {
        ipHash,
        ...(campaignId ? { campaignId } : { qrCodeId }),
        createdAt: { gte: tenMinutesAgo },
      },
    });
    if ((agg._sum.hitCount ?? 0) >= 20) {
      isSuspicious = true;
      isBillable = false;
      suspiciousReason = suspiciousReason
        ? `${suspiciousReason}, HIGH_FREQUENCY_IP`
        : "HIGH_FREQUENCY_IP";
    }
  }

  // ── Rule D: Internal/test QR exclusion ───────────────────────────────
  if (qrCodeType === "INTERNAL_TEST") {
    isBillable = false;
    suspiciousReason = suspiciousReason
      ? `${suspiciousReason}, INTERNAL_TEST_QR`
      : "INTERNAL_TEST_QR";
  }

  return { isRepeatScan, isSuspicious, suspiciousReason, isBillable, ipHash };
}

export type SuspiciousScansFilter = {
  brandId?: string;
  advertiserId?: string;
  campaignId?: string;
  suspiciousReason?: string;
  startDate?: string;
  endDate?: string;
  reviewState?: "FLAGGED" | "MARKED_SAFE" | "ALL";
};

export async function getSuspiciousScansPageData(filters: SuspiciousScansFilter = {}) {
  // 1. Fetch relevant AuditLog entries to identify manual review states
  const auditLogs = await prisma.auditLog.findMany({
    where: { action: "OVERRIDE_SUSPICIOUS_SCAN", entityType: "ScanEvent" },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });

  const latestOverrideByEventId = new Map<string, typeof auditLogs[0]>();
  for (const log of auditLogs) {
    if (!log.entityId) continue;
    if (!latestOverrideByEventId.has(log.entityId)) {
      latestOverrideByEventId.set(log.entityId, log);
    }
  }

  const markedSafeEventIds = Array.from(latestOverrideByEventId.entries())
    .filter(([_, log]) => {
      const metadata = log.metadata as any;
      return metadata?.after?.isSuspicious === false;
    })
    .map(([id]) => id);

  const reviewState = filters.reviewState || "FLAGGED";
  let stateWhereClause: any = {};

  if (reviewState === "FLAGGED") {
    stateWhereClause = {
      OR: [
        { isSuspicious: true },
        { suspiciousReason: { not: null } },
        { isBillable: false },
      ],
    };
  } else if (reviewState === "MARKED_SAFE") {
    stateWhereClause = {
      id: { in: markedSafeEventIds.length > 0 ? markedSafeEventIds : ["__NONE__"] },
      isSuspicious: false,
      suspiciousReason: null,
    };
  } else if (reviewState === "ALL") {
    stateWhereClause = {
      OR: [
        { isSuspicious: true },
        { suspiciousReason: { not: null } },
        { isBillable: false },
        { id: { in: markedSafeEventIds.length > 0 ? markedSafeEventIds : ["__NONE__"] } },
      ],
    };
  }

  const whereClause: any = { ...stateWhereClause };

  // Filter by brand
  if (filters.brandId) {
    whereClause.brandId = filters.brandId;
  }
  // Filter by advertiser
  if (filters.advertiserId) {
    whereClause.advertiserId = filters.advertiserId;
  }
  // Filter by campaign
  if (filters.campaignId) {
    whereClause.campaignId = filters.campaignId;
  }
  // Filter by suspicious reason
  if (filters.suspiciousReason) {
    whereClause.suspiciousReason = {
      contains: filters.suspiciousReason,
    };
  }
  // Filter by date range
  const dateFilter: any = {};
  if (filters.startDate) {
    dateFilter.gte = new Date(filters.startDate);
  }
  if (filters.endDate) {
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    dateFilter.lte = end;
  }
  if (Object.keys(dateFilter).length > 0) {
    whereClause.createdAt = dateFilter;
  }

  // Fetch data
  const [
    totalSuspiciousAgg,
    reasonGroups,
    recentScans,
    brands,
    advertisers,
    campaigns,
  ] = await Promise.all([
    // Total suspicious count
    prisma.scanEvent.aggregate({
      _sum: { suspiciousCount: true },
      where: whereClause,
    }),
    
    // Aggregated by reason
    prisma.scanEvent.groupBy({
      by: ["suspiciousReason"],
      where: {
        ...whereClause,
        suspiciousReason: { not: null },
      },
      _sum: {
        suspiciousCount: true,
      },
    }),

    // Recent scans list (take 100)
    prisma.scanEvent.findMany({
      where: whereClause,
      include: {
        brand: { select: { name: true } },
        advertiser: { select: { name: true } },
        campaign: { select: { name: true } },
        qrCode: { select: { code: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),

    // Dropdown options
    prisma.brand.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.advertiser.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.campaign.findMany({
      select: { id: true, name: true, brandId: true, advertiserId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalSuspicious = totalSuspiciousAgg._sum.suspiciousCount ?? 0;

  return {
    totalSuspicious,
    reasonGroups: reasonGroups.map((g) => ({
      reason: g.suspiciousReason ?? "UNKNOWN",
      count: g._sum.suspiciousCount ?? 0,
    })),
    recentScans: recentScans.map((s) => {
      const latestLog = latestOverrideByEventId.get(s.id);
      return {
        ...s,
        latitude: s.latitude ? s.latitude.toNumber() : null,
        longitude: s.longitude ? s.longitude.toNumber() : null,
        latestReview: latestLog ? {
          action: latestLog.action,
          user: latestLog.user ? latestLog.user.name || latestLog.user.email : "Unknown Admin",
          timestamp: latestLog.createdAt,
          wasMarkedSafe: (latestLog.metadata as any)?.after?.isSuspicious === false,
        } : null,
      };
    }),
    brands,
    advertisers,
    campaigns,
  };
}
