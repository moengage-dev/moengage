import { Metadata } from "next";
import { requireRole } from "@/lib/auth/require-role";
import { ReportsClient, DEFAULT_REPORT_CARDS } from "@/components/dashboard/reports-client";
import { FileText } from "lucide-react";

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
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Campaign Reports
          </h1>
          <p className="text-muted-foreground">Export and view reports for your assigned campaigns.</p>
        </div>
      </div>

      <ReportsClient availableCards={cards} />
    </div>
  );
}
