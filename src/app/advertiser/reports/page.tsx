import { Metadata } from "next";
import { requireRole } from "@/lib/auth/require-role";
import { ReportsClient, DEFAULT_REPORT_CARDS } from "@/components/dashboard/reports-client";
import { FileText } from "lucide-react";

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
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Advertiser Reports
          </h1>
          <p className="text-muted-foreground">Export and view reports for campaigns you are advertising.</p>
        </div>
      </div>

      <ReportsClient availableCards={cards} />
    </div>
  );
}
