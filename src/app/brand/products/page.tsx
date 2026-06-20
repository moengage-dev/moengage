import React from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { getProductsPageData } from "@/server/services/products.service";
import { formatNumber } from "@/lib/format";
import { ProductsClient } from "@/app/admin/products/products-client";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";
import {
  createProductAction,
  updateProductAction,
  archiveProductAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function BrandProductsPage() {
  const user = await requireRole(["BRAND_ADMIN"]);

  if (!user.brandId) {
    redirect("/brand");
  }

  const { products, brands, totalProducts, activeProducts } =
    await getProductsPageData(user);

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        title="Products"
        description="Brand-scoped product catalog. Only products belonging to your brand are shown."
        badgeText="Brand Admin"
        badgeVariant="emerald"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-primary">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Total Products</span>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">{formatNumber(totalProducts)}</div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-brand-teal">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Active Products</span>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">{formatNumber(activeProducts)}</div>
        </div>
      </div>

      <ProductsClient
        products={products}
        brands={brands}
        actions={{
          create: createProductAction,
          update: updateProductAction,
          archive: archiveProductAction,
        }}
      />
    </div>
  );
}
