// src/app/campaign-manager/page.tsx
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

export const dynamic = "force-dynamic";

export default async function CampaignManagerDashboardPage() {
  // Enforce Campaign Manager or Admin role
  const user = await requireRole(["CAMPAIGN_MANAGER", "ADMIN"]);

  // Fetch campaign manager dashboard analytics (scoped to assignments)
  const data = await getAnalyticsDashboardData(user);
  const { metrics, performance, hasData } = data;

  if (!hasData) {
    return (
      <div className="space-y-6">
        <DashboardSectionHeader
          title="Campaign Manager Dashboard"
          description="Track scan engagements, QR codes, and claims for your assigned campaigns."
          badgeText="Campaign Manager"
          badgeVariant="indigo"
        />
        <Card className="bg-slate-900/40 border-slate-850 py-12">
          <CardContent className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h2 className="text-lg font-bold text-slate-200">No Assigned Campaigns</h2>
              <p className="text-sm text-slate-400">
                You are not currently assigned to any active campaigns. Please request a campaign assignment from your administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        title="Campaign Manager Dashboard"
        description="Engagement statistics, reward claims, and logistics for your assigned campaigns."
        badgeText="Campaign Manager"
        badgeVariant="indigo"
      />

      {/* Metrics Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <AnalyticsStatCard
          title="My Campaigns"
          value={`${metrics.activeCampaigns} / ${metrics.totalCampaigns}`}
          description="Active vs total assigned campaigns"
          icon={<BarChart3 className="h-4 w-4" />}
          accentColor="indigo"
        />
        <AnalyticsStatCard
          title="QRs Assigned"
          value={formatNumber(metrics.totalQRCodes)}
          description="Active QR codes linked to campaigns"
          icon={<Layers className="h-4 w-4" />}
          accentColor="purple"
        />
        <AnalyticsStatCard
          title="Total Scans"
          value={formatNumber(metrics.totalScans)}
          description="Scans registered on assigned campaigns"
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
          description="Legitimate billable consumer scans"
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
          description="Total cartons delivered to retail"
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
          title="Assigned Campaigns Performance"
          description="Engagement metrics for campaigns assigned to your management account."
          headers={["Campaign Name", "Advertiser", "Scans", "Claims", "Declines", "Deliveries", "Units"]}
          hasData={performance.campaignPerformance.length > 0}
        >
          {performance.campaignPerformance.map((c, idx) => (
            <tr key={idx} className="hover:bg-slate-850/40 transition-colors">
              <td className="py-3 px-3.5 font-semibold text-slate-200">{c.name}</td>
              <td className="py-3 px-3.5 text-slate-400">{c.advertiserName}</td>
              <td className="py-3 px-3.5 text-right font-mono font-medium">{formatNumber(c.totalScans)}</td>
              <td className="py-3 px-3.5 text-right font-mono font-medium text-emerald-400">{formatNumber(c.approvedClaims)}</td>
              <td className="py-3 px-3.5 text-right font-mono font-medium text-rose-400">{formatNumber(c.duplicateDeclines)}</td>
              <td className="py-3 px-3.5 text-right font-mono font-medium text-blue-400">{formatNumber(c.deliveryScans)}</td>
              <td className="py-3 px-3.5 text-right font-mono font-semibold text-teal-400">{formatNumber(c.estimatedUnitsDelivered)}</td>
            </tr>
          ))}
        </AnalyticsTableSection>

        <AnalyticsTableSection
          title="Location Performance"
          description="Geographic scan locations for assigned campaigns."
          headers={["Location", "Scans", "Claims", "Deliveries", "Est. Units"]}
          hasData={performance.locationPerformance.length > 0}
        >
          {performance.locationPerformance.map((l, idx) => (
            <tr key={idx} className="hover:bg-slate-850/40 transition-colors">
              <td className="py-3 px-3.5 font-semibold text-slate-200">{l.location}</td>
              <td className="py-3 px-3.5 text-right font-mono font-medium">{formatNumber(l.totalScans)}</td>
              <td className="py-3 px-3.5 text-right font-mono font-medium text-emerald-400">{formatNumber(l.approvedClaims)}</td>
              <td className="py-3 px-3.5 text-right font-mono font-medium text-blue-400">{formatNumber(l.deliveryScans)}</td>
              <td className="py-3 px-3.5 text-right font-mono font-semibold text-teal-400">{formatNumber(l.estimatedUnitsDelivered)}</td>
            </tr>
          ))}
        </AnalyticsTableSection>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsTableSection
          title="Recent Scan Buckets"
          description="Latest 30-second consumer scan buckets for assigned campaigns."
          headers={["Date", "Campaign", "Product", "Location", "Device", "Hits", "Repeat", "Suspicious", "Billable"]}
          hasData={performance.recentScanEvents.length > 0}
        >
          {performance.recentScanEvents.map((s, idx) => (
            <tr key={idx} className="hover:bg-slate-850/40 transition-colors">
              <td className="py-3 px-3.5 font-mono text-[10px] text-slate-400">
                {formatDateTime(s.createdAt)}
              </td>
              <td className="py-3 px-3.5 font-semibold text-slate-200 truncate max-w-[100px]" title={s.campaignName}>
                {s.campaignName}
              </td>
              <td className="py-3 px-3.5 truncate max-w-[80px]" title={s.productName}>{s.productName}</td>
              <td className="py-3 px-3.5 truncate max-w-[100px]" title={s.location}>{s.location}</td>
              <td className="py-3 px-3.5 uppercase text-[9px] tracking-wider text-slate-400">
                {s.deviceType}
              </td>
              <td className="py-3 px-3.5 text-right font-mono">{formatNumber(s.hitCount)}</td>
              <td className="py-3 px-3.5 text-right font-mono">{formatNumber(s.repeatCount)}</td>
              <td className="py-3 px-3.5 text-right font-mono">{formatNumber(s.suspiciousCount)}</td>
              <td className="py-3 px-3.5 text-right font-mono">{formatNumber(s.billableCount)}</td>
            </tr>
          ))}
        </AnalyticsTableSection>

        <AnalyticsTableSection
          title="Recent Reward Claims"
          description="Latest reward requests and OTP verifications submitted by users."
          headers={["Date", "Campaign", "Reward Type", "Status", "Mobile Last 4"]}
          hasData={performance.recentRewardClaims.length > 0}
        >
          {performance.recentRewardClaims.map((r, idx) => (
            <tr key={idx} className="hover:bg-slate-850/40 transition-colors">
              <td className="py-3 px-3.5 font-mono text-[10px] text-slate-400">
                {formatDateTime(r.createdAt)}
              </td>
              <td className="py-3 px-3.5 font-semibold text-slate-200 truncate max-w-[120px]" title={r.campaignName}>
                {r.campaignName}
              </td>
              <td className="py-3 px-3.5">
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 uppercase border-slate-800 text-slate-400">
                  {r.rewardType}
                </Badge>
              </td>
              <td className="py-3 px-3.5 text-right">
                <Badge className={`text-[9px] uppercase px-1 py-0 h-4 ${r.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                  {r.status}
                </Badge>
              </td>
              <td className="py-3 px-3.5 text-right font-mono text-slate-400">
                ···{r.mobileNumberLast4}
              </td>
            </tr>
          ))}
        </AnalyticsTableSection>
      </div>
    </div>
  );
}
