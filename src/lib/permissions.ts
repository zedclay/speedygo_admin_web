/** Mirrors backend ADMIN_PERMISSIONS — do not invent codes. */
export const PERMS = {
  MERCHANTS_READ: 'merchants.read',
  MERCHANTS_VERIFY: 'merchants.verify',
  MERCHANTS_SUSPEND: 'merchants.suspend',
  DRIVERS_READ: 'drivers.read',
  DRIVERS_VERIFY: 'drivers.verify',
  DRIVERS_SUSPEND: 'drivers.suspend',
  CUSTOMERS_READ: 'customers.read',
  CUSTOMERS_SUSPEND: 'customers.suspend',
  CUSTOMERS_NOTES_MANAGE: 'customers.notes.manage',
  ORDERS_READ: 'orders.read',
  ORDERS_ASSIGN: 'orders.assign',
  ORDERS_CANCEL: 'orders.cancel',
  PAYMENTS_READ: 'payments.read',
  REFUNDS_READ: 'refunds.read',
  REFUNDS_MANAGE: 'refunds.manage',
  COD_READ: 'cod.read',
  COD_REMITTANCE_CONFIRM: 'cod.remittance.confirm',
  SETTLEMENTS_READ: 'settlements.read',
  SETTLEMENTS_MANAGE: 'settlements.manage',
  PROMOTIONS_READ: 'promotions.read',
  PROMOTIONS_MANAGE: 'promotions.manage',
  LEDGER_READ: 'ledger.read',
  AUDIT_READ: 'audit.read',
  SUPPORT_READ: 'support.read',
  SUPPORT_MANAGE: 'support.manage',
  REPORTS_READ: 'reports.read',
  REPORTS_FINANCE_READ: 'reports.finance.read',
  SETTINGS_READ: 'settings.read',
  SETTINGS_MANAGE: 'settings.manage',
  DELIVERY_ZONES_READ: 'delivery.zones.read',
  DELIVERY_ZONES_MANAGE: 'delivery.zones.manage',
  DELIVERY_PRICING_READ: 'delivery.pricing.read',
  DELIVERY_PRICING_MANAGE: 'delivery.pricing.manage',
  COMMERCE_VERTICALS_READ: 'commerce.verticals.read',
  COMMERCE_VERTICALS_MANAGE: 'commerce.verticals.manage',
  STOREFRONT_COVERS_MANAGE: 'storefront.covers.manage',
  PRODUCT_IMAGES_MANAGE: 'product.images.manage',
  /** Admin RBAC — AdminProfile list/detail. */
  ADMINS_READ: 'admins.read',
  /** Create/update AdminProfile + Account.status. */
  ADMINS_MANAGE: 'admins.manage',
  /** Role list/detail + Permission catalogue. */
  ROLES_READ: 'roles.read',
  /** Create/update Role + permission set. */
  ROLES_MANAGE: 'roles.manage',
} as const

export type PermissionCode = (typeof PERMS)[keyof typeof PERMS]

export function hasPermission(
  granted: readonly string[] | undefined,
  required: PermissionCode | PermissionCode[],
): boolean {
  if (!granted?.length) return false
  const need = Array.isArray(required) ? required : [required]
  return need.every((code) => granted.includes(code))
}

export function hasAnyPermission(
  granted: readonly string[] | undefined,
  required: PermissionCode[],
): boolean {
  if (!granted?.length) return false
  return required.some((code) => granted.includes(code))
}
