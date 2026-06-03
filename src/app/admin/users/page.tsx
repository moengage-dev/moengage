// src/app/admin/users/page.tsx
import React from "react";
import { getAdminUsersPageData } from "@/server/services/users.service";
import { UsersClient } from "@/app/admin/users/users-client";

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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          All platform users across roles, brands, and advertisers.
        </p>
      </div>

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
