// src/app/admin/advertisers/advertisers-client.tsx
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
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AdvertiserForm } from "@/components/forms/advertiser-form";
import {
  createAdvertiserAction,
  updateAdvertiserAction,
  archiveAdvertiserAction,
} from "@/app/admin/advertisers/actions";
import type { AdvertiserRow } from "@/server/services/advertisers.service";
import type { AdvertiserFormValues } from "@/lib/validators/advertiser.validator";
import { formatDate, formatStatusLabel } from "@/lib/format";

type Props = {
  advertisers: AdvertiserRow[];
  unassignedUsers: { id: string; name: string | null; email: string }[];
};

export function AdvertisersClient({ advertisers, unassignedUsers }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAdvertiser, setEditingAdvertiser] = useState<AdvertiserRow | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredAdvertisers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return advertisers.filter((adv) => {
      const matchesStatus = statusFilter === "ALL" || adv.status === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        adv.name.toLowerCase().includes(q) ||
        adv.slug.toLowerCase().includes(q) ||
        (adv.industry ?? "").toLowerCase().includes(q) ||
        (adv.contactName ?? "").toLowerCase().includes(q) ||
        (adv.contactEmail ?? "").toLowerCase().includes(q)
      );
    });
  }, [advertisers, searchQuery, statusFilter]);

  function openCreate() {
    setEditingAdvertiser(undefined);
    setSheetOpen(true);
  }

  function openEdit(advertiser: AdvertiserRow) {
    setEditingAdvertiser(advertiser);
    setSheetOpen(true);
  }

  function handleSheetSuccess() {
    setSheetOpen(false);
  }

  async function handleArchive(advertiser: AdvertiserRow) {
    const result = await archiveAdvertiserAction(advertiser.id);
    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error(result.error);
    }
  }

  function makeSubmitAction(advertiser?: AdvertiserRow) {
    return (values: AdvertiserFormValues) =>
      advertiser
        ? updateAdvertiserAction(advertiser.id, values)
        : createAdvertiserAction(values);
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
            placeholder="Search by name, slug, industry, or contact…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Search advertisers"
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
          Add Advertiser
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Contact Name</TableHead>
              <TableHead>Contact Email</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAdvertisers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  {hasActiveFilters
                    ? "No advertisers match your search or filter."
                    : "No advertisers found."}
                </TableCell>
              </TableRow>
            ) : (
              filteredAdvertisers.map((adv) => (
                <TableRow key={adv.id}>
                  <TableCell className="font-medium">{adv.name}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">
                    {adv.slug}
                  </TableCell>
                  <TableCell>{adv.industry ?? "—"}</TableCell>
                  <TableCell>{adv.contactName ?? "—"}</TableCell>
                  <TableCell>{adv.contactEmail ?? "—"}</TableCell>
                  <TableCell>
                    {adv.websiteUrl ? (
                      <a
                        href={adv.websiteUrl}
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
                        adv.status === "ACTIVE"
                          ? "default"
                          : adv.status === "ARCHIVED"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {formatStatusLabel(adv.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(adv.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Edit advertiser"
                              onClick={() => openEdit(adv)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Edit advertiser</TooltipContent>
                        </Tooltip>

                        {adv.status !== "ARCHIVED" && (
                          <AlertDialog>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Archive advertiser"
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Archive className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent side="top">Archive advertiser</TooltipContent>
                            </Tooltip>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Archive advertiser?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will set <strong>{adv.name}</strong> to Archived status.
                                  No data will be deleted.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleArchive(adv)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
              {editingAdvertiser ? "Edit Advertiser" : "Add Advertiser"}
            </SheetTitle>
            <SheetDescription>
              {editingAdvertiser
                ? "Update advertiser details below."
                : "Fill in the details to create a new advertiser."}
            </SheetDescription>
          </SheetHeader>
          <AdvertiserForm
            key={editingAdvertiser?.id ?? "create"}
            initialData={editingAdvertiser}
            unassignedUsers={unassignedUsers}
            onSubmitAction={makeSubmitAction(editingAdvertiser)}
            onSuccess={handleSheetSuccess}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
