"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
  Search,
  X,
  UserPlus,
  UserMinus,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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
import { formatDate, formatStatusLabel, formatCurrency, formatNumber } from "@/lib/format";
import type {
  CampaignRow,
  CampaignManagerOption,
} from "@/server/services/campaigns.service";
import {
  assignCampaignManagerAction,
  unassignCampaignManagerAction,
} from "./actions";

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "ACTIVE") return "default";
  if (status === "ARCHIVED") return "destructive";
  return "secondary";
}

type AssignedManagers = Record<string, CampaignManagerOption[]>;

type Props = {
  campaigns: CampaignRow[];
  totalCampaigns: number;
  activeCampaigns: number;
  draftCampaigns: number;
  availableManagers: CampaignManagerOption[];
  initialAssignments: AssignedManagers;
};

export function CampaignsBrandClient({
  campaigns,
  totalCampaigns,
  activeCampaigns,
  draftCampaigns,
  availableManagers,
  initialAssignments,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<AssignedManagers>(initialAssignments);
  const [isPending, startTransition] = useTransition();

  const filteredCampaigns = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return campaigns.filter((c) => {
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.advertiserName.toLowerCase().includes(q) ||
        (c.productName ?? "").toLowerCase().includes(q)
      );
    });
  }, [campaigns, searchQuery, statusFilter]);

  function toggleExpand(campaignId: string) {
    setExpandedCampaignId((prev) => (prev === campaignId ? null : campaignId));
  }

  function handleAssign(campaignId: string, managerId: string) {
    const manager = availableManagers.find((m) => m.id === managerId);
    if (!manager) return;
    const already = assignments[campaignId] ?? [];
    if (already.some((m) => m.id === managerId)) {
      toast.info("Already assigned");
      return;
    }

    startTransition(async () => {
      const res = await assignCampaignManagerAction(campaignId, managerId);
      if (res.ok) {
        setAssignments((prev) => ({
          ...prev,
          [campaignId]: [...(prev[campaignId] ?? []), manager],
        }));
        toast.success("Campaign Manager assigned");
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleUnassign(campaignId: string, managerId: string) {
    startTransition(async () => {
      const res = await unassignCampaignManagerAction(campaignId, managerId);
      if (res.ok) {
        setAssignments((prev) => ({
          ...prev,
          [campaignId]: (prev[campaignId] ?? []).filter((m) => m.id !== managerId),
        }));
        toast.success("Campaign Manager unassigned");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Campaigns", value: totalCampaigns },
          { label: "Active", value: activeCampaigns },
          { label: "Draft", value: draftCampaigns },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="bg-card rounded-xl border border-border/40 p-5 shadow-sm"
          >
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p className="text-3xl font-extrabold text-foreground mt-1">
              {formatNumber(value)}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
            <SelectItem value="ENDED">Ended</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/40 overflow-hidden bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead>Campaign</TableHead>
              <TableHead>Advertiser</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fixed Fee</TableHead>
              <TableHead>Eng. Fee</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Managers</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCampaigns.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="text-center py-10 text-sm text-muted-foreground"
                >
                  No campaigns found.
                </TableCell>
              </TableRow>
            ) : (
              filteredCampaigns.map((campaign) => {
                const assigned = assignments[campaign.id] ?? [];
                const isExpanded = expandedCampaignId === campaign.id;
                const unassigned = availableManagers.filter(
                  (m) => !assigned.some((a) => a.id === m.id)
                );

                return (
                  <React.Fragment key={campaign.id}>
                    <TableRow className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-medium text-foreground max-w-[180px] truncate">
                        {campaign.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {campaign.advertiserName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {campaign.productName ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(campaign.status)}>
                          {formatStatusLabel(campaign.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {campaign.fixedFeePerUnit != null
                          ? formatCurrency(campaign.fixedFeePerUnit, campaign.currency)
                          : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {campaign.engagementFeePerScan != null
                          ? formatCurrency(campaign.engagementFeePerScan, campaign.currency)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {campaign.startDate ? formatDate(campaign.startDate) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {campaign.endDate ? formatDate(campaign.endDate) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {assigned.length}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => toggleExpand(campaign.id)}
                          aria-label={isExpanded ? "Collapse" : "Manage managers"}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={10} className="py-4 px-6">
                          <div className="space-y-3">
                            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                              Campaign Managers
                            </p>

                            {assigned.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic">
                                No managers assigned to this campaign.
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {assigned.map((m) => (
                                  <div
                                    key={m.id}
                                    className="flex items-center gap-1.5 bg-background border border-border/60 rounded-full px-3 py-1 text-xs"
                                  >
                                    <span className="font-medium text-foreground">
                                      {m.name ?? m.email}
                                    </span>
                                    <span className="text-muted-foreground hidden sm:inline">
                                      {m.email}
                                    </span>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <button
                                          disabled={isPending}
                                          className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                                          aria-label={`Unassign ${m.name ?? m.email}`}
                                        >
                                          <UserMinus className="h-3.5 w-3.5" />
                                        </button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Remove Campaign Manager</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Remove{" "}
                                            <strong>{m.name ?? m.email}</strong> from this campaign?
                                            They will no longer be able to access it.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleUnassign(campaign.id, m.id)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                            Remove
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                ))}
                              </div>
                            )}

                            {unassigned.length > 0 && (
                              <div className="flex items-center gap-2 pt-1">
                                <UserPlus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <Select
                                  onValueChange={(managerId) =>
                                    handleAssign(campaign.id, managerId)
                                  }
                                  disabled={isPending}
                                  value=""
                                >
                                  <SelectTrigger className="h-8 text-xs w-64">
                                    <SelectValue placeholder="Assign a campaign manager…" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {unassigned.map((m) => (
                                      <SelectItem key={m.id} value={m.id} className="text-xs">
                                        {m.name ?? m.email} —{" "}
                                        <span className="text-muted-foreground">{m.email}</span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {unassigned.length === 0 && availableManagers.length > 0 && (
                              <p className="text-xs text-muted-foreground italic">
                                All campaign managers from your brand are already assigned.
                              </p>
                            )}

                            {availableManagers.length === 0 && (
                              <p className="text-xs text-muted-foreground italic">
                                No Campaign Managers are currently registered under your brand.
                                Contact a Platform Admin to create users.
                              </p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
