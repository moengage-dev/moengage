// src/app/admin/brands/page.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminBrandsPageData } from "@/server/services/brands.service";
import { formatNumber } from "@/lib/format";
import { BrandsClient } from "@/app/admin/brands/brands-client";

export default async function BrandsPage() {
  const { brands, totalBrands, activeBrands } = await getAdminBrandsPageData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Brands</h1>
        <p className="text-muted-foreground">
          FMCG brands registered on the platform.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Brands</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalBrands)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Brands</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(activeBrands)}</div>
          </CardContent>
        </Card>
      </div>

      <BrandsClient brands={brands} />
    </div>
  );
}
