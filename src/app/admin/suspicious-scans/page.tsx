// src/app/admin/suspicious-scans/page.tsx
import { Metadata } from "next";
import { requireRole } from "@/lib/auth/require-role";
import { getSuspiciousScansPageData } from "@/server/services/scan-classification.service";
import { SuspiciousScansClient } from "./suspicious-scans-client";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";

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
    <div className="min-h-screen bg-[#FFF6DE] p-8 md:p-12 space-y-10">
      <DashboardSectionHeader
        title="Abuse Controls & Suspicious Scans"
        description="Investigate suspicious scan behavior, repeat IPs, and exclude fraudulent activities from billing."
        badgeText="Fraud Monitoring"
        badgeVariant="emerald"
      />

      <SuspiciousScansClient data={data} />
    </div>
  );
}
