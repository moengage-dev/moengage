// src/app/admin/batches/batches-client.tsx
"use client";

import React, { useState, useMemo } from "react";
import { Plus, Pencil, XCircle, Search, X } from "lucide-react";
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
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BatchForm } from "@/components/forms/batch-form";
import {
  createBatchAction,
  updateBatchAction,
  closeBatchAction,
} from "@/app/admin/batches/actions";
import type {
  BatchRow,
  BrandOption,
  CampaignOption,
  ProductOption,
} from "@/server/services/batches.service";
import type { BatchFormValues } from "@/lib/validators/batch.validator";
import { formatDate, formatStatusLabel, formatNumber } from "@/lib/format";

type Props = {
  batches: BatchRow[];
  brands: BrandOption[];
  campaigns: CampaignOption[];
  products: ProductOption[];
  totalBatches: number;
  activeBatches: number;
  deliveringBatches: number;
  closedBatches: number;
};

function batchStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "ACTIVE") return "default";
  if (status === "DELIVERING") return "outline";
  if (status === "CLOSED") return "destructive";
  return "secondary";
}

export function BatchesClient({
  batches,
  brands,
  campaigns,
  products,
  totalBatches,
  activeBatches,
  deliveringBatches,
  closedBatches,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchRow | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredBatches = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return batches.filter((b) => {
      const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        b.batchCode.toLowerCase().includes(q) ||
        b.brandName.toLowerCase().includes(q) ||
        b.campaignName.toLowerCase().includes(q) ||
        (b.productName ?? "").toLowerCase().includes(q) ||
        (b.region ?? "").toLowerCase().includes(q) ||
        (b.city ?? "").toLowerCase().includes(q)
      );
    });
  }, [batches, searchQuery, statusFilter]);

  function openCreate() {
    setEditingBatch(undefined);
    setSheetOpen(true);
  }

  function openEdit(batch: BatchRow) {
    setEditingBatch(batch);
    setSheetOpen(true);
  }

  function handleSheetSuccess() {
    setSheetOpen(false);
  }

  async function handleClose(batch: BatchRow) {
    const result = await closeBatchAction(batch.id);
    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error(result.error);
    }
  }

  function makeSubmitAction(batch?: BatchRow) {
    return (values: BatchFormValues) =>
      batch ? updateBatchAction(batch.id, values) : createBatchAction(values);
  }

  const hasActiveFilters = searchQuery !== "" || statusFilter !== "ALL";

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("ALL");
  }

  return (
    <>
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Total Batches</span>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">{formatNumber(totalBatches)}</div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-brand-teal">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Active</span>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">{formatNumber(activeBatches)}</div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-brand-yellow">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Delivering</span>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">{formatNumber(deliveringBatches)}</div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-muted-foreground/40">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Closed</span>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">{formatNumber(closedBatches)}</div>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by batch code, brand, campaign, region, or city…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Search batches"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]" aria-label="Filter by status">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="DELIVERING">Delivering</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
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
          Add Batch
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch Code</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Est. Units</TableHead>
              <TableHead>Units/Carton</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBatches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                  {hasActiveFilters
                    ? "No batches match your search or filter."
                    : "No batches found."}
                </TableCell>
              </TableRow>
            ) : (
              filteredBatches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-mono font-medium text-sm">{batch.batchCode}</TableCell>
                  <TableCell>{batch.brandName}</TableCell>
                  <TableCell>{batch.campaignName}</TableCell>
                  <TableCell>{batch.productName ?? "—"}</TableCell>
                  <TableCell>{batch.region ?? "—"}</TableCell>
                  <TableCell>{batch.city ?? "—"}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {batch.estimatedUnitCount != null ? formatNumber(batch.estimatedUnitCount) : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {batch.unitsPerCarton != null ? formatNumber(batch.unitsPerCarton) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={batchStatusVariant(batch.status)}>
                      {formatStatusLabel(batch.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(batch.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <TooltipProvider>
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Edit batch"
                              onClick={() => openEdit(batch)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Edit batch</TooltipContent>
                        </Tooltip>

                        {batch.status !== "CLOSED" && (
                          <AlertDialog>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Close batch"
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent side="top">Close batch</TooltipContent>
                            </Tooltip>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Close batch?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will set <strong>{batch.batchCode}</strong> to Closed status.
                                  No data will be deleted.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleClose(batch)}>
                                  Close Batch
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TooltipProvider>
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
            <SheetTitle>{editingBatch ? "Edit Batch" : "Add Batch"}</SheetTitle>
            <SheetDescription>
              {editingBatch
                ? "Update batch details below."
                : "Fill in the details to create a new batch."}
            </SheetDescription>
          </SheetHeader>
          <BatchForm
            key={editingBatch?.id ?? "create"}
            initialData={editingBatch}
            brands={brands}
            campaigns={campaigns}
            products={products}
            onSubmitAction={makeSubmitAction(editingBatch)}
            onSuccess={handleSheetSuccess}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
