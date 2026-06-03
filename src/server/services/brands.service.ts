// src/server/services/brands.service.ts
import prisma from "@/lib/prisma";
import { brandSchema } from "@/lib/validators/brand.validator";
import type { BrandFormValues } from "@/lib/validators/brand.validator";

function toNull(v: string | undefined | null): string | null {
  if (!v || v.trim() === "") return null;
  return v;
}

export type BrandRow = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  createdAt: string;
};

export type AdminBrandsPageData = {
  brands: BrandRow[];
  totalBrands: number;
  activeBrands: number;
};

export async function getAdminBrandsPageData(): Promise<AdminBrandsPageData> {
  const [brands, totalBrands, activeBrands] = await Promise.all([
    prisma.brand.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.brand.count(),
    prisma.brand.count({ where: { status: "ACTIVE" } }),
  ]);

  return {
    brands: brands.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      industry: b.industry,
      websiteUrl: b.websiteUrl,
      logoUrl: b.logoUrl,
      status: b.status as "ACTIVE" | "PAUSED" | "ARCHIVED",
      createdAt: b.createdAt.toISOString(),
    })),
    totalBrands,
    activeBrands,
  };
}

export type ServiceResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function createBrand(
  input: BrandFormValues
): Promise<ServiceResult<BrandRow>> {
  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, slug, industry, websiteUrl, logoUrl, status } = parsed.data;

  const existing = await prisma.brand.findUnique({ where: { slug } });
  if (existing) {
    return { ok: false, error: `Slug "${slug}" is already taken` };
  }

  const brand = await prisma.brand.create({
    data: {
      name,
      slug,
      industry: toNull(industry),
      websiteUrl: toNull(websiteUrl),
      logoUrl: toNull(logoUrl),
      status,
    },
  });

  return {
    ok: true,
    data: {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      industry: brand.industry,
      websiteUrl: brand.websiteUrl,
      logoUrl: brand.logoUrl,
      status: brand.status as "ACTIVE" | "PAUSED" | "ARCHIVED",
      createdAt: brand.createdAt.toISOString(),
    },
  };
}

export async function updateBrand(
  id: string,
  input: BrandFormValues
): Promise<ServiceResult<BrandRow>> {
  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, slug, industry, websiteUrl, logoUrl, status } = parsed.data;

  const slugConflict = await prisma.brand.findFirst({
    where: { slug, NOT: { id } },
  });
  if (slugConflict) {
    return { ok: false, error: `Slug "${slug}" is already taken` };
  }

  const brand = await prisma.brand.update({
    where: { id },
    data: {
      name,
      slug,
      industry: toNull(industry),
      websiteUrl: toNull(websiteUrl),
      logoUrl: toNull(logoUrl),
      status,
    },
  });

  return {
    ok: true,
    data: {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      industry: brand.industry,
      websiteUrl: brand.websiteUrl,
      logoUrl: brand.logoUrl,
      status: brand.status as "ACTIVE" | "PAUSED" | "ARCHIVED",
      createdAt: brand.createdAt.toISOString(),
    },
  };
}

export async function archiveBrand(id: string): Promise<ServiceResult> {
  await prisma.brand.update({ where: { id }, data: { status: "ARCHIVED" } });
  return { ok: true, data: undefined };
}
