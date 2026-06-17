// src/app/admin/page.tsx
import React from "react";
import { getAnalyticsDashboardData } from "@/server/services/analytics.service";
import { requireRole } from "@/lib/auth/require-role";
import { formatNumber, formatDateTime } from "@/lib/format";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";
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
} from "lucide-react";

export const dynamic = "force-dynamic";

// Local table section wrapper to enforce distinct premium white sections
function LocalTableSection({
  title,
  description,
  headers,
  children,
  hasData = true,
}: {
  title: string;
  description?: string;
  headers: string[];
  children: React.ReactNode;
  hasData?: boolean;
}) {
  return (
    <div className="bg-card rounded-2xl p-8 border border-border/50 shadow-sm flex flex-col justify-between h-full">
      <div>
        <div className="pb-6">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-1 leading-normal">
              {description}
            </p>
          )}
        </div>

        {!hasData ? (
          <div className="text-center py-10 text-xs text-muted-foreground/75 italic border border-border/30 rounded-xl bg-transparent">
            No analytics data recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[800px] text-left border-collapse text-xs bg-transparent">
              <thead>
                <tr>
                  {headers.map((header, idx) => (
                    <th
                      key={idx}
                      className={`text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 pb-4 border-b border-border/40 px-3 ${
                        header.toLowerCase().includes("scans") ||
                        header.toLowerCase().includes("claims") ||
                        header.toLowerCase().includes("declines") ||
                        header.toLowerCase().includes("cartons") ||
                        header.toLowerCase().includes("units") ||
                        header.toLowerCase().includes("status") ||
                        header.toLowerCase().includes("billable") ||
                        header.toLowerCase().includes("repeat") ||
                        header.toLowerCase().includes("last 4")
                          ? "text-right"
                          : "text-left"
                      }`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {children}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default async function AdminDashboardPage() {
  // Enforce Admin role
  const user = await requireRole(["ADMIN"]);

  // Fetch admin dashboard analytics
  const data = await getAnalyticsDashboardData(user);
  const { metrics, performance } = data;

  return (
    <div className="min-h-screen bg-background p-8 md:p-12 space-y-10">
      <DashboardSectionHeader
        title="Admin Analytics Dashboard"
        description="Platform-wide overview of campaigns, QR code scans, reward claims, and delivery logs."
        badgeText="System Admin"
        badgeVariant="blue"
      />

      {/* 10 Metrics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Card 1: Campaigns */}
        <div className="bg-card text-card-foreground rounded-xl border border-border/40 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 flex flex-col justify-between relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-primary">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Campaigns</span>
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary"><BarChart3 className="h-4 w-4" /></span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-primary tracking-tight">
              {metrics.activeCampaigns} <span className="text-muted-foreground text-lg font-medium">/</span> {metrics.totalCampaigns}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium leading-relaxed">Active vs total campaigns</p>
          </div>
        </div>

        {/* Card 2: QR Codes */}
        <div className="bg-card text-card-foreground rounded-xl border border-border/40 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 flex flex-col justify-between relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-brand-teal">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">QR Codes</span>
            <span className="p-1.5 rounded-lg bg-brand-teal/15 text-foreground"><Layers className="h-4 w-4" /></span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-foreground tracking-tight">
              {formatNumber(metrics.totalQRCodes)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium leading-relaxed">Total active QR codes</p>
          </div>
        </div>

        {/* Card 3: Total Scan Events */}
        <div className="bg-card text-card-foreground rounded-xl border border-border/40 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 flex flex-col justify-between relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-brand-teal">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Total Scans</span>
            <span className="p-1.5 rounded-lg bg-brand-teal/15 text-foreground"><Scan className="h-4 w-4" /></span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-foreground tracking-tight">
              {formatNumber(metrics.totalScans)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium leading-relaxed">Total scans logged</p>
          </div>
        </div>

        {/* Card 4: Unique Visitors */}
        <div className="bg-card text-card-foreground rounded-xl border border-border/40 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 flex flex-col justify-between relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-brand-teal">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Unique Visitors</span>
            <span className="p-1.5 rounded-lg bg-brand-teal/15 text-foreground"><Users className="h-4 w-4" /></span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-foreground tracking-tight">
              {formatNumber(metrics.uniqueScans)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium leading-relaxed">Distinct visitor devices</p>
          </div>
        </div>

        {/* Card 5: Billable Scans */}
        <div className="bg-card text-card-foreground rounded-xl border border-border/40 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 flex flex-col justify-between relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-brand-teal">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Billable Scans</span>
            <span className="p-1.5 rounded-lg bg-brand-teal/15 text-foreground"><ShieldCheck className="h-4 w-4" /></span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-foreground tracking-tight">
              {formatNumber(metrics.billableScans)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium leading-relaxed">Legitimate billable scans</p>
          </div>
        </div>

        {/* Card 6: Approved Claims */}
        <div className="bg-card text-card-foreground rounded-xl border border-border/40 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 flex flex-col justify-between relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-brand-yellow">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Approved Claims</span>
            <span className="p-1.5 rounded-lg bg-brand-yellow/30 text-foreground"><Award className="h-4 w-4" /></span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-foreground tracking-tight">
              {formatNumber(metrics.approvedRewardClaims)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium leading-relaxed">Approved reward provisions</p>
          </div>
        </div>

        {/* Card 7: Duplicate Declines */}
        <div className="bg-card text-card-foreground rounded-xl border border-border/40 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 flex flex-col justify-between relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-primary">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Declined Claims</span>
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary"><AlertCircle className="h-4 w-4" /></span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-primary tracking-tight">
              {formatNumber(metrics.duplicateRewardDeclines)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium leading-relaxed">Declined duplicate claims</p>
          </div>
        </div>

        {/* Card 8: Delivery Scans */}
        <div className="bg-card text-card-foreground rounded-xl border border-border/40 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 flex flex-col justify-between relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-brand-teal">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Deliveries</span>
            <span className="p-1.5 rounded-lg bg-brand-teal/15 text-foreground"><Truck className="h-4 w-4" /></span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-foreground tracking-tight">
              {formatNumber(metrics.totalDeliveryScans)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium leading-relaxed">Total distribution logs</p>
          </div>
        </div>

        {/* Card 9: Cartons Placed */}
        <div className="bg-card text-card-foreground rounded-xl border border-border/40 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 flex flex-col justify-between relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-brand-yellow">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Cartons Placed</span>
            <span className="p-1.5 rounded-lg bg-brand-yellow/30 text-foreground"><Layers className="h-4 w-4" /></span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-foreground tracking-tight">
              {formatNumber(metrics.totalCartonsDelivered)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium leading-relaxed">Total physical carton count</p>
          </div>
        </div>

        {/* Card 10: Est. Units Placed */}
        <div className="bg-card text-card-foreground rounded-xl border border-border/40 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 flex flex-col justify-between relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-brand-yellow">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Est. Units Placed</span>
            <span className="p-1.5 rounded-lg bg-brand-yellow/30 text-foreground"><Archive className="h-4 w-4" /></span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-foreground tracking-tight">
              {formatNumber(metrics.totalEstimatedUnitsDelivered)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium leading-relaxed">Estimated units delivered</p>
          </div>
        </div>
      </div>

      {/* Analytics Tables (Middle Layer & Activity Sections) */}
      <div className="grid gap-8 lg:grid-cols-2">
        <LocalTableSection
          title="Campaign Performance"
          description="Top campaigns evaluated by engagement scans, claims, and supply chain drops."
          headers={["Campaign Name", "Brand", "Advertiser", "Scans", "Claims", "Declines", "Deliveries", "Units"]}
          hasData={performance.campaignPerformance.length > 0}
        >
          {performance.campaignPerformance.map((c, idx) => (
            <tr key={idx} className="border-b border-border/30 last:border-0 hover:bg-muted/40 transition-colors">
              <td className="py-4 px-3 font-semibold text-foreground">{c.name}</td>
              <td className="py-4 px-3 text-muted-foreground">{c.brandName}</td>
              <td className="py-4 px-3 text-muted-foreground">{c.advertiserName}</td>
              <td className="py-4 px-3 text-right font-medium text-foreground">{formatNumber(c.totalScans)}</td>
              <td className="py-4 px-3 text-right font-semibold text-foreground">{formatNumber(c.approvedClaims)}</td>
              <td className="py-4 px-3 text-right font-semibold text-primary">{formatNumber(c.duplicateDeclines)}</td>
              <td className="py-4 px-3 text-right font-medium text-foreground">{formatNumber(c.deliveryScans)}</td>
              <td className="py-4 px-3 text-right font-semibold text-foreground">{formatNumber(c.estimatedUnitsDelivered)}</td>
            </tr>
          ))}
        </LocalTableSection>

        <LocalTableSection
          title="Product Performance"
          description="Top product lines measured by consumer interaction scans and verified retail units."
          headers={["Product Name", "Brand", "Total Scans", "Claims", "Units Placed"]}
          hasData={performance.productPerformance.length > 0}
        >
          {performance.productPerformance.map((p, idx) => (
            <tr key={idx} className="border-b border-border/30 last:border-0 hover:bg-muted/40 transition-colors">
              <td className="py-4 px-3 font-semibold text-foreground">{p.name}</td>
              <td className="py-4 px-3 text-muted-foreground">{p.brandName}</td>
              <td className="py-4 px-3 text-right font-medium text-foreground">{formatNumber(p.totalScans)}</td>
              <td className="py-4 px-3 text-right font-semibold text-foreground">{formatNumber(p.approvedClaims)}</td>
              <td className="py-4 px-3 text-right font-semibold text-foreground">{formatNumber(p.estimatedUnitsDelivered)}</td>
            </tr>
          ))}
        </LocalTableSection>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <LocalTableSection
          title="Location Performance"
          description="Geographic scan centers and placements sorted by scan volume."
          headers={["Location", "Scans", "Claims", "Deliveries", "Est. Units"]}
          hasData={performance.locationPerformance.length > 0}
        >
          {performance.locationPerformance.map((l, idx) => (
            <tr key={idx} className="border-b border-border/30 last:border-0 hover:bg-muted/40 transition-colors">
              <td className="py-4 px-3 font-semibold text-foreground">{l.location}</td>
              <td className="py-4 px-3 text-right font-medium text-foreground">{formatNumber(l.totalScans)}</td>
              <td className="py-4 px-3 text-right font-semibold text-foreground">{formatNumber(l.approvedClaims)}</td>
              <td className="py-4 px-3 text-right font-medium text-foreground">{formatNumber(l.deliveryScans)}</td>
              <td className="py-4 px-3 text-right font-semibold text-foreground">{formatNumber(l.estimatedUnitsDelivered)}</td>
            </tr>
          ))}
        </LocalTableSection>

        <LocalTableSection
          title="Recent Scan Buckets"
          description="Latest 30-second consumer scan buckets logged on the platform."
          headers={["Date", "Campaign", "Product", "Location", "Device", "Hits", "Repeat", "Suspicious", "Billable"]}
          hasData={performance.recentScanEvents.length > 0}
        >
          {performance.recentScanEvents.map((s, idx) => (
            <tr key={idx} className="border-b border-border/30 last:border-0 hover:bg-muted/40 transition-colors">
              <td className="py-4 px-3 font-mono text-[10px] text-muted-foreground">
                {formatDateTime(s.createdAt)}
              </td>
              <td className="py-4 px-3 font-semibold text-foreground truncate max-w-[100px]" title={s.campaignName}>
                {s.campaignName}
              </td>
              <td className="py-4 px-3 text-muted-foreground truncate max-w-[80px]" title={s.productName}>{s.productName}</td>
              <td className="py-4 px-3 text-muted-foreground truncate max-w-[100px]" title={s.location}>{s.location}</td>
              <td className="py-4 px-3 uppercase text-[9px] tracking-wider text-muted-foreground">
                {s.deviceType}
              </td>
              <td className="py-4 px-3 text-right font-mono">{formatNumber(s.hitCount)}</td>
              <td className="py-4 px-3 text-right font-mono">{formatNumber(s.repeatCount)}</td>
              <td className="py-4 px-3 text-right font-mono">{formatNumber(s.suspiciousCount)}</td>
              <td className="py-4 px-3 text-right font-mono">{formatNumber(s.billableCount)}</td>
            </tr>
          ))}
        </LocalTableSection>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <LocalTableSection
          title="Recent Reward Claims"
          description="Latest reward requests and OTP verifications submitted by users."
          headers={["Date", "Campaign", "Reward Type", "Status", "Mobile Last 4"]}
          hasData={performance.recentRewardClaims.length > 0}
        >
          {performance.recentRewardClaims.map((r, idx) => (
            <tr key={idx} className="border-b border-border/30 last:border-0 hover:bg-muted/40 transition-colors">
              <td className="py-4 px-3 font-mono text-[10px] text-muted-foreground">
                {formatDateTime(r.createdAt)}
              </td>
              <td className="py-4 px-3 font-semibold text-foreground truncate max-w-[120px]" title={r.campaignName}>
                {r.campaignName}
              </td>
              <td className="py-4 px-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-muted text-foreground border border-border/40">
                  {r.rewardType}
                </span>
              </td>
              <td className="py-4 px-3 text-right">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                  r.status === "APPROVED" 
                    ? "bg-brand-teal/20 text-foreground border-brand-teal/35"
                    : "bg-primary/20 text-foreground border-primary/25"
                }`}>
                  {r.status}
                </span>
              </td>
              <td className="py-4 px-3 text-right font-mono text-muted-foreground">
                ···{r.mobileNumberLast4}
              </td>
            </tr>
          ))}
        </LocalTableSection>

        <LocalTableSection
          title="Recent Delivery Scans"
          description="Latest batch carton drop-offs completed by retail logistics operators."
          headers={["Date", "Retailer", "Campaign", "Batch", "Cartons", "Est. Units", "Location"]}
          hasData={performance.recentDeliveryScans.length > 0}
        >
          {performance.recentDeliveryScans.map((d, idx) => (
            <tr key={idx} className="border-b border-border/30 last:border-0 hover:bg-muted/40 transition-colors">
              <td className="py-4 px-3 font-mono text-[10px] text-muted-foreground">
                {formatDateTime(d.createdAt)}
              </td>
              <td className="py-4 px-3 font-semibold text-foreground truncate max-w-[100px]" title={d.retailerName}>
                {d.retailerName}
              </td>
              <td className="py-4 px-3 text-muted-foreground truncate max-w-[100px]" title={d.campaignName}>{d.campaignName}</td>
              <td className="py-4 px-3 font-mono text-[10px] text-muted-foreground">{d.batchCode}</td>
              <td className="py-4 px-3 text-right font-medium text-foreground">{d.cartonsDelivered}</td>
              <td className="py-4 px-3 text-right font-semibold text-foreground">{formatNumber(d.estimatedUnitsDelivered)}</td>
              <td className="py-4 px-3 text-muted-foreground truncate max-w-[100px]">{d.location}</td>
            </tr>
          ))}
        </LocalTableSection>
      </div>
    </div>
  );
}
