"use client";

import { useState } from "react";
import { ReportType } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Table } from "lucide-react";
import { toast } from "sonner";

const REPORT_CARDS = [
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
];

export function ReportsClient() {
  const [isDownloading, setIsDownloading] = useState<ReportType | null>(null);

  const handleDownload = async (type: ReportType) => {
    try {
      setIsDownloading(type);
      toast.info(`Generating ${type.replace(/_/g, " ")}...`);

      // Using window.open or hidden anchor tag to trigger browser download
      // An elegant way is to fetch and create object URL to handle errors properly
      const response = await fetch(`/api/admin/reports?type=${type}`);

      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
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
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Report downloaded successfully");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to download report");
    } finally {
      setIsDownloading(null);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {REPORT_CARDS.map((report) => (
        <Card key={report.title} className="flex flex-col">
          <CardHeader>
            <CardTitle>{report.title}</CardTitle>
            <CardDescription>{report.description}</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto flex flex-col gap-2">
            {report.csvType && (
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled={isDownloading !== null}
                onClick={() => handleDownload(report.csvType!)}
              >
                {isDownloading === report.csvType ? (
                  <Download className="mr-2 h-4 w-4 animate-bounce" />
                ) : (
                  <Table className="mr-2 h-4 w-4" />
                )}
                Download CSV
              </Button>
            )}
            {report.pdfType && (
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled={isDownloading !== null}
                onClick={() => handleDownload(report.pdfType!)}
              >
                {isDownloading === report.pdfType ? (
                  <Download className="mr-2 h-4 w-4 animate-bounce" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                Download PDF
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
