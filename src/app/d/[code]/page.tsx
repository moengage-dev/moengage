// src/app/d/[code]/page.tsx
import React from "react";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { getDashboardForRole } from "@/lib/auth/role-redirect";
import { getDeliveryQRCodePageData, getRetailDeliveriesPageData } from "@/server/services/delivery-scan.service";
import { DeliveryScanForm } from "@/components/delivery/delivery-scan-form";
import { AlertCircle, Ban, ArrowLeft, Archive, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ code: string }>;
};

export default async function DeliveryScanPage({ params }: Props) {
  const { code } = await params;

  // 1. Authenticate user
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=/d/${code}`);
  }

  // 2. Authorize role (RETAIL_OPERATIONS or ADMIN only)
  if (user.role !== "RETAIL_OPERATIONS" && user.role !== "ADMIN") {
    redirect(getDashboardForRole(user.role));
  }

  // 3. Resolve QR Code page data
  const result = await getDeliveryQRCodePageData(code, user);

  if (!result.ok) {
    let errorTitle = "Invalid QR Code";
    let errorMsg = result.error;
    let Icon = AlertCircle;
    let iconClass = "bg-red-500/10 border-red-500/20 text-red-400";

    if (result.status === "NOT_FOUND") {
      errorTitle = "Delivery QR Not Found";
      errorMsg = "The scanned QR code is either invalid or does not exist in our systems.";
    } else if (result.status === "WRONG_TYPE") {
      errorTitle = "Wrong QR Code Type";
      errorMsg = "This scan flow is reserved for BATCH_DELIVERY operations. The scanned QR is of a different category.";
      Icon = Ban;
      iconClass = "bg-amber-500/10 border-amber-500/20 text-amber-400";
    } else if (result.status === "INACTIVE") {
      errorTitle = "Delivery QR Inactive";
      errorMsg = "This batch delivery QR code has been paused, disabled, or expired.";
      Icon = Archive;
      iconClass = "bg-slate-800 text-slate-400";
    } else if (result.status === "MISSING_BATCH" || result.status === "MISSING_CARTON_CONFIG") {
      errorTitle = "Configuration Missing";
      errorMsg = result.error;
      Icon = AlertTriangle;
      iconClass = "bg-yellow-500/10 border-yellow-500/20 text-yellow-400";
    } else if (result.status === "UNAUTHORIZED") {
      errorTitle = "Access Denied";
      errorMsg = "This batch belongs to another brand. You are unauthorized to log drop-offs for this inventory.";
      Icon = Ban;
      iconClass = "bg-red-500/10 border-red-500/20 text-red-400";
    }

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/60 border border-slate-800 backdrop-blur-xl rounded-2xl p-8 text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-red-500" />
          <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center border ${iconClass}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold">{errorTitle}</h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              {errorMsg}
            </p>
          </div>
          <Button asChild className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200">
            <Link href="/retail" className="flex items-center justify-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Return to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const { qrCode } = result.data;

  // 4. Fetch retailers for brand
  const deliveriesData = await getRetailDeliveriesPageData(user);
  const retailers = deliveriesData.retailers;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      <main className="w-full max-w-lg z-10 space-y-4 my-8">
        <div className="flex justify-between items-center px-1">
          <Link
            href="/retail"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
          <span className="text-[10px] font-mono text-slate-500">
            Operator: {user.name || user.email}
          </span>
        </div>

        <DeliveryScanForm qrCode={qrCode as any} retailers={retailers as any} />
      </main>
    </div>
  );
}
