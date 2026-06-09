// src/server/services/reports.service.ts
import prisma from "@/lib/prisma";
import { ReportFilterParams } from "@/lib/validators/report-filter.validator";
import type { RoleScopeFilters } from "@/lib/auth/role-scope";

export type ReportParams = ReportFilterParams & RoleScopeFilters;

type BuildWhereOptions = {
  startDate?: string;
  endDate?: string;
};

function buildDateFilter(options: BuildWhereOptions) {
  const dateFilter: any = {};
  if (options.startDate) {
    dateFilter.gte = new Date(options.startDate);
  }
  if (options.endDate) {
    const end = new Date(options.endDate);
    end.setHours(23, 59, 59, 999);
    dateFilter.lte = end;
  }
  return Object.keys(dateFilter).length > 0 ? dateFilter : undefined;
}

function applyRoleScope(where: any, filters: ReportParams, isCampaignModel: boolean = false) {
  if (filters.brandId) {
    where.brandId = filters.brandId;
  }
  if (filters.advertiserId) {
    where.advertiserId = filters.advertiserId;
  }
  if (filters.campaignId) {
    if (isCampaignModel) {
      where.id = filters.campaignId;
    } else {
      where.campaignId = filters.campaignId;
    }
  }
  return where;
}

export async function getCampaignSummaryData(filters: ReportParams) {
  const createdAtFilter = buildDateFilter(filters);
  const whereClause: any = createdAtFilter ? { createdAt: createdAtFilter } : {};
  applyRoleScope(whereClause, filters, true);

  const campaigns = await prisma.campaign.findMany({
    where: whereClause,
    include: {
      brand: { select: { name: true } },
      advertiser: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return campaigns;
}

export async function getScanEventsData(filters: ReportParams) {
  const createdAtFilter = buildDateFilter(filters);
  const whereClause: any = createdAtFilter ? { createdAt: createdAtFilter } : {};
  applyRoleScope(whereClause, filters, false);

  const scanEvents = await prisma.scanEvent.findMany({
    where: whereClause,
    include: {
      campaign: { select: { name: true } },
      product: { select: { name: true } },
      brand: { select: { name: true } },
      advertiser: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return scanEvents;
}

export async function getRewardClaimsData(filters: ReportParams) {
  const createdAtFilter = buildDateFilter(filters);
  const whereClause: any = createdAtFilter ? { createdAt: createdAtFilter } : {};
  applyRoleScope(whereClause, filters, false);

  const rewardClaims = await prisma.rewardClaim.findMany({
    where: whereClause,
    include: {
      campaign: { select: { name: true } },
      brand: { select: { name: true } },
      advertiser: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return rewardClaims;
}

export async function getDeliveryScansData(filters: ReportParams) {
  const createdAtFilter = buildDateFilter(filters);
  const whereClause: any = createdAtFilter ? { createdAt: createdAtFilter } : {};

  if (filters.brandId) whereClause.brandId = filters.brandId;
  if (filters.campaignId) whereClause.campaignId = filters.campaignId;
  // DeliveryScan has no advertiserId column, so an ADVERTISER_VIEWER must be
  // scoped through the related campaign. Without this, an advertiser hitting
  // the endpoint directly would receive every brand's delivery scans (cross-tenant leak).
  if (filters.advertiserId) {
    whereClause.campaign = { advertiserId: filters.advertiserId };
  }

  const deliveryScans = await prisma.deliveryScan.findMany({
    where: whereClause,
    include: {
      campaign: { select: { name: true } },
      batch: { select: { batchCode: true } },
      retailer: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return deliveryScans;
}

export async function getSuspiciousScansData(filters: ReportParams) {
  const createdAtFilter = buildDateFilter(filters);
  const whereClause: any = {
    OR: [
      { isSuspicious: true },
      { suspiciousReason: { not: null } },
      { isBillable: false },
    ],
  };

  if (createdAtFilter) {
    whereClause.createdAt = createdAtFilter;
  }
  applyRoleScope(whereClause, filters, false);

  const suspiciousScans = await prisma.scanEvent.findMany({
    where: whereClause,
    include: {
      campaign: { select: { name: true } },
      product: { select: { name: true } },
      brand: { select: { name: true } },
      advertiser: { select: { name: true } },
      qrCode: { select: { code: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return suspiciousScans;
}

export async function getBillingSummaryData(filters: ReportParams) {
  const where: any = {};
  if (filters.brandId) where.brandId = filters.brandId;
  if (filters.advertiserId) where.advertiserId = filters.advertiserId;
  if (filters.campaignId) where.campaignId = filters.campaignId;

  if (filters.startDate || filters.endDate) {
    where.generatedAt = {};
    if (filters.startDate) where.generatedAt.gte = new Date(filters.startDate);
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      where.generatedAt.lte = end;
    }
  }

  const summaries = await prisma.billingSummary.findMany({
    where,
    include: {
      campaign: { select: { name: true } },
      brand: { select: { name: true } },
      advertiser: { select: { name: true } },
    },
    orderBy: { generatedAt: "desc" },
  });

  return summaries.map((s) => ({
    campaignId: s.campaignId,
    campaignName: s.campaign.name,
    brandName: s.brand?.name || "—",
    advertiserName: s.advertiser?.name || "—",
    fixedFeePerUnit: s.fixedFeePerUnit ? s.fixedFeePerUnit.toNumber() : 0,
    engagementFeePerScan: s.engagementFeePerScan ? s.engagementFeePerScan.toNumber() : 0,
    currency: s.currency,
    estimatedUnitsPlaced: s.estimatedUnitsPlaced,
    totalScans: s.totalScanCount,
    billableScanCount: s.billableScanCount,
    nonBillableScanCount: s.totalScanCount - s.billableScanCount,
    rewardClaimsApproved: s.approvedRewardClaims,
    duplicateRewardClaimsDeclined: s.duplicateRewardDeclines,
    fixedFeeTotal: s.fixedFeeTotal ? s.fixedFeeTotal.toNumber() : 0,
    engagementFeeTotal: s.engagementFeeTotal ? s.engagementFeeTotal.toNumber() : 0,
    totalAmount: s.totalAmount ? s.totalAmount.toNumber() : 0,
    generatedAt: s.generatedAt,
  }));
}
