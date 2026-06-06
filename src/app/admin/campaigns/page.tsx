// src/app/admin/campaigns/page.tsx
import React from "react";
import { getCampaignsPageData } from "@/server/services/campaigns.service";
import { CampaignsClient } from "@/app/admin/campaigns/campaigns-client";
import { requireRole } from "@/lib/auth/require-role";

export default async function CampaignsPage() {
  const user = await requireRole(["ADMIN"]);
  const {
    campaigns,
    brands,
    advertisers,
    products,
    totalCampaigns,
    activeCampaigns,
    draftCampaigns,
    archivedCampaigns,
  } = await getCampaignsPageData(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
        <p className="text-muted-foreground">
          All QR advertising campaigns across brands and advertisers.
        </p>
      </div>

      <CampaignsClient
        campaigns={campaigns}
        brands={brands}
        advertisers={advertisers}
        products={products}
        totalCampaigns={totalCampaigns}
        activeCampaigns={activeCampaigns}
        draftCampaigns={draftCampaigns}
        archivedCampaigns={archivedCampaigns}
      />
    </div>
  );
}
