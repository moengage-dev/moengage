// src/app/admin/retailers/retailers-client.tsx
"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  Pencil,
  Search,
  X,
  MapPin,
  Navigation,
  Building2,
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createRetailerAction, updateRetailerAction } from "./actions";
import type { RetailerRow } from "@/server/services/retailers.service";
import type { RetailerFormValues } from "@/lib/validators/retailer.validator";
import { formatDate } from "@/lib/format";
import { RetailerForm } from "@/components/forms/retailer-form";

const RETAILER_TYPES = [
  "RETAILER",
  "DISTRIBUTOR",
  "KIOSK",
  "SUPERMARKET",
  "WHOLESALER",
  "OUTLET",
  "OTHER",
] as const;

type BrandOption = { id: string; name: string };

type Props = {
  retailers: RetailerRow[];
  brands: BrandOption[];
  totalRetailers: number;
  uniqueCountries: number;
  brandsRepresented: number;
  withCoords: number;
};

export function RetailersClient({
  retailers,
  brands,
  totalRetailers,
  uniqueCountries,
  brandsRepresented,
  withCoords,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRetailer, setEditingRetailer] = useState<RetailerRow | undefined>(undefined);

  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const filteredRetailers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return retailers.filter((r) => {
      if (brandFilter !== "ALL" && r.brandId !== brandFilter) return false;
      if (typeFilter !== "ALL" && r.type !== typeFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.city ?? "").toLowerCase().includes(q) ||
        (r.region ?? "").toLowerCase().includes(q) ||
        (r.country ?? "").toLowerCase().includes(q) ||
        (r.suburb ?? "").toLowerCase().includes(q) ||
        (r.address ?? "").toLowerCase().includes(q)
      );
    });
  }, [retailers, searchQuery, brandFilter, typeFilter]);

  const hasFilters = searchQuery !== "" || brandFilter !== "ALL" || typeFilter !== "ALL";

  function openCreate() {
    setEditingRetailer(undefined);
    setSheetOpen(true);
  }
  function openEdit(r: RetailerRow) {
    setEditingRetailer(r);
    setSheetOpen(true);
  }
  function handleSheetSuccess() {
    setSheetOpen(false);
  }

  function makeSubmitAction(retailer?: RetailerRow) {
    return (values: RetailerFormValues) =>
      retailer
        ? updateRetailerAction(retailer.id, values)
        : createRetailerAction(values);
  }

  return (
    <>
      {/* KPI summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Retailers", value: totalRetailers, icon: Building2, color: "text-foreground" },
          { label: "Countries", value: uniqueCountries, icon: MapPin, color: "text-primary" },
          { label: "Brands Represented", value: brandsRepresented, icon: Building2, color: "text-blue-600" },
          { label: "With Coordinates", value: withCoords, icon: Navigation, color: "text-emerald-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-white rounded-2xl border border-border/50 shadow-sm p-5 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div className="text-2xl font-extrabold text-foreground">{value}</div>
          </div>
        ))}
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name, city, region, country…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Search retailers"
          />
        </div>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-[180px]" aria-label="Filter by brand">
            <SelectValue placeholder="All Brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Brands</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]" aria-label="Filter by outlet type">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {RETAILER_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearchQuery(""); setBrandFilter("ALL"); setTypeFilter("ALL"); }}
            className="text-muted-foreground"
          >
            <X className="mr-1.5 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Retailer
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-x-auto bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>City / Suburb</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Coords</TableHead>
              <TableHead>Deliveries</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRetailers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground py-10">
                  {hasFilters
                    ? "No retailers match your search or filters."
                    : "No retailers yet. Add one to get started."}
                </TableCell>
              </TableRow>
            ) : (
              filteredRetailers.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-foreground">{r.name}</TableCell>
                  <TableCell>
                    {r.brandName ? (
                      <Badge variant="outline" className="text-[10px]">{r.brandName}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.type ? (
                      <Badge variant="secondary" className="text-[10px]">{r.type}</Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{r.country ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{r.region ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    {r.city
                      ? `${r.suburb ? r.suburb + ", " : ""}${r.city}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs max-w-[160px] truncate" title={r.address ?? undefined}>
                    {r.address ?? "—"}
                  </TableCell>
                  <TableCell>
                    {r.latitude != null && r.longitude != null ? (
                      <Badge variant="outline" className="text-[9px] text-emerald-700 border-emerald-200 bg-emerald-50 gap-1">
                        <Navigation className="h-2.5 w-2.5" />
                        GPS
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {r.deliveryScanCount}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {formatDate(r.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Edit retailer"
                            onClick={() => openEdit(r)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 focus-visible:ring-blue-500"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Edit retailer</TooltipContent>
                      </Tooltip>
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
            <SheetTitle>{editingRetailer ? "Edit Retailer" : "Add Retailer"}</SheetTitle>
            <SheetDescription>
              {editingRetailer ? "Update retailer details." : "Add a new retail outlet to the platform."}
            </SheetDescription>
          </SheetHeader>
          <RetailerForm
            key={editingRetailer?.id ?? "create"}
            initialData={editingRetailer}
            brands={brands}
            onSubmitAction={makeSubmitAction(editingRetailer)}
            onSuccess={handleSheetSuccess}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
