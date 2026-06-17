// src/app/admin/campaigns/campaigns-client.tsx
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
  const [editingCampaign, setEditingCampaign] = useState<CampaignRow | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredCampaigns = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return campaigns.filter((c) => {
      const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.brandName.toLowerCase().includes(q) ||
        c.advertiserName.toLowerCase().includes(q) ||
        (c.productName ?? "").toLowerCase().includes(q)
      );
    });
  }, [campaigns, searchQuery, statusFilter]);

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
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Total Campaigns</span>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">{formatNumber(totalCampaigns)}</div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-brand-teal">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Active</span>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">{formatNumber(activeCampaigns)}</div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-brand-yellow">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Draft</span>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">{formatNumber(draftCampaigns)}</div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-muted-foreground/40">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Archived</span>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">{formatNumber(archivedCampaigns)}</div>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name, brand, advertiser, or product…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Search campaigns"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]" aria-label="Filter by status">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
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
            {filteredCampaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                  {hasActiveFilters
                    ? "No campaigns match your search or filter."
                    : "No campaigns found."}
                </TableCell>
              </TableRow>
            ) : (
              filteredCampaigns.map((campaign) => (
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
                      ? formatCurrency(campaign.fixedFeePerUnit, campaign.currency)
                      : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {campaign.engagementFeePerScan != null
                      ? formatCurrency(campaign.engagementFeePerScan, campaign.currency)
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
                    <TooltipProvider>
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Edit campaign"
                              onClick={() => openEdit(campaign)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Edit campaign</TooltipContent>
                        </Tooltip>

                        {campaign.status !== "ARCHIVED" && (
                          <AlertDialog>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Archive campaign"
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Archive className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent side="top">Archive campaign</TooltipContent>
                            </Tooltip>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Archive campaign?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will set <strong>{campaign.name}</strong> to Archived status.
                                  No data will be deleted.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleArchive(campaign)}
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
        <SheetContent side="right" className="overflow-y-auto w-full sm:max-w-lg">
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
