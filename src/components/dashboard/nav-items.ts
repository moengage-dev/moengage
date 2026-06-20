import {
  LayoutDashboard,
  Building2,
  Users,
  Megaphone,
  Package,
  Target,
  Boxes,
  QrCode,
  Truck,
  Map,
  BarChart3,
  CreditCard,
  ShieldAlert,
  Scan,
  ClipboardList,
  LineChart,
  Store,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", href: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "Platform Management",
    items: [
      { title: "Brands", href: "/admin/brands", icon: Building2 },
      { title: "Users", href: "/admin/users", icon: Users },
      { title: "Advertisers", href: "/admin/advertisers", icon: Megaphone },
      { title: "Retailers", href: "/admin/retailers", icon: Store },
    ],
  },
  {
    label: "Campaign Operations",
    items: [
      { title: "Products", href: "/admin/products", icon: Package },
      { title: "Campaigns", href: "/admin/campaigns", icon: Target },
      { title: "QR Codes", href: "/admin/qr-codes", icon: QrCode },
    ],
  },
  {
    label: "Supply Chain Operations",
    items: [
      { title: "Batches", href: "/admin/batches", icon: Boxes },
      { title: "Delivery", href: "/admin/delivery", icon: Truck },
    ],
  },
  {
    label: "Analytics & Controls",
    items: [
      { title: "Heatmaps", href: "/admin/heatmaps", icon: Map },
      { title: "Reports", href: "/admin/reports", icon: BarChart3 },
      { title: "Billing", href: "/admin/billing", icon: CreditCard },
      {
        title: "Suspicious Scans",
        href: "/admin/suspicious-scans",
        icon: ShieldAlert,
      },
    ],
  },
];

export const BRAND_ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", href: "/brand", icon: LayoutDashboard }],
  },
  {
    label: "Campaign Operations",
    items: [
      { title: "Products", href: "/brand/products", icon: Package },
      { title: "Campaigns", href: "/brand/campaigns", icon: Target },
      { title: "QR Codes", href: "/brand/qr-codes", icon: QrCode },
    ],
  },
  {
    label: "Supply Chain Operations",
    items: [
      { title: "Batches", href: "/brand/batches", icon: Boxes },
      { title: "Delivery", href: "/brand/delivery", icon: Truck },
    ],
  },
  {
    label: "Analytics & Finance",
    items: [
      { title: "Heatmaps", href: "/brand/heatmaps", icon: Map },
      { title: "Reports", href: "/brand/reports", icon: BarChart3 },
      { title: "Billing", href: "/brand/billing", icon: CreditCard },
    ],
  },
];

export const CAMPAIGN_MANAGER_NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/campaign-manager", icon: LayoutDashboard },
    ],
  },
  {
    label: "Campaign Management",
    items: [
      { title: "Campaigns", href: "/campaign-manager/campaigns", icon: Target },
      { title: "QR Codes", href: "/campaign-manager/qr-codes", icon: QrCode },
    ],
  },
  {
    label: "Analytics & Reports",
    items: [
      {
        title: "Analytics",
        href: "/campaign-manager/analytics",
        icon: LineChart,
      },
      { title: "Heatmaps", href: "/campaign-manager/heatmaps", icon: Map },
      { title: "Reports", href: "/campaign-manager/reports", icon: BarChart3 },
    ],
  },
];

export const ADVERTISER_VIEWER_NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", href: "/advertiser", icon: LayoutDashboard }],
  },
  {
    label: "Campaign Visibility",
    items: [
      { title: "Campaigns", href: "/advertiser/campaigns", icon: Target },
      { title: "Heatmaps", href: "/advertiser/heatmaps", icon: Map },
    ],
  },
  {
    label: "Analytics & Reports",
    items: [
      { title: "Reports", href: "/advertiser/reports", icon: BarChart3 },
      { title: "Billing", href: "/advertiser/billing", icon: CreditCard },
    ],
  },
];

export const RETAIL_OPERATIONS_NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", href: "/retail", icon: LayoutDashboard }],
  },
  {
    label: "Delivery Operations",
    items: [
      { title: "Scan Delivery QR", href: "/retail/scan", icon: Scan },
      { title: "Deliveries", href: "/retail/deliveries", icon: ClipboardList },
    ],
  },
];

export function getNavGroupsForRole(role: string): NavGroup[] {
  switch (role) {
    case "ADMIN":
      return ADMIN_NAV_GROUPS;
    case "BRAND_ADMIN":
      return BRAND_ADMIN_NAV_GROUPS;
    case "CAMPAIGN_MANAGER":
      return CAMPAIGN_MANAGER_NAV_GROUPS;
    case "ADVERTISER_VIEWER":
      return ADVERTISER_VIEWER_NAV_GROUPS;
    case "RETAIL_OPERATIONS":
      return RETAIL_OPERATIONS_NAV_GROUPS;
    default:
      return [];
  }
}

// Flat list derived from groups — kept for backward compatibility.
export function getNavItemsForRole(role: string): NavItem[] {
  return getNavGroupsForRole(role).flatMap((g) => g.items);
}
