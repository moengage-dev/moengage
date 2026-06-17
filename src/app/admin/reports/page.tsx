import { Metadata } from "next";
import { requireRole } from "@/lib/auth/require-role";
import { ReportsClient } from "@/components/dashboard/reports-client";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";

export const metadata: Metadata = {
  title: "Reports | MoEngage Admin",
  description: "Download CSV and PDF reports",
};

export default async function AdminReportsPage() {
  await requireRole(["ADMIN"]);

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        title="System Reports"
        description="Export and view campaign summaries, scan events, and claim logs."
        badgeText="Admin"
        badgeVariant="blue"
      />

      <ReportsClient />
    </div>
  );
}
