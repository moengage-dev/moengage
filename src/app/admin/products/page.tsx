// src/app/admin/products/page.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminProductsPageData } from "@/server/services/products.service";
import { formatNumber } from "@/lib/format";
import { ProductsClient } from "@/app/admin/products/products-client";

export default async function ProductsPage() {
  const { products, brands, totalProducts, activeProducts } =
    await getAdminProductsPageData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground">
          All products registered across brands on the platform.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(totalProducts)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(activeProducts)}
            </div>
          </CardContent>
        </Card>
      </div>

      <ProductsClient products={products} brands={brands} />
    </div>
  );
}
