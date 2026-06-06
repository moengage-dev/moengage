// src/server/services/scan-classification.service.ts
import prisma from "@/lib/prisma";
import crypto from "crypto";

export type ClassificationInput = {
  campaignId: string | null;
  qrCodeId: string;
  qrCodeType: string;
  visitorId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  now?: Date;
};

export type ClassificationResult = {
  isRepeatScan: boolean;
  isSuspicious: boolean;
  suspiciousReason: string | null;
  isBillable: boolean;
};

export async function classifyConsumerScan(
  input: ClassificationInput
): Promise<ClassificationResult> {
  const {
    campaignId,
    qrCodeId,
    qrCodeType,
    visitorId,
    ipAddress,
    now = new Date(),
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
    };
  }

  // Generate IP Hash if IP is available
  const ipHash = ipAddress
    ? crypto.createHash("sha256").update(ipAddress).digest("hex")
    : null;

  // Rule A: Repeat Scan Detection
  if (visitorId) {
    if (campaignId) {
      const previous = await prisma.scanEvent.findFirst({
        where: {
          anonymousVisitorId: visitorId,
          campaignId: campaignId,
        },
        select: { id: true },
      });
      isRepeatScan = !!previous;
    } else {
      const previous = await prisma.scanEvent.findFirst({
        where: {
          anonymousVisitorId: visitorId,
          qrCodeId: qrCodeId,
        },
        select: { id: true },
      });
      isRepeatScan = !!previous;
    }
  }

  // Active IP Footprint (30 minutes session window) repeat scan check
  if (!isRepeatScan && ipHash) {
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const previousByIp = await prisma.scanEvent.findFirst({
      where: {
        ipHash: ipHash,
        qrCodeId: qrCodeId,
        createdAt: {
          gte: thirtyMinutesAgo,
        },
      },
      select: { id: true },
    });
    if (previousByIp) {
      isRepeatScan = true;
    }
  }

  // Rule B: High Frequency Visitor Abuse (>10 scans in 5 minutes by visitorId or ipHash + campaignId)
  let visitorOrIpCampaignAbuse = false;

  // Check visitorId frequency if present
  if (visitorId) {
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const visitorScanCountAgg = await prisma.scanEvent.aggregate({
      _sum: { hitCount: true },
      where: {
        anonymousVisitorId: visitorId,
        ...(campaignId ? { campaignId } : { qrCodeId }),
        createdAt: {
          gte: fiveMinutesAgo,
        },
      },
    });
    const visitorScanCount = visitorScanCountAgg._sum.hitCount ?? 0;

    if (visitorScanCount >= 10) {
      visitorOrIpCampaignAbuse = true;
    }
  }

  // Check ipHash + campaignId frequency if present
  if (!visitorOrIpCampaignAbuse && ipHash && campaignId) {
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const ipCampaignScanCountAgg = await prisma.scanEvent.aggregate({
      _sum: { hitCount: true },
      where: {
        ipHash: ipHash,
        campaignId: campaignId,
        createdAt: {
          gte: fiveMinutesAgo,
        },
      },
    });
    const ipCampaignScanCount = ipCampaignScanCountAgg._sum.hitCount ?? 0;

    if (ipCampaignScanCount >= 10) {
      visitorOrIpCampaignAbuse = true;
    }
  }

  if (visitorOrIpCampaignAbuse) {
    isSuspicious = true;
    suspiciousReason = "HIGH_FREQUENCY_VISITOR";
    isBillable = false;
  }

  // Rule C: IP frequency abuse (>20 scans in 10 minutes)
  if (ipHash) {
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const ipScanCountAgg = await prisma.scanEvent.aggregate({
      _sum: { hitCount: true },
      where: {
        ipHash: ipHash,
        ...(campaignId ? { campaignId } : { qrCodeId }),
        createdAt: {
          gte: tenMinutesAgo,
        },
      },
    });
    const ipScanCount = ipScanCountAgg._sum.hitCount ?? 0;

    if (ipScanCount >= 20) {
      isSuspicious = true;
      isBillable = false;
      suspiciousReason = suspiciousReason
        ? `${suspiciousReason}, HIGH_FREQUENCY_IP`
        : "HIGH_FREQUENCY_IP";
    }
  }

  // Rule D: Internal/test QR exclusion
  if (qrCodeType === "INTERNAL_TEST") {
    isBillable = false;
    suspiciousReason = suspiciousReason
      ? `${suspiciousReason}, INTERNAL_TEST_QR`
      : "INTERNAL_TEST_QR";
  }

  return {
    isRepeatScan,
    isSuspicious,
    suspiciousReason,
    isBillable,
  };
}

export type SuspiciousScansFilter = {
  brandId?: string;
  advertiserId?: string;
  campaignId?: string;
  suspiciousReason?: string;
  startDate?: string;
  endDate?: string;
};

export async function getSuspiciousScansPageData(filters: SuspiciousScansFilter = {}) {
  const whereClause: any = {
    OR: [
      { isSuspicious: true },
      { suspiciousReason: { not: null } },
      { isBillable: false },
    ],
  };

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
      select: { id: true, name: true },
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
    recentScans: recentScans.map((s) => ({
      ...s,
      latitude: s.latitude ? s.latitude.toNumber() : null,
      longitude: s.longitude ? s.longitude.toNumber() : null,
    })),
    brands,
    advertisers,
    campaigns,
  };
}
