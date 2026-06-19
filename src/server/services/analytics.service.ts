// src/server/services/analytics.service.ts
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAssignedCampaignIds } from "@/lib/auth/role-scope";

export type ScopedUser = {
  id: string;
  role: string;
  brandId?: string | null;
  advertiserId?: string | null;
};

export type AnalyticsMetrics = {
  totalCampaigns: number;
  activeCampaigns: number;
  totalQRCodes: number;
  totalScans: number;
  uniqueScans: number;
  repeatScans: number;
  billableScans: number;
  suspiciousScans: number;
  approvedRewardClaims: number;
  duplicateRewardDeclines: number;
  totalDeliveryScans: number;
  totalCartonsDelivered: number;
  totalEstimatedUnitsDelivered: number;
};

export type CampaignPerfRow = {
  name: string;
  brandName: string;
  advertiserName: string;
  totalScans: number;
  approvedClaims: number;
  duplicateDeclines: number;
  deliveryScans: number;
  estimatedUnitsDelivered: number;
};

export type ProductPerfRow = {
  name: string;
  brandName: string;
  totalScans: number;
  approvedClaims: number;
  estimatedUnitsDelivered: number;
};

export type LocationPerfRow = {
  location: string;
  totalScans: number;
  approvedClaims: number;
  deliveryScans: number;
  estimatedUnitsDelivered: number;
};

export type RecentScanRow = {
  id: string;
  createdAt: Date;
  campaignName: string;
  productName: string;
  location: string;
  deviceType: string;
  hitCount: number;
  repeatCount: number;
  suspiciousCount: number;
  billableCount: number;
  isRepeatScan: boolean;
  isBillable: boolean;
};

export type RecentRewardRow = {
  id: string;
  createdAt: Date;
  campaignName: string;
  rewardType: string;
  status: string;
  mobileNumberLast4: string;
};

export type RecentDeliveryRow = {
  id: string;
  createdAt: Date;
  retailerName: string;
  campaignName: string;
  batchCode: string;
  cartonsDelivered: number;
  estimatedUnitsDelivered: number;
  location: string;
};

export type AnalyticsDashboardData = {
  metrics: AnalyticsMetrics;
  performance: {
    campaignPerformance: CampaignPerfRow[];
    productPerformance: ProductPerfRow[];
    locationPerformance: LocationPerfRow[];
    recentScanEvents: RecentScanRow[];
    recentRewardClaims: RecentRewardRow[];
    recentDeliveryScans: RecentDeliveryRow[];
  };
  hasData: boolean;
};

type AnalyticsFilters = {
  campaign: Prisma.CampaignWhereInput;
  qrCode: Prisma.QRCodeWhereInput;
  scanEvent: Prisma.ScanEventWhereInput;
  rewardClaim: Prisma.RewardClaimWhereInput;
  rewardClaimAttempt: Prisma.RewardClaimAttemptWhereInput;
  deliveryScan: Prisma.DeliveryScanWhereInput;
};

// Generic helper to compute scoped metrics and performance groups
async function computeMetricsAndPerformance(filters: AnalyticsFilters): Promise<AnalyticsDashboardData> {
  const campaignBrandId =
    typeof filters.campaign.brandId === "string"
      ? filters.campaign.brandId
      : undefined;
  const productWhere: Prisma.ProductWhereInput =
    campaignBrandId
      ? { brandId: campaignBrandId }
      : Object.keys(filters.campaign).length > 0
        ? { campaigns: { some: filters.campaign } }
        : {};

  const [
    totalCampaigns,
    activeCampaigns,
    totalQRCodes,
    scanEventsAgg,
    uniqueVisitorsGroups,
    approvedRewardClaims,
    duplicateRewardDeclines,
    totalDeliveryScans,
    cartonsAgg,
    unitsAgg,

    // Performance raw lists
    campaignsRaw,
    productsRaw,
    locationsRaw,
    recentScansRaw,
    recentRewardsRaw,
    recentDeliveriesRaw,
  ] = await Promise.all([
    prisma.campaign.count({ where: filters.campaign }),
    prisma.campaign.count({ where: { ...filters.campaign, status: "ACTIVE" } }),
    prisma.qRCode.count({ where: { ...filters.qrCode, status: "ACTIVE" } }),
    prisma.scanEvent.aggregate({
      _sum: {
        hitCount: true,
        repeatCount: true,
        billableCount: true,
        suspiciousCount: true,
      },
      where: filters.scanEvent,
    }),
    prisma.scanEvent.groupBy({
      by: ["anonymousVisitorId"],
      where: { ...filters.scanEvent, anonymousVisitorId: { not: null } },
    }),
    prisma.rewardClaim.count({ where: { ...filters.rewardClaim, status: "APPROVED" } }),
    prisma.rewardClaimAttempt.count({ where: { ...filters.rewardClaimAttempt, status: "DECLINED_DUPLICATE" } }),
    prisma.deliveryScan.count({ where: filters.deliveryScan }),
    prisma.deliveryScan.aggregate({ _sum: { cartonsDelivered: true }, where: filters.deliveryScan }),
    prisma.deliveryScan.aggregate({ _sum: { estimatedUnitsDelivered: true }, where: filters.deliveryScan }),

    // Top campaigns by scans
    prisma.campaign.findMany({
      where: filters.campaign,
      include: {
        brand: { select: { name: true } },
        advertiser: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),

    // Top products by scans (indirectly via product filter)
    prisma.product.findMany({
      where: productWhere,
      include: {
        brand: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),

    // Top locations
    prisma.scanEvent.groupBy({
      by: ["city", "suburb", "country"],
      where: filters.scanEvent,
      _sum: { hitCount: true },
    }),

    // Recent Scans
    prisma.scanEvent.findMany({
      where: filters.scanEvent,
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        campaign: { select: { name: true } },
        product: { select: { name: true } },
      },
    }),

    // Recent Rewards
    prisma.rewardClaim.findMany({
      where: filters.rewardClaim,
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        campaign: { select: { name: true } },
      },
    }),

    // Recent Deliveries
    prisma.deliveryScan.findMany({
      where: filters.deliveryScan,
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        retailer: { select: { name: true } },
        campaign: { select: { name: true } },
        batch: { select: { batchCode: true } },
      },
    }),
  ]);

  const totalScans = scanEventsAgg._sum.hitCount ?? 0;
  const repeatScans = scanEventsAgg._sum.repeatCount ?? 0;
  const billableScans = scanEventsAgg._sum.billableCount ?? 0;
  const suspiciousScans = scanEventsAgg._sum.suspiciousCount ?? 0;

  // Aggregate metrics for top campaigns
  const campaignPerformance = await Promise.all(
    campaignsRaw.map(async (c) => {
      const [scansCountAgg, approvedClaims, duplicateDeclines, deliveryScans, delivAgg] =
        await Promise.all([
          prisma.scanEvent.aggregate({
            _sum: { hitCount: true },
            where: { ...filters.scanEvent, campaignId: c.id },
          }),
          prisma.rewardClaim.count({
            where: { ...filters.rewardClaim, campaignId: c.id, status: "APPROVED" },
          }),
          prisma.rewardClaimAttempt.count({
            where: { ...filters.rewardClaimAttempt, campaignId: c.id, status: "DECLINED_DUPLICATE" },
          }),
          prisma.deliveryScan.count({ where: { ...filters.deliveryScan, campaignId: c.id } }),
          prisma.deliveryScan.aggregate({
            _sum: { estimatedUnitsDelivered: true },
            where: { ...filters.deliveryScan, campaignId: c.id },
          }),
        ]);

      return {
        name: c.name,
        brandName: c.brand?.name ?? "—",
        advertiserName: c.advertiser?.name ?? "—",
        totalScans: scansCountAgg._sum.hitCount ?? 0,
        approvedClaims,
        duplicateDeclines,
        deliveryScans,
        estimatedUnitsDelivered: delivAgg._sum.estimatedUnitsDelivered ?? 0,
      };
    })
  );

  // Aggregate metrics for top products
  const productPerformance = await Promise.all(
    productsRaw.map(async (p) => {
      const [scansCountAgg, approvedClaims, delivAgg] = await Promise.all([
        prisma.scanEvent.aggregate({
          _sum: { hitCount: true },
          where: { ...filters.scanEvent, productId: p.id },
        }),
        prisma.rewardClaim.count({
          where: { ...filters.rewardClaim, scanEvent: { productId: p.id }, status: "APPROVED" },
        }),
        prisma.deliveryScan.aggregate({
          _sum: { estimatedUnitsDelivered: true },
          where: { ...filters.deliveryScan, qrCode: { productId: p.id } },
        }),
      ]);

      return {
        name: p.name,
        brandName: p.brand?.name ?? "—",
        totalScans: scansCountAgg._sum.hitCount ?? 0,
        approvedClaims,
        estimatedUnitsDelivered: delivAgg._sum.estimatedUnitsDelivered ?? 0,
      };
    })
  );

  // Sort and take top 5 locations in memory
  const sortedLocations = [...locationsRaw]
    .sort((a, b) => (b._sum?.hitCount ?? 0) - (a._sum?.hitCount ?? 0))
    .slice(0, 5);

  // Aggregate metrics for top locations
  const locationPerformance = await Promise.all(
    sortedLocations.map(async (loc) => {
      const { city, suburb, country } = loc;

      const [approvedClaims, deliveryScans, delivAgg] = await Promise.all([
        prisma.rewardClaim.count({
          where: {
            ...filters.rewardClaim,
            scanEvent: { city, suburb, country },
            status: "APPROVED",
          },
        }),
        prisma.deliveryScan.count({
          where: { ...filters.deliveryScan, city, suburb, country },
        }),
        prisma.deliveryScan.aggregate({
          _sum: { estimatedUnitsDelivered: true },
          where: { ...filters.deliveryScan, city, suburb, country },
        }),
      ]);

      const locationLabel = [suburb, city, country].filter(Boolean).join(", ") || "Unknown Location";

      return {
        location: locationLabel,
        totalScans: loc._sum?.hitCount ?? 0,
        approvedClaims,
        deliveryScans,
        estimatedUnitsDelivered: delivAgg._sum.estimatedUnitsDelivered ?? 0,
      };
    })
  );

  // Map recents to readable rows
  const recentScanEvents: RecentScanRow[] = recentScansRaw.map((s) => ({
    id: s.id,
    createdAt: s.createdAt,
    campaignName: s.campaign?.name ?? "—",
    productName: s.product?.name ?? "—",
    location: [s.suburb, s.city, s.country].filter(Boolean).join(", ") || "Unknown Location",
    deviceType: s.deviceType ?? "Unknown",
    hitCount: s.hitCount,
    repeatCount: s.repeatCount,
    suspiciousCount: s.suspiciousCount,
    billableCount: s.billableCount,
    isRepeatScan: s.isRepeatScan,
    isBillable: s.isBillable,
  }));

  const recentRewardClaims: RecentRewardRow[] = recentRewardsRaw.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    campaignName: r.campaign?.name ?? "—",
    rewardType: r.rewardType,
    status: r.status,
    mobileNumberLast4: r.mobileNumberLast4 ?? "—",
  }));

  const recentDeliveryScans: RecentDeliveryRow[] = recentDeliveriesRaw.map((d) => ({
    id: d.id,
    createdAt: d.createdAt,
    retailerName: d.retailer?.name ?? "—",
    campaignName: d.campaign?.name ?? "—",
    batchCode: d.batch?.batchCode ?? "—",
    cartonsDelivered: d.cartonsDelivered,
    estimatedUnitsDelivered: d.estimatedUnitsDelivered,
    location: [d.suburb, d.city].filter(Boolean).join(", ") || "Manual Entry",
  }));

  return {
    metrics: {
      totalCampaigns,
      activeCampaigns,
      totalQRCodes,
      totalScans,
      uniqueScans: uniqueVisitorsGroups.length,
      repeatScans,
      billableScans,
      suspiciousScans,
      approvedRewardClaims,
      duplicateRewardDeclines,
      totalDeliveryScans,
      totalCartonsDelivered: cartonsAgg._sum.cartonsDelivered ?? 0,
      totalEstimatedUnitsDelivered: unitsAgg._sum.estimatedUnitsDelivered ?? 0,
    },
    performance: {
      campaignPerformance,
      productPerformance,
      locationPerformance,
      recentScanEvents,
      recentRewardClaims,
      recentDeliveryScans,
    },
    hasData: totalCampaigns > 0 || totalScans > 0 || totalDeliveryScans > 0,
  };
}

// Empty metrics returned when a scoped user has no valid scope (fail closed).
const EMPTY_ANALYTICS_DATA: AnalyticsDashboardData = {
  metrics: {
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalQRCodes: 0,
    totalScans: 0,
    uniqueScans: 0,
    repeatScans: 0,
    billableScans: 0,
    suspiciousScans: 0,
    approvedRewardClaims: 0,
    duplicateRewardDeclines: 0,
    totalDeliveryScans: 0,
    totalCartonsDelivered: 0,
    totalEstimatedUnitsDelivered: 0,
  },
  performance: {
    campaignPerformance: [],
    productPerformance: [],
    locationPerformance: [],
    recentScanEvents: [],
    recentRewardClaims: [],
    recentDeliveryScans: [],
  },
  hasData: false,
};

export async function getAnalyticsDashboardData(user: ScopedUser): Promise<AnalyticsDashboardData> {
  const filters: AnalyticsFilters = {
    campaign: {},
    qrCode: {},
    scanEvent: {},
    rewardClaim: {},
    rewardClaimAttempt: {},
    deliveryScan: {},
  };

  if (user.role === "ADMIN") {
    // No filters — global view.
  } else if (user.role === "BRAND_ADMIN") {
    // Fail closed: BRAND_ADMIN must have a brandId.
    if (!user.brandId) {
      return EMPTY_ANALYTICS_DATA;
    }
    filters.campaign.brandId = user.brandId;
    filters.qrCode.brandId = user.brandId;
    filters.scanEvent.brandId = user.brandId;
    filters.rewardClaim.brandId = user.brandId;
    filters.rewardClaimAttempt.brandId = user.brandId;
    filters.deliveryScan.brandId = user.brandId;
  } else if (user.role === "CAMPAIGN_MANAGER") {
    // Scope by the campaigns explicitly assigned to this manager.
    const campaignIds = await getAssignedCampaignIds(user.id);
    if (campaignIds.length === 0) {
      return EMPTY_ANALYTICS_DATA;
    }
    filters.campaign.id = { in: campaignIds };
    filters.qrCode.campaignId = { in: campaignIds };
    filters.scanEvent.campaignId = { in: campaignIds };
    filters.rewardClaim.campaignId = { in: campaignIds };
    filters.rewardClaimAttempt.campaignId = { in: campaignIds };
    filters.deliveryScan.campaignId = { in: campaignIds };
  } else if (user.role === "ADVERTISER_VIEWER") {
    // Fail closed: ADVERTISER_VIEWER must have an advertiserId.
    if (!user.advertiserId) {
      return EMPTY_ANALYTICS_DATA;
    }
    filters.campaign.advertiserId = user.advertiserId;
    filters.qrCode.advertiserId = user.advertiserId;
    filters.scanEvent.advertiserId = user.advertiserId;
    filters.rewardClaim.advertiserId = user.advertiserId;
    filters.rewardClaimAttempt.advertiserId = user.advertiserId;
    filters.deliveryScan.campaign = { advertiserId: user.advertiserId };
  } else {
    // Unknown role: fail closed.
    return EMPTY_ANALYTICS_DATA;
  }

  return computeMetricsAndPerformance(filters);
}

export async function getScanTrendByMinute(campaignId?: string): Promise<Array<{ minute: Date; scanCount: number }>> {
  const result = await prisma.$queryRaw<Array<{ minute: Date; scanCount: number }>>`
    SELECT 
      date_trunc('minute', "windowStartedAt") as minute,
      SUM("hitCount")::int as "scanCount"
    FROM "ScanEvent"
    ${campaignId ? Prisma.sql`WHERE "campaignId" = ${campaignId}` : Prisma.empty}
    GROUP BY minute
    ORDER BY minute ASC
  `;
  return result;
}
