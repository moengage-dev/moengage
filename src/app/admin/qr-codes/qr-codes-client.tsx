// src/app/admin/qr-codes/qr-codes-client.tsx
"use client";

import React, { useState } from "react";
import { Plus, Pencil, Ban, Download, FileCode } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { QRCodeForm } from "@/components/forms/qr-code-form";
import {
  createQRCodeAction,
  updateQRCodeAction,
  disableQRCodeAction,
} from "@/app/admin/qr-codes/actions";
import type {
  QRCodeRow,
  BrandOption,
  AdvertiserOption,
  CampaignOption,
  ProductOption,
  BatchOption,
} from "@/server/services/qr-codes.service";
import { formatDate, formatStatusLabel, formatNumber } from "@/lib/format";

type Props = {
  qrCodes: QRCodeRow[];
  brands: BrandOption[];
  advertisers: AdvertiserOption[];
  campaigns: CampaignOption[];
  products: ProductOption[];
  batches: BatchOption[];
  totalQRCodes: number;
  activeQRCodes: number;
  consumerCampaignQRCodes: number;
  deliveryQRCodes: number;
  sampleLabelQRCodes: number;
  internalTestQRCodes: number;
};

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "ACTIVE") return "default";
  if (status === "PAUSED") return "secondary";
  if (status === "EXPIRED") return "outline";
  return "destructive"; // DISABLED
}

function typeVariant(
  type: string
): "default" | "secondary" | "destructive" | "outline" {
  if (type === "CONSUMER_CAMPAIGN") return "default";
  if (type === "SAMPLE_LABEL") return "secondary";
  if (type === "BATCH_DELIVERY") return "outline";
  return "outline"; // INTERNAL_TEST
}

export function QRCodesClient({
  qrCodes,
  brands,
  advertisers,
  campaigns,
  products,
  batches,
  totalQRCodes,
  activeQRCodes,
  consumerCampaignQRCodes,
  deliveryQRCodes,
  sampleLabelQRCodes,
  internalTestQRCodes,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingQR, setEditingQR] = useState<QRCodeRow | undefined>(undefined);

  function openCreate() {
    setEditingQR(undefined);
    setSheetOpen(true);
  }

  function openEdit(qr: QRCodeRow) {
    setEditingQR(qr);
    setSheetOpen(true);
  }

  function handleSheetSuccess() {
    setSheetOpen(false);
  }

  async function handleDisable(qr: QRCodeRow) {
    const result = await disableQRCodeAction(qr.id);
    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total QRs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalQRCodes)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(activeQRCodes)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consumer Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(consumerCampaignQRCodes)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(deliveryQRCodes)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sample Labels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(sampleLabelQRCodes)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Internal Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(internalTestQRCodes)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add QR Code
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Advertiser</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Scans</TableHead>
              <TableHead>Destination URL</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {qrCodes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={13}
                  className="text-center text-muted-foreground py-8"
                >
                  No QR codes found.
                </TableCell>
              </TableRow>
            ) : (
              qrCodes.map((qr) => (
                <TableRow key={qr.id}>
                  <TableCell className="font-mono text-sm font-medium">
                    {qr.code}
                  </TableCell>
                  <TableCell>
                    <Badge variant={typeVariant(qr.type)}>
                      {formatStatusLabel(qr.type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">
                    {qr.label ?? "—"}
                  </TableCell>
                  <TableCell>{qr.brandName ?? "—"}</TableCell>
                  <TableCell>{qr.advertiserName ?? "—"}</TableCell>
                  <TableCell className="max-w-[150px] truncate">
                    {qr.campaignName ?? "—"}
                  </TableCell>
                  <TableCell>{qr.productName ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{qr.batchCode ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(qr.status)}>
                      {formatStatusLabel(qr.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatNumber(qr.scanCount)}</TableCell>
                  <TableCell className="max-w-[200px] truncate font-mono text-xs text-muted-foreground">
                    {qr.destinationUrl ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(qr.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(qr)}
                        title="Edit QR Code"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon-sm"
                        asChild
                        title="Download PNG"
                      >
                        <a href={`/api/qr-codes/${qr.id}/download/png`} download>
                          <Download className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                          <span className="sr-only">Download PNG</span>
                        </a>
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon-sm"
                        asChild
                        title="Download SVG"
                      >
                        <a href={`/api/qr-codes/${qr.id}/download/svg`} download>
                          <FileCode className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                          <span className="sr-only">Download SVG</span>
                        </a>
                      </Button>

                      {qr.status !== "DISABLED" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Disable QR Code"
                            >
                              <Ban className="h-3.5 w-3.5 text-destructive" />
                              <span className="sr-only">Disable</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Disable QR Code?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will change the status of QR Code{" "}
                                <strong>{qr.code}</strong> to <strong>DISABLED</strong>. No scan data or associations will be deleted, but the QR code will be deactivated.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDisable(qr)}
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                              >
                                Disable
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editingQR ? "Edit QR Code" : "Add QR Code"}</SheetTitle>
            <SheetDescription>
              {editingQR
                ? "Update QR code configurations below."
                : "Fill in the details to create a new QR code."}
            </SheetDescription>
          </SheetHeader>
          {editingQR ? (
            <QRCodeForm
              key={editingQR.id}
              mode="edit"
              initialData={editingQR}
              brands={brands}
              advertisers={advertisers}
              campaigns={campaigns}
              products={products}
              batches={batches}
              onSubmitAction={(values) => updateQRCodeAction(editingQR.id, values)}
              onSuccess={handleSheetSuccess}
            />
          ) : (
            <QRCodeForm
              key="create"
              mode="create"
              brands={brands}
              advertisers={advertisers}
              campaigns={campaigns}
              products={products}
              batches={batches}
              onSubmitAction={createQRCodeAction}
              onSuccess={handleSheetSuccess}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
