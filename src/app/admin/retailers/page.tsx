// src/app/admin/retailers/page.tsx
import React from "react";
import { requireRole } from "@/lib/auth/require-role";
import { getAdminRetailersPageData } from "@/server/services/retailers.service";
import { RetailersClient } from "./retailers-client";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";

export default async function RetailersPage() {
  await requireRole(["ADMIN"]);

  const data = await getAdminRetailersPageData({});

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        title="Retailers"
        description="Manage retail outlets and distribution points linked to delivery operations."
        badgeText="Admin"
        badgeVariant="blue"
      />

      <RetailersClient
        retailers={data.retailers}
        brands={data.brands}
        totalRetailers={data.totalRetailers}
        uniqueCountries={data.uniqueCountries}
        brandsRepresented={data.brandsRepresented}
        withCoords={data.withCoords}
      />
    </div>
  );
}
