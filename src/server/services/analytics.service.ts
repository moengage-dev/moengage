// src/server/services/analytics.service.ts
import prisma from "@/lib/prisma";

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

// Generic helper to compute scoped metrics and performance groups
async function computeMetricsAndPerformance(filters: {
  campaign: any;
  qrCode: any;
  scanEvent: any;
  rewardClaim: any;
  deliveryScan: any;
}): Promise<AnalyticsDashboardData> {
  const [
    totalCampaigns,
    activeCampaigns,
    totalQRCodes,
    totalScans,
    uniqueVisitorsGroups,
    repeatScans,
    billableScans,
    suspiciousScans,
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
    prisma.qRCode.count({ where: filters.qrCode }),
    prisma.scanEvent.count({ where: filters.scanEvent }),
    prisma.scanEvent.groupBy({
      by: ["anonymousVisitorId"],
      where: { ...filters.scanEvent, anonymousVisitorId: { not: null } },
    }),
    prisma.scanEvent.count({ where: { ...filters.scanEvent, isRepeatScan: true } }),
    prisma.scanEvent.count({
      where: { ...filters.scanEvent, isBillable: true, isSuspicious: false, isInternalTest: false },
    }),
    prisma.scanEvent.count({ where: { ...filters.scanEvent, isSuspicious: true } }),
    prisma.rewardClaim.count({ where: { ...filters.rewardClaim, status: "APPROVED" } }),
    prisma.rewardClaim.count({ where: { ...filters.rewardClaim, status: "DECLINED_DUPLICATE" } }),
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
      take: 5,
    }),

    // Top products by scans (indirectly via product filter)
    prisma.product.findMany({
      where: filters.campaign.brandId ? { brandId: filters.campaign.brandId } : {},
      include: {
        brand: { select: { name: true } },
      },
      take: 5,
    }),

    // Top locations
    prisma.scanEvent.groupBy({
      by: ["city", "suburb", "country"],
      where: filters.scanEvent,
      _count: { id: true },
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

  // Aggregate metrics for top campaigns
  const campaignPerformance = await Promise.all(
    campaignsRaw.map(async (c) => {
      const [scansCount, approvedClaims, duplicateDeclines, deliveryScans, delivAgg] =
        await Promise.all([
          prisma.scanEvent.count({ where: { ...filters.scanEvent, campaignId: c.id } }),
          prisma.rewardClaim.count({
            where: { ...filters.rewardClaim, campaignId: c.id, status: "APPROVED" },
          }),
          prisma.rewardClaim.count({
            where: { ...filters.rewardClaim, campaignId: c.id, status: "DECLINED_DUPLICATE" },
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
        totalScans: scansCount,
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
      const [scansCount, approvedClaims, delivAgg] = await Promise.all([
        prisma.scanEvent.count({ where: { ...filters.scanEvent, productId: p.id } }),
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
        totalScans: scansCount,
        approvedClaims,
        estimatedUnitsDelivered: delivAgg._sum.estimatedUnitsDelivered ?? 0,
      };
    })
  );

  // Sort and take top 5 locations in memory
  const sortedLocations = [...locationsRaw]
    .sort((a, b) => (b._count?.id ?? 0) - (a._count?.id ?? 0))
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
        totalScans: loc._count?.id ?? 0,
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

export async function getAdminAnalyticsDashboardData(): Promise<AnalyticsDashboardData> {
  const filters = {
    campaign: {},
    qrCode: {},
    scanEvent: {},
    rewardClaim: {},
    deliveryScan: {},
  };
  return computeMetricsAndPerformance(filters);
}

export async function getBrandAnalyticsDashboardData(brandId: string): Promise<AnalyticsDashboardData> {
  const filters = {
    campaign: { brandId },
    qrCode: { brandId },
    scanEvent: { brandId },
    rewardClaim: { brandId },
    deliveryScan: { brandId },
  };
  return computeMetricsAndPerformance(filters);
}

export async function getCampaignManagerAnalyticsDashboardData(
  userId: string,
  brandId?: string | null
): Promise<AnalyticsDashboardData> {
  const cmAssignments = await prisma.campaignAssignment.findMany({
    where: { userId },
    select: { campaignId: true },
  });
  const campaignIds = cmAssignments.map((a) => a.campaignId);

  if (campaignIds.length === 0) {
    return {
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
  }

  const campaignQuery: any = { id: { in: campaignIds } };
  if (brandId) {
    campaignQuery.brandId = brandId;
  }

  const filters = {
    campaign: campaignQuery,
    qrCode: { campaignId: { in: campaignIds } },
    scanEvent: { campaignId: { in: campaignIds } },
    rewardClaim: { campaignId: { in: campaignIds } },
    deliveryScan: { campaignId: { in: campaignIds } },
  };
  return computeMetricsAndPerformance(filters);
}

export async function getAdvertiserAnalyticsDashboardData(advertiserId: string): Promise<AnalyticsDashboardData> {
  const filters = {
    campaign: { advertiserId },
    qrCode: { advertiserId },
    scanEvent: { advertiserId },
    rewardClaim: { advertiserId },
    deliveryScan: { campaign: { advertiserId } },
  };
  return computeMetricsAndPerformance(filters);
}
