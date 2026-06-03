// src/server/services/reports.service.ts
import prisma from "@/lib/prisma";
import { ReportFilterParams } from "@/lib/validators/report-filter.validator";

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
    dateFilter.lte = new Date(options.endDate);
  }
  return Object.keys(dateFilter).length > 0 ? dateFilter : undefined;
}

export async function getCampaignSummaryData(filters: ReportFilterParams) {
  const createdAtFilter = buildDateFilter(filters);
  const whereClause = createdAtFilter ? { createdAt: createdAtFilter } : {};

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

export async function getScanEventsData(filters: ReportFilterParams) {
  const createdAtFilter = buildDateFilter(filters);
  const whereClause = createdAtFilter ? { createdAt: createdAtFilter } : {};

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

export async function getRewardClaimsData(filters: ReportFilterParams) {
  const createdAtFilter = buildDateFilter(filters);
  const whereClause = createdAtFilter ? { createdAt: createdAtFilter } : {};

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

export async function getDeliveryScansData(filters: ReportFilterParams) {
  const createdAtFilter = buildDateFilter(filters);
  const whereClause = createdAtFilter ? { createdAt: createdAtFilter } : {};

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

export async function getBillingSummaryData(filters: ReportFilterParams) {
  const generatedAtFilter = buildDateFilter(filters);
  const whereClause = generatedAtFilter ? { generatedAt: generatedAtFilter } : {};

  const summaries = await prisma.billingSummary.findMany({
    where: whereClause,
    include: {
      campaign: { select: { name: true } },
      brand: { select: { name: true } },
      advertiser: { select: { name: true } },
    },
    orderBy: { generatedAt: "desc" },
  });

  return summaries;
}
