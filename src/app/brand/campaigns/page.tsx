import { requireRole } from "@/lib/auth/require-role";
import {
  getCampaignsPageData,
  getCampaignManagersForBrand,
  getAssignedManagersForCampaign,
} from "@/server/services/campaigns.service";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";
import { CampaignsBrandClient } from "./campaigns-brand-client";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BrandCampaignsPage() {
  const user = await requireRole(["BRAND_ADMIN", "ADMIN"]);

  if (!user.brandId) {
    redirect("/brand");
  }

  const [pageData, managers] = await Promise.all([
    getCampaignsPageData(user),
    getCampaignManagersForBrand(user.brandId),
  ]);

  // Fetch current assignments for every campaign in parallel
  const assignmentEntries = await Promise.all(
    pageData.campaigns.map(async (c) => {
      const assigned = await getAssignedManagersForCampaign(c.id);
      return [c.id, assigned] as const;
    })
  );
  const initialAssignments = Object.fromEntries(assignmentEntries);

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        title="Campaigns"
        description="Brand-scoped campaign overview. Expand any row to assign or remove Campaign Managers."
        badgeText="Brand Admin"
        badgeVariant="emerald"
      />

      <CampaignsBrandClient
        campaigns={pageData.campaigns}
        totalCampaigns={pageData.totalCampaigns}
        activeCampaigns={pageData.activeCampaigns}
        draftCampaigns={pageData.draftCampaigns}
        availableManagers={managers}
        initialAssignments={initialAssignments}
      />
    </div>
  );
}
