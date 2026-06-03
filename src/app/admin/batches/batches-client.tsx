// src/app/admin/batches/batches-client.tsx
"use client";

import React, { useState } from "react";
import { Plus, Pencil, XCircle } from "lucide-react";
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
  const [editingBatch, setEditingBatch] = useState<BatchRow | undefined>(
    undefined
  );

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
      batch
        ? updateBatchAction(batch.id, values)
        : createBatchAction(values);
  }

  return (
    <>
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalBatches)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(activeBatches)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivering</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(deliveringBatches)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(closedBatches)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
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
            {batches.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={11}
                  className="text-center text-muted-foreground py-8"
                >
                  No batches found.
                </TableCell>
              </TableRow>
            ) : (
              batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-mono font-medium text-sm">
                    {batch.batchCode}
                  </TableCell>
                  <TableCell>{batch.brandName}</TableCell>
                  <TableCell>{batch.campaignName}</TableCell>
                  <TableCell>{batch.productName ?? "—"}</TableCell>
                  <TableCell>{batch.region ?? "—"}</TableCell>
                  <TableCell>{batch.city ?? "—"}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {batch.estimatedUnitCount != null
                      ? formatNumber(batch.estimatedUnitCount)
                      : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {batch.unitsPerCarton != null
                      ? formatNumber(batch.unitsPerCarton)
                      : "—"}
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
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(batch)}
                        title="Edit batch"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      {batch.status !== "CLOSED" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Close batch"
                            >
                              <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="sr-only">Close</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Close batch?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will set{" "}
                                <strong>{batch.batchCode}</strong> to Closed
                                status. No data will be deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleClose(batch)}
                              >
                                Close Batch
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
        <SheetContent
          side="right"
          className="overflow-y-auto w-full sm:max-w-lg"
        >
          <SheetHeader>
            <SheetTitle>
              {editingBatch ? "Edit Batch" : "Add Batch"}
            </SheetTitle>
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
