// src/app/admin/brands/brands-client.tsx
"use client";

import React, { useState, useMemo } from "react";
import { Plus, Pencil, Archive, Search, X } from "lucide-react";
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
  const [editingBrand, setEditingBrand] = useState<BrandRow | undefined>(undefined);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Filtered brands — computed from local state only (no server re-fetch)
  const filteredBrands = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return brands.filter((b) => {
      const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.slug.toLowerCase().includes(q) ||
        (b.industry ?? "").toLowerCase().includes(q) ||
        (b.primaryUserName ?? "").toLowerCase().includes(q) ||
        (b.primaryUserEmail ?? "").toLowerCase().includes(q)
      );
    });
  }, [brands, searchQuery, statusFilter]);

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

  const hasActiveFilters = searchQuery !== "" || statusFilter !== "ALL";

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("ALL");
  }

  return (
    <>
      {/* Search & Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name, slug, industry, or administrator…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Search brands"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]" aria-label="Filter by status">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
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
          Add Brand
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Primary Administrator</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBrands.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  {hasActiveFilters
                    ? "No brands match your search or filter. Try adjusting your criteria."
                    : "No brands found."}
                </TableCell>
              </TableRow>
            ) : (
              filteredBrands.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell className="font-medium">{brand.name}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">
                    {brand.slug}
                  </TableCell>
                  <TableCell>{brand.industry ?? "—"}</TableCell>
                  <TableCell>
                    {brand.primaryUserName || brand.primaryUserEmail ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{brand.primaryUserName ?? "—"}</span>
                        <span className="text-xs text-muted-foreground">{brand.primaryUserEmail}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
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
                    <TooltipProvider>
                      <div className="flex justify-end gap-1">
                        {/* Edit */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Edit brand"
                              onClick={() => openEdit(brand)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Edit brand</TooltipContent>
                        </Tooltip>

                        {/* Archive */}
                        {brand.status !== "ARCHIVED" && (
                          <AlertDialog>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Archive brand"
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Archive className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent side="top">Archive brand</TooltipContent>
                            </Tooltip>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Archive brand?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will set <strong>{brand.name}</strong> to Archived status.
                                  No data will be deleted.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleArchive(brand)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Archive
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
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingBrand ? "Edit Brand" : "Add Brand"}</SheetTitle>
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
