// src/lib/auth/require-role.ts
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getDashboardForRole } from "@/lib/auth/role-redirect";
import type { AppRole } from "@/lib/auth/role-redirect";
import type { CurrentUser } from "@/lib/auth/get-current-user";

export async function requireRole(allowedRoles: AppRole[]): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!allowedRoles.includes(user.role)) {
    redirect(getDashboardForRole(user.role));
  }

  return user;
}
