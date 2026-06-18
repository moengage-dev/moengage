"use server";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";
import { revalidatePath } from "next/cache";
import { generateCampaignBillingSummary } from "@/server/services/billing.service";
import { Prisma } from "@prisma/client";

import { toCampaignOptionDTO, toRetailerOptionDTO } from "@/lib/dtos/delivery.dto";

export async function getDeliveryFilterOptions() {
  await requireRole(["ADMIN"]);

  const [brands, advertisers, campaigns, products, batches, retailers, locationGroups] = await Promise.all([
    prisma.brand.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.advertiser.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.campaign.findMany({
      select: { id: true, name: true, brandId: true, advertiserId: true, productId: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({ select: { id: true, name: true, brandId: true }, orderBy: { name: "asc" } }),
    prisma.batch.findMany({
      select: { id: true, batchCode: true, campaignId: true, productId: true },
      orderBy: { batchCode: "asc" },
    }),
    prisma.retailer.findMany({ select: { id: true, name: true, brandId: true }, orderBy: { name: "asc" } }),
    prisma.deliveryScan.groupBy({
      by: ["country", "region", "city"],
      where: { country: { not: null } },
      _count: { id: true },
    }),
  ]);

  // Build brand → [advertiserId] map; Advertiser has no brandId so we derive from campaigns.
  const brandAdvertiserIds: Record<string, string[]> = {};
  for (const camp of campaigns) {
    if (!brandAdvertiserIds[camp.brandId]) brandAdvertiserIds[camp.brandId] = [];
    if (!brandAdvertiserIds[camp.brandId].includes(camp.advertiserId)) {
      brandAdvertiserIds[camp.brandId].push(camp.advertiserId);
    }
  }

  return {
    brands,
    advertisers,
    campaigns: campaigns.map(toCampaignOptionDTO),
    products,
    batches,
    retailers: retailers.map(toRetailerOptionDTO),
    brandAdvertiserIds,
    locations: locationGroups.map(g => ({
      country: g.country as string,
      region: g.region,
      city: g.city,
    })),
  };
}

export type DeliveryCorrectionInput = {
  id: string;
  retailerId: string | null;
  cartonsDelivered: number;
  notes: string | null;
  correctionReason: string;
  country: string | null;
  region: string | null;
  city: string | null;
  suburb: string | null;
  latitude: number | null;
  longitude: number | null;
};

export async function correctDeliveryScan(input: DeliveryCorrectionInput) {
  const user = await requireRole(["ADMIN"]);

  if (!input.correctionReason?.trim()) {
    return { ok: false, error: "Correction reason is required." };
  }
  
  if (input.cartonsDelivered <= 0 || input.cartonsDelivered > 100000) {
    return { ok: false, error: "Cartons delivered must be between 1 and 100,000." };
  }

  if (input.latitude != null && (input.latitude < -90 || input.latitude > 90)) {
    return { ok: false, error: "Latitude must be between -90 and 90." };
  }

  if (input.longitude != null && (input.longitude < -180 || input.longitude > 180)) {
    return { ok: false, error: "Longitude must be between -180 and 180." };
  }

  const existing = await prisma.deliveryScan.findUnique({
    where: { id: input.id },
  });

  if (!existing) {
    return { ok: false, error: "Delivery scan not found." };
  }

  const estimatedUnitsDelivered = input.cartonsDelivered * existing.unitsPerCarton;

  const metadata = {
    correctionReason: input.correctionReason,
    before: {
      retailerId: existing.retailerId,
      cartonsDelivered: existing.cartonsDelivered,
      estimatedUnitsDelivered: existing.estimatedUnitsDelivered,
      notes: existing.notes,
      country: existing.country,
      region: existing.region,
      city: existing.city,
      suburb: existing.suburb,
      latitude: existing.latitude ? existing.latitude.toNumber() : null,
      longitude: existing.longitude ? existing.longitude.toNumber() : null,
    },
    after: {
      retailerId: input.retailerId,
      cartonsDelivered: input.cartonsDelivered,
      estimatedUnitsDelivered,
      notes: input.notes,
      country: input.country,
      region: input.region,
      city: input.city,
      suburb: input.suburb,
      latitude: input.latitude,
      longitude: input.longitude,
    },
    changedFields: [] as string[],
  };

  // Determine changed fields
  for (const key of Object.keys(metadata.before) as Array<keyof typeof metadata.before>) {
    if (metadata.before[key] !== metadata.after[key]) {
      metadata.changedFields.push(key);
    }
  }

  if (metadata.changedFields.length === 0) {
    return { ok: false, error: "No changes detected." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.deliveryScan.update({
        where: { id: existing.id },
        data: {
          retailerId: input.retailerId,
          cartonsDelivered: input.cartonsDelivered,
          estimatedUnitsDelivered,
          notes: input.notes,
          country: input.country,
          region: input.region,
          city: input.city,
          suburb: input.suburb,
          latitude: input.latitude,
          longitude: input.longitude,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "CORRECT_DELIVERY_SCAN",
          entityType: "DeliveryScan",
          entityId: existing.id,
          metadata,
        },
      });
    });

    // If cartons changed, regenerate billing summary
    if (existing.cartonsDelivered !== input.cartonsDelivered && existing.campaignId) {
      await generateCampaignBillingSummary(existing.campaignId, user.id);
    }

    revalidatePath("/admin/delivery");
    return { ok: true };
  } catch (err: any) {
    console.error("Error correcting delivery scan:", err);
    return { ok: false, error: err.message || "Failed to update delivery scan." };
  }
}
