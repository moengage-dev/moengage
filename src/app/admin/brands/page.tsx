// src/app/admin/brands/page.tsx
import React from "react";
import { getAdminBrandsPageData } from "@/server/services/brands.service";
import { getUnassignedBrandAdmins } from "@/server/services/users.service";
import { formatNumber } from "@/lib/format";
import { BrandsClient } from "@/app/admin/brands/brands-client";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";

export default async function BrandsPage() {
  const [{ brands, totalBrands, activeBrands }, unassignedAdmins] = await Promise.all([
    getAdminBrandsPageData(),
    getUnassignedBrandAdmins(),
  ]);

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        title="Brands"
        description="FMCG brands registered on the platform."
        badgeText="Admin"
        badgeVariant="blue"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Total Brands</span>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">{formatNumber(totalBrands)}</div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-brand-teal">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Active Brands</span>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">{formatNumber(activeBrands)}</div>
        </div>
      </div>

      <BrandsClient brands={brands} unassignedAdmins={unassignedAdmins} />
    </div>
  );
}
