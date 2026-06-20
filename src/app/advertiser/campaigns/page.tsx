import { requireRole } from "@/lib/auth/require-role";
import { getAdvertiserCampaignsWithStats } from "@/server/services/analytics.service";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatStatusLabel, formatNumber } from "@/lib/format";
import { Target } from "lucide-react";
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

export default async function AdvertiserCampaignsPage() {
  const user = await requireRole(["ADVERTISER_VIEWER", "ADMIN"]);

  // Fail closed: Advertiser Viewer must have an advertiserId
  if (user.role === "ADVERTISER_VIEWER" && !user.advertiserId) {
    return (
      <div className="space-y-6">
        <DashboardSectionHeader
          title="Campaigns"
          description="Read-only view of campaigns associated with your advertiser account."
          badgeText="Advertiser"
          badgeVariant="blue"
        />
        <Card className="py-12">
          <CardContent className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-muted border border-border text-muted-foreground rounded-full flex items-center justify-center">
              <Target className="h-6 w-6" />
            </div>
            <p className="text-sm text-muted-foreground">
              Your account is not linked to an advertiser. Contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const campaigns = await getAdvertiserCampaignsWithStats(user);

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        title="Campaigns"
        description="Read-only view of campaigns associated with your advertiser account."
        badgeText="Advertiser"
        badgeVariant="blue"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border/40 p-5 shadow-sm">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Campaigns</p>
          <p className="text-3xl font-extrabold text-foreground mt-1">{formatNumber(campaigns.length)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border/40 p-5 shadow-sm">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active</p>
          <p className="text-3xl font-extrabold text-foreground mt-1">
            {formatNumber(campaigns.filter((c) => c.status === "ACTIVE").length)}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border/40 p-5 shadow-sm">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Hits</p>
          <p className="text-3xl font-extrabold text-foreground mt-1">
            {formatNumber(campaigns.reduce((sum, c) => sum + c.totalHits, 0))}
          </p>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-muted border border-border text-muted-foreground rounded-full flex items-center justify-center">
              <Target className="h-6 w-6" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h2 className="text-lg font-bold text-foreground">No Campaigns Found</h2>
              <p className="text-sm text-muted-foreground">
                No campaigns are linked to your advertiser account yet.
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
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead className="text-right">Total Hits</TableHead>
                <TableHead className="text-right">Billable Hits</TableHead>
                <TableHead className="text-right">Suspicious</TableHead>
                <TableHead className="text-right">Approved Claims</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="font-medium text-foreground max-w-[180px] truncate">
                    {c.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{c.brandName}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{c.productName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(c.status)} className="text-[10px]">
                      {formatStatusLabel(c.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.startDate ? formatDate(c.startDate) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.endDate ? formatDate(c.endDate) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatNumber(c.totalHits)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-emerald-600">
                    {formatNumber(c.billableHits)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-amber-600">
                    {formatNumber(c.suspiciousHits)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">
                    {formatNumber(c.approvedClaims)}
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
