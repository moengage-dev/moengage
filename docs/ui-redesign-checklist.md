# UI Redesign Checklist

Branch: `ui/shadcn-theme-redesign`
Preset applied: `b5JgzKn2G` (radix-maia style)
Date: 2026-06-17

## Theme Status

- [x] Brand palette restored in `globals.css`
- [x] `--font-mono` bridged to `--font-geist-mono`
- [x] Dark mode uses warm brand-aligned values
- [x] Radius restored to `0.85rem`
- [x] Chart tokens mapped to brand palette
- [x] Sidebar tokens mapped to brand palette

## Semantic Token Migration

- [x] `app-sidebar.tsx` — uses `bg-sidebar`, `text-sidebar-foreground`, `text-primary`
- [x] `dashboard-header.tsx` — already semantic
- [x] `dashboard-shell.tsx` — already semantic
- [x] `user-menu.tsx` — avatar uses `bg-primary/15 text-primary`
- [x] `dashboard-section-header.tsx` — badge text uses `text-foreground`
- [x] `analytics-stat-card.tsx` — value uses `text-foreground`

## Route Inventory

42 routes total. Status: semantic = brand colors via CSS variables, hardcoded = hex/fixed values remain.

### Auth Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/login` | To review | Public auth page |
| `/signup` | To review | Public auth page |
| `/verify-email` | To review | OTP verification page |

### Admin Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/admin` | ✅ Semantic | `bg-background`, `text-foreground`, `text-primary`, brand tokens |
| `/admin/brands` | To review | CRUD table |
| `/admin/advertisers` | To review | CRUD table |
| `/admin/products` | To review | CRUD table |
| `/admin/campaigns` | To review | CRUD table |
| `/admin/batches` | To review | CRUD table |
| `/admin/users` | To review | CRUD table |
| `/admin/qr-codes` | To review | QR management |
| `/admin/retailers` | ✅ Semantic | KPI cards, table — uses `bg-card`, `text-foreground` |
| `/admin/delivery` | ✅ Semantic | KPI cards, table — brand tokens applied |
| `/admin/heatmaps` | ✅ Semantic | `bg-background`, heatmap map component |
| `/admin/suspicious-scans` | ✅ Semantic | KPI cards, filters, table |
| `/admin/reports` | To review | Reports client |
| `/admin/billing` | To review | Billing client |

### Brand Admin Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/brand` | To review | Brand dashboard |
| `/brand/campaigns` | To review | |
| `/brand/products` | To review | |
| `/brand/batches` | To review | |
| `/brand/qr-codes` | To review | |
| `/brand/delivery` | To review | |
| `/brand/heatmaps` | To review | |
| `/brand/reports` | To review | |
| `/brand/billing` | To review | |

### Campaign Manager Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/campaign-manager` | To review | Campaign manager dashboard |
| `/campaign-manager/campaigns` | To review | |
| `/campaign-manager/analytics` | To review | |
| `/campaign-manager/qr-codes` | To review | |
| `/campaign-manager/reports` | To review | |

### Advertiser Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/advertiser` | To review | Advertiser dashboard |
| `/advertiser/campaigns` | To review | |
| `/advertiser/heatmaps` | To review | |
| `/advertiser/reports` | To review | |
| `/advertiser/billing` | To review | |

### Retail Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/retail` | ✅ Semantic | `bg-background`, `bg-card`, `text-foreground`, `text-primary` |
| `/retail/deliveries` | ✅ Semantic | Same treatment as `/retail` |
| `/retail/scan` | To review | Delivery scan entry |

### Public / Operations Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/q` | To review | QR redirect index |
| `/q/[code]/landing` | ✅ Semantic | `bg-background`, `text-foreground` applied |
| `/d/[code]` | ✅ Semantic | `bg-background`, `text-foreground` applied |

## Shared Components

| Component | Status | Notes |
|-----------|--------|-------|
| `ui/button.tsx` | ✅ Preset | `rounded-4xl`, semantic tokens |
| `ui/input.tsx` | ✅ Preset | `rounded-4xl`, `border-input` |
| `ui/select.tsx` | ✅ Preset | Semantic tokens |
| `ui/card.tsx` | ✅ Preset | Ring-1 foreground/10 |
| `ui/table.tsx` | ✅ Preset | `h-12 px-3` header, `p-3` cells |
| `ui/sheet.tsx` | ✅ Preset | radix-ui Dialog primitive |
| `ui/badge.tsx` | ✅ Preset | `rounded-4xl` pills |
| `ui/tabs.tsx` | ✅ Preset | Semantic tokens |
| `ui/dialog.tsx` | ✅ Preset | Semantic tokens |
| `ui/alert.tsx` | ✅ Preset | Semantic tokens |
| `ui/tooltip.tsx` | ✅ Preset | Semantic tokens |
| `ui/skeleton.tsx` | ✅ Preset | Semantic tokens |
| `ui/avatar.tsx` | ✅ Preset | Semantic tokens |
| `ui/checkbox.tsx` | ✅ Preset | Semantic tokens |
| `ui/sidebar.tsx` | ✅ Preset | Full sidebar system |
| `ui/dropdown-menu.tsx` | ✅ Preset | Semantic tokens |
| `ui/command.tsx` | ✅ Preset | Semantic tokens |
| `ui/popover.tsx` | ✅ Preset | Semantic tokens |
| `ui/pagination.tsx` | ✅ Preset | Semantic tokens |
| `ui/alert-dialog.tsx` | ✅ Preset | Semantic tokens |
| `ui/label.tsx` | ✅ Preset | Semantic tokens |
| `ui/textarea.tsx` | ✅ Preset | Semantic tokens |
| `ui/breadcrumb.tsx` | ✅ Preset | Semantic tokens |
| `ui/input-group.tsx` | ✅ Preset | New component |
| `campaign/public-campaign-landing.tsx` | ✅ Semantic | `text-foreground`, `bg-background/30` |
| `delivery/delivery-scan-form.tsx` | ✅ Semantic | `bg-card`, `text-foreground` |
| `delivery/delivery-qr-scanner.tsx` | Partial | Camera overlay uses white for contrast |
| `heatmaps/heatmap-map.tsx` | ✅ Semantic | `text-foreground`, `text-primary` |
| `heatmaps/heatmap-data-tables.tsx` | ✅ Semantic | `text-foreground` |
| `heatmaps/heatmap-filters.tsx` | ✅ Semantic | `text-foreground` |
| `dashboard/reports-client.tsx` | ✅ Semantic | `text-foreground` |
| `dashboard/app-sidebar.tsx` | ✅ Semantic | Full semantic tokens |
| `dashboard/user-menu.tsx` | ✅ Semantic | `bg-primary/15 text-primary` avatar |
| `dashboard/dashboard-header.tsx` | ✅ Semantic | Already clean |
| `dashboard/dashboard-shell.tsx` | ✅ Semantic | Already clean |
| `dashboard/dashboard-section-header.tsx` | ✅ Semantic | Badge text uses `text-foreground` |
| `dashboard/analytics-stat-card.tsx` | ✅ Semantic | Value uses `text-foreground` |

## Remaining Work

Routes marked "To review" share the same structural patterns. The most critical outstanding items:

1. Brand Admin / Campaign Manager / Advertiser dashboards (`/brand`, `/campaign-manager`, `/advertiser`) — check for `bg-[#FFF6DE]` and `text-[#2C2621]` patterns
2. Auth pages — check background and text colors
3. Admin CRUD pages (brands, advertisers, products, campaigns, batches, users, qr-codes) — these use the same `DashboardSectionHeader` and `AnalyticsStatCard` shared components which are already semantic; review for inline hardcoded colors

## What NOT to Change

- Business logic (scan classification, reward claims, delivery calculations)
- Prisma schema or migrations
- Authorization or role scoping
- API routes or server actions
- Heatmap grouping logic
- QR routing logic
- Report export logic
