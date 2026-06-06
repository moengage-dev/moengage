import React from "react";
import { requireRole } from "@/lib/auth/require-role";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function AdvertiserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["ADVERTISER_VIEWER", "ADMIN"]);

  return (
    <DashboardShell role="ADVERTISER_VIEWER" user={user}>
      {children}
    </DashboardShell>
  );
}
