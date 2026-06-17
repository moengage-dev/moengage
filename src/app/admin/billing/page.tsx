import { Metadata } from "next";
import { requireRole } from "@/lib/auth/require-role";
import { getAdminBillingPageData } from "@/server/services/billing.service";
import { billingFilterSchema } from "@/lib/validators/billing.validator";
import { BillingClient } from "@/components/dashboard/billing-client";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";

export const metadata: Metadata = {
  title: "Billing | MoEngage Admin",
  description: "View calculated billing summaries",
};

export default async function AdminBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireRole(["ADMIN"]);

  const resolvedParams = await searchParams;

  const parseResult = billingFilterSchema.safeParse({
    brandId: typeof resolvedParams.brandId === "string" ? resolvedParams.brandId : undefined,
    advertiserId: typeof resolvedParams.advertiserId === "string" ? resolvedParams.advertiserId : undefined,
    campaignId: typeof resolvedParams.campaignId === "string" ? resolvedParams.campaignId : undefined,
    startDate: typeof resolvedParams.startDate === "string" ? resolvedParams.startDate : undefined,
    endDate: typeof resolvedParams.endDate === "string" ? resolvedParams.endDate : undefined,
  });

  const filters = parseResult.success ? parseResult.data : {};
  const data = await getAdminBillingPageData(filters);

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        title="Billing Overview"
        description="Calculated engagement fees and fixed fees across all campaigns."
        badgeText="Admin"
        badgeVariant="blue"
      />

      <BillingClient data={data} isAdmin={true} />
    </div>
  );
}
