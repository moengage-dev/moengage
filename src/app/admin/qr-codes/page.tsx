import React from "react";
import { requireRole } from "@/lib/auth/require-role";
import { getQRCodesPageData } from "@/server/services/qr-codes.service";
import { QRCodesClient } from "@/app/admin/qr-codes/qr-codes-client";

export default async function QRCodesPage() {
  const user = await requireRole(["ADMIN"]);

  const {
    qrCodes,
    brands,
    advertisers,
    campaigns,
    products,
    batches,
    totalQRCodes,
    activeQRCodes,
    consumerCampaignQRCodes,
    deliveryQRCodes,
    sampleLabelQRCodes,
    internalTestQRCodes,
  } = await getQRCodesPageData(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">QR Codes</h1>
        <p className="text-muted-foreground">
          Manage, view, and export platform QR codes.
        </p>
      </div>

      <QRCodesClient
        qrCodes={qrCodes}
        brands={brands}
        advertisers={advertisers}
        campaigns={campaigns}
        products={products}
        batches={batches}
        totalQRCodes={totalQRCodes}
        activeQRCodes={activeQRCodes}
        consumerCampaignQRCodes={consumerCampaignQRCodes}
        deliveryQRCodes={deliveryQRCodes}
        sampleLabelQRCodes={sampleLabelQRCodes}
        internalTestQRCodes={internalTestQRCodes}
      />
    </div>
  );
}
