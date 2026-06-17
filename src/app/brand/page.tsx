// src/app/brand/page.tsx
import React from "react";
import { requireRole } from "@/lib/auth/require-role";
import { getAnalyticsDashboardData } from "@/server/services/analytics.service";
import { formatNumber, formatDateTime } from "@/lib/format";
import { AnalyticsStatCard } from "@/components/dashboard/analytics-stat-card";
import { AnalyticsTableSection } from "@/components/dashboard/analytics-table-section";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  Scan,
  Users,
  AlertCircle,
  ShieldCheck,
  Truck,
  Archive,
  BarChart3,
  Award,
  Calendar,
} from "lucide-react";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function BrandDashboardPage() {
  // Enforce Brand Admin or Admin role
  const user = await requireRole(["BRAND_ADMIN", "ADMIN"]);

  const brandId = user.brandId;

  if (!brandId) {
    return (
      <div className="space-y-6">
        <DashboardSectionHeader
          title="Brand Dashboard"
          description="Campaign metrics, QR scans, and placements."
          badgeText="Brand Admin"
          badgeVariant="emerald"
        />
        <Card className="py-12">
          <CardContent className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-muted border border-border text-muted-foreground rounded-full flex items-center justify-center">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h2 className="text-lg font-bold text-foreground">No Brand Assigned</h2>
              <p className="text-sm text-muted-foreground">
                Your account is not currently assigned to a brand context. Please contact your system administrator to configure your profile.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch the Brand name
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { name: true },
  });

  const brandName = brand?.name ?? "Brand";

  // Fetch brand dashboard analytics
  const data = await getAnalyticsDashboardData(user);
  const { metrics, performance } = data;

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        title={`${brandName} Dashboard`}
        description={`Analytics overview for campaigns, products, and retail distributions of ${brandName}.`}
        badgeText="Brand Admin"
        badgeVariant="emerald"
      />

      {/* Metrics Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <AnalyticsStatCard
          title="Campaigns"
          value={`${metrics.activeCampaigns} / ${metrics.totalCampaigns}`}
          description="Active campaigns vs total campaigns"
          icon={<BarChart3 className="h-4 w-4" />}
          accentColor="indigo"
        />
        <AnalyticsStatCard
          title="QR Codes"
          value={formatNumber(metrics.totalQRCodes)}
          description="Total printed or active QR codes"
          icon={<Layers className="h-4 w-4" />}
          accentColor="purple"
        />
        <AnalyticsStatCard
          title="Total Scan Events"
          value={formatNumber(metrics.totalScans)}
          description="Total scans logged for your brand"
          icon={<Scan className="h-4 w-4" />}
          accentColor="blue"
        />
        <AnalyticsStatCard
          title="Unique Visitors"
          value={formatNumber(metrics.uniqueScans)}
          description="Distinct consumer visitor devices"
          icon={<Users className="h-4 w-4" />}
          accentColor="teal"
        />
        <AnalyticsStatCard
          title="Billable Scans"
          value={formatNumber(metrics.billableScans)}
          description="Legitimate non-internal billable scans"
          icon={<ShieldCheck className="h-4 w-4" />}
          accentColor="emerald"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <AnalyticsStatCard
          title="Approved Claims"
          value={formatNumber(metrics.approvedRewardClaims)}
          description="Approved mobile reward provisions"
          icon={<Award className="h-4 w-4" />}
          accentColor="emerald"
        />
        <AnalyticsStatCard
          title="Duplicate Declines"
          value={formatNumber(metrics.duplicateRewardDeclines)}
          description="Declined duplicate mobile claims"
          icon={<AlertCircle className="h-4 w-4" />}
          accentColor="rose"
        />
        <AnalyticsStatCard
          title="Delivery Scans"
          value={formatNumber(metrics.totalDeliveryScans)}
          description="Total distribution drop-offs logged"
          icon={<Truck className="h-4 w-4" />}
          accentColor="blue"
        />
        <AnalyticsStatCard
          title="Cartons Placed"
          value={formatNumber(metrics.totalCartonsDelivered)}
          description="Total physical carton count delivered"
          icon={<Layers className="h-4 w-4" />}
          accentColor="indigo"
        />
        <AnalyticsStatCard
          title="Est. Units Placed"
          value={formatNumber(metrics.totalEstimatedUnitsDelivered)}
          description="Estimated units delivered to retail"
          icon={<Archive className="h-4 w-4" />}
          accentColor="teal"
        />
      </div>

      {/* Analytics Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsTableSection
          title="Campaign Performance"
          description="Top campaigns evaluated by engagement scans, claims, and supply chain drops."
          headers={["Campaign Name", "Advertiser", "Scans", "Claims", "Declines", "Deliveries", "Units"]}
          hasData={performance.campaignPerformance.length > 0}
        >
          {performance.campaignPerformance.map((c, idx) => (
            <tr key={idx} className="hover:bg-muted/40 transition-colors">
              <td className="py-3 px-3.5 font-semibold text-foreground">{c.name}</td>
              <td className="py-3 px-3.5 text-muted-foreground">{c.advertiserName}</td>
              <td className="py-3 px-3.5 text-right font-mono font-medium">{formatNumber(c.totalScans)}</td>
              <td className="py-3 px-3.5 text-right font-mono font-medium text-emerald-600">{formatNumber(c.approvedClaims)}</td>
              <td className="py-3 px-3.5 text-right font-mono font-medium text-rose-600">{formatNumber(c.duplicateDeclines)}</td>
              <td className="py-3 px-3.5 text-right font-mono font-medium text-blue-600">{formatNumber(c.deliveryScans)}</td>
              <td className="py-3 px-3.5 text-right font-mono font-semibold text-foreground">{formatNumber(c.estimatedUnitsDelivered)}</td>
            </tr>
          ))}
        </AnalyticsTableSection>

        <AnalyticsTableSection
          title="Product Performance"
          description="Top product lines measured by consumer interaction scans and verified retail units."
          headers={["Product Name", "Total Scans", "Claims", "Units Placed"]}
          hasData={performance.productPerformance.length > 0}
        >
          {performance.productPerformance.map((p, idx) => (
            <tr key={idx} className="hover:bg-muted/40 transition-colors">
              <td className="py-3 px-3.5 font-semibold text-foreground">{p.name}</td>
              <td className="py-3 px-3.5 text-right font-mono font-medium">{formatNumber(p.totalScans)}</td>
              <td className="py-3 px-3.5 text-right font-mono font-medium text-emerald-600">{formatNumber(p.approvedClaims)}</td>
              <td className="py-3 px-3.5 text-right font-mono font-semibold text-foreground">{formatNumber(p.estimatedUnitsDelivered)}</td>
            </tr>
          ))}
        </AnalyticsTableSection>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsTableSection
          title="Location Performance"
          description="Geographic scan centers and placements sorted by scan volume."
          headers={["Location", "Scans", "Claims", "Deliveries", "Est. Units"]}
          hasData={performance.locationPerformance.length > 0}
        >
          {performance.locationPerformance.map((l, idx) => (
            <tr key={idx} className="hover:bg-muted/40 transition-colors">
              <td className="py-3 px-3.5 font-semibold text-foreground">{l.location}</td>
              <td className="py-3 px-3.5 text-right font-mono font-medium">{formatNumber(l.totalScans)}</td>
              <td className="py-3 px-3.5 text-right font-mono font-medium text-emerald-600">{formatNumber(l.approvedClaims)}</td>
              <td className="py-3 px-3.5 text-right font-mono font-medium text-blue-600">{formatNumber(l.deliveryScans)}</td>
              <td className="py-3 px-3.5 text-right font-mono font-semibold text-foreground">{formatNumber(l.estimatedUnitsDelivered)}</td>
            </tr>
          ))}
        </AnalyticsTableSection>

        <AnalyticsTableSection
          title="Recent Scan Buckets"
          description="Latest 30-second consumer scan buckets for your products."
          headers={["Date", "Campaign", "Product", "Location", "Device", "Hits", "Repeat", "Suspicious", "Billable"]}
          hasData={performance.recentScanEvents.length > 0}
        >
          {performance.recentScanEvents.map((s, idx) => (
            <tr key={idx} className="hover:bg-muted/40 transition-colors">
              <td className="py-3 px-3.5 font-mono text-[10px] text-muted-foreground">
                {formatDateTime(s.createdAt)}
              </td>
              <td className="py-3 px-3.5 font-semibold text-foreground truncate max-w-[100px]" title={s.campaignName}>
                {s.campaignName}
              </td>
              <td className="py-3 px-3.5 truncate max-w-[80px]" title={s.productName}>{s.productName}</td>
              <td className="py-3 px-3.5 truncate max-w-[100px]" title={s.location}>{s.location}</td>
              <td className="py-3 px-3.5 uppercase text-[9px] tracking-wider text-muted-foreground">
                {s.deviceType}
              </td>
              <td className="py-3 px-3.5 text-right font-mono">{formatNumber(s.hitCount)}</td>
              <td className="py-3 px-3.5 text-right font-mono">{formatNumber(s.repeatCount)}</td>
              <td className="py-3 px-3.5 text-right font-mono">{formatNumber(s.suspiciousCount)}</td>
              <td className="py-3 px-3.5 text-right font-mono">{formatNumber(s.billableCount)}</td>
            </tr>
          ))}
        </AnalyticsTableSection>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsTableSection
          title="Recent Reward Claims"
          description="Latest reward requests and OTP verifications submitted by users."
          headers={["Date", "Campaign", "Reward Type", "Status", "Mobile Last 4"]}
          hasData={performance.recentRewardClaims.length > 0}
        >
          {performance.recentRewardClaims.map((r, idx) => (
            <tr key={idx} className="hover:bg-muted/40 transition-colors">
              <td className="py-3 px-3.5 font-mono text-[10px] text-muted-foreground">
                {formatDateTime(r.createdAt)}
              </td>
              <td className="py-3 px-3.5 font-semibold text-foreground truncate max-w-[120px]" title={r.campaignName}>
                {r.campaignName}
              </td>
              <td className="py-3 px-3.5">
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 uppercase border-border text-muted-foreground">
                  {r.rewardType}
                </Badge>
              </td>
              <td className="py-3 px-3.5 text-right">
                <Badge className={`text-[9px] uppercase px-1 py-0 h-4 ${r.status === "APPROVED" ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-amber-100 text-amber-700 border-amber-300"}`}>
                  {r.status}
                </Badge>
              </td>
              <td className="py-3 px-3.5 text-right font-mono text-muted-foreground">
                ···{r.mobileNumberLast4}
              </td>
            </tr>
          ))}
        </AnalyticsTableSection>

        <AnalyticsTableSection
          title="Recent Delivery Scans"
          description="Latest batch carton drop-offs completed by logistics operators."
          headers={["Date", "Retailer", "Campaign", "Batch", "Cartons", "Est. Units", "Location"]}
          hasData={performance.recentDeliveryScans.length > 0}
        >
          {performance.recentDeliveryScans.map((d, idx) => (
            <tr key={idx} className="hover:bg-muted/40 transition-colors">
              <td className="py-3 px-3.5 font-mono text-[10px] text-muted-foreground">
                {formatDateTime(d.createdAt)}
              </td>
              <td className="py-3 px-3.5 font-semibold text-foreground truncate max-w-[100px]" title={d.retailerName}>
                {d.retailerName}
              </td>
              <td className="py-3 px-3.5 truncate max-w-[100px]" title={d.campaignName}>{d.campaignName}</td>
              <td className="py-3 px-3.5 font-mono text-[10px] text-muted-foreground">{d.batchCode}</td>
              <td className="py-3 px-3.5 text-right font-mono font-medium">{d.cartonsDelivered}</td>
              <td className="py-3 px-3.5 text-right font-mono font-semibold text-foreground">{formatNumber(d.estimatedUnitsDelivered)}</td>
              <td className="py-3 px-3.5 truncate max-w-[100px]" title={d.location}>{d.location}</td>
            </tr>
          ))}
        </AnalyticsTableSection>
      </div>
    </div>
  );
}
