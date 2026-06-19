// src/server/services/retailers.service.ts
import prisma from "@/lib/prisma";
import { Prisma, RetailerType } from "@prisma/client";
import { retailerSchema } from "@/lib/validators/retailer.validator";
import type { RetailerFormValues } from "@/lib/validators/retailer.validator";

export { retailerSchema } from "@/lib/validators/retailer.validator";
export type { RetailerFormValues } from "@/lib/validators/retailer.validator";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RetailerRow = {
  id: string;
  brandId: string | null;
  brandName: string | null;
  name: string;
  type: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  suburb: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  deliveryScanCount: number;
};

export type ServiceResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getAdminRetailersPageData(filters: {
  search?: string;
  brandId?: string;
  type?: string;
  country?: string;
}) {
  const where: Prisma.RetailerWhereInput = {};
  if (filters.brandId) where.brandId = filters.brandId;
  if (
    filters.type &&
    Object.values(RetailerType).includes(filters.type as RetailerType)
  ) {
    where.type = filters.type as RetailerType;
  }
  if (filters.country) where.country = { contains: filters.country, mode: "insensitive" };
  if (filters.search) {
    const q = filters.search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
      { region: { contains: q, mode: "insensitive" } },
      { country: { contains: q, mode: "insensitive" } },
      { suburb: { contains: q, mode: "insensitive" } },
      { address: { contains: q, mode: "insensitive" } },
    ];
  }

  const [retailers, totalRetailers, brands] = await Promise.all([
    prisma.retailer.findMany({
      where,
      include: {
        brand: { select: { id: true, name: true } },
        _count: { select: { deliveryScans: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.retailer.count(),
    prisma.brand.findMany({
      select: { id: true, name: true },
      where: { status: { not: "ARCHIVED" } },
      orderBy: { name: "asc" },
    }),
  ]);

  // KPI aggregates
  const uniqueCountries = [...new Set(retailers.map((r) => r.country).filter(Boolean))];
  const uniqueCities = [...new Set(retailers.map((r) => r.city).filter(Boolean))];
  const withCoords = retailers.filter((r) => r.latitude != null && r.longitude != null).length;

  return {
    retailers: retailers.map((r): RetailerRow => ({
      id: r.id,
      brandId: r.brandId,
      brandName: r.brand?.name ?? null,
      name: r.name,
      type: r.type,
      country: r.country,
      region: r.region,
      city: r.city,
      suburb: r.suburb,
      address: r.address,
      latitude: r.latitude ? Number(r.latitude) : null,
      longitude: r.longitude ? Number(r.longitude) : null,
      createdAt: r.createdAt.toISOString(),
      deliveryScanCount: r._count.deliveryScans,
    })),
    totalRetailers,
    uniqueCountries: uniqueCountries.length,
    uniqueCities: uniqueCities.length,
    brandsRepresented: [...new Set(retailers.map((r) => r.brandId).filter(Boolean))].length,
    withCoords,
    brands,
  };
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createRetailer(input: RetailerFormValues): Promise<ServiceResult<RetailerRow>> {
  const parsed = retailerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { brandId, name, type, country, region, city, suburb, address, latitude, longitude } = parsed.data;

  if (brandId) {
    const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { id: true } });
    if (!brand) return { ok: false, error: "Selected brand not found." };
  }

  const retailer = await prisma.retailer.create({
    data: {
      brandId: brandId ?? null,
      name,
      type: type ?? null,
      country: country ?? null,
      region: region ?? null,
      city: city ?? null,
      suburb: suburb ?? null,
      address: address ?? null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    },
    include: { brand: { select: { name: true } } },
  });

  return {
    ok: true,
    data: {
      id: retailer.id,
      brandId: retailer.brandId,
      brandName: retailer.brand?.name ?? null,
      name: retailer.name,
      type: retailer.type,
      country: retailer.country,
      region: retailer.region,
      city: retailer.city,
      suburb: retailer.suburb,
      address: retailer.address,
      latitude: retailer.latitude ? Number(retailer.latitude) : null,
      longitude: retailer.longitude ? Number(retailer.longitude) : null,
      createdAt: retailer.createdAt.toISOString(),
      deliveryScanCount: 0,
    },
  };
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateRetailer(id: string, input: RetailerFormValues): Promise<ServiceResult<RetailerRow>> {
  const parsed = retailerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { brandId, name, type, country, region, city, suburb, address, latitude, longitude } = parsed.data;

  if (brandId) {
    const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { id: true } });
    if (!brand) return { ok: false, error: "Selected brand not found." };
  }

  const retailer = await prisma.retailer.update({
    where: { id },
    data: {
      brandId: brandId ?? null,
      name,
      type: type ?? null,
      country: country ?? null,
      region: region ?? null,
      city: city ?? null,
      suburb: suburb ?? null,
      address: address ?? null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    },
    include: {
      brand: { select: { name: true } },
      _count: { select: { deliveryScans: true } },
    },
  });

  return {
    ok: true,
    data: {
      id: retailer.id,
      brandId: retailer.brandId,
      brandName: retailer.brand?.name ?? null,
      name: retailer.name,
      type: retailer.type,
      country: retailer.country,
      region: retailer.region,
      city: retailer.city,
      suburb: retailer.suburb,
      address: retailer.address,
      latitude: retailer.latitude ? Number(retailer.latitude) : null,
      longitude: retailer.longitude ? Number(retailer.longitude) : null,
      createdAt: retailer.createdAt.toISOString(),
      deliveryScanCount: retailer._count.deliveryScans,
    },
  };
}
