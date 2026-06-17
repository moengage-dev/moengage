// src/app/admin/campaigns/page.tsx
import React from "react";
import { getCampaignsPageData } from "@/server/services/campaigns.service";
import { CampaignsClient } from "@/app/admin/campaigns/campaigns-client";
import { requireRole } from "@/lib/auth/require-role";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";

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
      <DashboardSectionHeader
        title="Campaigns"
        description="All QR advertising campaigns across brands and advertisers."
        badgeText="Admin"
        badgeVariant="blue"
      />

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
