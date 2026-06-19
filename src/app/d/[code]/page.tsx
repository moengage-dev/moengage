// src/app/d/[code]/page.tsx
import React from "react";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { getDashboardForRole } from "@/lib/auth/role-redirect";
import {
  getDeliveryQRCodePageData,
  getRetailDeliveriesPageData,
} from "@/server/services/delivery-scan.service";
import { getApproximateLocationFromHeaders } from "@/lib/scans/ip-location";
import { DeliveryScanForm } from "@/components/delivery/delivery-scan-form";
import { AlertCircle, Ban, ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ code: string }>;
};

export default async function DeliveryScanPage({ params }: Props) {
  const { code } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/d/${code}`);
  if (user.role !== "RETAIL_OPERATIONS" && user.role !== "ADMIN") {
    redirect(getDashboardForRole(user.role));
  }

  const result = await getDeliveryQRCodePageData(code, user);

  if (!result.ok) {
    let errorTitle = "Invalid QR Code";
    let errorMsg = result.error;
    let Icon = AlertCircle;
    let iconColor = "text-destructive";
    let borderColor = "border-destructive/30";
    let bgColor = "bg-destructive/10";

    if (result.status === "NOT_FOUND") {
      errorTitle = "Delivery QR Not Found";
      errorMsg = "The scanned QR code is either invalid or does not exist in our systems.";
    } else if (result.status === "WRONG_TYPE") {
      errorTitle = "Wrong QR Code Type";
      errorMsg = "This scan flow is reserved for BATCH_DELIVERY operations. The scanned QR is of a different category.";
      Icon = Ban;
      iconColor = "text-primary";
      borderColor = "border-primary/30";
      bgColor = "bg-primary/10";
    } else if (result.status === "INACTIVE") {
      errorTitle = "Delivery QR Inactive";
      errorMsg = "This batch delivery QR code has been paused, disabled, or expired.";
      iconColor = "text-muted-foreground";
      borderColor = "border-border";
      bgColor = "bg-muted/30";
    } else if (result.status === "MISSING_BATCH" || result.status === "MISSING_CARTON_CONFIG") {
      errorTitle = "Configuration Missing";
      Icon = AlertTriangle;
      iconColor = "text-primary";
      borderColor = "border-primary/30";
      bgColor = "bg-primary/10";
    } else if (result.status === "UNAUTHORIZED") {
      errorTitle = "Access Denied";
      errorMsg = "This batch belongs to another brand. You are unauthorized to log drop-offs for this inventory.";
      Icon = Ban;
    }

    return (
      <div className="public-page-bg flex flex-col items-center justify-center p-4">
        <div className={`public-card relative z-10 max-w-md w-full border ${borderColor} p-8 text-center space-y-5`}>
          <div className={`mx-auto w-12 h-12 rounded-full ${bgColor} border ${borderColor} flex items-center justify-center`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">{errorTitle}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{errorMsg}</p>
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link href="/retail" className="flex items-center justify-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Return to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const { qrCode } = result.data;
  const deliveriesData = await getRetailDeliveriesPageData(user);
  
  const qrCodeDto = {
    id: qrCode.id,
    code: qrCode.code,
    brandId: qrCode.brandId,
    campaignId: qrCode.campaignId,
    productId: qrCode.productId,
    batchId: qrCode.batchId,
    brand: qrCode.brand ? { name: qrCode.brand.name } : null,
    campaign: qrCode.campaign ? { name: qrCode.campaign.name, offerTitle: qrCode.campaign.offerTitle } : null,
    product: qrCode.product ? { name: qrCode.product.name } : null,
    batch: qrCode.batch ? { batchCode: qrCode.batch.batchCode, unitsPerCarton: qrCode.batch.unitsPerCarton } : null,
  };

  const retailerDtos = deliveriesData.retailers.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    city: r.city,
    suburb: r.suburb,
  }));

  // Server-side IP location for fallback
  const reqHeaders = await headers();
  const ipLocation = getApproximateLocationFromHeaders(reqHeaders);

  return (
    <div className="public-page-bg flex flex-col items-center p-4 pb-12">
      <div className="relative z-10 w-full max-w-lg space-y-4 pt-6">
        <div className="flex items-center justify-between">
          <Link
            href="/retail"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
          <span className="text-[10px] text-muted-foreground font-mono">
            Operator: {user.name || user.email}
          </span>
        </div>

        <DeliveryScanForm
          qrCode={qrCodeDto}
          retailers={retailerDtos}
          ipLocation={{
            latitude: ipLocation.latitude,
            longitude: ipLocation.longitude,
            country: ipLocation.country,
            region: ipLocation.region,
            city: ipLocation.city,
          }}
        />
      </div>
    </div>
  );
}
