import { PERMS, type PermissionCode } from '../permissions'

export type NavItem = {
  id: string
  labelKey:
    | 'overview'
    | 'liveOps'
    | 'orders'
    | 'drivers'
    | 'merchants'
    | 'customers'
    | 'collections'
    | 'zones'
    | 'promotions'
    | 'reports'
    | 'administration'
    | 'settings'
    | 'support'
    | 'help'
  path: string
  icon: string
  /** Any of these permissions shows the item; empty = always for authenticated admin */
  anyOf?: PermissionCode[]
  /** Design note / contract adaptation */
  note?: string
}

/**
 * Canonical sidebar — reconciles design labels:
 * - Encaissements (not duplicate Paiements)
 * - Support (Aide → /support/help informational)
 * - Utilisateurs design maps to Administration (audit) — no admin-user CRUD API
 * - Hubs logistiques omitted (no contract)
 */
export const SIDEBAR_NAV: NavItem[] = [
  { id: 'overview', labelKey: 'overview', path: '/', icon: 'dashboard' },
  {
    id: 'liveOps',
    labelKey: 'liveOps',
    path: '/operations',
    icon: 'sensors',
    anyOf: [PERMS.ORDERS_READ, PERMS.DRIVERS_READ],
    note: 'List sync of active orders; map view contract-blocked',
  },
  {
    id: 'orders',
    labelKey: 'orders',
    path: '/orders',
    icon: 'shopping_cart',
    anyOf: [PERMS.ORDERS_READ],
  },
  {
    id: 'drivers',
    labelKey: 'drivers',
    path: '/drivers',
    icon: 'local_shipping',
    anyOf: [PERMS.DRIVERS_READ, PERMS.DRIVERS_VERIFY],
  },
  {
    id: 'merchants',
    labelKey: 'merchants',
    path: '/merchants',
    icon: 'storefront',
    anyOf: [PERMS.MERCHANTS_READ, PERMS.MERCHANTS_VERIFY],
  },
  {
    id: 'customers',
    labelKey: 'customers',
    path: '/customers',
    icon: 'group',
    anyOf: [PERMS.CUSTOMERS_READ],
  },
  {
    id: 'collections',
    labelKey: 'collections',
    path: '/collections',
    icon: 'payments',
    anyOf: [
      PERMS.COD_READ,
      PERMS.PAYMENTS_READ,
      PERMS.REFUNDS_READ,
      PERMS.SETTLEMENTS_READ,
    ],
  },
  {
    id: 'zones',
    labelKey: 'zones',
    path: '/geo/zones',
    icon: 'map',
    anyOf: [PERMS.DELIVERY_ZONES_READ, PERMS.DELIVERY_PRICING_READ],
  },
  {
    id: 'promotions',
    labelKey: 'promotions',
    path: '/promotions',
    icon: 'sell',
    anyOf: [PERMS.PROMOTIONS_READ],
  },
  {
    id: 'reports',
    labelKey: 'reports',
    path: '/reports',
    icon: 'analytics',
    anyOf: [PERMS.REPORTS_READ, PERMS.REPORTS_FINANCE_READ],
  },
  {
    id: 'administration',
    labelKey: 'administration',
    path: '/administration',
    icon: 'admin_panel_settings',
    anyOf: [PERMS.AUDIT_READ],
    note: 'Audit journal; admin/role CRUD contract-blocked',
  },
  {
    id: 'settings',
    labelKey: 'settings',
    path: '/settings',
    icon: 'settings',
    anyOf: [PERMS.SETTINGS_READ],
  },
  {
    id: 'support',
    labelKey: 'support',
    path: '/support',
    icon: 'support_agent',
    anyOf: [PERMS.SUPPORT_READ],
  },
  {
    id: 'help',
    labelKey: 'help',
    path: '/help',
    icon: 'help',
  },
]

export function navItemVisible(
  item: NavItem,
  permissions: readonly string[] | undefined,
): boolean {
  if (!item.anyOf?.length) return true
  if (!permissions?.length) return false
  return item.anyOf.some((p) => permissions.includes(p))
}

export function matchSidebarId(pathname: string): string {
  if (pathname.startsWith('/operations')) return 'liveOps'
  if (pathname.startsWith('/orders')) return 'orders'
  if (pathname.startsWith('/drivers')) return 'drivers'
  if (pathname.startsWith('/merchants')) return 'merchants'
  if (pathname.startsWith('/customers')) return 'customers'
  if (pathname.startsWith('/collections') || pathname.startsWith('/payments') || pathname.startsWith('/refunds') || pathname.startsWith('/cod'))
    return 'collections'
  if (pathname.startsWith('/geo')) return 'zones'
  if (pathname.startsWith('/promotions')) return 'promotions'
  if (pathname.startsWith('/reports')) return 'reports'
  if (pathname.startsWith('/administration') || pathname.startsWith('/audit'))
    return 'administration'
  if (pathname.startsWith('/settings')) return 'settings'
  if (pathname.startsWith('/support')) return 'support'
  if (pathname.startsWith('/help')) return 'help'
  return 'overview'
}
