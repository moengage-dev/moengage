// src/server/services/billing.service.ts
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

export type BillingSummaryRow = {
  id?: string;
  campaignId: string;
  campaignName: string;
  brandName: string;
  advertiserName: string;
  
  fixedFeePerUnit: number;
  engagementFeePerScan: number;
  currency: string;
  
  estimatedUnitsPlaced: number;
  totalScans: number;
  billableScanCount: number;
  nonBillableScanCount: number;
  
  rewardClaimsApproved: number;
  duplicateRewardClaimsDeclined: number;
  
  fixedFeeTotal: number;
  engagementFeeTotal: number;
  totalAmount: number;
  
  generatedAt: Date;
};

export type BillingDashboardData = {
  summaries: BillingSummaryRow[];
  totals: {
    estimatedUnitsPlaced: number;
    billableScans: number;
    fixedFees: number;
    engagementFees: number;
    totalAmount: number;
    approvedRewards: number;
  };
};

export type BillingFilterParams = {
  brandId?: string;
  advertiserId?: string;
  campaignId?: string;
  startDate?: string;
  endDate?: string;
};

export async function getAdminBillingPageData(
  filters: BillingFilterParams = {}
): Promise<BillingDashboardData> {
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

  const rows = summaries.map((s) => ({
    id: s.id,
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

  const totals = {
    estimatedUnitsPlaced: rows.reduce((sum, r) => sum + r.estimatedUnitsPlaced, 0),
    billableScans: rows.reduce((sum, r) => sum + r.billableScanCount, 0),
    fixedFees: rows.reduce((sum, r) => sum + r.fixedFeeTotal, 0),
    engagementFees: rows.reduce((sum, r) => sum + r.engagementFeeTotal, 0),
    totalAmount: rows.reduce((sum, r) => sum + r.totalAmount, 0),
    approvedRewards: rows.reduce((sum, r) => sum + r.rewardClaimsApproved, 0),
  };

  return { summaries: rows, totals };
}

export async function getBrandBillingPageData(
  brandId: string,
  filters: BillingFilterParams = {}
): Promise<BillingDashboardData> {
  return getAdminBillingPageData({ ...filters, brandId });
}

export async function getAdvertiserBillingPageData(
  advertiserId: string,
  filters: BillingFilterParams = {}
): Promise<BillingDashboardData> {
  return getAdminBillingPageData({ ...filters, advertiserId });
}

// Deprecated fallback to keep backward compatibility
export async function getCampaignBillingSummaries(
  filters: BillingFilterParams = {},
  scope?: { brandId?: string; advertiserId?: string; campaignId?: string } | null
): Promise<BillingDashboardData> {
  const brandId = scope?.brandId || filters.brandId;
  const advertiserId = scope?.advertiserId || filters.advertiserId;
  const campaignId = scope?.campaignId || filters.campaignId;
  return getAdminBillingPageData({ ...filters, brandId, advertiserId, campaignId });
}

export async function generateCampaignBillingSummary(
  campaignId: string,
  generatedByUserId: string
) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  // 1. estimatedUnitsPlaced:
  // Prefer sum of DeliveryScan.estimatedUnitsDelivered for campaign.
  const deliveryAgg = await prisma.deliveryScan.aggregate({
    _sum: { estimatedUnitsDelivered: true },
    where: { campaignId },
  });

  let estimatedUnitsPlaced = deliveryAgg._sum.estimatedUnitsDelivered ?? 0;

  // Fallback to Batch estimatedUnitCount sum if no delivery scans
  if (estimatedUnitsPlaced === 0) {
    const batchAgg = await prisma.batch.aggregate({
      _sum: { estimatedUnitCount: true },
      where: { campaignId },
    });
    estimatedUnitsPlaced = batchAgg._sum.estimatedUnitCount ?? 0;
  }

  // 2. Calculations
  const fixedFeePerUnit = campaign.fixedFeePerUnit ?? new Prisma.Decimal(0);
  const fixedFeeTotal = fixedFeePerUnit.mul(estimatedUnitsPlaced);

  // Fetch scan events stats using aggregated counters
  const [
    totalScanAgg,
    repeatScanAgg,
    suspiciousScanAgg,
    internalScanAgg,
    billableScanAgg,
    uniqueScanCountRes,
  ] = await Promise.all([
    prisma.scanEvent.aggregate({
      _sum: { hitCount: true },
      where: { campaignId },
    }),
    prisma.scanEvent.aggregate({
      _sum: { repeatCount: true },
      where: { campaignId },
    }),
    prisma.scanEvent.aggregate({
      _sum: { suspiciousCount: true },
      where: { campaignId },
    }),
    prisma.scanEvent.aggregate({
      _sum: { hitCount: true },
      where: { campaignId, isInternalTest: true },
    }),
    prisma.scanEvent.aggregate({
      _sum: { billableCount: true },
      where: {
        campaignId,
      },
    }),
    prisma.scanEvent.groupBy({
      by: ['anonymousVisitorId'],
      where: { campaignId, anonymousVisitorId: { not: null } },
    }),
  ]);

  const totalScanCount = totalScanAgg._sum.hitCount ?? 0;
  const repeatScanCount = repeatScanAgg._sum.repeatCount ?? 0;
  const suspiciousScanCount = suspiciousScanAgg._sum.suspiciousCount ?? 0;
  const internalTestScanCount = internalScanAgg._sum.hitCount ?? 0;
  const billableScanCount = billableScanAgg._sum.billableCount ?? 0;
  const uniqueScanCount = uniqueScanCountRes.length;

  const engagementFeePerScan = campaign.engagementFeePerScan ?? new Prisma.Decimal(0);
  const engagementFeeTotal = engagementFeePerScan.mul(billableScanCount);

  // Approved Rewards
  const approvedRewardClaims = await prisma.rewardClaim.count({
    where: { campaignId, status: "APPROVED" },
  });

  // Duplicate Reward Claims
  const duplicateRewardDeclines = await prisma.rewardClaimAttempt.count({
    where: { campaignId, status: "DECLINED_DUPLICATE" },
  });

  // Total Amount
  const totalAmount = fixedFeeTotal.add(engagementFeeTotal);

  // 3. Upsert into BillingSummary
  const existing = await prisma.billingSummary.findFirst({
    where: { campaignId },
  });

  const summaryData = {
    brandId: campaign.brandId,
    advertiserId: campaign.advertiserId,
    campaignId: campaign.id,
    fixedFeePerUnit,
    estimatedUnitsPlaced,
    fixedFeeTotal,
    engagementFeePerScan,
    totalScanCount,
    uniqueScanCount,
    repeatScanCount,
    suspiciousScanCount,
    internalTestScanCount,
    billableScanCount,
    engagementFeeTotal,
    approvedRewardClaims,
    duplicateRewardDeclines,
    totalAmount,
    currency: campaign.currency || "USD",
    generatedAt: new Date(),
  };

  if (existing) {
    const metadata = {
      campaignId,
      billingSummaryId: existing.id,
      previousTotalAmount: existing.totalAmount,
      newTotalAmount: summaryData.totalAmount,
      previousBillableScans: existing.billableScanCount,
      newBillableScans: summaryData.billableScanCount,
    };

    // UPDATE path: already atomic from a prior fix
    const [updated] = await prisma.$transaction([
      prisma.billingSummary.update({
        where: { id: existing.id },
        data: summaryData,
      }),
      prisma.auditLog.create({
        data: {
          userId: generatedByUserId,
          action: "GENERATE_BILLING_SUMMARY",
          entityType: "BillingSummary",
          entityId: existing.id,
          metadata,
        },
      }),
    ]);
    return updated;
  } else {
    // CREATE path: wrap creation + audit in an interactive transaction so they
    // succeed or fail together.
    return prisma.$transaction(async (tx) => {
      const created = await tx.billingSummary.create({
        data: summaryData,
      });

      const metadata = {
        campaignId,
        billingSummaryId: created.id,
        previousTotalAmount: 0,
        newTotalAmount: summaryData.totalAmount,
        previousBillableScans: 0,
        newBillableScans: summaryData.billableScanCount,
      };

      await tx.auditLog.create({
        data: {
          userId: generatedByUserId,
          action: "GENERATE_BILLING_SUMMARY",
          entityType: "BillingSummary",
          entityId: created.id,
          metadata,
        },
      });

      return created;
    });
  }
}

export async function regenerateAllCampaignBillingSummaries(generatedByUserId: string) {
  const campaigns = await prisma.campaign.findMany({
    select: { id: true },
  });

  const runId = randomUUID();
  const startedAt = new Date();
  const totalCampaigns = campaigns.length;

  // Write STARTED audit event before touching any summaries.
  // If this fails we do not proceed — the caller receives the error.
  await prisma.auditLog.create({
    data: {
      userId: generatedByUserId,
      action: "REGENERATE_ALL_BILLING_STARTED",
      entityType: "BillingSummary",
      metadata: { runId, totalCampaigns, startedAt },
    },
  });

  let processedCount = 0;

  try {
    for (const c of campaigns) {
      // Each individual campaign summary + its audit entry is already atomic
      // inside generateCampaignBillingSummary (see CREATE and UPDATE paths above).
      await generateCampaignBillingSummary(c.id, generatedByUserId);
      processedCount++;
    }
  } catch (err) {
    const failedCampaignId = campaigns[processedCount]?.id ?? "unknown";
    const safeErrorMessage =
      err instanceof Error ? err.message.substring(0, 200) : "unknown error";

    await prisma.auditLog.create({
      data: {
        userId: generatedByUserId,
        action: "REGENERATE_ALL_BILLING_FAILED",
        entityType: "BillingSummary",
        metadata: {
          runId,
          totalCampaigns,
          processedCount,
          failedCampaignId,
          errorSummary: safeErrorMessage,
          failedAt: new Date(),
        },
      },
    });

    throw err;
  }

  const completedAt = new Date();
  await prisma.auditLog.create({
    data: {
      userId: generatedByUserId,
      action: "REGENERATE_ALL_BILLING_COMPLETED",
      entityType: "BillingSummary",
      metadata: {
        runId,
        totalCampaigns,
        processedCount,
        startedAt,
        completedAt,
      },
    },
  });
}
