import React from "react";
import { getConsumerQRCodeByCode, logConsumerScan } from "@/server/services/public-scan.service";
import { PublicCampaignLanding } from "@/components/campaign/public-campaign-landing";
import { AlertTriangle, AlertCircle, Ban } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ code: string }>;
};

export default async function ConsumerQRLandingPage({ params }: Props) {
  const { code } = await params;

  // The route handler sets the durable visitor cookie on its redirect response.
  // Direct landing requests without that cookie must pass through it first so
  // refreshes aggregate into the same visitor bucket.
  const cookieStore = await cookies();
  if (!cookieStore.get("moengage_visitor_id")?.value) {
    redirect(`/q/${code}`);
  }

  const result = await getConsumerQRCodeByCode(code);

  if (result.status === "NOT_FOUND") {
    return (
      <div className="public-page-bg flex flex-col items-center justify-center p-4">
        <div className="public-card relative z-10 max-w-md w-full p-8 text-center space-y-6">
          <div className="public-status-icon bg-destructive/10 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">Campaign Not Found</h1>
            <p className="text-sm text-muted-foreground">
              The QR code you scanned does not match any active campaign or promotion.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/login">Return Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (result.status === "BATCH_DELIVERY") {
    return (
      <div className="public-page-bg flex flex-col items-center justify-center p-4">
        <div className="public-card relative z-10 max-w-md w-full p-8 text-center space-y-6">
          <div className="public-status-icon bg-brand-teal/15">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">Delivery Operations Only</h1>
            <p className="text-sm text-muted-foreground">
              This QR code is reserved for batch and delivery operations.
            </p>
          </div>
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href={`/d/${code}`}>Go to Delivery Scanner</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full text-muted-foreground hover:text-foreground">
              <Link href="/login">Retailer Login</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (result.status === "INACTIVE" || result.status === "WRONG_TYPE") {
    return (
      <div className="public-page-bg flex flex-col items-center justify-center p-4">
        <div className="public-card relative z-10 max-w-md w-full p-8 text-center space-y-6">
          <div className="public-status-icon bg-destructive/10 text-destructive">
            <Ban className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">Campaign Inactive</h1>
            <p className="text-sm text-muted-foreground">
              This campaign or promotional offer is not currently active.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/login">Return Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const qrCode = result.qrCode!;

  // Log scan event immediately
  let scanEventId: string | null = null;
  let scanResult: Awaited<ReturnType<typeof logConsumerScan>> | null = null;

  try {
    scanResult = await logConsumerScan(qrCode);
    scanEventId = scanResult.scanEventId;
  } catch (error) {
    console.error("Failed to log consumer scan event:", error);
  }

  // Show debug info in development only
  const isDev = process.env.NODE_ENV === "development";
  const debugInfo = isDev && scanResult
    ? {
        scanEventId: scanResult.scanEventId,
        isRepeatScan: scanResult.isRepeatScan,
        location: scanResult.location,
      }
    : null;

  return (
    <PublicCampaignLanding
      qrCode={{
        code: qrCode.code,
        label: qrCode.label,
        brand: qrCode.brand,
        advertiser: qrCode.advertiser,
        product: qrCode.product,
        campaign: qrCode.campaign
          ? {
              id: qrCode.campaign.id,
              name: qrCode.campaign.name,
              offerTitle: qrCode.campaign.offerTitle,
              offerDescription: qrCode.campaign.offerDescription,
              rewardType: qrCode.campaign.rewardType,
            }
          : null,
      }}
      scanEventId={scanEventId}
      debugInfo={debugInfo}
    />
  );
}
