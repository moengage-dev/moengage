import { requireRole } from "@/lib/auth/require-role";
import { getQRCodesPageData } from "@/server/services/qr-codes.service";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatStatusLabel, formatNumber } from "@/lib/format";
import { Layers, Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

export const dynamic = "force-dynamic";

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "ACTIVE") return "default";
  if (status === "PAUSED") return "secondary";
  if (status === "EXPIRED") return "outline";
  return "destructive";
}

function typeVariant(
  type: string
): "default" | "secondary" | "destructive" | "outline" {
  if (type === "CONSUMER_CAMPAIGN") return "default";
  if (type === "SAMPLE_LABEL") return "secondary";
  if (type === "BATCH_DELIVERY") return "outline";
  return "outline";
}

export default async function CampaignManagerQRCodesPage() {
  const user = await requireRole(["CAMPAIGN_MANAGER", "ADMIN"]);
  const data = await getQRCodesPageData(user);

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        title="QR Codes"
        description="QR codes for your assigned campaigns. Download PNGs or SVGs for printing."
        badgeText="Campaign Manager"
        badgeVariant="indigo"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: data.totalQRCodes },
          { label: "Active", value: data.activeQRCodes },
          { label: "Consumer", value: data.consumerCampaignQRCodes },
          { label: "Delivery", value: data.deliveryQRCodes },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="bg-card rounded-xl border border-border/40 p-5 shadow-sm"
          >
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p className="text-3xl font-extrabold text-foreground mt-1">
              {formatNumber(value)}
            </p>
          </div>
        ))}
      </div>

      {data.qrCodes.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-muted border border-border text-muted-foreground rounded-full flex items-center justify-center">
              <Layers className="h-6 w-6" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h2 className="text-lg font-bold text-foreground">No QR Codes Found</h2>
              <p className="text-sm text-muted-foreground">
                No QR codes are linked to your assigned campaigns yet.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-border/40 overflow-hidden bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>Code</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead className="text-right">Scans</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Download</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.qrCodes.map((qr) => (
                <TableRow key={qr.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="font-mono text-xs">{qr.code}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {qr.label ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={typeVariant(qr.type)} className="text-[10px]">
                      {formatStatusLabel(qr.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(qr.status)} className="text-[10px]">
                      {formatStatusLabel(qr.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs max-w-[140px] truncate text-muted-foreground">
                    {qr.campaignName ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {qr.productName ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground">
                    {qr.batchCode ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatNumber(qr.scanCount)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(qr.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Download PNG"
                      >
                        <Link
                          href={`/api/qr-codes/${qr.id}/download/png`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
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
