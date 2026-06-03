// src/app/q/[code]/page.tsx
import React from "react";
import { getConsumerQRCodeByCode, logConsumerScan } from "@/server/services/public-scan.service";
import { PublicCampaignLanding } from "@/components/campaign/public-campaign-landing";
import { AlertTriangle, AlertCircle, Ban } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ code: string }>;
};

export default async function ConsumerQRPage({ params }: Props) {
  const { code } = await params;

  const result = await getConsumerQRCodeByCode(code);

  if (result.status === "NOT_FOUND") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/60 border border-slate-800 backdrop-blur-xl rounded-2xl p-8 text-center space-y-6">
          <div className="mx-auto w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold">Campaign Not Found</h1>
            <p className="text-sm text-slate-400">
              The QR code you scanned does not match any active campaign or promotion.
            </p>
          </div>
          <Button asChild className="w-full bg-slate-800 hover:bg-slate-700">
            <Link href="/login">Return Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (result.status === "BATCH_DELIVERY") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/60 border border-slate-800 backdrop-blur-xl rounded-2xl p-8 text-center space-y-6">
          <div className="mx-auto w-12 h-12 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold">Delivery Operations Only</h1>
            <p className="text-sm text-slate-400">
              This QR code is reserved for batch and delivery operations.
            </p>
          </div>
          <div className="space-y-2">
            <Button asChild className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
              <Link href={`/d/${code}`}>Go to Delivery Scanner</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full text-slate-400 hover:text-slate-200">
              <Link href="/login">Retailer Login</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (result.status === "INACTIVE" || result.status === "WRONG_TYPE") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/60 border border-slate-800 backdrop-blur-xl rounded-2xl p-8 text-center space-y-6">
          <div className="mx-auto w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center justify-center">
            <Ban className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold">Campaign Inactive</h1>
            <p className="text-sm text-slate-400">
              This campaign or promotional offer is not currently active.
            </p>
          </div>
          <Button asChild className="w-full bg-slate-800 hover:bg-slate-700">
            <Link href="/login">Return Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const qrCode = result.qrCode!;

  // Log scan event immediately
  let scanEventId: string | null = null;
  let scanResult: any = null;

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
      qrCode={qrCode as any}
      scanEventId={scanEventId}
      debugInfo={debugInfo}
    />
  );
}
