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
  primaryUserId: string | null;
  primaryUserName: string | null;
  primaryUserEmail: string | null;
};

export type AdminBrandsPageData = {
  brands: BrandRow[];
  totalBrands: number;
  activeBrands: number;
};

export async function getAdminBrandsPageData(): Promise<AdminBrandsPageData> {
  const [brands, totalBrands, activeBrands] = await Promise.all([
    prisma.brand.findMany({
      include: {
        users: {
          where: { role: "BRAND_ADMIN" },
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
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
      primaryUserId: b.users[0]?.id ?? null,
      primaryUserName: b.users[0]?.name ?? null,
      primaryUserEmail: b.users[0]?.email ?? null,
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

  const { name, slug, industry, websiteUrl, logoUrl, status, primaryUserId } = parsed.data;

  const existing = await prisma.brand.findUnique({ where: { slug } });
  if (existing) {
    return { ok: false, error: `Slug "${slug}" is already taken` };
  }

  // Validate the selected administrator
  if (!primaryUserId) {
    return { ok: false, error: "A Primary Brand Administrator is required." };
  }
  const adminUser = await prisma.user.findUnique({
    where: { id: primaryUserId },
    select: { role: true, isActive: true },
  });
  if (!adminUser) {
    return { ok: false, error: "Selected administrator not found." };
  }
  if (adminUser.role !== "BRAND_ADMIN") {
    return { ok: false, error: "Selected user must have the BRAND_ADMIN role." };
  }
  if (!adminUser.isActive) {
    return { ok: false, error: "Selected administrator is not active." };
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

  let primaryUserName: string | null = null;
  let primaryUserEmail: string | null = null;

  if (primaryUserId) {
    const updatedUser = await prisma.user.update({
      where: { id: primaryUserId },
      data: { brandId: brand.id },
      select: { name: true, email: true },
    });
    primaryUserName = updatedUser.name;
    primaryUserEmail = updatedUser.email;
  }

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
      primaryUserId: primaryUserId ?? null,
      primaryUserName,
      primaryUserEmail,
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

  const { name, slug, industry, websiteUrl, logoUrl, status, primaryUserId } = parsed.data;

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

  // Validate the selected administrator
  if (!primaryUserId) {
    return { ok: false, error: "A Primary Brand Administrator is required." };
  }
  const adminUserForUpdate = await prisma.user.findUnique({
    where: { id: primaryUserId },
    select: { role: true, isActive: true },
  });
  if (!adminUserForUpdate) {
    return { ok: false, error: "Selected administrator not found." };
  }
  if (adminUserForUpdate.role !== "BRAND_ADMIN") {
    return { ok: false, error: "Selected user must have the BRAND_ADMIN role." };
  }
  if (!adminUserForUpdate.isActive) {
    return { ok: false, error: "Selected administrator is not active." };
  }

  // Clear existing links
  await prisma.user.updateMany({
    where: { brandId: id },
    data: { brandId: null },
  });

  let primaryUserName: string | null = null;
  let primaryUserEmail: string | null = null;

  if (primaryUserId) {
    const updatedUser = await prisma.user.update({
      where: { id: primaryUserId },
      data: { brandId: id },
      select: { name: true, email: true },
    });
    primaryUserName = updatedUser.name;
    primaryUserEmail = updatedUser.email;
  }

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
      primaryUserId: primaryUserId ?? null,
      primaryUserName,
      primaryUserEmail,
    },
  };
}

export async function archiveBrand(id: string): Promise<ServiceResult> {
  await prisma.brand.update({ where: { id }, data: { status: "ARCHIVED" } });
  return { ok: true, data: undefined };
}
