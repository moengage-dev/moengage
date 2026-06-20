"use client";

import { useState } from "react";
import { Building2, MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeliveryCorrectionSheet } from "@/components/forms/delivery-correction-form";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { DeliveryScanDTO, RetailerDTO } from "@/lib/dtos/delivery.dto";

const ALL_HEADERS = [
  "Date", "Brand", "Retailer", "Campaign", "Product", "Batch Code",
  "Cartons", "Units/Carton", "Est. Units", "City / Suburb", "Notes", "Actions",
];

export function AdminDeliveryTable({
  deliveryScans,
  retailers,
  readOnly = false,
}: {
  deliveryScans: DeliveryScanDTO[];
  retailers: RetailerDTO[];
  readOnly?: boolean;
}) {
  const HEADERS = readOnly ? ALL_HEADERS.filter((h) => h !== "Actions") : ALL_HEADERS;
  const [selectedScan, setSelectedScan] = useState<DeliveryScanDTO | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  function openSheet(scan: DeliveryScanDTO) {
    setSelectedScan(scan);
    setSheetOpen(true);
  }

  if (deliveryScans.length === 0) {
    return (
      <div className="text-center py-10 text-xs text-muted-foreground/75 italic border border-border/30 rounded-xl bg-transparent">
        No delivery scan logs recorded yet.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[800px] text-left border-collapse text-xs bg-transparent">
          <thead>
            <tr>
              {HEADERS.map((header, idx) => (
                <th
                  key={idx}
                  className={`text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 pb-4 border-b border-border/40 px-3 whitespace-nowrap ${
                    header.toLowerCase().includes("cartons") ||
                    header.toLowerCase().includes("units") ||
                    header.toLowerCase().includes("est.")
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deliveryScans.map((scan) => (
              <tr
                key={scan.id}
                className="border-b border-border/30 last:border-0 hover:bg-muted/40 transition-colors"
              >
                <td className="py-4 px-3 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                  {formatDateTime(scan.createdAt)}
                </td>
                <td className="py-4 px-3 font-medium text-foreground whitespace-nowrap">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    {scan.brand?.name ?? "—"}
                  </span>
                </td>
                <td className="py-4 px-3 whitespace-nowrap">
                  <span className="font-semibold text-foreground block">
                    {scan.retailer?.name ?? "—"}
                  </span>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider block mt-0.5">
                    {scan.retailer?.type ?? "—"}
                  </span>
                </td>
                <td
                  className="py-4 px-3 max-w-[120px] truncate text-muted-foreground"
                  title={scan.campaign?.name ?? undefined}
                >
                  {scan.campaign?.name ?? "—"}
                </td>
                <td
                  className="py-4 px-3 max-w-[120px] truncate text-muted-foreground"
                  title={scan.qrCode?.product?.name ?? undefined}
                >
                  {scan.qrCode?.product?.name ?? "—"}
                </td>
                <td className="py-4 px-3 font-mono text-[10px] text-muted-foreground">
                  {scan.batch?.batchCode ?? "—"}
                </td>
                <td className="py-4 px-3 text-right font-medium text-foreground">
                  {formatNumber(scan.cartonsDelivered)}
                </td>
                <td className="py-4 px-3 text-right font-mono text-muted-foreground">
                  {scan.unitsPerCarton}
                </td>
                <td className="py-4 px-3 text-right font-semibold text-foreground">
                  {formatNumber(scan.estimatedUnitsDelivered)}
                </td>
                <td className="py-4 px-3 whitespace-nowrap">
                  {scan.city ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {scan.suburb ? `${scan.suburb}, ` : ""}
                        {scan.city}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td
                  className="py-4 px-3 max-w-[150px] truncate italic text-muted-foreground"
                  title={scan.notes ?? undefined}
                >
                  {scan.notes ?? "—"}
                </td>
                {!readOnly && (
                  <td className="py-4 px-3 whitespace-nowrap text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openSheet(scan)}
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!readOnly && selectedScan && (
        <DeliveryCorrectionSheet
          key={selectedScan.id}
          scan={selectedScan}
          retailers={retailers}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      )}
    </>
  );
}
