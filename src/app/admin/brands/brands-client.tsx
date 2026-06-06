// src/app/admin/brands/brands-client.tsx
"use client";

import React, { useState } from "react";
import { Plus, Pencil, Archive } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { BrandForm } from "@/components/forms/brand-form";
import {
  createBrandAction,
  updateBrandAction,
  archiveBrandAction,
} from "@/app/admin/brands/actions";
import type { BrandRow } from "@/server/services/brands.service";
import type { BrandFormValues } from "@/lib/validators/brand.validator";
import { formatDate, formatStatusLabel } from "@/lib/format";

type Props = {
  brands: BrandRow[];
  unassignedAdmins: { id: string; name: string | null; email: string }[];
};

export function BrandsClient({ brands, unassignedAdmins }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandRow | undefined>(
    undefined
  );

  function openCreate() {
    setEditingBrand(undefined);
    setSheetOpen(true);
  }

  function openEdit(brand: BrandRow) {
    setEditingBrand(brand);
    setSheetOpen(true);
  }

  function handleSheetSuccess() {
    setSheetOpen(false);
  }

  async function handleArchive(brand: BrandRow) {
    const result = await archiveBrandAction(brand.id);
    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error(result.error);
    }
  }

  function makeSubmitAction(brand?: BrandRow) {
    return (values: BrandFormValues) =>
      brand ? updateBrandAction(brand.id, values) : createBrandAction(values);
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Brand
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brands.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                >
                  No brands found.
                </TableCell>
              </TableRow>
            ) : (
              brands.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell className="font-medium">{brand.name}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">
                    {brand.slug}
                  </TableCell>
                  <TableCell>{brand.industry ?? "—"}</TableCell>
                  <TableCell>
                    {brand.websiteUrl ? (
                      <a
                        href={brand.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm underline underline-offset-2 text-muted-foreground hover:text-foreground"
                      >
                        Link
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        brand.status === "ACTIVE"
                          ? "default"
                          : brand.status === "ARCHIVED"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {formatStatusLabel(brand.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(brand.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(brand)}
                        title="Edit brand"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      {brand.status !== "ARCHIVED" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Archive brand"
                            >
                              <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="sr-only">Archive</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Archive brand?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will set <strong>{brand.name}</strong> to
                                Archived status. No data will be deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleArchive(brand)}
                              >
                                Archive
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
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingBrand ? "Edit Brand" : "Add Brand"}
            </SheetTitle>
            <SheetDescription>
              {editingBrand
                ? "Update brand details below."
                : "Fill in the details to create a new brand."}
            </SheetDescription>
          </SheetHeader>
          <BrandForm
            key={editingBrand?.id ?? "create"}
            initialData={editingBrand}
            unassignedAdmins={unassignedAdmins}
            onSubmitAction={makeSubmitAction(editingBrand)}
            onSuccess={handleSheetSuccess}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
