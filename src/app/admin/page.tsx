import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminDashboardStats } from "@/server/services/admin-dashboard.service";
import { formatNumber, formatCurrency } from "@/lib/format";

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();

  const cards = [
    { title: "Total Brands", value: formatNumber(stats.totalBrands) },
    { title: "Active Campaigns", value: formatNumber(stats.activeCampaigns) },
    { title: "Total Advertisers", value: formatNumber(stats.totalAdvertisers) },
    { title: "Total Products", value: formatNumber(stats.totalProducts) },
    { title: "Total Users", value: formatNumber(stats.totalUsers) },
    { title: "Total QR Codes", value: formatNumber(stats.totalQrCodes) },
    { title: "Total Scans", value: formatNumber(stats.totalScanEvents) },
    { title: "Reward Claims", value: formatNumber(stats.totalRewardClaims) },
    { title: "Delivery Scans", value: formatNumber(stats.totalDeliveryScans) },
    {
      title: "Est. Billing Total",
      value: formatCurrency(stats.estimatedBillingTotal),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Platform-wide overview for brands, advertisers, campaigns, QR
          activity, delivery scans, and billing.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
