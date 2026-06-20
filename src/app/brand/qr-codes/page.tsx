import React from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { getQRCodesPageData } from "@/server/services/qr-codes.service";
import { QRCodesClient } from "@/app/admin/qr-codes/qr-codes-client";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";
import {
  createQRCodeAction,
  updateQRCodeAction,
  disableQRCodeAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function BrandQRCodesPage() {
  const user = await requireRole(["BRAND_ADMIN"]);

  if (!user.brandId) {
    redirect("/brand");
  }

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
      <DashboardSectionHeader
        title="QR Codes"
        description="Brand-scoped QR code management. View, edit, and export QR codes for your brand."
        badgeText="Brand Admin"
        badgeVariant="emerald"
      />

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
        actions={{
          create: createQRCodeAction,
          update: updateQRCodeAction,
          disable: disableQRCodeAction,
        }}
      />
    </div>
  );
}
