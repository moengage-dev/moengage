// src/app/admin/suspicious-scans/page.tsx
import { Metadata } from "next";
import { requireRole } from "@/lib/auth/require-role";
import { getSuspiciousScansPageData } from "@/server/services/scan-classification.service";
import { SuspiciousScansClient } from "./suspicious-scans-client";
import { ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Suspicious Scans | MoEngage Admin",
  description: "View and manage suspicious or flagged scans",
};

export default async function SuspiciousScansPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireRole(["ADMIN"]);

  const resolvedParams = await searchParams;

  const filters = {
    brandId: typeof resolvedParams.brandId === "string" ? resolvedParams.brandId : undefined,
    advertiserId: typeof resolvedParams.advertiserId === "string" ? resolvedParams.advertiserId : undefined,
    campaignId: typeof resolvedParams.campaignId === "string" ? resolvedParams.campaignId : undefined,
    suspiciousReason: typeof resolvedParams.suspiciousReason === "string" ? resolvedParams.suspiciousReason : undefined,
    startDate: typeof resolvedParams.startDate === "string" ? resolvedParams.startDate : undefined,
    endDate: typeof resolvedParams.endDate === "string" ? resolvedParams.endDate : undefined,
  };

  const data = await getSuspiciousScansPageData(filters);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-8 w-8 text-destructive" />
            Abuse Controls & Suspicious Scans
          </h1>
          <p className="text-muted-foreground">
            Investigate suspicious scan behavior, repeat IPs, and exclude fraudulent activities from billing.
          </p>
        </div>
      </div>

      <SuspiciousScansClient data={data} />
    </div>
  );
}
