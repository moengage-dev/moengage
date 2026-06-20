// src/app/admin/qr-codes/qr-codes-client.tsx
"use client";

import React, { useState, useMemo } from "react";
import { Plus, Pencil, Ban, Download, FileCode, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { QRCodeForm } from "@/components/forms/qr-code-form";
import {
  createQRCodeAction,
  updateQRCodeAction,
  disableQRCodeAction,
  type ActionResult,
} from "@/app/admin/qr-codes/actions";
import type {
  QRCodeRow,
  BrandOption,
  AdvertiserOption,
  CampaignOption,
  ProductOption,
  BatchOption,
} from "@/server/services/qr-codes.service";
import type { QRCodeFormValues } from "@/lib/validators/qr-code.validator";
import { formatDate, formatStatusLabel, formatNumber } from "@/lib/format";

type QRCodesClientActions = {
  create: (values: QRCodeFormValues) => Promise<ActionResult>;
  update: (id: string, values: QRCodeFormValues) => Promise<ActionResult>;
  disable: (id: string) => Promise<ActionResult>;
};

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
  actions?: QRCodesClientActions;
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
  actions,
}: Props) {
  const create = actions?.create ?? createQRCodeAction;
  const update = actions?.update ?? updateQRCodeAction;
  const disable = actions?.disable ?? disableQRCodeAction;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingQR, setEditingQR] = useState<QRCodeRow | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const filteredQRCodes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return qrCodes.filter((qr) => {
      const matchesStatus = statusFilter === "ALL" || qr.status === statusFilter;
      const matchesType = typeFilter === "ALL" || qr.type === typeFilter;
      if (!matchesStatus || !matchesType) return false;
      if (!q) return true;
      return (
        qr.code.toLowerCase().includes(q) ||
        (qr.label ?? "").toLowerCase().includes(q) ||
        (qr.brandName ?? "").toLowerCase().includes(q) ||
        (qr.campaignName ?? "").toLowerCase().includes(q) ||
        (qr.productName ?? "").toLowerCase().includes(q)
      );
    });
  }, [qrCodes, searchQuery, statusFilter, typeFilter]);

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
    const result = await disable(qr.id);
    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error(result.error);
    }
  }

  const hasActiveFilters = searchQuery !== "" || statusFilter !== "ALL" || typeFilter !== "ALL";

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
  }

  return (
    <>
      {/* KPI Cards — 2 rows of 3 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-primary">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Total QR Codes</span>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">{formatNumber(totalQRCodes)}</div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-brand-teal">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Active</span>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">{formatNumber(activeQRCodes)}</div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-brand-yellow">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Consumer Campaigns</span>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">{formatNumber(consumerCampaignQRCodes)}</div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-muted-foreground/40">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Deliveries</span>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">{formatNumber(deliveryQRCodes)}</div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-muted-foreground/40">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Sample Labels</span>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">{formatNumber(sampleLabelQRCodes)}</div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-muted-foreground/40">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Internal Tests</span>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">{formatNumber(internalTestQRCodes)}</div>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by code, label, brand, or campaign…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Search QR codes"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]" aria-label="Filter by status">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
            <SelectItem value="DISABLED">Disabled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]" aria-label="Filter by type">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="CONSUMER_CAMPAIGN">Consumer Campaign</SelectItem>
            <SelectItem value="SAMPLE_LABEL">Sample Label</SelectItem>
            <SelectItem value="BATCH_DELIVERY">Batch Delivery</SelectItem>
            <SelectItem value="INTERNAL_TEST">Internal Test</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <X className="mr-1.5 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
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
            {filteredQRCodes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                  {hasActiveFilters
                    ? "No QR codes match your search or filter."
                    : "No QR codes found."}
                </TableCell>
              </TableRow>
            ) : (
              filteredQRCodes.map((qr) => (
                <TableRow key={qr.id}>
                  <TableCell className="font-mono text-sm font-medium">{qr.code}</TableCell>
                  <TableCell>
                    <Badge variant={typeVariant(qr.type)}>
                      {formatStatusLabel(qr.type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">{qr.label ?? "—"}</TableCell>
                  <TableCell>{qr.brandName ?? "—"}</TableCell>
                  <TableCell>{qr.advertiserName ?? "—"}</TableCell>
                  <TableCell className="max-w-[150px] truncate">{qr.campaignName ?? "—"}</TableCell>
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
                  <TableCell className="text-muted-foreground">{formatDate(qr.createdAt)}</TableCell>
                  <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Edit QR Code"
                              onClick={() => openEdit(qr)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Edit QR Code</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon-sm" asChild className="text-muted-foreground hover:text-foreground">
                              <a href={`/api/qr-codes/${qr.id}/download/png`} download aria-label="Download PNG">
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Download PNG</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon-sm" asChild className="text-muted-foreground hover:text-foreground">
                              <a href={`/api/qr-codes/${qr.id}/download/svg`} download aria-label="Download SVG">
                                <FileCode className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Download SVG</TooltipContent>
                        </Tooltip>

                        {qr.status !== "DISABLED" && (
                          <AlertDialog>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Disable QR Code"
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Ban className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent side="top">Disable QR Code</TooltipContent>
                            </Tooltip>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Disable QR Code?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will change the status of QR Code <strong>{qr.code}</strong> to{" "}
                                  <strong>DISABLED</strong>. No scan data or associations will be deleted,
                                  but the QR code will be deactivated.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDisable(qr)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
              onSubmitAction={(values) => update(editingQR.id, values)}
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
              onSubmitAction={(values) => create(values)}
              onSuccess={handleSheetSuccess}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
