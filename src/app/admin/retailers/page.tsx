// src/app/admin/retailers/page.tsx
import React from "react";
import { requireRole } from "@/lib/auth/require-role";
import { getAdminRetailersPageData } from "@/server/services/retailers.service";
import { RetailersClient } from "./retailers-client";

export default async function RetailersPage() {
  await requireRole(["ADMIN"]);

  const data = await getAdminRetailersPageData({});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Retailers</h1>
        <p className="text-muted-foreground">
          Manage retail outlets and distribution points linked to delivery operations.
        </p>
      </div>

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
