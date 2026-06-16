// src/server/services/heatmaps.service.ts
import prisma from "@/lib/prisma";
import { getAssignedCampaignIds } from "@/lib/auth/role-scope";
import type { CurrentUser } from "@/lib/auth/get-current-user";

export interface HeatmapFilters {
  brandId?: string;
  advertiserId?: string;
  campaignId?: string;
  productId?: string;
  batchId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ConsumerScanMarker {
  id: string;
  type: "SCAN";
  createdAt: Date;
  brandName: string;
  advertiserName: string;
  campaignName: string;
  productName: string;
  batchCode: string;
  city: string;
  suburb: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  hitCount: number;
  repeatCount: number;
  suspiciousCount: number;
  billableCount: number;
  isRepeatScan: boolean;
  isBillable: boolean;
  isSuspicious: boolean;
}

export interface DeliveryMarker {
  id: string;
  type: "DELIVERY";
  createdAt: Date;
  brandName: string;
  campaignName: string;
  productName: string;
  batchCode: string;
  retailerName: string;
  city: string;
  suburb: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  cartonsDelivered: number;
  estimatedUnitsDelivered: number;
}

export interface HeatmapData {
  filterOptions: {
    brands: { id: string; name: string }[];
    advertisers: { id: string; name: string }[];
    campaigns: { id: string; name: string }[];
    products: { id: string; name: string }[];
    batches: { id: string; name: string }[];
  };
  consumerEngagementMarkers: ConsumerScanMarker[];
  deliveryDistributionMarkers: DeliveryMarker[];
  summaryCounts: {
    totalScanCount: number;
    totalDeliveryCount: number;
    totalBillableScans: number;
    totalRepeatScans: number;
    totalCartonsDelivered: number;
    totalEstimatedUnitsDelivered: number;
  };
  metadata: {
    totalMatchingConsumerPoints: number;
    returnedConsumerPoints: number;
    totalMatchingDeliveryPoints: number;
    returnedDeliveryPoints: number;
    isConsumerDataTruncated: boolean;
    isDeliveryDataTruncated: boolean;
  };
}

function toNumber(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return val;
  const parsed = parseFloat(val.toString());
  return isNaN(parsed) ? null : parsed;
}

export async function getAdminHeatmapData(
  filters: HeatmapFilters,
  user?: CurrentUser
): Promise<HeatmapData> {
  const scanWhere: any = {};
  const deliveryWhere: any = {};

  // User scope check (Task B)
  if (user) {
    if (user.role === "BRAND_ADMIN") {
      const bId = user.brandId || "NONE";
      scanWhere.brandId = bId;
      deliveryWhere.brandId = bId;
    } else if (user.role === "CAMPAIGN_MANAGER") {
      const assignedCampaignIds = await getAssignedCampaignIds(user.id);
      scanWhere.campaignId = { in: assignedCampaignIds };
      deliveryWhere.campaignId = { in: assignedCampaignIds };
    } else if (user.role === "ADVERTISER_VIEWER") {
      const advId = user.advertiserId || "NONE";
      scanWhere.advertiserId = advId;
      deliveryWhere.campaign = { advertiserId: advId };
    }
  }

  // Filter parameters
  if (filters.brandId) {
    if (scanWhere.brandId && scanWhere.brandId !== filters.brandId) {
      scanWhere.brandId = "NONE";
      deliveryWhere.brandId = "NONE";
    } else {
      scanWhere.brandId = filters.brandId;
      deliveryWhere.brandId = filters.brandId;
    }
  }
  if (filters.advertiserId) {
    if (scanWhere.advertiserId && scanWhere.advertiserId !== filters.advertiserId) {
      scanWhere.advertiserId = "NONE";
      deliveryWhere.campaign = { advertiserId: "NONE" };
    } else {
      scanWhere.advertiserId = filters.advertiserId;
      deliveryWhere.campaign = { advertiserId: filters.advertiserId };
    }
  }
  if (filters.campaignId) {
    if (scanWhere.campaignId) {
      if (user && user.role === "CAMPAIGN_MANAGER") {
        const assignedCampaignIds = await getAssignedCampaignIds(user.id);
        if (!assignedCampaignIds.includes(filters.campaignId)) {
          scanWhere.campaignId = "NONE";
          deliveryWhere.campaignId = "NONE";
        } else {
          scanWhere.campaignId = filters.campaignId;
          deliveryWhere.campaignId = filters.campaignId;
        }
      } else {
        scanWhere.campaignId = filters.campaignId;
        deliveryWhere.campaignId = filters.campaignId;
      }
    } else {
      scanWhere.campaignId = filters.campaignId;
      deliveryWhere.campaignId = filters.campaignId;
    }
  }
  if (filters.productId) {
    scanWhere.productId = filters.productId;
    deliveryWhere.qrCode = { productId: filters.productId };
  }
  if (filters.batchId) {
    scanWhere.batchId = filters.batchId;
    deliveryWhere.batchId = filters.batchId;
  }

  // Default date range when no dates are supplied: previous 90 days
  let startDate = filters.startDate;
  let endDate = filters.endDate;
  if (!startDate && !endDate) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 90);
    startDate = start.toISOString().split("T")[0];
    endDate = end.toISOString().split("T")[0];
  }

  // Date range filters
  const scanDateFilter: any = {};
  const deliveryDateFilter: any = {};

  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    scanDateFilter.gte = start;
    deliveryDateFilter.gte = start;
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    scanDateFilter.lte = end;
    deliveryDateFilter.lte = end;
  }

  scanWhere.createdAt = scanDateFilter;
  deliveryWhere.createdAt = deliveryDateFilter;

  const [
    brands,
    advertisers,
    campaigns,
    products,
    batches,
    scans,
    deliveries,
    scanEventAgg,
    totalDeliveryCount,
    cartonsAgg,
    unitsAgg,
    totalMatchingConsumerPoints,
  ] = await Promise.all([
    prisma.brand.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.advertiser.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.campaign.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.batch.findMany({ select: { id: true, batchCode: true }, orderBy: { batchCode: "asc" } }),

    prisma.scanEvent.findMany({
      where: scanWhere,
      include: {
        brand: { select: { name: true } },
        advertiser: { select: { name: true } },
        campaign: { select: { name: true } },
        product: { select: { name: true } },
        batch: { select: { batchCode: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 2001,
    }),

    prisma.deliveryScan.findMany({
      where: deliveryWhere,
      include: {
        brand: { select: { name: true } },
        campaign: { select: { name: true } },
        batch: { select: { batchCode: true } },
        retailer: { select: { name: true } },
        qrCode: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 2001,
    }),

    prisma.scanEvent.aggregate({
      _sum: {
        hitCount: true,
        billableCount: true,
        repeatCount: true,
      },
      where: scanWhere,
    }),
    prisma.deliveryScan.count({ where: deliveryWhere }),
    prisma.deliveryScan.aggregate({
      _sum: { cartonsDelivered: true },
      where: deliveryWhere,
    }),
    prisma.deliveryScan.aggregate({
      _sum: { estimatedUnitsDelivered: true },
      where: deliveryWhere,
    }),
    prisma.scanEvent.count({ where: scanWhere }),
  ]);

  const totalScanCount = scanEventAgg._sum.hitCount ?? 0;
  const totalBillableScans = scanEventAgg._sum.billableCount ?? 0;
  const totalRepeatScans = scanEventAgg._sum.repeatCount ?? 0;

  const isConsumerDataTruncated = scans.length > 2000;
  const isDeliveryDataTruncated = deliveries.length > 2000;

  const consumerEngagementMarkers: ConsumerScanMarker[] = scans.slice(0, 2000).map((s) => ({
    id: s.id,
    type: "SCAN",
    createdAt: s.createdAt,
    brandName: s.brand?.name ?? "—",
    advertiserName: s.advertiser?.name ?? "—",
    campaignName: s.campaign?.name ?? "—",
    productName: s.product?.name ?? "—",
    batchCode: s.batch?.batchCode ?? "—",
    city: s.city ?? "",
    suburb: s.suburb ?? "",
    country: s.country ?? "",
    latitude: toNumber(s.latitude),
    longitude: toNumber(s.longitude),
    hitCount: s.hitCount,
    repeatCount: s.repeatCount,
    suspiciousCount: s.suspiciousCount,
    billableCount: s.billableCount,
    isRepeatScan: s.isRepeatScan,
    isBillable: s.isBillable,
    isSuspicious: s.isSuspicious,
  }));

  const deliveryDistributionMarkers: DeliveryMarker[] = deliveries.slice(0, 2000).map((d) => ({
    id: d.id,
    type: "DELIVERY",
    createdAt: d.createdAt,
    brandName: d.brand?.name ?? "—",
    campaignName: d.campaign?.name ?? "—",
    productName: d.qrCode?.product?.name ?? "—",
    batchCode: d.batch?.batchCode ?? "—",
    retailerName: d.retailer?.name ?? "—",
    city: d.city ?? "",
    suburb: d.suburb ?? "",
    country: d.country ?? "",
    latitude: toNumber(d.latitude),
    longitude: toNumber(d.longitude),
    cartonsDelivered: d.cartonsDelivered,
    estimatedUnitsDelivered: d.estimatedUnitsDelivered,
  }));

  return {
    filterOptions: {
      brands,
      advertisers,
      campaigns,
      products,
      batches: batches.map((b) => ({ id: b.id, name: b.batchCode })),
    },
    consumerEngagementMarkers,
    deliveryDistributionMarkers,
    summaryCounts: {
      totalScanCount,
      totalDeliveryCount,
      totalBillableScans,
      totalRepeatScans,
      totalCartonsDelivered: cartonsAgg._sum.cartonsDelivered ?? 0,
      totalEstimatedUnitsDelivered: unitsAgg._sum.estimatedUnitsDelivered ?? 0,
    },
    metadata: {
      totalMatchingConsumerPoints,
      returnedConsumerPoints: consumerEngagementMarkers.length,
      totalMatchingDeliveryPoints: totalDeliveryCount,
      returnedDeliveryPoints: deliveryDistributionMarkers.length,
      isConsumerDataTruncated,
      isDeliveryDataTruncated,
    },
  };
}
