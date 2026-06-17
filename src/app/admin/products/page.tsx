// src/app/admin/products/page.tsx
import React from "react";
import { getProductsPageData } from "@/server/services/products.service";
import { formatNumber } from "@/lib/format";
import { ProductsClient } from "@/app/admin/products/products-client";
import { requireRole } from "@/lib/auth/require-role";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";

export default async function ProductsPage() {
  const user = await requireRole(["ADMIN"]);
  const { products, brands, totalProducts, activeProducts } =
    await getProductsPageData(user);

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        title="Products"
        description="All products registered across brands on the platform."
        badgeText="Admin"
        badgeVariant="blue"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Total Products</span>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">{formatNumber(totalProducts)}</div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-brand-teal">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Active Products</span>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">{formatNumber(activeProducts)}</div>
        </div>
      </div>

      <ProductsClient products={products} brands={brands} />
    </div>
  );
}
