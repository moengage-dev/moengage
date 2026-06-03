// src/server/services/admin-dashboard.service.ts
import prisma from "@/lib/prisma";

export type AdminDashboardStats = {
  totalBrands: number;
  activeBrands: number;
  totalAdvertisers: number;
  activeAdvertisers: number;
  totalProducts: number;
  activeProducts: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  totalQrCodes: number;
  totalScanEvents: number;
  totalRewardClaims: number;
  totalDeliveryScans: number;
  estimatedBillingTotal: number;
};

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const [
    totalBrands,
    activeBrands,
    totalAdvertisers,
    activeAdvertisers,
    totalProducts,
    activeProducts,
    totalCampaigns,
    activeCampaigns,
    totalUsers,
    activeUsers,
    verifiedUsers,
    totalQrCodes,
    totalScanEvents,
    totalRewardClaims,
    totalDeliveryScans,
    billingAgg,
  ] = await Promise.all([
    prisma.brand.count(),
    prisma.brand.count({ where: { status: "ACTIVE" } }),
    prisma.advertiser.count(),
    prisma.advertiser.count({ where: { status: "ACTIVE" } }),
    prisma.product.count(),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.campaign.count(),
    prisma.campaign.count({ where: { status: "ACTIVE" } }),
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isEmailVerified: true } }),
    prisma.qRCode.count(),
    prisma.scanEvent.count(),
    prisma.rewardClaim.count(),
    prisma.deliveryScan.count(),
    prisma.billingSummary.aggregate({ _sum: { totalAmount: true } }),
  ]);

  const rawTotal = billingAgg._sum.totalAmount;
  const estimatedBillingTotal =
    rawTotal !== null ? rawTotal.toNumber() : 0;

  return {
    totalBrands,
    activeBrands,
    totalAdvertisers,
    activeAdvertisers,
    totalProducts,
    activeProducts,
    totalCampaigns,
    activeCampaigns,
    totalUsers,
    activeUsers,
    verifiedUsers,
    totalQrCodes,
    totalScanEvents,
    totalRewardClaims,
    totalDeliveryScans,
    estimatedBillingTotal,
  };
}
