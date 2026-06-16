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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || undefined;
    
    // RETAIL_OPERATIONS shouldn't access general reports
    if (user.role === "RETAIL_OPERATIONS") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const scope = await getRoleScopeFilters(user);
    if (scope === null && user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    let startDate = searchParams.get("startDate") || undefined;
    let endDate = searchParams.get("endDate") || undefined;
    const preview = searchParams.get("preview") === "true";

    if (!startDate && !endDate) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 90);
      startDate = start.toISOString().split("T")[0];
      endDate = end.toISOString().split("T")[0];
    }

    const parseResult = ReportFilterSchema.safeParse({ type, startDate, endDate });

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid request parameters";
      return new NextResponse(errorMsg, { status: 400 });
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
        filters.take = preview ? 1001 : 25001;
        const rawData = await getCampaignSummaryData(filters);
        const totalCount = rawData.length;

        if (preview) {
          const isTruncated = totalCount > 1000;
          const data = rawData.slice(0, 1000).map((c) => ({
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
          return NextResponse.json({ data, totalCount, isTruncated });
        }

        if (totalCount > 25000) {
          return new NextResponse(
            "The requested export exceeds the maximum limit of 25,000 rows. Please narrow the date range or filters to reduce the number of records.",
            { status: 422 }
          );
        }

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
        filters.take = preview ? 1001 : 5001;
        const rawData = await getCampaignSummaryData(filters);
        const totalCount = rawData.length;

        if (preview) {
          const isTruncated = totalCount > 1000;
          const data = rawData.slice(0, 1000).map((c) => ({
            Name: c.name,
            Brand: c.brand?.name || "—",
            Advertiser: c.advertiser?.name || "—",
            Status: c.status,
            StartDate: formatDateTime(c.startDate),
            EndDate: formatDateTime(c.endDate),
          }));
          return NextResponse.json({ data, totalCount, isTruncated });
        }

        if (totalCount > 5000) {
          return new NextResponse(
            "The requested export exceeds the maximum limit of 5,000 rows. Please narrow the date range or filters to reduce the number of records.",
            { status: 422 }
          );
        }

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
        filters.take = preview ? 1001 : 25001;
        const rawData = await getScanEventsData(filters);
        const totalCount = rawData.length;

        if (preview) {
          const isTruncated = totalCount > 1000;
          const data = rawData.slice(0, 1000).map((s) => ({
            ID: s.id,
            Campaign: s.campaign?.name || "—",
            Product: s.product?.name || "—",
            DeviceType: s.deviceType || "—",
            Location: [s.suburb, s.city, s.country].filter(Boolean).join(", ") || "—",
            HitCount: s.hitCount,
            RepeatCount: s.repeatCount,
            SuspiciousCount: s.suspiciousCount,
            BillableCount: s.billableCount,
            IsRepeat: s.isRepeatScan ? "Yes" : "No",
            IsSuspicious: s.isSuspicious ? "Yes" : "No",
            IsBillable: s.isBillable ? "Yes" : "No",
            CreatedAt: formatDateTime(s.createdAt),
          }));
          return NextResponse.json({ data, totalCount, isTruncated });
        }

        if (totalCount > 25000) {
          return new NextResponse(
            "The requested export exceeds the maximum limit of 25,000 rows. Please narrow the date range or filters to reduce the number of records.",
            { status: 422 }
          );
        }

        const data = rawData.map((s) => ({
          ID: s.id,
          Campaign: s.campaign?.name || "—",
          Product: s.product?.name || "—",
          DeviceType: s.deviceType || "—",
          Location: [s.suburb, s.city, s.country].filter(Boolean).join(", ") || "—",
          HitCount: s.hitCount,
          RepeatCount: s.repeatCount,
          SuspiciousCount: s.suspiciousCount,
          BillableCount: s.billableCount,
          IsRepeat: s.isRepeatScan ? "Yes" : "No",
          IsSuspicious: s.isSuspicious ? "Yes" : "No",
          IsBillable: s.isBillable ? "Yes" : "No",
          CreatedAt: formatDateTime(s.createdAt),
        }));

        const columns = [
          "ID",
          "Campaign",
          "Product",
          "DeviceType",
          "Location",
          "HitCount",
          "RepeatCount",
          "SuspiciousCount",
          "BillableCount",
          "IsRepeat",
          "IsSuspicious",
          "IsBillable",
          "CreatedAt",
        ];
        fileBuffer = generateCSV(data, columns);
        contentType = "text/csv";
        filename = `Scan_Events_${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }

      case "REWARD_CLAIMS_CSV": {
        filters.take = preview ? 1001 : 25001;
        const rawData = await getRewardClaimsData(filters);
        const totalCount = rawData.length;

        if (preview) {
          const isTruncated = totalCount > 1000;
          const data = rawData.slice(0, 1000).map((r) => ({
            ID: r.id,
            RecordType: r.recordType,
            Campaign: r.campaign?.name || "—",
            MobileLast4: r.mobileNumberLast4 || "—",
            Status: r.status,
            FailureReason: r.failureReason || "—",
            RewardType: r.rewardType || "—",
            ProviderStatus: r.providerStatus || "—",
            CreatedAt: formatDateTime(r.createdAt),
          }));
          return NextResponse.json({ data, totalCount, isTruncated });
        }

        if (totalCount > 25000) {
          return new NextResponse(
            "The requested export exceeds the maximum limit of 25,000 rows. Please narrow the date range or filters to reduce the number of records.",
            { status: 422 }
          );
        }

        const data = rawData.map((r) => ({
          ID: r.id,
          RecordType: r.recordType,
          Campaign: r.campaign?.name || "—",
          MobileLast4: r.mobileNumberLast4 || "—",
          Status: r.status,
          FailureReason: r.failureReason || "—",
          RewardType: r.rewardType || "—",
          ProviderStatus: r.providerStatus || "—",
          CreatedAt: formatDateTime(r.createdAt),
        }));

        const columns = [
          "ID",
          "RecordType",
          "Campaign",
          "MobileLast4",
          "Status",
          "FailureReason",
          "RewardType",
          "ProviderStatus",
          "CreatedAt",
        ];
        fileBuffer = generateCSV(data, columns);
        contentType = "text/csv";
        filename = `Reward_Claims_${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }

      case "DELIVERY_SCANS_CSV": {
        filters.take = preview ? 1001 : 25001;
        const rawData = await getDeliveryScansData(filters);
        const totalCount = rawData.length;

        if (preview) {
          const isTruncated = totalCount > 1000;
          const data = rawData.slice(0, 1000).map((d) => ({
            ID: d.id,
            Campaign: d.campaign?.name || "—",
            BatchCode: d.batch?.batchCode || "—",
            Retailer: d.retailer?.name || "—",
            Cartons: d.cartonsDelivered,
            EstUnits: d.estimatedUnitsDelivered,
            Location: [d.suburb, d.city, d.country].filter(Boolean).join(", ") || "—",
            CreatedAt: formatDateTime(d.createdAt),
          }));
          return NextResponse.json({ data, totalCount, isTruncated });
        }

        if (totalCount > 25000) {
          return new NextResponse(
            "The requested export exceeds the maximum limit of 25,000 rows. Please narrow the date range or filters to reduce the number of records.",
            { status: 422 }
          );
        }

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
        filters.take = preview ? 1001 : 5001;
        const rawData = await getBillingSummaryData(filters);
        const totalCount = rawData.length;

        if (preview) {
          const isTruncated = totalCount > 1000;
          const data = rawData.slice(0, 1000).map((b) => ({
            Campaign: b.campaignName || "—",
            TotalScans: b.totalScans,
            BillableScans: b.billableScanCount,
            EngagementFee: formatCurrency(b.engagementFeeTotal || 0, b.currency),
            FixedFee: formatCurrency(b.fixedFeeTotal || 0, b.currency),
            TotalAmount: formatCurrency(b.totalAmount || 0, b.currency),
            GeneratedAt: formatDateTime(b.generatedAt),
          }));
          return NextResponse.json({ data, totalCount, isTruncated });
        }

        if (totalCount > 5000) {
          return new NextResponse(
            "The requested export exceeds the maximum limit of 5,000 rows. Please narrow the date range or filters to reduce the number of records.",
            { status: 422 }
          );
        }

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
        filters.take = preview ? 1001 : 25001;
        const rawData = await getSuspiciousScansData(filters);
        const totalCount = rawData.length;

        if (preview) {
          const isTruncated = totalCount > 1000;
          const data = rawData.slice(0, 1000).map((s) => ({
            Date: formatDateTime(s.createdAt),
            Campaign: s.campaign?.name || "—",
            Brand: s.brand?.name || "—",
            Advertiser: s.advertiser?.name || "—",
            QRCode: s.qrCode?.code || "—",
            Reason: s.suspiciousReason || "—",
            VisitorID: s.anonymousVisitorId
              ? `${s.anonymousVisitorId.slice(0, 8)}...`
              : "—",
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
          return NextResponse.json({ data, totalCount, isTruncated });
        }

        if (totalCount > 25000) {
          return new NextResponse(
            "The requested export exceeds the maximum limit of 25,000 rows. Please narrow the date range or filters to reduce the number of records.",
            { status: 422 }
          );
        }

        const data = rawData.map((s) => ({
          Date: formatDateTime(s.createdAt),
          Campaign: s.campaign?.name || "—",
          Brand: s.brand?.name || "—",
          Advertiser: s.advertiser?.name || "—",
          QRCode: s.qrCode?.code || "—",
          Reason: s.suspiciousReason || "—",
          VisitorID: s.anonymousVisitorId
            ? `${s.anonymousVisitorId.slice(0, 8)}...`
            : "—",
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
    headers.set("Cache-Control", "no-store");
    headers.set("X-Content-Type-Options", "nosniff");

    return new NextResponse(fileBuffer as any, { headers });
  } catch (error) {
    console.error("[REPORTS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
