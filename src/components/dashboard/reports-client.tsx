"use client";

import { useState } from "react";
import { ReportType } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, FileText, Table, Eye, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const DEFAULT_REPORT_CARDS = [
  {
    title: "Campaign Summary",
    description: "Overview of all campaigns, statuses, and configured rewards.",
    csvType: ReportType.CAMPAIGN_SUMMARY_CSV,
    pdfType: ReportType.CAMPAIGN_SUMMARY_PDF,
  },
  {
    title: "Scan Events",
    description: "Detailed log of all consumer QR scans including location and device info.",
    csvType: ReportType.SCAN_EVENTS_CSV,
    pdfType: undefined,
  },
  {
    title: "Reward Claims",
    description: "Record of all reward claims, statuses, and mobile numbers.",
    csvType: ReportType.REWARD_CLAIMS_CSV,
    pdfType: undefined,
  },
  {
    title: "Delivery Scans",
    description: "Retailer operations delivery scans and carton estimations.",
    csvType: ReportType.DELIVERY_SCANS_CSV,
    pdfType: undefined,
  },
  {
    title: "Billing Summary",
    description: "Calculated billing per campaign including engagement fees.",
    csvType: undefined,
    pdfType: ReportType.BILLING_SUMMARY_PDF,
  },
  {
    title: "Suspicious Scans",
    description: "Log of flagged/non-billable consumer QR scans and reasons.",
    csvType: "SUSPICIOUS_SCANS_CSV",
    pdfType: undefined,
  },
];

export function ReportsClient({ 
  apiEndpoint = "/api/reports",
  availableCards = DEFAULT_REPORT_CARDS
}: {
  apiEndpoint?: string;
  availableCards?: typeof DEFAULT_REPORT_CARDS;
} = {}) {
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isTruncated, setIsTruncated] = useState<boolean>(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState<string | null>(null);

  const validateDates = () => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) {
        toast.error("End date cannot be before start date");
        return false;
      }
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 366) {
        toast.error("Date range cannot exceed 366 days");
        return false;
      }
    }
    return true;
  };

  const handleDownload = async (type: string) => {
    if (!validateDates()) return;
    try {
      setIsDownloading(type);
      toast.info(`Generating ${type.replace(/_/g, " ")}...`);

      let url = `${apiEndpoint}?type=${type}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to generate report");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "report";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match && match.length === 2) filename = match[1];
      } else {
        filename = type.includes("CSV") ? `${type}.csv` : `${type}.pdf`;
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);

      toast.success("Report downloaded successfully");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to download report");
    } finally {
      setIsDownloading(null);
    }
  };

  const handlePreview = async (type: string, title: string) => {
    if (!validateDates()) return;
    try {
      setIsPreviewLoading(type);
      toast.info(`Loading preview for ${title}...`);

      let url = `${apiEndpoint}?type=${type}&preview=true`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to load preview");
      }

      const result = await response.json();
      setPreviewData(result.data);
      setPreviewType(title);
      setTotalCount(result.totalCount);
      setIsTruncated(result.isTruncated);
      toast.success("Preview loaded successfully");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to load preview");
    } finally {
      setIsPreviewLoading(null);
    }
  };

  const handleClearDates = () => {
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="space-y-6">
      {/* Date Filters Card */}
      <Card className="border border-border/50 shadow-sm bg-card rounded-2xl">
        <CardHeader className="py-4">
          <CardTitle className="text-base font-semibold text-[#2C2621] flex items-center gap-2">
            Filter Report Dates
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Narrow down report records by specifying a date range. Leaving these blank defaults to the previous 90 days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto h-9 bg-background font-sans focus-visible:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-auto h-9 bg-background font-sans focus-visible:ring-ring"
              />
            </div>
            {(startDate || endDate) && (
              <Button type="button" variant="ghost" size="sm" onClick={handleClearDates} className="h-9">
                Clear Dates
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reports Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {availableCards.map((report) => (
          <Card key={report.title} className="flex flex-col border border-border/50 shadow-sm bg-card rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base font-bold text-[#2C2621]">{report.title}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
                {report.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto flex flex-col gap-2">
              {report.csvType && (
                <div className="grid grid-cols-2 gap-2 w-full">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-9 px-3 text-xs"
                    disabled={isDownloading !== null || isPreviewLoading !== null}
                    onClick={() => handleDownload(report.csvType!)}
                  >
                    {isDownloading === report.csvType ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Table className="mr-1.5 h-3.5 w-3.5 text-[#156D6B]" />
                    )}
                    Download CSV
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start h-9 px-3 text-xs border-brand-teal/20 text-[#1E5C5A] hover:bg-brand-teal/[0.04]"
                    disabled={isDownloading !== null || isPreviewLoading !== null}
                    onClick={() => handlePreview(report.csvType!, report.title)}
                  >
                    {isPreviewLoading === report.csvType ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Eye className="mr-1.5 h-3.5 w-3.5 text-[#1E5C5A]" />
                    )}
                    Preview
                  </Button>
                </div>
              )}
              {report.pdfType && (
                <div className="grid grid-cols-2 gap-2 w-full">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-9 px-3 text-xs"
                    disabled={isDownloading !== null || isPreviewLoading !== null}
                    onClick={() => handleDownload(report.pdfType!)}
                  >
                    {isDownloading === report.pdfType ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileText className="mr-1.5 h-3.5 w-3.5 text-[#8C3A1B]" />
                    )}
                    Download PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start h-9 px-3 text-xs border-brand-teal/20 text-[#1E5C5A] hover:bg-brand-teal/[0.04]"
                    disabled={isDownloading !== null || isPreviewLoading !== null}
                    onClick={() => handlePreview(report.pdfType!, report.title)}
                  >
                    {isPreviewLoading === report.pdfType ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Eye className="mr-1.5 h-3.5 w-3.5 text-[#1E5C5A]" />
                    )}
                    Preview
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dynamic Preview Card */}
      {previewData && (
        <Card className="mt-8 border border-border/50 shadow-sm bg-card rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base font-semibold text-[#2C2621]">
                Preview: {previewType}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Showing the first {previewData.length} rows of {totalCount} total matching records.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPreviewData(null);
                setPreviewType(null);
              }}
              className="text-muted-foreground hover:text-foreground h-9"
            >
              Clear Preview
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {isTruncated && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-800">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  Showing the most recent 1,000 records. Narrow the filters to view a more specific area.
                </div>
              </div>
            )}

            {previewData.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground italic bg-transparent border border-border/30 rounded-xl">
                No matching records found for this period.
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-xl border-border/30">
                <table className="w-full text-left border-collapse text-xs bg-transparent">
                  <thead>
                    <tr className="border-b border-border/30 bg-[#F5EFE0]/40">
                      {Object.keys(previewData[0]).map((key) => (
                        <th
                          key={key}
                          className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 py-3 px-4 whitespace-nowrap"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-border/20 last:border-0 hover:bg-[#F5EFE0]/20 transition-colors"
                      >
                        {Object.values(row).map((val: any, colIdx) => (
                          <td
                            key={colIdx}
                            className="py-3 px-4 text-muted-foreground font-sans whitespace-nowrap max-w-[200px] truncate"
                            title={String(val)}
                          >
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
