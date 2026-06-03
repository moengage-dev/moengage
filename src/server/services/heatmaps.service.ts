// src/server/services/heatmaps.service.ts
import prisma from "@/lib/prisma";

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
}

function toNumber(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return val;
  const parsed = parseFloat(val.toString());
  return isNaN(parsed) ? null : parsed;
}

export async function getAdminHeatmapData(filters: HeatmapFilters): Promise<HeatmapData> {
  const scanWhere: any = {};
  const deliveryWhere: any = {};

  if (filters.brandId) {
    scanWhere.brandId = filters.brandId;
    deliveryWhere.brandId = filters.brandId;
  }
  if (filters.advertiserId) {
    scanWhere.advertiserId = filters.advertiserId;
    deliveryWhere.campaign = { advertiserId: filters.advertiserId };
  }
  if (filters.campaignId) {
    scanWhere.campaignId = filters.campaignId;
    deliveryWhere.campaignId = filters.campaignId;
  }
  if (filters.productId) {
    scanWhere.productId = filters.productId;
    deliveryWhere.qrCode = { productId: filters.productId };
  }
  if (filters.batchId) {
    scanWhere.batchId = filters.batchId;
    deliveryWhere.batchId = filters.batchId;
  }

  // Date range filters
  if (filters.startDate || filters.endDate) {
    const scanDateFilter: any = {};
    const deliveryDateFilter: any = {};

    if (filters.startDate) {
      const start = new Date(filters.startDate);
      scanDateFilter.gte = start;
      deliveryDateFilter.gte = start;
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      scanDateFilter.lte = end;
      deliveryDateFilter.lte = end;
    }

    scanWhere.createdAt = scanDateFilter;
    deliveryWhere.createdAt = deliveryDateFilter;
  }

  const [
    brands,
    advertisers,
    campaigns,
    products,
    batches,
    scans,
    deliveries,
    totalScanCount,
    totalDeliveryCount,
    totalBillableScans,
    totalRepeatScans,
    cartonsAgg,
    unitsAgg,
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
      orderBy: { createdAt: "desc" },
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
      orderBy: { createdAt: "desc" },
    }),

    prisma.scanEvent.count({ where: scanWhere }),
    prisma.deliveryScan.count({ where: deliveryWhere }),
    prisma.scanEvent.count({
      where: {
        ...scanWhere,
        isBillable: true,
        isSuspicious: false,
        isInternalTest: false,
      },
    }),
    prisma.scanEvent.count({
      where: {
        ...scanWhere,
        isRepeatScan: true,
      },
    }),
    prisma.deliveryScan.aggregate({
      _sum: { cartonsDelivered: true },
      where: deliveryWhere,
    }),
    prisma.deliveryScan.aggregate({
      _sum: { estimatedUnitsDelivered: true },
      where: deliveryWhere,
    }),
  ]);

  const consumerEngagementMarkers: ConsumerScanMarker[] = scans.map((s) => ({
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
    isRepeatScan: s.isRepeatScan,
    isBillable: s.isBillable,
    isSuspicious: s.isSuspicious,
  }));

  const deliveryDistributionMarkers: DeliveryMarker[] = deliveries.map((d) => ({
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
  };
}
