import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function AdvertiserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const role = session.user.role;

  if (role !== "ADVERTISER_VIEWER" && role !== "ADMIN") {
    switch (role) {
      case "BRAND_ADMIN":
        redirect("/brand");
      case "CAMPAIGN_MANAGER":
        redirect("/campaign-manager");
      case "RETAIL_OPERATIONS":
        redirect("/retail");
      default:
        redirect("/login");
    }
  }

  return (
    <DashboardShell role="ADVERTISER_VIEWER" user={session.user}>
      {children}
    </DashboardShell>
  );
}
