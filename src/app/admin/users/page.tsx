// src/app/admin/users/page.tsx
import React from "react";
import { getAdminUsersPageData } from "@/server/services/users.service";
import { UsersClient } from "@/app/admin/users/users-client";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";

export default async function UsersPage() {
  const {
    users,
    brands,
    advertisers,
    totalUsers,
    activeUsers,
    verifiedUsers,
    inactiveUsers,
  } = await getAdminUsersPageData();

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        title="Users"
        description="All platform users across roles, brands, and advertisers."
        badgeText="Admin"
        badgeVariant="blue"
      />

      <UsersClient
        users={users}
        brands={brands}
        advertisers={advertisers}
        totalUsers={totalUsers}
        activeUsers={activeUsers}
        verifiedUsers={verifiedUsers}
        inactiveUsers={inactiveUsers}
      />
    </div>
  );
}
