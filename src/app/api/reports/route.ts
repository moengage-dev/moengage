// src/app/api/reports/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getRoleScopeFilters } from "@/lib/auth/role-scope";
import { ReportFilterSchema } from "@/lib/validators/report-filter.validator";
import {
  getCampaignSummaryData,
  getScanEventsData,
  getRewardClaimsData,
  getDeliveryScansData,
  getBillingSummaryData,
  getSuspiciousScansData,
} from "@/server/services/reports.service";
import { generateCSV, generatePDF } from "@/lib/report-generator";
import { formatCurrency, formatDateTime } from "@/lib/format";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    // RETAIL_OPERATIONS shouldn't access general reports
    if (user.role === "RETAIL_OPERATIONS") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const scope = await getRoleScopeFilters(user);
    if (scope === null && user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const parseResult = ReportFilterSchema.safeParse({ type, startDate, endDate });

    if (!parseResult.success) {
      return new NextResponse("Invalid request parameters", { status: 400 });
    }

    const filters: any = { ...parseResult.data, ...scope };

    // Additional Role constraints on Report Types
    if (user.role === "ADVERTISER_VIEWER" && filters.type === "SUSPICIOUS_SCANS_CSV") {
      return new NextResponse("Forbidden", { status: 403 });
    }
    if (user.role === "CAMPAIGN_MANAGER" && filters.type === "BILLING_SUMMARY_PDF") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    let fileBuffer: Buffer | string = "";
    let contentType = "";
    let filename = "";

    switch (filters.type) {
      case "CAMPAIGN_SUMMARY_CSV": {
        const rawData = await getCampaignSummaryData(filters);
        const data = rawData.map((c) => ({
          ID: c.id,
          Name: c.name,
          Brand: c.brand?.name || "—",
          Advertiser: c.advertiser?.name || "—",
          Status: c.status,
          OfferTitle: c.offerTitle,
          RewardType: c.rewardType,
          StartDate: formatDateTime(c.startDate),
          EndDate: formatDateTime(c.endDate),
          CreatedAt: formatDateTime(c.createdAt),
        }));
        
        const columns = ["ID", "Name", "Brand", "Advertiser", "Status", "OfferTitle", "RewardType", "StartDate", "EndDate", "CreatedAt"];
        fileBuffer = generateCSV(data, columns);
        contentType = "text/csv";
        filename = `Campaign_Summary_${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }
      
      case "CAMPAIGN_SUMMARY_PDF": {
        const rawData = await getCampaignSummaryData(filters);
        const data = rawData.map((c) => ({
          Name: c.name,
          Brand: c.brand?.name || "—",
          Advertiser: c.advertiser?.name || "—",
          Status: c.status,
          StartDate: formatDateTime(c.startDate),
          EndDate: formatDateTime(c.endDate),
        }));
        
        const columns = ["Name", "Brand", "Advertiser", "Status", "StartDate", "EndDate"];
        fileBuffer = generatePDF("Campaign Summary Report", columns, data);
        contentType = "application/pdf";
        filename = `Campaign_Summary_${new Date().toISOString().split("T")[0]}.pdf`;
        break;
      }

      case "SCAN_EVENTS_CSV": {
        const rawData = await getScanEventsData(filters);
        const data = rawData.map((s) => ({
          ID: s.id,
          Campaign: s.campaign?.name || "—",
          Product: s.product?.name || "—",
          DeviceType: s.deviceType || "—",
          Location: [s.suburb, s.city, s.country].filter(Boolean).join(", ") || "—",
          IsRepeat: s.isRepeatScan ? "Yes" : "No",
          IsSuspicious: s.isSuspicious ? "Yes" : "No",
          IsBillable: s.isBillable ? "Yes" : "No",
          CreatedAt: formatDateTime(s.createdAt),
        }));

        const columns = ["ID", "Campaign", "Product", "DeviceType", "Location", "IsRepeat", "IsSuspicious", "IsBillable", "CreatedAt"];
        fileBuffer = generateCSV(data, columns);
        contentType = "text/csv";
        filename = `Scan_Events_${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }

      case "REWARD_CLAIMS_CSV": {
        const rawData = await getRewardClaimsData(filters);
        const data = rawData.map((r) => ({
          ID: r.id,
          Campaign: r.campaign?.name || "—",
          MobileLast4: r.mobileNumberLast4 || "—",
          Status: r.status,
          RewardType: r.rewardType,
          ProviderStatus: r.providerStatus,
          CreatedAt: formatDateTime(r.createdAt),
        }));

        const columns = ["ID", "Campaign", "MobileLast4", "Status", "RewardType", "ProviderStatus", "CreatedAt"];
        fileBuffer = generateCSV(data, columns);
        contentType = "text/csv";
        filename = `Reward_Claims_${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }

      case "DELIVERY_SCANS_CSV": {
        const rawData = await getDeliveryScansData(filters);
        const data = rawData.map((d) => ({
          ID: d.id,
          Campaign: d.campaign?.name || "—",
          BatchCode: d.batch?.batchCode || "—",
          Retailer: d.retailer?.name || "—",
          Cartons: d.cartonsDelivered,
          EstUnits: d.estimatedUnitsDelivered,
          Location: [d.suburb, d.city, d.country].filter(Boolean).join(", ") || "—",
          CreatedAt: formatDateTime(d.createdAt),
        }));

        const columns = ["ID", "Campaign", "BatchCode", "Retailer", "Cartons", "EstUnits", "Location", "CreatedAt"];
        fileBuffer = generateCSV(data, columns);
        contentType = "text/csv";
        filename = `Delivery_Scans_${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }

      case "BILLING_SUMMARY_PDF": {
        const rawData = await getBillingSummaryData(filters);
        if (rawData.length === 0) {
          fileBuffer = generatePDF(
            "Billing Summary Report",
            [],
            [],
            "No billing summary has been generated yet for this selection."
          );
        } else {
          const data = rawData.map((b) => ({
            Campaign: b.campaignName || "—",
            TotalScans: b.totalScans,
            BillableScans: b.billableScanCount,
            EngagementFee: formatCurrency(b.engagementFeeTotal || 0, b.currency),
            FixedFee: formatCurrency(b.fixedFeeTotal || 0, b.currency),
            TotalAmount: formatCurrency(b.totalAmount || 0, b.currency),
            GeneratedAt: formatDateTime(b.generatedAt),
          }));

          const columns = ["Campaign", "TotalScans", "BillableScans", "EngagementFee", "FixedFee", "TotalAmount", "GeneratedAt"];
          fileBuffer = generatePDF("Billing Summary Report", columns, data);
        }
        contentType = "application/pdf";
        filename = `Billing_Summary_${new Date().toISOString().split("T")[0]}.pdf`;
        break;
      }

      case "SUSPICIOUS_SCANS_CSV": {
        const rawData = await getSuspiciousScansData(filters);
        const data = rawData.map((s) => ({
          Date: formatDateTime(s.createdAt),
          Campaign: s.campaign?.name || "—",
          Brand: s.brand?.name || "—",
          Advertiser: s.advertiser?.name || "—",
          QRCode: s.qrCode?.code || "—",
          Reason: s.suspiciousReason || "—",
          VisitorID: s.anonymousVisitorId || "—",
          MaskedIP: s.ipHash ? s.ipHash.slice(0, 8) + "..." : "—",
          Country: s.country || "—",
          Region: s.region || "—",
          City: s.city || "—",
          DeviceType: s.deviceType || "—",
          OS: s.os || "—",
          Browser: s.browser || "—",
          UserAgent: s.userAgent || "—",
          IsBillable: s.isBillable ? "Yes" : "No",
        }));

        const columns = [
          "Date",
          "Campaign",
          "Brand",
          "Advertiser",
          "QRCode",
          "Reason",
          "VisitorID",
          "MaskedIP",
          "Country",
          "Region",
          "City",
          "DeviceType",
          "OS",
          "Browser",
          "UserAgent",
          "IsBillable",
        ];
        fileBuffer = generateCSV(data, columns);
        contentType = "text/csv";
        filename = `Suspicious_Scans_${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }

      default:
        return new NextResponse("Unsupported report type", { status: 400 });
    }

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);

    return new NextResponse(fileBuffer as any, { headers });
  } catch (error) {
    console.error("[REPORTS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
