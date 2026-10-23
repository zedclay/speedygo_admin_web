import { PERMS, hasPermission, type PermissionCode } from '../../lib/permissions'

export type DashSection =
  | 'orders'
  | 'drivers'
  | 'merchants'
  | 'cod'
  | 'support'
  | 'reportsOps'
  | 'reportsFinance'

const SECTION_PERMS: Record<DashSection, PermissionCode[]> = {
  orders: [PERMS.ORDERS_READ],
  drivers: [PERMS.DRIVERS_READ],
  merchants: [PERMS.MERCHANTS_READ],
  cod: [PERMS.COD_READ],
  support: [PERMS.SUPPORT_READ],
  reportsOps: [PERMS.REPORTS_READ],
  reportsFinance: [PERMS.REPORTS_FINANCE_READ],
}

export function canLoadSection(
  permissions: readonly string[] | undefined,
  section: DashSection,
): boolean {
  return hasPermission(permissions, SECTION_PERMS[section])
}

/** UTC calendar-day window for report queries (honest “aujourd’hui” bound). */
export function todayUtcWindowIso(now = new Date()): { from: string; to: string } {
  const to = now.toISOString()
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
  )
  return { from: start.toISOString(), to }
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export type OrdersOpsSummary = {
  created: number | null
  completed: number | null
  cancelled: number | null
  failed: number | null
  activeInByStatus: number | null
}

export function parseOrdersOpsReport(data: unknown): OrdersOpsSummary {
  if (!isRecord(data)) {
    return {
      created: null,
      completed: null,
      cancelled: null,
      failed: null,
      activeInByStatus: null,
    }
  }
  const byStatus = isRecord(data.ordersCreatedByStatus)
    ? data.ordersCreatedByStatus
    : null
  const activeRaw = byStatus?.ACTIVE
  return {
    created: numOrNull(data.ordersCreatedCount),
    completed: numOrNull(data.ordersCompletedCount),
    cancelled: numOrNull(data.ordersCancelledCount),
    failed: numOrNull(data.ordersFailedCount),
    activeInByStatus: numOrNull(activeRaw),
  }
}

export type CodFinanceSummary = {
  collectedMinor: string | null
  outstandingCustodyMinor: string | null
  discrepancyCount: number | null
}

export function parseCodFinanceReport(data: unknown): CodFinanceSummary {
  if (!isRecord(data)) {
    return {
      collectedMinor: null,
      outstandingCustodyMinor: null,
      discrepancyCount: null,
    }
  }
  return {
    collectedMinor: strOrNull(data.codCollectedDuringPeriodMinor),
    outstandingCustodyMinor: strOrNull(data.codOutstandingCustodyAsOfToMinor),
    discrepancyCount: numOrNull(data.codDiscrepancyCreatedDuringPeriodCount),
  }
}

/**
 * Completion ratio among terminal completed+failed cohorts from the ops report.
 * Returns null when the denominator is zero or inputs missing — never invents.
 */
export function completionRatioPercent(
  completed: number | null,
  failed: number | null,
): number | null {
  if (completed === null || failed === null) return null
  const den = completed + failed
  if (den <= 0) return null
  return Math.round((completed * 100) / den)
}

export function relativeAgeLabel(iso: string, now = Date.now()): string {
  const ms = now - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return '—'
  const min = Math.floor(ms / 60000)
  if (min < 1) return '<1 min'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  return `${h} h`
}

function numOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) {
    return Number(v)
  }
  return null
}

function strOrNull(v: unknown): string | null {
  if (typeof v === 'string' && v.length > 0) return v
  if (typeof v === 'number' && Number.isFinite(v)) return String(Math.trunc(v))
  return null
}
