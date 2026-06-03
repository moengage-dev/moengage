import { Metadata } from "next";
import { requireRole } from "@/lib/auth/require-role";
import { ReportsClient } from "./reports-client";
import { FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Reports | MoEngage Admin",
  description: "Download CSV and PDF reports",
};

export default async function AdminReportsPage() {
  await requireRole(["ADMIN"]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            System Reports
          </h1>
          <p className="text-muted-foreground">Export and view campaign summaries, scan events, and claim logs.</p>
        </div>
      </div>

      <ReportsClient />
    </div>
  );
}
