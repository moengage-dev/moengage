import React from "react";
import { requireRole } from "@/lib/auth/require-role";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function BrandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["BRAND_ADMIN", "ADMIN"]);

  return (
    <DashboardShell role="BRAND_ADMIN" user={user}>
      {children}
    </DashboardShell>
  );
}
