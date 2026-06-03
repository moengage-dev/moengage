// src/lib/auth/role-redirect.ts
export type AppRole =
  | "ADMIN"
  | "BRAND_ADMIN"
  | "CAMPAIGN_MANAGER"
  | "ADVERTISER_VIEWER"
  | "RETAIL_OPERATIONS";

export const ROLE_DASHBOARD: Record<AppRole, string> = {
  ADMIN: "/admin",
  BRAND_ADMIN: "/brand",
  CAMPAIGN_MANAGER: "/campaign-manager",
  ADVERTISER_VIEWER: "/advertiser",
  RETAIL_OPERATIONS: "/retail",
};

export function getDashboardForRole(role: AppRole): string {
  return ROLE_DASHBOARD[role] ?? "/login";
}
