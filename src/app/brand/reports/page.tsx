import { Metadata } from "next";
import { requireRole } from "@/lib/auth/require-role";
import { ReportsClient, DEFAULT_REPORT_CARDS } from "@/components/dashboard/reports-client";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";

export const metadata: Metadata = {
  title: "Reports | Brand Admin",
  description: "Download CSV and PDF reports",
};

export default async function BrandReportsPage() {
  await requireRole(["BRAND_ADMIN"]);

  // Brand admins can see all standard reports except maybe some internal admin stuff.
  // We provide the full standard set, the API enforces brand scoping.
  const cards = DEFAULT_REPORT_CARDS;

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        title="Brand Reports"
        description="Export and view your brand's campaign summaries, scan events, and claim logs."
        badgeText="Brand"
        badgeVariant="emerald"
      />

      <ReportsClient availableCards={cards} />
    </div>
  );
}
