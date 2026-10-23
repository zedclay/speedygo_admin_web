import { apiGet, apiPatch, apiPost, apiPut, apiRequest, getApiBaseUrl } from './client'
import type {
  AdminAccountStatus,
  AdminMe,
  AdminPermissionCatalogItem,
  AdminProfileDetail,
  AdminProfileListItem,
  AdminRoleDetail,
  AdminRoleListItem,
  AuditListItem,
  AuthTokens,
  CodDriverSummaryItem,
  CodRemittanceListItem,
  BranchClassification,
  CommerceVertical,
  CreateAdminProfileInput,
  CreateAdminRoleInput,
  CustomerAddressItem,
  CustomerComplaintItem,
  CustomerDetail,
  CustomerInternalNoteItem,
  CustomerLifecycleResult,
  CustomerListItem,
  AdminSearchResponse,
  AdminNotificationItem,
  AdminNotificationList,
  AdminNotificationTemplate,
  AdminNotificationTemplateList,
  AdminNotificationTemplatePreview,
  AdminNotificationUnreadCount,
  DriverListItem,
  DriverVerificationPackage,
  MerchantBranchStoreItem,
  MerchantListItem,
  MerchantQueueItem,
  AdminAssignOfferResult,
  AdminOrderCancelResult,
  OrderDetail,
  OrderListItem,
  Paginated,
  DeliveryPricingRule,
  DeliveryZone,
  PaymentListItem,
  PlatformSetting,
  PromotionListItem,
  RefundListItem,
  SettlementListItem,
  SupportTicketDetail,
  SupportTicketListItem,
  UpdateAdminProfileInput,
  UpdateAdminRoleInput,
  WilayaListItem,
} from './types'

export { getApiBaseUrl }

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    search.set(key, String(value))
  }
  const s = search.toString()
  return s ? `?${s}` : ''
}

export const authApi = {
  requestOtp(input: {
    channel: 'PHONE' | 'EMAIL'
    identifier: string
    purpose?: 'AUTHENTICATE'
  }) {
    return apiPost<{ accepted: boolean }>(
      '/auth/otp/request',
      {
        channel: input.channel,
        identifier: input.identifier,
        purpose: input.purpose ?? 'AUTHENTICATE',
      },
      false,
    )
  },
  verifyOtp(input: {
    channel: 'PHONE' | 'EMAIL'
    identifier: string
    code: string
    platform?: 'web' | 'ios' | 'android'
    appVersion?: string
    deviceId?: string
    deviceName?: string
  }) {
    return apiPost<AuthTokens>(
      '/auth/otp/verify',
      {
        channel: input.channel,
        identifier: input.identifier,
        purpose: 'AUTHENTICATE',
        code: input.code,
        platform: input.platform ?? 'web',
        appVersion: input.appVersion ?? 'admin-web-1.0.0',
        deviceId: input.deviceId,
        deviceName: input.deviceName ?? 'SpeedyGo Admin Web',
      },
      false,
    )
  },
  logout() {
    return apiPost<void>('/auth/logout', {})
  },
}

export const adminApi = {
  me: () => apiGet<AdminMe>('/admin/me'),
  updatePreferredLocale: (preferredLocale: 'fr' | 'ar') =>
    apiPut<AdminMe>('/admin/me/preferred-locale', { preferredLocale }),

  listMerchants: (p: { limit?: number; offset?: number; status?: string } = {}) =>
    apiGet<Paginated<MerchantListItem>>(`/admin/merchants${qs(p)}`),
  getMerchant: (id: string) => apiGet<MerchantListItem>(`/admin/merchants/${id}`),
  listMerchantBranches: (id: string) =>
    apiGet<{ items: MerchantBranchStoreItem[] }>(`/admin/merchants/${id}/branches`),
  merchantVerificationQueue: (p: { limit?: number; offset?: number } = {}) =>
    apiGet<Paginated<MerchantQueueItem>>(
      `/admin/merchants/verification/queue${qs(p)}`,
    ),
  getMerchantVerification: (id: string) =>
    apiGet<Record<string, unknown>>(`/admin/merchants/${id}/verification`),
  approveMerchant: (id: string) =>
    apiPost(`/admin/merchants/${id}/verification/approve`, {}),
  rejectMerchant: (
    id: string,
    issues: Array<{
      scope: string
      code: string
      messageFr: string
      documentType?: string
    }>,
  ) => apiPost(`/admin/merchants/${id}/verification/reject`, { issues }),
  suspendMerchant: (id: string) => apiPost(`/admin/merchants/${id}/suspend`, {}),
  downloadMerchantDocument: (merchantId: string, documentId: string) =>
    apiRequest<Response>(
      `/admin/merchants/${merchantId}/documents/${documentId}/content`,
      { raw: true },
    ),

  listDrivers: (p: {
    limit?: number
    offset?: number
    verificationStatus?: string
  } = {}) => apiGet<Paginated<DriverListItem>>(`/admin/drivers${qs(p)}`),
  getDriver: (id: string) => apiGet<DriverListItem>(`/admin/drivers/${id}`),
  getDriverVerification: (id: string) =>
    apiGet<DriverVerificationPackage>(`/admin/drivers/${id}/verification`),
  driverVerificationQueue: (p: { limit?: number; offset?: number } = {}) =>
    apiGet<Paginated<DriverListItem>>(
      `/admin/drivers/verification/queue${qs(p)}`,
    ),
  approveDriver: (id: string) =>
    apiPost(`/admin/drivers/${id}/verification/approve`, {}),
  rejectDriver: (id: string) =>
    apiPost(`/admin/drivers/${id}/verification/reject`, {}),
  suspendDriver: (id: string) => apiPost(`/admin/drivers/${id}/suspend`, {}),
  downloadDriverDocument: (driverId: string, documentId: string) =>
    apiRequest<Response>(
      `/admin/drivers/${driverId}/documents/${documentId}/content`,
      { raw: true },
    ),

  listCustomers: (p: { limit?: number; offset?: number } = {}) =>
    apiGet<Paginated<CustomerListItem>>(`/admin/customers${qs(p)}`),
  getCustomer: (id: string) =>
    apiGet<CustomerDetail>(`/admin/customers/${id}`),
  listCustomerAddresses: (id: string) =>
    apiGet<{ items: CustomerAddressItem[] }>(`/admin/customers/${id}/addresses`),
  listCustomerComplaints: (
    id: string,
    p: { limit?: number; offset?: number } = {},
  ) =>
    apiGet<Paginated<CustomerComplaintItem>>(
      `/admin/customers/${id}/complaints${qs(p)}`,
    ),
  suspendCustomer: (id: string, body: { auditNote?: string } = {}) =>
    apiPost<CustomerLifecycleResult>(`/admin/customers/${id}/suspend`, body),
  reactivateCustomer: (id: string, body: { auditNote?: string } = {}) =>
    apiPost<CustomerLifecycleResult>(
      `/admin/customers/${id}/reactivate`,
      body,
    ),
  listCustomerNotes: (
    id: string,
    p: { limit?: number; offset?: number } = {},
  ) =>
    apiGet<Paginated<CustomerInternalNoteItem>>(
      `/admin/customers/${id}/notes${qs(p)}`,
    ),
  createCustomerNote: (
    id: string,
    body: { category: string; body: string },
  ) => apiPost<CustomerInternalNoteItem>(`/admin/customers/${id}/notes`, body),

  /** A005 bounded Admin global search — permission-gated groups. */
  globalSearch: (p: {
    q?: string
    types?: string
    limitPerType?: number
  }) => apiGet<AdminSearchResponse>(`/admin/search${qs(p)}`),

  /** A006 Admin operational inbox — permission-filtered. */
  listAdminNotifications: (p: {
    limit?: number
    offset?: number
    unreadOnly?: boolean
    types?: string
  } = {}) => apiGet<AdminNotificationList>(`/admin/notifications${qs(p)}`),
  adminNotificationsUnreadCount: () =>
    apiGet<AdminNotificationUnreadCount>(`/admin/notifications/unread-count`),
  markAdminNotificationRead: (id: string) =>
    apiPost<AdminNotificationItem>(`/admin/notifications/${id}/read`, {}),
  markAllAdminNotificationsRead: () =>
    apiPost<{ marked: number; visibleTypes: string[] }>(
      `/admin/notifications/read-all`,
      {},
    ),

  /** A087 Admin IN_APP notification templates. */
  listNotificationTemplates: () =>
    apiGet<AdminNotificationTemplateList>('/admin/notification-templates'),
  getNotificationTemplate: (id: string) =>
    apiGet<AdminNotificationTemplate>(
      `/admin/notification-templates/${id}`,
    ),
  updateNotificationTemplate: (
    id: string,
    body: {
      titleTemplate: string
      bodyTemplate: string
      active: boolean
    },
  ) =>
    apiPut<AdminNotificationTemplate>(
      `/admin/notification-templates/${id}`,
      body,
    ),
  previewNotificationTemplate: (
    id: string,
    body: { titleTemplate?: string; bodyTemplate?: string } = {},
  ) =>
    apiPost<AdminNotificationTemplatePreview>(
      `/admin/notification-templates/${id}/preview`,
      body,
    ),

  listOrders: (
    p: {
      limit?: number
      offset?: number
      status?: string
      customerId?: string
      merchantId?: string
      merchantBranchId?: string
      createdFrom?: string
      createdTo?: string
    } = {},
  ) => apiGet<Paginated<OrderListItem>>(`/admin/orders${qs(p)}`),
  getOrder: (id: string) => apiGet<OrderDetail>(`/admin/orders/${id}`),
  assignOrderOffer: (
    id: string,
    body: { driverId: string; reason: string },
  ) => apiPost<AdminAssignOfferResult>(`/admin/orders/${id}/assign-offer`, body),
  cancelOrder: (id: string, body: { reason: string }) =>
    apiPost<AdminOrderCancelResult>(`/admin/orders/${id}/cancel`, body),

  getBranchClassification: (branchId: string) =>
    apiGet<BranchClassification>(
      `/admin/merchant-branches/${branchId}/classification`,
    ),
  listCommerceVerticals: () =>
    apiGet<{ items: CommerceVertical[] }>('/admin/commerce-verticals'),

  listPayments: (p: { limit?: number; offset?: number; status?: string } = {}) =>
    apiGet<Paginated<PaymentListItem>>(`/admin/payments${qs(p)}`),
  getPayment: (id: string) => apiGet<PaymentListItem>(`/admin/payments/${id}`),

  listRefunds: (p: {
    limit?: number
    offset?: number
    status?: string
    orderId?: string
  } = {}) => apiGet<Paginated<RefundListItem>>(`/admin/refunds${qs(p)}`),
  getRefund: (id: string) => apiGet<RefundListItem>(`/admin/refunds/${id}`),
  createRefund: (body: {
    orderId: string
    amount: string
    reason: string
    method: string
    internalNote?: string
  }) => apiPost<RefundListItem>('/admin/refunds', body),
  approveRefund: (id: string, internalNote?: string) =>
    apiPost(`/admin/refunds/${id}/approve`, { internalNote }),
  rejectRefund: (id: string, internalNote?: string) =>
    apiPost(`/admin/refunds/${id}/reject`, { internalNote }),
  confirmManualRefund: (id: string, internalNote?: string) =>
    apiPost(`/admin/refunds/${id}/confirm-manual`, { internalNote }),

  listCodDriverSummaries: (p: {
    limit?: number
    offset?: number
    q?: string
    reconciliationStatus?: string
  } = {}) =>
    apiGet<Paginated<CodDriverSummaryItem>>(`/admin/cod/driver-summaries${qs(p)}`),
  getCodDriverSummary: (driverId: string) =>
    apiGet<CodDriverSummaryItem>(`/admin/cod/driver-summaries/${driverId}`),
  listCodRemittances: (p: {
    limit?: number
    offset?: number
    driverId?: string
    status?: string
  } = {}) =>
    apiGet<Paginated<CodRemittanceListItem>>(`/admin/cod/remittances${qs(p)}`),
  getCodRemittance: (id: string) =>
    apiGet<CodRemittanceListItem>(`/admin/cod/remittances/${id}`),
  confirmCodRemittance: (id: string, confirmedAmount: string) =>
    apiPost(`/admin/cod/remittances/${id}/confirm`, { confirmedAmount }),

  listSettlements: (p: {
    limit?: number
    offset?: number
    merchantId?: string
    status?: string
  } = {}) =>
    apiGet<Paginated<SettlementListItem>>(`/admin/settlements${qs(p)}`),
  getSettlement: (id: string) =>
    apiGet<SettlementListItem>(`/admin/settlements/${id}`),

  listPromotions: (p: {
    limit?: number
    offset?: number
    active?: boolean
  } = {}) => apiGet<Paginated<PromotionListItem>>(`/admin/promotions${qs(p)}`),
  getPromotion: (id: string) =>
    apiGet<PromotionListItem>(`/admin/promotions/${id}`),
  createPromotion: (body: {
    code: string
    type: string
    value?: number
    valueAmount?: string
    startsAt: string
    endsAt: string
    active?: boolean
    customerDiscoverable?: boolean
    customerLabel?: string | null
  }) => apiPost<PromotionListItem>('/admin/promotions', body),
  updatePromotionValue: (
    id: string,
    body: { value?: number; valueAmount?: string },
  ) => apiPost<PromotionListItem>(`/admin/promotions/${id}/value`, body),
  activatePromotion: (id: string) =>
    apiPost(`/admin/promotions/${id}/activate`, {}),
  deactivatePromotion: (id: string) =>
    apiPost(`/admin/promotions/${id}/deactivate`, {}),
  publishPromotionDiscovery: (id: string, customerLabel?: string) =>
    apiPost(`/admin/promotions/${id}/publish-discovery`, { customerLabel }),
  hidePromotionDiscovery: (id: string) =>
    apiPost(`/admin/promotions/${id}/hide-discovery`, {}),
  updatePromotionPresentation: (id: string, customerLabel?: string | null) =>
    apiPost(`/admin/promotions/${id}/presentation`, { customerLabel }),

  openSettlementDraft: (body: {
    merchantId: string
    periodStart: string
    periodEnd: string
  }) => apiPost('/admin/settlements', body),
  buildSettlementSaleLines: (id: string) =>
    apiPost(`/admin/settlements/${id}/build-sale-lines`, {}),
  finalizeSettlement: (id: string) =>
    apiPost(`/admin/settlements/${id}/finalize`, {}),
  attachSettlementRefundLiability: (
    id: string,
    body: { refundId: string; merchantLiabilityMinor: number },
  ) => apiPost(`/admin/settlements/${id}/refund-liability`, body),

  listAudit: (p: {
    limit?: number
    offset?: number
    action?: string
    targetType?: string
    targetId?: string
  } = {}) => apiGet<Paginated<AuditListItem>>(`/admin/audit${qs(p)}`),

  listSupport: (p: {
    limit?: number
    offset?: number
    status?: string
    priority?: string
    assignedAdminId?: string
    createdFrom?: string
    createdTo?: string
  } = {}) => apiGet<Paginated<SupportTicketListItem>>(`/admin/support${qs(p)}`),
  getSupportTicket: (id: string) =>
    apiGet<SupportTicketDetail>(`/admin/support/${id}`),
  supportReply: (id: string, body: string) =>
    apiPost(`/admin/support/${id}/messages`, { body }),
  supportInternalNote: (id: string, body: string) =>
    apiPost(`/admin/support/${id}/internal-notes`, { body }),
  supportAssign: (id: string, assignedAdminId: string | null) =>
    apiPost(`/admin/support/${id}/assign`, { assignedAdminId }),
  supportPriority: (id: string, priority: string) =>
    apiPost(`/admin/support/${id}/priority`, { priority }),
  supportStart: (id: string) => apiPost(`/admin/support/${id}/start`, {}),
  supportWaitCustomer: (id: string) =>
    apiPost(`/admin/support/${id}/wait-customer`, {}),
  supportResolve: (id: string) => apiPost(`/admin/support/${id}/resolve`, {}),
  supportClose: (id: string) => apiPost(`/admin/support/${id}/close`, {}),
  supportReopen: (id: string) => apiPost(`/admin/support/${id}/reopen`, {}),

  listSettings: () => apiGet<PlatformSetting[]>('/admin/settings'),
  getSetting: (key: string) =>
    apiGet<PlatformSetting>(`/admin/settings/${encodeURIComponent(key)}`),
  updateSetting: (key: string, value: unknown) =>
    apiPut(`/admin/settings/${encodeURIComponent(key)}`, { value }),

  listDeliveryZones: (
    p: {
      limit?: number
      offset?: number
      active?: boolean
      sortBy?: 'createdAt' | 'updatedAt' | 'name'
      sortDir?: 'ASC' | 'DESC'
    } = {},
  ) => apiGet<Paginated<DeliveryZone>>(`/admin/delivery/zones${qs(p)}`),
  getDeliveryZone: (id: string) =>
    apiGet<DeliveryZone>(`/admin/delivery/zones/${id}`),
  createDeliveryZone: (body: { name: string; geometry: object }) =>
    apiPost<DeliveryZone>('/admin/delivery/zones', body),
  updateDeliveryZone: (
    id: string,
    body: { name?: string; geometry?: object },
  ) => apiPut<DeliveryZone>(`/admin/delivery/zones/${id}`, body),
  activateDeliveryZone: (id: string) =>
    apiPost(`/admin/delivery/zones/${id}/activate`, {}),
  deactivateDeliveryZone: (id: string) =>
    apiPost(`/admin/delivery/zones/${id}/deactivate`, {}),
  listPricingRules: (
    p: {
      limit?: number
      offset?: number
      zoneId?: string
      active?: boolean
      sortBy?: 'createdAt' | 'effectiveFrom'
      sortDir?: 'ASC' | 'DESC'
    } = {},
  ) =>
    apiGet<Paginated<DeliveryPricingRule>>(
      `/admin/delivery/pricing-rules${qs(p)}`,
    ),
  getPricingRule: (id: string) =>
    apiGet<DeliveryPricingRule>(`/admin/delivery/pricing-rules/${id}`),
  createPricingRule: (body: {
    zoneId: string
    name: string
    timeBand: string
    startLocalTime?: string
    endLocalTime?: string
    customerDeliveryFeeMinor: number
    driverRemunerationMinor: number
    effectiveFrom: string
    effectiveTo?: string
  }) => apiPost<DeliveryPricingRule>('/admin/delivery/pricing-rules', body),
  activatePricingRule: (id: string) =>
    apiPost(`/admin/delivery/pricing-rules/${id}/activate`, {}),
  deactivatePricingRule: (id: string) =>
    apiPost(`/admin/delivery/pricing-rules/${id}/deactivate`, {}),
  /** Authenticated geo catalogue — not Admin-managed delivery coverage. */
  listWilayas: () => apiGet<{ wilayas: WilayaListItem[] }>('/geo/wilayas'),

  reportsOperations: (path: string, p: Record<string, string | undefined> = {}) =>
    apiGet<unknown>(`/admin/reports/operations/${path}${qs(p)}`),
  reportsFinance: (path: string, p: Record<string, string | undefined> = {}) =>
    apiGet<unknown>(`/admin/reports/finance/${path}${qs(p)}`),

  listAdmins: (
    p: {
      limit?: number
      offset?: number
      q?: string
      roleId?: string
      accountStatus?: AdminAccountStatus | string
    } = {},
  ) => apiGet<Paginated<AdminProfileListItem>>(`/admin/admins${qs(p)}`),
  getAdmin: (id: string) => apiGet<AdminProfileDetail>(`/admin/admins/${id}`),
  createAdmin: (body: CreateAdminProfileInput) =>
    apiPost<AdminProfileDetail>('/admin/admins', body),
  updateAdmin: (id: string, body: UpdateAdminProfileInput) =>
    apiPatch<AdminProfileDetail>(`/admin/admins/${id}`, body),

  listRoles: (
    p: {
      limit?: number
      offset?: number
      q?: string
      active?: boolean
    } = {},
  ) => apiGet<Paginated<AdminRoleListItem>>(`/admin/roles${qs(p)}`),
  getRole: (id: string) => apiGet<AdminRoleDetail>(`/admin/roles/${id}`),
  createRole: (body: CreateAdminRoleInput) =>
    apiPost<AdminRoleDetail>('/admin/roles', body),
  updateRole: (id: string, body: UpdateAdminRoleInput) =>
    apiPatch<AdminRoleDetail>(`/admin/roles/${id}`, body),
  listPermissions: () =>
    apiGet<AdminPermissionCatalogItem[]>('/admin/permissions'),
}
