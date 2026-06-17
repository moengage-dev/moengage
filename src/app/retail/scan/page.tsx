import React from "react";
import { DeliveryQrScanner } from "@/components/delivery/delivery-qr-scanner";

export default function Page() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scan Delivery QR</h1>
          <p className="text-muted-foreground">Use your device camera to scan a delivery QR code, or enter the code manually.</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            You can also scan the QR using your phone&apos;s Camera app. After signing in, you will be returned to the delivery form.
          </p>
        </div>
      </div>

      <DeliveryQrScanner />
    </div>
  );
}
