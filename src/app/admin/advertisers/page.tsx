// src/app/admin/advertisers/page.tsx
import React from "react";
import { getAdminAdvertisersPageData } from "@/server/services/advertisers.service";
import { getUnassignedAdvertiserUsers } from "@/server/services/users.service";
import { formatNumber } from "@/lib/format";
import { AdvertisersClient } from "@/app/admin/advertisers/advertisers-client";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";

export default async function AdvertisersPage() {
  const [{ advertisers, totalAdvertisers, activeAdvertisers }, unassignedUsers] = await Promise.all([
    getAdminAdvertisersPageData(),
    getUnassignedAdvertiserUsers(),
  ]);

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        title="Advertisers"
        description="Advertiser organisations running campaigns on the platform."
        badgeText="Admin"
        badgeVariant="blue"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Total Advertisers</span>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">{formatNumber(totalAdvertisers)}</div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-brand-teal">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Active Advertisers</span>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">{formatNumber(activeAdvertisers)}</div>
        </div>
      </div>

      <AdvertisersClient advertisers={advertisers} unassignedUsers={unassignedUsers} />
    </div>
  );
}
