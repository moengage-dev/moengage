import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import prisma from "@/lib/prisma";
import {
  formatDate,
  formatStatusLabel,
  formatCurrency,
  formatNumber,
} from "@/lib/format";

export default async function CampaignsPage() {
  const [campaigns, totalCampaigns, activeCampaigns] = await Promise.all([
    prisma.campaign.findMany({
      include: {
        brand: { select: { name: true } },
        advertiser: { select: { name: true } },
        product: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.campaign.count(),
    prisma.campaign.count({ where: { status: "ACTIVE" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
        <p className="text-muted-foreground">
          All QR advertising campaigns across brands and advertisers.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalCampaigns)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(activeCampaigns)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Advertiser</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Reward Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fixed Fee/Unit</TableHead>
              <TableHead>Engagement Fee/Scan</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No campaigns found.
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>{campaign.brand.name}</TableCell>
                  <TableCell>{campaign.advertiser.name}</TableCell>
                  <TableCell>{campaign.product?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {formatStatusLabel(campaign.rewardType)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={campaign.status === "ACTIVE" ? "default" : "secondary"}
                    >
                      {formatStatusLabel(campaign.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {campaign.fixedFeePerUnit
                      ? formatCurrency(campaign.fixedFeePerUnit.toNumber())
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {campaign.engagementFeePerScan
                      ? formatCurrency(campaign.engagementFeePerScan.toNumber())
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(campaign.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
