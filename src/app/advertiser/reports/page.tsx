import { Metadata } from "next";
import { requireRole } from "@/lib/auth/require-role";
import { ReportsClient, DEFAULT_REPORT_CARDS } from "@/components/dashboard/reports-client";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";

export const metadata: Metadata = {
  title: "Reports | Advertiser Dashboard",
  description: "Download CSV and PDF reports",
};

export default async function AdvertiserReportsPage() {
  await requireRole(["ADVERTISER_VIEWER"]);

  // Advertisers do not see Delivery Scans or Suspicious Scans
  const cards = DEFAULT_REPORT_CARDS.filter(
    (c) => c.csvType !== "DELIVERY_SCANS_CSV" && c.csvType !== "SUSPICIOUS_SCANS_CSV"
  );

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        title="Advertiser Reports"
        description="Export and view reports for campaigns you are advertising."
        badgeText="Advertiser"
        badgeVariant="purple"
      />

      <ReportsClient availableCards={cards} />
    </div>
  );
}
