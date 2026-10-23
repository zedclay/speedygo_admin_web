import type { MessageKey } from '../../lib/i18n/messages'

/**
 * Admin report catalog — maps Stitch surfaces A072–A080 to Backend contracts.
 * A072p (promotion detail) is intentionally excluded.
 *
 * Money fields ending in Minor are Backend decimal-strings of integer minor units (DZD).
 * Do not equate GMS, commission, merchant net, delivery fee, driver remuneration,
 * SpeedyGo share, COD custody, settlements, or refunds.
 */

export type ReportApiFamily = 'operations' | 'finance' | 'none'

export type ReportViewId =
  | 'hub'
  | 'orders'
  | 'revenue'
  | 'merchants'
  | 'drivers'
  | 'customers'
  | 'cancellations'
  | 'export'
  | 'deliveries'
  | 'support'
  | 'ratings'
  | 'payments'
  | 'refunds'
  | 'cod'
  | 'driver-earnings'
  | 'settlements'
  | 'promotions'

export type MetricDef = {
  key: string
  labelKey: MessageKey
  /** Short definition for UI hint — never invents formulas */
  hintKey: MessageKey
  kind: 'count' | 'money' | 'average' | 'text' | 'map'
}

export type ReportViewDef = {
  id: ReportViewId
  labelKey: MessageKey
  /** Stitch reference id(s) this view primarily covers */
  stitchRefs: string[]
  family: ReportApiFamily
  /** Path segment under /admin/reports/{operations|finance}/ */
  apiPath?: string
  permission: 'reports.read' | 'reports.finance.read' | 'either' | 'none'
  paginated?: boolean
  metrics?: MetricDef[]
  /** Capability note when family === 'none' or partial */
  blockedKey?: MessageKey
}

export const PRIMARY_REPORT_VIEWS: ReportViewId[] = [
  'hub',
  'orders',
  'revenue',
  'merchants',
  'drivers',
  'customers',
  'cancellations',
  'export',
]

export const MORE_OPS_VIEWS: ReportViewId[] = [
  'deliveries',
  'support',
  'ratings',
]

export const MORE_FIN_VIEWS: ReportViewId[] = [
  'payments',
  'refunds',
  'cod',
  'driver-earnings',
  'settlements',
  'promotions',
]

export const REPORT_VIEWS: Record<ReportViewId, ReportViewDef> = {
  hub: {
    id: 'hub',
    labelKey: 'reportHub',
    stitchRefs: ['a_072'],
    family: 'none',
    permission: 'either',
  },
  orders: {
    id: 'orders',
    labelKey: 'reportOrders',
    stitchRefs: ['a_073', 'a_074'],
    family: 'operations',
    apiPath: 'orders',
    permission: 'reports.read',
    metrics: [
      {
        key: 'ordersCreatedCount',
        labelKey: 'rptOrdersCreated',
        hintKey: 'rptHintOrdersCreated',
        kind: 'count',
      },
      {
        key: 'ordersCompletedCount',
        labelKey: 'rptOrdersCompleted',
        hintKey: 'rptHintOrdersCompleted',
        kind: 'count',
      },
      {
        key: 'ordersCancelledCount',
        labelKey: 'rptOrdersCancelled',
        hintKey: 'rptHintOrdersCancelled',
        kind: 'count',
      },
      {
        key: 'ordersFailedCount',
        labelKey: 'rptOrdersFailed',
        hintKey: 'rptHintOrdersFailed',
        kind: 'count',
      },
      {
        key: 'ordersCreatedByStatus',
        labelKey: 'rptOrdersByStatus',
        hintKey: 'rptHintOrdersByStatus',
        kind: 'map',
      },
    ],
  },
  revenue: {
    id: 'revenue',
    labelKey: 'reportRevenue',
    stitchRefs: ['a_075'],
    family: 'finance',
    apiPath: 'completed-orders',
    permission: 'reports.finance.read',
    metrics: [
      {
        key: 'completedOrderCount',
        labelKey: 'rptCompletedOrderCount',
        hintKey: 'rptHintCompletedOrders',
        kind: 'count',
      },
      {
        key: 'grossMerchandiseMinor',
        labelKey: 'rptGms',
        hintKey: 'rptHintGms',
        kind: 'money',
      },
      {
        key: 'merchantCommissionMinor',
        labelKey: 'rptMerchantCommission',
        hintKey: 'rptHintMerchantCommission',
        kind: 'money',
      },
      {
        key: 'merchantNetMinor',
        labelKey: 'rptMerchantNet',
        hintKey: 'rptHintMerchantNet',
        kind: 'money',
      },
      {
        key: 'merchantDiscountMinor',
        labelKey: 'rptMerchantDiscount',
        hintKey: 'rptHintDiscounts',
        kind: 'money',
      },
      {
        key: 'platformDiscountMinor',
        labelKey: 'rptPlatformDiscount',
        hintKey: 'rptHintDiscounts',
        kind: 'money',
      },
      {
        key: 'customerDeliveryFeeMinor',
        labelKey: 'rptCustomerDeliveryFee',
        hintKey: 'rptHintDeliverySplit',
        kind: 'money',
      },
      {
        key: 'driverRemunerationMinor',
        labelKey: 'rptDriverRemuneration',
        hintKey: 'rptHintDeliverySplit',
        kind: 'money',
      },
      {
        key: 'speedyGoDeliveryShareMinor',
        labelKey: 'rptSpeedyGoShare',
        hintKey: 'rptHintDeliverySplit',
        kind: 'money',
      },
      {
        key: 'customerPayableMinor',
        labelKey: 'rptCustomerPayable',
        hintKey: 'rptHintCustomerPayable',
        kind: 'money',
      },
    ],
  },
  merchants: {
    id: 'merchants',
    labelKey: 'reportMerchants',
    stitchRefs: ['a_076'],
    family: 'finance',
    apiPath: 'merchants',
    permission: 'reports.finance.read',
    paginated: true,
  },
  drivers: {
    id: 'drivers',
    labelKey: 'reportDrivers',
    stitchRefs: ['a_077'],
    family: 'operations',
    apiPath: 'drivers',
    permission: 'reports.read',
    paginated: true,
  },
  customers: {
    id: 'customers',
    labelKey: 'reportCustomers',
    stitchRefs: ['a_078'],
    family: 'none',
    permission: 'none',
    blockedKey: 'reportCustomersBlocked',
  },
  cancellations: {
    id: 'cancellations',
    labelKey: 'reportCancellations',
    stitchRefs: ['a_079'],
    family: 'operations',
    apiPath: 'orders',
    permission: 'reports.read',
    metrics: [
      {
        key: 'ordersCancelledCount',
        labelKey: 'rptOrdersCancelled',
        hintKey: 'rptHintCancellationsPartial',
        kind: 'count',
      },
      {
        key: 'ordersCreatedByStatus',
        labelKey: 'rptOrdersByStatus',
        hintKey: 'rptHintCancellationsPartial',
        kind: 'map',
      },
    ],
  },
  export: {
    id: 'export',
    labelKey: 'reportExport',
    stitchRefs: ['a_080', 'a_080h', 'a_080s'],
    family: 'none',
    permission: 'either',
    blockedKey: 'reportExportHistoryBlocked',
  },
  deliveries: {
    id: 'deliveries',
    labelKey: 'deliveries',
    stitchRefs: [],
    family: 'operations',
    apiPath: 'deliveries',
    permission: 'reports.read',
    metrics: [
      {
        key: 'deliveriesDeliveredCount',
        labelKey: 'rptDeliveriesDelivered',
        hintKey: 'rptHintDeliveries',
        kind: 'count',
      },
    ],
  },
  support: {
    id: 'support',
    labelKey: 'support',
    stitchRefs: [],
    family: 'operations',
    apiPath: 'support',
    permission: 'reports.read',
    metrics: [
      {
        key: 'ticketsCreatedCount',
        labelKey: 'rptTicketsCreated',
        hintKey: 'rptHintSupport',
        kind: 'count',
      },
      {
        key: 'ticketsCreatedByStatus',
        labelKey: 'rptTicketsByStatus',
        hintKey: 'rptHintSupport',
        kind: 'map',
      },
      {
        key: 'ticketsCreatedByPriority',
        labelKey: 'rptTicketsByPriority',
        hintKey: 'rptHintSupport',
        kind: 'map',
      },
    ],
  },
  ratings: {
    id: 'ratings',
    labelKey: 'tabRatings',
    stitchRefs: [],
    family: 'operations',
    apiPath: 'ratings',
    permission: 'reports.read',
    metrics: [
      {
        key: 'driverRatingsCreatedCount',
        labelKey: 'rptDriverRatingsCount',
        hintKey: 'rptHintRatings',
        kind: 'count',
      },
      {
        key: 'merchantRatingsCreatedCount',
        labelKey: 'rptMerchantRatingsCount',
        hintKey: 'rptHintRatings',
        kind: 'count',
      },
      {
        key: 'driverRatingAverage',
        labelKey: 'rptDriverRatingAvg',
        hintKey: 'rptHintRatings',
        kind: 'average',
      },
      {
        key: 'merchantRatingAverage',
        labelKey: 'rptMerchantRatingAvg',
        hintKey: 'rptHintRatings',
        kind: 'average',
      },
    ],
  },
  payments: {
    id: 'payments',
    labelKey: 'payments',
    stitchRefs: [],
    family: 'finance',
    apiPath: 'payments',
    permission: 'reports.finance.read',
    metrics: [
      {
        key: 'paymentSucceededDuringPeriodCount',
        labelKey: 'rptPaymentsSucceededCount',
        hintKey: 'rptHintPayments',
        kind: 'count',
      },
      {
        key: 'customerPaymentSucceededDuringPeriodMinor',
        labelKey: 'rptPaymentsSucceededAmount',
        hintKey: 'rptHintPayments',
        kind: 'money',
      },
    ],
  },
  refunds: {
    id: 'refunds',
    labelKey: 'refunds',
    stitchRefs: [],
    family: 'finance',
    apiPath: 'refunds',
    permission: 'reports.finance.read',
    metrics: [
      {
        key: 'refundCompletedCount',
        labelKey: 'rptRefundsCompletedCount',
        hintKey: 'rptHintRefunds',
        kind: 'count',
      },
      {
        key: 'customerRefundedMinor',
        labelKey: 'rptRefundsCompletedAmount',
        hintKey: 'rptHintRefunds',
        kind: 'money',
      },
    ],
  },
  cod: {
    id: 'cod',
    labelKey: 'cod',
    stitchRefs: [],
    family: 'finance',
    apiPath: 'cod',
    permission: 'reports.finance.read',
    metrics: [
      {
        key: 'codCollectedDuringPeriodMinor',
        labelKey: 'rptCodCollected',
        hintKey: 'rptHintCod',
        kind: 'money',
      },
      {
        key: 'codConfirmedRemittedDuringPeriodMinor',
        labelKey: 'rptCodRemitted',
        hintKey: 'rptHintCod',
        kind: 'money',
      },
      {
        key: 'codCustodyNetMovementDuringPeriodMinor',
        labelKey: 'rptCodNetMovement',
        hintKey: 'rptHintCodNet',
        kind: 'money',
      },
      {
        key: 'codOutstandingCustodyAsOfToMinor',
        labelKey: 'rptCodOutstanding',
        hintKey: 'rptHintCodOutstanding',
        kind: 'money',
      },
    ],
  },
  'driver-earnings': {
    id: 'driver-earnings',
    labelKey: 'driverEarnings',
    stitchRefs: [],
    family: 'finance',
    apiPath: 'driver-earnings',
    permission: 'reports.finance.read',
    metrics: [
      {
        key: 'driverEarningRowCount',
        labelKey: 'rptDriverEarningRows',
        hintKey: 'rptHintDriverEarnings',
        kind: 'count',
      },
      {
        key: 'driverEarnedMinor',
        labelKey: 'rptDriverEarned',
        hintKey: 'rptHintDriverEarnings',
        kind: 'money',
      },
    ],
  },
  settlements: {
    id: 'settlements',
    labelKey: 'settlements',
    stitchRefs: [],
    family: 'finance',
    apiPath: 'settlements',
    permission: 'reports.finance.read',
    metrics: [
      {
        key: 'settlementsCreatedDuringPeriodCount',
        labelKey: 'rptSettlementsCreated',
        hintKey: 'rptHintSettlements',
        kind: 'count',
      },
      {
        key: 'settlementsCreatedCurrentlyDraftCount',
        labelKey: 'rptSettlementsDraft',
        hintKey: 'rptHintSettlements',
        kind: 'count',
      },
      {
        key: 'settlementsCreatedCurrentlyFinalizedCount',
        labelKey: 'rptSettlementsFinalized',
        hintKey: 'rptHintSettlements',
        kind: 'count',
      },
      {
        key: 'settlementsCreatedCurrentlyFinalizedNetPayableMinor',
        labelKey: 'rptSettlementsNetPayable',
        hintKey: 'rptHintSettlements',
        kind: 'money',
      },
    ],
  },
  promotions: {
    id: 'promotions',
    labelKey: 'promotions',
    stitchRefs: [],
    family: 'finance',
    apiPath: 'promotions',
    permission: 'reports.finance.read',
    metrics: [
      {
        key: 'completedOrderCount',
        labelKey: 'rptCompletedOrderCount',
        hintKey: 'rptHintPromoFinance',
        kind: 'count',
      },
      {
        key: 'merchantFundedDiscountMinor',
        labelKey: 'rptMerchantFundedDiscount',
        hintKey: 'rptHintPromoFinance',
        kind: 'money',
      },
      {
        key: 'platformFundedDiscountMinor',
        labelKey: 'rptPlatformFundedDiscount',
        hintKey: 'rptHintPromoFinance',
        kind: 'money',
      },
    ],
  },
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
