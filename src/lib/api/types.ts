export type Paginated<T> = {
  items: T[]
  total: number
  limit: number
  offset: number
}

/** Admin delivery zone — polygon coverage unit (not a Wilaya). */
export type DeliveryZone = {
  id: string
  name: string
  geometry: { type: string; coordinates: unknown }
  active: boolean
  createdAt: string
  updatedAt: string
}

export type DeliveryTimeBand = 'DAY' | 'NIGHT' | 'CUSTOM'

/** Admin pricing rule — dual minor fees; SpeedyGo share is derived, not stored. */
export type DeliveryPricingRule = {
  id: string
  zoneId: string
  name: string
  timeBand: DeliveryTimeBand | string
  startLocalTime: string | null
  endLocalTime: string | null
  /** Minor units as decimal string from Backend. */
  customerDeliveryFeeMinor: string
  /** Minor units as decimal string from Backend. */
  driverRemunerationMinor: string
  effectiveFrom: string
  effectiveTo: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type WilayaListItem = {
  code: string
  nameFr: string
  nameAr: string
}

export type AdminMe = {
  adminProfileId: string
  accountId: string
  displayName: string
  roleId: string
  roleName: string
  permissions: string[]
  /** Server-persisted Admin UI + IN_APP notification emit locale. */
  preferredLocale: 'fr' | 'ar'
}

export type AuthTokens = {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
}

export type ApiErrorBody = {
  error?: { code?: string; message?: string }
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export type MerchantListItem = {
  id: string
  name: string
  status: string
  verifiedAt: string | null
  publicReference: string | null
  createdAt: string
}

export type MerchantQueueItem = MerchantListItem & {
  verificationReady?: boolean
  verificationSubmitted?: boolean
  documentsReceived?: number
}

export type VerificationDocumentItem = {
  id: string
  type: string
  status: string
  expiryDate: string | null
}

export type DriverCurrentMission = {
  assignmentId: string
  assignmentStatus: string
  deliveryId: string
  deliveryStatus: string
  orderId: string
  orderPublicReference: string
}

/** Derived occupancy: ONLINE alone ≠ free when currentMission is set. */
export type DriverMatchingOccupancy =
  | 'OFFLINE'
  | 'ONLINE_AVAILABLE'
  | 'ONLINE_ON_MISSION'
  | 'UNKNOWN'

export type DriverListItem = {
  id: string
  fullName: string
  verificationStatus: string
  approvedAt: string | null
  createdAt: string
  documentsReceived?: number
  vehicleType?: string | null
  vehiclePlate?: string | null
  /** Present on GET /admin/drivers/:id */
  availabilityStatus?: string | null
  matchingOccupancy?: DriverMatchingOccupancy
  currentMission?: DriverCurrentMission | null
}

export type DriverVerificationPackage = {
  driverId: string
  fullName: string
  verificationStatus: string
  approvedAt: string | null
  createdAt: string
  documents: VerificationDocumentItem[]
  vehicle: {
    type: string
    plateNumber: string
    model: string
  } | null
}

export type CustomerColocated = {
  hasAdminProfile: boolean
  hasDriverProfile: boolean
  hasMerchantMembership: boolean
}

export type CustomerListItem = {
  id: string
  fullName: string
  avatarUrl: string | null
  phone?: string | null
  /** Account.status — Account-wide, not CustomerProfile.status. */
  accountStatus?: string
  createdAt: string
}

export type CustomerDetail = CustomerListItem & {
  accountId: string
  accountStatus: string
  colocated: CustomerColocated
}

export type CustomerComplaintItem = {
  id: string
  publicReference: string
  subject: string | null
  topicCode: string | null
  status: string
  priority: string
  createdAt: string
  updatedAt: string
}

export type CustomerLifecycleResult = {
  customerId: string
  accountId: string
  accountStatus: string
  alreadyApplied: boolean
  sessionsRevoked: number
  colocated: CustomerColocated
}

export type CustomerInternalNoteItem = {
  id: string
  customerId: string
  adminId: string
  authorDisplayName: string
  category: string
  body: string
  createdAt: string
}

export type AdminSearchEntityType =
  | 'customers'
  | 'merchants'
  | 'drivers'
  | 'orders'
  | 'support'

export type AdminSearchEmptyReason =
  | 'QUERY_REQUIRED'
  | 'NO_SEARCHABLE_PERMISSIONS'
  | 'NO_MATCHES'
  | null

export type AdminSearchCustomerHit = {
  id: string
  fullName: string
  phone: string | null
  accountStatus: string
  createdAt: string
  exactMatch: boolean
}

export type AdminSearchMerchantHit = {
  id: string
  name: string
  status: string
  publicReference: string
  createdAt: string
  exactMatch: boolean
}

export type AdminSearchDriverHit = {
  id: string
  fullName: string
  verificationStatus: string
  createdAt: string
  exactMatch: boolean
}

export type AdminSearchOrderHit = {
  id: string
  publicReference: string
  status: string
  fulfillmentStatus: string
  customerFullName: string | null
  merchantName: string | null
  createdAt: string
  exactMatch: boolean
}

export type AdminSearchSupportHit = {
  id: string
  publicReference: string
  subject: string | null
  status: string
  priority: string
  createdAt: string
  exactMatch: boolean
}

export type AdminSearchGroup =
  | {
      type: 'customers'
      total: number
      limit: number
      items: AdminSearchCustomerHit[]
    }
  | {
      type: 'merchants'
      total: number
      limit: number
      items: AdminSearchMerchantHit[]
    }
  | {
      type: 'drivers'
      total: number
      limit: number
      items: AdminSearchDriverHit[]
    }
  | {
      type: 'orders'
      total: number
      limit: number
      items: AdminSearchOrderHit[]
    }
  | {
      type: 'support'
      total: number
      limit: number
      items: AdminSearchSupportHit[]
    }

export type AdminSearchResponse = {
  query: string
  normalizedQuery: string | null
  permittedTypes: AdminSearchEntityType[]
  groups: AdminSearchGroup[]
  emptyReason: AdminSearchEmptyReason
}

export type AdminNotificationGroup = 'verification' | 'support'

export type AdminNotificationItem = {
  id: string
  type: string
  sourceId: string
  entityId: string
  group: AdminNotificationGroup
  title: string
  body: string
  read: boolean
  createdAt: string
  href: string
}

export type AdminNotificationList = {
  items: AdminNotificationItem[]
  total: number
  limit: number
  offset: number
  unreadCount: number
  visibleTypes: string[]
}

export type AdminNotificationUnreadCount = {
  unreadCount: number
  visibleTypes: string[]
}

/** A087 Admin IN_APP notification template catalogue row. */
export type AdminNotificationTemplate = {
  id: string
  code: string
  type: string
  locale: string
  displayName: string
  audience: string
  trigger: string
  channel: string
  titleTemplate: string
  bodyTemplate: string
  active: boolean
  editable: boolean
  placeholders: string[]
  createdAt: string
  updatedAt: string
}

export type AdminNotificationTemplateList = {
  items: AdminNotificationTemplate[]
  deferredChannels: string[]
}

export type AdminNotificationTemplatePreview = {
  title: string
  body: string
  exampleVars: Record<string, string>
  exampleLabel: string
}

export type CustomerAddressItem = {
  id: string
  customerId: string
  label: string
  addressText: string
  latitude: number
  longitude: number
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export type OrderListItem = {
  id: string
  publicReference: string
  customerId: string
  merchantBranchId: string
  status: string
  fulfillmentStatus: string
  createdAt: string
  confirmedAt: string | null
  completedAt: string | null
  customerFullName: string | null
  customerAvatarUrl: string | null
  merchantName: string | null
  merchantBranchName: string | null
  /** Null when OrderFinancialSnapshot absent. */
  customerPayableMinor: string | null
  currency: string | null
}

export type OrderItemOption = {
  optionNameSnapshot: string
  additionalPriceMinor: string
}

export type OrderItemRow = {
  id: string
  productId: string | null
  productNameSnapshot: string
  quantity: number
  unitPriceMinor: string
  lineTotalMinor: string
  options: OrderItemOption[]
}

export type OrderFinancialSnapshot = {
  currency: string
  grossMerchandiseSubtotalMinor: string
  merchantDiscountMinor: string
  platformDiscountMinor: string
  totalDiscountMinor: string
  commissionBaseMinor: string
  merchantCommissionRateBps: number
  merchantCommissionAmountMinor: string
  merchantNetAmountMinor: string
  customerDeliveryFeeMinor: string
  driverRemunerationMinor: string
  speedyGoDeliveryShareMinor: string
  serviceFeeMinor: string
  customerPayableMinor: string
  commissionRuleId: string
  pricingRuleId: string
  createdAt: string
}

/** Persisted OrderStatusEvent / DeliveryEvent only — never inferred from current status. */
export type OrderTimelineEvent = {
  source: 'ORDER_STATUS' | 'DELIVERY'
  eventType: string
  actorType: string | null
  fromStatus: string | null
  toStatus: string | null
  occurredAt: string
  driverId: string | null
  driverFullName: string | null
}

export type OrderDetail = OrderListItem & {
  items: OrderItemRow[]
  financial: OrderFinancialSnapshot | null
  deliveryAddress: {
    addressText: string
    latitude: number
    longitude: number
    instructions: string | null
  } | null
  payment: {
    id: string
    method: string
    status: string
    amountMinor: string
    currency: string
  } | null
  customer: {
    id: string
    fullName: string
    avatarUrl: string | null
    phone: string | null
  } | null
  merchant: {
    merchantId: string
    merchantName: string
    publicReference: string
    branchId: string
    branchName: string
    phone: string
    addressText: string
    wilayaCode: string | null
  } | null
  driver: {
    driverId: string
    fullName: string
    assignmentStatus: string
    deliveryStatus: string
  } | null
  /** Present when a Delivery row exists — Admin assign eligibility. */
  delivery: { id: string; status: string } | null
  timeline: OrderTimelineEvent[]
}

export type AdminAssignOfferResult = {
  orderId: string
  deliveryId: string
  assignmentId: string
  driverId: string
  assignmentStatus: string
  deliveryStatus: string
  supersededPreviousOffer: boolean
}

export type AdminOrderCancelResult = {
  orderId: string
  orderStatus: string
  cancellationAccepted: true
  cancelledAt: string | null
  refundRequired: boolean
  refundId: string | null
  refundStatus: string | null
  refundAmountMinor: string | null
}

export type MerchantBranchStoreItem = {
  id: string
  merchantId: string
  name: string
  phone: string
  addressText: string
  wilayaCode: string | null
  communeId: number | null
  operationalStatus: string
  description: string | null
  nameAr: string | null
  publicEmail: string | null
  availability: {
    hoursConfigured: boolean
    acceptingOrders: boolean
    availabilityMode: string
    effectiveMode: string
    closedUntil: string | null
    reasonCode: string | null
    customerMessage: string | null
    timezone: string
    currentClosesAt: string | null
    nextOpenAt: string | null
  }
}

/** GET /admin/merchant-branches/:branchId/classification */
export type BranchClassification = {
  id: string
  branchId: string
  verticalId: string
  createdAt: string
  updatedAt: string
}

/** GET /admin/commerce-verticals item */
export type CommerceVertical = {
  id: string
  slug: string
  name: string
  iconKey: string | null
  sortOrder: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export type PaymentListItem = {
  id: string
  orderId: string
  method: string
  status: string
  amountMinor: string
  currency: string
  createdAt: string
  updatedAt: string
}

export type RefundListItem = {
  id: string
  orderId: string
  paymentTransactionId: string | null
  refundMethod: string
  amountMinor: string
  status: string
  reason: string
  internalNote: string | null
  requestedByAdminId: string | null
  requestedAt: string
  completedAt: string | null
  createdAt: string
}

export type CodRemittanceListItem = {
  id: string
  driverId: string
  submittedAmountMinor: string
  confirmedAmountMinor: string | null
  status: string
  reference: string | null
  submittedAt: string
  confirmedAt?: string | null
}

export type CodDriverSummaryItem = {
  driverId: string
  fullName: string
  collectedOrderCount: number
  collectedAmountMinor: string
  confirmedAllocatedMinor: string
  outstandingCustodyMinor: string
  openDeclaredCount: number
  discrepancyRemittanceCount: number
  reconciliationStatus: string
}

export type PromotionListItem = {
  id: string
  code: string
  type: string
  value: number | string
  valueAmount?: string | null
  startsAt: string
  endsAt: string
  active: boolean
  customerDiscoverable: boolean
  customerLabel: string | null
  createdAt: string
  updatedAt: string
}

export type SettlementListItem = {
  id: string
  merchantId: string
  periodStart: string
  periodEnd: string
  status: string
  grossSalesMinor: string
  commissionMinor: string
  refundAdjustmentsMinor: string
  manualAdjustmentsMinor: string
  netPayableMinor: string
  paidAt: string | null
  createdAt: string
}

export type AuditListItem = {
  id: string
  adminId: string
  action: string
  targetType: string
  targetId: string
  beforeJson: unknown
  afterJson: unknown
  /** Null when not recorded — never invent. */
  ipAddress: string | null
  /** Null when not recorded — never invent. */
  sessionId: string | null
  createdAt: string
}

export type SupportTicketListItem = {
  id: string
  publicReference: string
  status: string
  priority: string
  orderId: string | null
  merchantId: string | null
  driverId: string | null
  assignedAdminId: string | null
  topicCode: string | null
  subject: string | null
  createdAt: string
  updatedAt: string
}

export type SupportMessage = {
  id: string
  ticketId: string
  authorAccountId: string
  body: string
  createdAt: string
  displayName: string | null
}

export type SupportInternalNote = {
  id: string
  ticketId: string
  adminId: string
  body: string
  createdAt: string
}

export type SupportTicketDetail = SupportTicketListItem & {
  createdByAccountId: string
  order: {
    id: string
    publicReference: string
    status: string
  } | null
  messages?: SupportMessage[]
  internalNotes?: SupportInternalNote[]
}

export type PlatformSetting = {
  key: string
  value: unknown
  description?: string
  updatedAt?: string | null
}

export type AdminAccountStatus = 'ACTIVE' | 'SUSPENDED' | 'DISABLED'

export type AdminProfileListItem = {
  id: string
  displayName: string
  twoFactorEnabled: boolean
  roleId: string
  roleName: string
  roleActive: boolean
  accountId: string
  phone: string | null
  email: string | null
  accountStatus: string
  createdAt: string
  updatedAt: string
}

export type AdminProfileDetail = AdminProfileListItem & {
  permissionCodes: string[]
}

export type AdminRoleListItem = {
  id: string
  name: string
  description: string | null
  active: boolean
  memberCount: number
  permissionCount: number
}

export type AdminRoleDetail = {
  id: string
  name: string
  description: string | null
  active: boolean
  memberCount: number
  permissionCodes: string[]
}

export type AdminPermissionCatalogItem = {
  id: string
  code: string
  description: string | null
}

export type CreateAdminProfileInput = {
  displayName: string
  roleId: string
  phone?: string
  email?: string
  accountStatus?: AdminAccountStatus
}

export type UpdateAdminProfileInput = {
  displayName?: string
  roleId?: string
  accountStatus?: AdminAccountStatus
}

export type CreateAdminRoleInput = {
  name: string
  description?: string
  active?: boolean
  permissionCodes: string[]
}

export type UpdateAdminRoleInput = {
  name?: string
  description?: string
  active?: boolean
  permissionCodes?: string[]
}
