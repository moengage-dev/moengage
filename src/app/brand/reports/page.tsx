import { Metadata } from "next";
import { requireRole } from "@/lib/auth/require-role";
import { ReportsClient, DEFAULT_REPORT_CARDS } from "@/components/dashboard/reports-client";
import { FileText } from "lucide-react";

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
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Brand Reports
          </h1>
          <p className="text-muted-foreground">Export and view your brand&apos;s campaign summaries, scan events, and claim logs.</p>
        </div>
      </div>

      <ReportsClient availableCards={cards} />
    </div>
  );
}
