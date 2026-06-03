// src/app/admin/campaigns/campaigns-client.tsx
"use client";

import React, { useState } from "react";
import { Plus, Pencil, Archive } from "lucide-react";
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
import { CampaignForm } from "@/components/forms/campaign-form";
import {
  createCampaignAction,
  updateCampaignAction,
  archiveCampaignAction,
} from "@/app/admin/campaigns/actions";
import type {
  CampaignRow,
  BrandOption,
  AdvertiserOption,
  ProductOption,
} from "@/server/services/campaigns.service";
import type { CampaignFormValues } from "@/lib/validators/campaign.validator";
import {
  formatDate,
  formatStatusLabel,
  formatCurrency,
  formatNumber,
} from "@/lib/format";

type Props = {
  campaigns: CampaignRow[];
  brands: BrandOption[];
  advertisers: AdvertiserOption[];
  products: ProductOption[];
  totalCampaigns: number;
  activeCampaigns: number;
  draftCampaigns: number;
  archivedCampaigns: number;
};

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "ACTIVE") return "default";
  if (status === "ARCHIVED") return "destructive";
  return "secondary";
}

export function CampaignsClient({
  campaigns,
  brands,
  advertisers,
  products,
  totalCampaigns,
  activeCampaigns,
  draftCampaigns,
  archivedCampaigns,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<
    CampaignRow | undefined
  >(undefined);

  function openCreate() {
    setEditingCampaign(undefined);
    setSheetOpen(true);
  }

  function openEdit(campaign: CampaignRow) {
    setEditingCampaign(campaign);
    setSheetOpen(true);
  }

  function handleSheetSuccess() {
    setSheetOpen(false);
  }

  async function handleArchive(campaign: CampaignRow) {
    const result = await archiveCampaignAction(campaign.id);
    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error(result.error);
    }
  }

  function makeSubmitAction(campaign?: CampaignRow) {
    return (values: CampaignFormValues) =>
      campaign
        ? updateCampaignAction(campaign.id, values)
        : createCampaignAction(values);
  }

  return (
    <>
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(totalCampaigns)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(activeCampaigns)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(draftCampaigns)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archived</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(archivedCampaigns)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Campaign
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Advertiser</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Reward Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fixed Fee/Unit</TableHead>
              <TableHead>Engagement Fee/Scan</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={12}
                  className="text-center text-muted-foreground py-8"
                >
                  No campaigns found.
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>{campaign.brandName}</TableCell>
                  <TableCell>{campaign.advertiserName}</TableCell>
                  <TableCell>{campaign.productName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {formatStatusLabel(campaign.rewardType)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(campaign.status)}>
                      {formatStatusLabel(campaign.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {campaign.fixedFeePerUnit != null
                      ? formatCurrency(
                          campaign.fixedFeePerUnit,
                          campaign.currency
                        )
                      : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {campaign.engagementFeePerScan != null
                      ? formatCurrency(
                          campaign.engagementFeePerScan,
                          campaign.currency
                        )
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(campaign.startDate)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(campaign.endDate)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(campaign.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(campaign)}
                        title="Edit campaign"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      {campaign.status !== "ARCHIVED" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Archive campaign"
                            >
                              <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="sr-only">Archive</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Archive campaign?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This will set{" "}
                                <strong>{campaign.name}</strong> to Archived
                                status. No data will be deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleArchive(campaign)}
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
        <SheetContent
          side="right"
          className="overflow-y-auto w-full sm:max-w-lg"
        >
          <SheetHeader>
            <SheetTitle>
              {editingCampaign ? "Edit Campaign" : "Add Campaign"}
            </SheetTitle>
            <SheetDescription>
              {editingCampaign
                ? "Update campaign details below."
                : "Fill in the details to create a new campaign."}
            </SheetDescription>
          </SheetHeader>
          <CampaignForm
            key={editingCampaign?.id ?? "create"}
            initialData={editingCampaign}
            brands={brands}
            advertisers={advertisers}
            products={products}
            onSubmitAction={makeSubmitAction(editingCampaign)}
            onSuccess={handleSheetSuccess}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
