// src/app/admin/batches/page.tsx
import React from "react";
import { getAdminBatchesPageData } from "@/server/services/batches.service";
import { BatchesClient } from "@/app/admin/batches/batches-client";

export default async function BatchesPage() {
  const {
    batches,
    brands,
    campaigns,
    products,
    totalBatches,
    activeBatches,
    deliveringBatches,
    closedBatches,
  } = await getAdminBatchesPageData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Batches</h1>
        <p className="text-muted-foreground">
          Product batches assigned to campaigns, ready for QR code printing.
        </p>
      </div>

      <BatchesClient
        batches={batches}
        brands={brands}
        campaigns={campaigns}
        products={products}
        totalBatches={totalBatches}
        activeBatches={activeBatches}
        deliveringBatches={deliveringBatches}
        closedBatches={closedBatches}
      />
    </div>
  );
}
