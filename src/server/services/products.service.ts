// src/server/services/products.service.ts
import prisma from "@/lib/prisma";
import { productSchema } from "@/lib/validators/product.validator";
import type { ProductFormValues } from "@/lib/validators/product.validator";

export type ScopedUser = {
  id: string;
  role: string;
  brandId?: string | null;
  advertiserId?: string | null;
};

function toNull(v: string | undefined | null): string | null {
  if (!v || v.trim() === "") return null;
  return v;
}

export type ProductRow = {
  id: string;
  brandId: string;
  brandName: string;
  name: string;
  slug: string;
  sku: string | null;
  category: string | null;
  unitLabel: string | null;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  createdAt: string;
};

export type BrandOption = {
  id: string;
  name: string;
};

export type AdminProductsPageData = {
  products: ProductRow[];
  brands: BrandOption[];
  totalProducts: number;
  activeProducts: number;
};

export type ServiceResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function getProductsPageData(user: ScopedUser): Promise<AdminProductsPageData> {
  const productFilter: any = {};
  if (user.role === "BRAND_ADMIN") {
    productFilter.brandId = user.brandId;
  } else if (user.role !== "ADMIN") {
    productFilter.id = "none";
  }

  const brandFilter: any = { status: "ACTIVE" };
  if (user.role === "BRAND_ADMIN") {
    brandFilter.id = user.brandId;
  }

  const [products, brands, totalProducts, activeProducts] = await Promise.all([
    prisma.product.findMany({
      where: productFilter,
      include: { brand: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.brand.findMany({
      where: brandFilter,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.count({ where: productFilter }),
    prisma.product.count({ where: { ...productFilter, status: "ACTIVE" } }),
  ]);

  return {
    products: products.map((p) => ({
      id: p.id,
      brandId: p.brandId,
      brandName: p.brand.name,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      category: p.category,
      unitLabel: p.unitLabel,
      status: p.status as "ACTIVE" | "PAUSED" | "ARCHIVED",
      createdAt: p.createdAt.toISOString(),
    })),
    brands: brands.map((b) => ({ id: b.id, name: b.name })),
    totalProducts,
    activeProducts,
  };
}

export async function createProduct(
  input: ProductFormValues,
  user: ScopedUser
): Promise<ServiceResult<ProductRow>> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { brandId, name, slug, sku, category, unitLabel, status } = parsed.data;

  if (user.role === "BRAND_ADMIN" && brandId !== user.brandId) {
    return { ok: false, error: "Unauthorized: Invalid brand mapping" };
  }
  if (user.role !== "ADMIN" && user.role !== "BRAND_ADMIN") {
    return { ok: false, error: "Unauthorized to create products" };
  }

  const existing = await prisma.product.findUnique({
    where: { brandId_slug: { brandId, slug } },
  });
  if (existing) {
    return { ok: false, error: `Slug "${slug}" is already taken for this brand` };
  }

  const product = await prisma.product.create({
    data: {
      brandId,
      name,
      slug,
      sku: toNull(sku),
      category: toNull(category),
      unitLabel: toNull(unitLabel),
      status,
    },
    include: { brand: { select: { name: true } } },
  });

  return {
    ok: true,
    data: {
      id: product.id,
      brandId: product.brandId,
      brandName: product.brand.name,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      category: product.category,
      unitLabel: product.unitLabel,
      status: product.status as "ACTIVE" | "PAUSED" | "ARCHIVED",
      createdAt: product.createdAt.toISOString(),
    },
  };
}

export async function updateProduct(
  id: string,
  input: ProductFormValues,
  user: ScopedUser
): Promise<ServiceResult<ProductRow>> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { brandId, name, slug, sku, category, unitLabel, status } = parsed.data;

  if (user.role !== "ADMIN") {
    const existing = await prisma.product.findUnique({ where: { id }, select: { brandId: true } });
    if (!existing) return { ok: false, error: "Product not found" };
    if (user.role === "BRAND_ADMIN" && existing.brandId !== user.brandId) return { ok: false, error: "Unauthorized" };
    if (user.role === "BRAND_ADMIN" && brandId !== existing.brandId) return { ok: false, error: "Unauthorized to change brand ownership" };
  }

  const slugConflict = await prisma.product.findFirst({
    where: { brandId, slug, NOT: { id } },
  });
  if (slugConflict) {
    return { ok: false, error: `Slug "${slug}" is already taken for this brand` };
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      brandId,
      name,
      slug,
      sku: toNull(sku),
      category: toNull(category),
      unitLabel: toNull(unitLabel),
      status,
    },
    include: { brand: { select: { name: true } } },
  });

  return {
    ok: true,
    data: {
      id: product.id,
      brandId: product.brandId,
      brandName: product.brand.name,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      category: product.category,
      unitLabel: product.unitLabel,
      status: product.status as "ACTIVE" | "PAUSED" | "ARCHIVED",
      createdAt: product.createdAt.toISOString(),
    },
  };
}

export async function archiveProduct(id: string, user: ScopedUser): Promise<ServiceResult> {
  if (user.role !== "ADMIN") {
    const existing = await prisma.product.findUnique({ where: { id }, select: { brandId: true } });
    if (!existing) return { ok: false, error: "Product not found" };
    if (user.role === "BRAND_ADMIN" && existing.brandId !== user.brandId) return { ok: false, error: "Unauthorized" };
  }
  await prisma.product.update({ where: { id }, data: { status: "ARCHIVED" } });
  return { ok: true, data: undefined };
}
