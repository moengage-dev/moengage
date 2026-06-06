import React from "react";
import { requireRole } from "@/lib/auth/require-role";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function CampaignManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["CAMPAIGN_MANAGER", "ADMIN"]);

  return (
    <DashboardShell role="CAMPAIGN_MANAGER" user={user}>
      {children}
    </DashboardShell>
  );
}
