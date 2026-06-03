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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Brands", href: "/admin/brands", icon: Building2 },
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Advertisers", href: "/admin/advertisers", icon: Megaphone },
  { title: "Products", href: "/admin/products", icon: Package },
  { title: "Campaigns", href: "/admin/campaigns", icon: Target },
  { title: "Batches", href: "/admin/batches", icon: Boxes },
  { title: "QR Codes", href: "/admin/qr-codes", icon: QrCode },
  { title: "Delivery", href: "/admin/delivery", icon: Truck },
  { title: "Heatmaps", href: "/admin/heatmaps", icon: Map },
  { title: "Reports", href: "/admin/reports", icon: BarChart3 },
  { title: "Billing", href: "/admin/billing", icon: CreditCard },
  { title: "Fraud", href: "/admin/fraud", icon: ShieldAlert },
];

export const BRAND_ADMIN_NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/brand", icon: LayoutDashboard },
  { title: "Products", href: "/brand/products", icon: Package },
  { title: "Campaigns", href: "/brand/campaigns", icon: Target },
  { title: "Batches", href: "/brand/batches", icon: Boxes },
  { title: "QR Codes", href: "/brand/qr-codes", icon: QrCode },
  { title: "Delivery", href: "/brand/delivery", icon: Truck },
  { title: "Heatmaps", href: "/brand/heatmaps", icon: Map },
  { title: "Reports", href: "/brand/reports", icon: BarChart3 },
  { title: "Billing", href: "/brand/billing", icon: CreditCard },
];

export const CAMPAIGN_MANAGER_NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/campaign-manager", icon: LayoutDashboard },
  { title: "Campaigns", href: "/campaign-manager/campaigns", icon: Target },
  { title: "QR Codes", href: "/campaign-manager/qr-codes", icon: QrCode },
  { title: "Analytics", href: "/campaign-manager/analytics", icon: LineChart },
  { title: "Reports", href: "/campaign-manager/reports", icon: BarChart3 },
];

export const ADVERTISER_VIEWER_NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/advertiser", icon: LayoutDashboard },
  { title: "Campaigns", href: "/advertiser/campaigns", icon: Target },
  { title: "Heatmaps", href: "/advertiser/heatmaps", icon: Map },
  { title: "Reports", href: "/advertiser/reports", icon: BarChart3 },
  { title: "Billing", href: "/advertiser/billing", icon: CreditCard },
];

export const RETAIL_OPERATIONS_NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/retail", icon: LayoutDashboard },
  { title: "Scan Delivery QR", href: "/retail/scan", icon: Scan },
  { title: "Deliveries", href: "/retail/deliveries", icon: ClipboardList },
];

export function getNavItemsForRole(role: string): NavItem[] {
  switch (role) {
    case "ADMIN":
      return ADMIN_NAV_ITEMS;
    case "BRAND_ADMIN":
      return BRAND_ADMIN_NAV_ITEMS;
    case "CAMPAIGN_MANAGER":
      return CAMPAIGN_MANAGER_NAV_ITEMS;
    case "ADVERTISER_VIEWER":
      return ADVERTISER_VIEWER_NAV_ITEMS;
    case "RETAIL_OPERATIONS":
      return RETAIL_OPERATIONS_NAV_ITEMS;
    default:
      return [];
  }
}
