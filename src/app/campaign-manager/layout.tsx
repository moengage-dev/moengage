import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function CampaignManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const role = session.user.role;

  if (role !== "CAMPAIGN_MANAGER" && role !== "ADMIN") {
    switch (role) {
      case "BRAND_ADMIN":
        redirect("/brand");
      case "ADVERTISER_VIEWER":
        redirect("/advertiser");
      case "RETAIL_OPERATIONS":
        redirect("/retail");
      default:
        redirect("/login");
    }
  }

  return (
    <DashboardShell role="CAMPAIGN_MANAGER" user={session.user}>
      {children}
    </DashboardShell>
  );
}
