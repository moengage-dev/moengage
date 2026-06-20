import React from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { getBatchesPageData } from "@/server/services/batches.service";
import { BatchesClient } from "@/app/admin/batches/batches-client";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";
import {
  createBatchAction,
  updateBatchAction,
  closeBatchAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function BrandBatchesPage() {
  const user = await requireRole(["BRAND_ADMIN"]);

  if (!user.brandId) {
    redirect("/brand");
  }

  const {
    batches,
    brands,
    campaigns,
    products,
    totalBatches,
    activeBatches,
    deliveringBatches,
    closedBatches,
  } = await getBatchesPageData(user);

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        title="Batches"
        description="Brand-scoped batch management. Create and track manufacturing batches for your campaigns."
        badgeText="Brand Admin"
        badgeVariant="emerald"
      />

      <BatchesClient
        batches={batches}
        brands={brands}
        campaigns={campaigns}
        products={products}
        totalBatches={totalBatches}
        activeBatches={activeBatches}
        deliveringBatches={deliveringBatches}
        closedBatches={closedBatches}
        actions={{
          create: createBatchAction,
          update: updateBatchAction,
          close: closeBatchAction,
        }}
      />
    </div>
  );
}
