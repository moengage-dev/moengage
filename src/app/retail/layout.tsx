import React from "react";
import { requireRole } from "@/lib/auth/require-role";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function RetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["RETAIL_OPERATIONS", "ADMIN"]);

  return (
    <DashboardShell role="RETAIL_OPERATIONS" user={user}>
      {children}
    </DashboardShell>
  );
}
