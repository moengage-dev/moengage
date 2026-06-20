"use server";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";
import { toCampaignOptionDTO, toRetailerOptionDTO } from "@/lib/dtos/delivery.dto";

export async function getBrandDeliveryFilterOptions() {
  const user = await requireRole(["BRAND_ADMIN"]);

  if (!user.brandId) {
    return {
      brands: [],
      advertisers: [],
      campaigns: [],
      products: [],
      batches: [],
      retailers: [],
      brandAdvertiserIds: {},
      locations: [],
    };
  }

  const brandId = user.brandId;

  const [campaigns, products, batches, retailers, locationGroups] = await Promise.all([
    prisma.campaign.findMany({
      where: { brandId },
      select: { id: true, name: true, brandId: true, advertiserId: true, productId: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { brandId },
      select: { id: true, name: true, brandId: true },
      orderBy: { name: "asc" },
    }),
    prisma.batch.findMany({
      where: { brandId },
      select: { id: true, batchCode: true, campaignId: true, productId: true },
      orderBy: { batchCode: "asc" },
    }),
    prisma.retailer.findMany({
      where: { brandId },
      select: { id: true, name: true, brandId: true },
      orderBy: { name: "asc" },
    }),
    prisma.deliveryScan.groupBy({
      by: ["country", "region", "city"],
      where: { brandId, country: { not: null } },
      _count: { id: true },
    }),
  ]);

  const advertiserIds = [...new Set(campaigns.map((c) => c.advertiserId))];
  const advertisers = await prisma.advertiser.findMany({
    where: { id: { in: advertiserIds } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const brandAdvertiserIds: Record<string, string[]> = { [brandId]: advertiserIds };

  return {
    brands: [{ id: brandId, name: "" }],
    advertisers,
    campaigns: campaigns.map(toCampaignOptionDTO),
    products,
    batches,
    retailers: retailers.map(toRetailerOptionDTO),
    brandAdvertiserIds,
    locations: locationGroups.map((g) => ({
      country: g.country as string,
      region: g.region,
      city: g.city,
    })),
  };
}
