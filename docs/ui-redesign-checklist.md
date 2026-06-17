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

42 route entries plus application `not-found` and `error` boundaries. Status: semantic = brand colors via CSS variables, hardcoded = hex/fixed values remain.

### Auth Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/login` | ✅ Semantic | Public auth page uses shared public surface, live loading/status treatment |
| `/signup` | ✅ Semantic | Public auth page uses shared public surface, accessible status treatment |
| `/verify-email` | ✅ Semantic | OTP verification page uses shared public surface and loading fallback |

### Admin Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/admin` | ✅ Semantic | `bg-background`, `text-foreground`, `text-primary`, brand tokens |
| `/admin/brands` | ✅ Semantic | CRUD table uses shared shadcn table/filter/sheet/dialog patterns |
| `/admin/advertisers` | ✅ Semantic | CRUD table uses shared shadcn table/filter/sheet/dialog patterns |
| `/admin/products` | ✅ Semantic | CRUD table uses shared shadcn table/filter/sheet/dialog patterns |
| `/admin/campaigns` | ✅ Semantic | CRUD table and KPI cards use shared semantic tokens |
| `/admin/batches` | ✅ Semantic | CRUD table and KPI cards use shared semantic tokens |
| `/admin/users` | ✅ Semantic | CRUD table and KPI cards use shared semantic tokens |
| `/admin/qr-codes` | ✅ Semantic | QR management table/filter/action patterns use semantic tokens |
| `/admin/retailers` | ✅ Semantic | KPI cards, table — uses `bg-card`, `text-foreground` |
| `/admin/delivery` | ✅ Semantic | KPI cards, table — brand tokens applied |
| `/admin/heatmaps` | ✅ Semantic | `bg-background`, heatmap map component |
| `/admin/suspicious-scans` | ✅ Semantic | KPI cards, filters, table |
| `/admin/reports` | ✅ Semantic | Reports client uses semantic cards, inputs, buttons |
| `/admin/billing` | ✅ Semantic | Billing client uses semantic cards, filters, tables |

### Brand Admin Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/brand` | ✅ Semantic | Brand dashboard uses shared dashboard cards/tables |
| `/brand/campaigns` | ✅ Semantic | Shared campaign management UI |
| `/brand/products` | ✅ Semantic | Shared product management UI |
| `/brand/batches` | ✅ Semantic | Shared batch management UI |
| `/brand/qr-codes` | ✅ Semantic | Shared QR management UI |
| `/brand/delivery` | ✅ Semantic | Shared delivery dashboard UI |
| `/brand/heatmaps` | ✅ Semantic | Shared heatmap UI; map popups retain map-safe inline styles |
| `/brand/reports` | ✅ Semantic | Shared reports client |
| `/brand/billing` | ✅ Semantic | Shared billing client |

### Campaign Manager Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/campaign-manager` | ✅ Semantic | Shared dashboard cards/tables |
| `/campaign-manager/campaigns` | ✅ Semantic | Shared campaign management UI |
| `/campaign-manager/analytics` | ✅ Semantic | Shared analytics dashboard UI |
| `/campaign-manager/qr-codes` | ✅ Semantic | Shared QR management UI |
| `/campaign-manager/reports` | ✅ Semantic | Shared reports client |

### Advertiser Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/advertiser` | ✅ Semantic | Shared advertiser dashboard UI |
| `/advertiser/campaigns` | ✅ Semantic | Shared campaign UI |
| `/advertiser/heatmaps` | ✅ Semantic | Shared heatmap UI; map popups retain map-safe inline styles |
| `/advertiser/reports` | ✅ Semantic | Shared reports client |
| `/advertiser/billing` | ✅ Semantic | Shared billing client |

### Retail Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/retail` | ✅ Semantic | `bg-background`, `bg-card`, `text-foreground`, `text-primary` |
| `/retail/deliveries` | ✅ Semantic | Same treatment as `/retail` |
| `/retail/scan` | ✅ Semantic | Scanner entry and camera UI use semantic surfaces |

### Public / Operations Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/q` | ✅ Semantic | Redirect behavior unchanged |
| `/q/[code]/landing` | ✅ Semantic | Shared public surface and accessible reward states |
| `/d/[code]` | ✅ Semantic | Shared public surface, delivery form, error states |
| app `not-found` | ✅ Semantic | Shared public surface |
| app `error` | ✅ Semantic | Shared public surface |

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
| `campaign/public-campaign-landing.tsx` | ✅ Semantic | Shared public card, status, and reward claim treatment |
| `delivery/delivery-scan-form.tsx` | ✅ Semantic | Shared public card, tokenized delivery status and form sections |
| `delivery/delivery-qr-scanner.tsx` | ✅ Semantic | Camera frame uses semantic foreground/background contrast |
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

Visual QA still requires browser screenshots against seeded/demo data:

1. Public auth, QR reward, delivery form, scanner, not-found, and error states.
2. Admin, Brand, Campaign Manager, Advertiser, and Retail dashboards at desktop and mobile widths.
3. Heatmap map popup rendering, because map popup markup intentionally keeps map-safe inline styles.

## What NOT to Change

- Business logic (scan classification, reward claims, delivery calculations)
- Prisma schema or migrations
- Authorization or role scoping
- API routes or server actions
- Heatmap grouping logic
- QR routing logic
- Report export logic
