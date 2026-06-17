// src/app/admin/advertisers/advertisers-client.tsx
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
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
  const [editingAdvertiser, setEditingAdvertiser] = useState<
    AdvertiserRow | undefined
  >(undefined);

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

  return (
    <>
      <div className="flex justify-end">
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
            {advertisers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-muted-foreground py-8"
                >
                  No advertisers found.
                </TableCell>
              </TableRow>
            ) : (
              advertisers.map((adv) => (
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
                    <TooltipProvider>
                      <div className="flex justify-end gap-1">
                        {/* Edit */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Edit advertiser"
                              onClick={() => openEdit(adv)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 focus-visible:ring-blue-500"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Edit advertiser</TooltipContent>
                        </Tooltip>

                        {/* Archive */}
                        {adv.status !== "ARCHIVED" && (
                          <AlertDialog>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Archive advertiser"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 focus-visible:ring-red-500"
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
                                  className="bg-red-600 hover:bg-red-700"
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
