import { Metadata } from "next";
import { requireRole } from "@/lib/auth/require-role";
import { ReportsClient, DEFAULT_REPORT_CARDS } from "@/components/dashboard/reports-client";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";

export const metadata: Metadata = {
  title: "Reports | Campaign Manager",
  description: "Download CSV and PDF reports",
};

export default async function CampaignManagerReportsPage() {
  await requireRole(["CAMPAIGN_MANAGER"]);

  // Campaign Managers do not see Billing or Suspicious Scans
  const cards = DEFAULT_REPORT_CARDS.filter(
    (c) => c.pdfType !== "BILLING_SUMMARY_PDF" && c.csvType !== "SUSPICIOUS_SCANS_CSV"
  );

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        title="Campaign Reports"
        description="Export and view reports for your assigned campaigns."
        badgeText="Campaign Manager"
        badgeVariant="indigo"
      />

      <ReportsClient availableCards={cards} />
    </div>
  );
}
