// src/app/admin/advertisers/page.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminAdvertisersPageData } from "@/server/services/advertisers.service";
import { getUnassignedAdvertiserUsers } from "@/server/services/users.service";
import { formatNumber } from "@/lib/format";
import { AdvertisersClient } from "@/app/admin/advertisers/advertisers-client";

export default async function AdvertisersPage() {
  const [{ advertisers, totalAdvertisers, activeAdvertisers }, unassignedUsers] = await Promise.all([
    getAdminAdvertisersPageData(),
    getUnassignedAdvertiserUsers(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Advertisers</h1>
        <p className="text-muted-foreground">
          Advertiser organisations running campaigns on the platform.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Advertisers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(totalAdvertisers)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Advertisers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(activeAdvertisers)}
            </div>
          </CardContent>
        </Card>
      </div>

      <AdvertisersClient advertisers={advertisers} unassignedUsers={unassignedUsers} />
    </div>
  );
}
