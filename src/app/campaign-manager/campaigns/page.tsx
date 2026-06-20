import { requireRole } from "@/lib/auth/require-role";
import { getCampaignsPageData } from "@/server/services/campaigns.service";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatStatusLabel, formatCurrency } from "@/lib/format";
import { BarChart3 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "ACTIVE") return "default";
  if (status === "ARCHIVED") return "destructive";
  return "secondary";
}

export default async function CampaignManagerCampaignsPage() {
  const user = await requireRole(["CAMPAIGN_MANAGER", "ADMIN"]);
  const { campaigns, totalCampaigns, activeCampaigns } = await getCampaignsPageData(user);

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        title="My Campaigns"
        description="Campaigns you are assigned to manage. All data is scoped to your assignments."
        badgeText="Campaign Manager"
        badgeVariant="indigo"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border/40 p-5 shadow-sm">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Assigned Campaigns
          </p>
          <p className="text-3xl font-extrabold text-foreground mt-1">{totalCampaigns}</p>
        </div>
        <div className="bg-card rounded-xl border border-border/40 p-5 shadow-sm">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Active
          </p>
          <p className="text-3xl font-extrabold text-foreground mt-1">{activeCampaigns}</p>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-muted border border-border text-muted-foreground rounded-full flex items-center justify-center">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h2 className="text-lg font-bold text-foreground">No Assigned Campaigns</h2>
              <p className="text-sm text-muted-foreground">
                You are not currently assigned to any campaigns. Ask your Brand Admin to assign you.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-border/40 overflow-hidden bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>Campaign</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Advertiser</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fixed Fee / Unit</TableHead>
                <TableHead>Eng. Fee / Scan</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="font-medium text-foreground max-w-[200px] truncate">
                    {c.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.brandName}</TableCell>
                  <TableCell className="text-muted-foreground">{c.advertiserName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.productName ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(c.status)}>
                      {formatStatusLabel(c.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {c.fixedFeePerUnit != null
                      ? formatCurrency(c.fixedFeePerUnit, c.currency)
                      : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {c.engagementFeePerScan != null
                      ? formatCurrency(c.engagementFeePerScan, c.currency)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.startDate ? formatDate(c.startDate) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.endDate ? formatDate(c.endDate) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
