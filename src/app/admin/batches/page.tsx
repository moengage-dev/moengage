// src/app/admin/batches/page.tsx
import React from "react";
import { getBatchesPageData } from "@/server/services/batches.service";
import { BatchesClient } from "@/app/admin/batches/batches-client";
import { requireRole } from "@/lib/auth/require-role";

export default async function BatchesPage() {
  const user = await requireRole(["ADMIN"]);
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
