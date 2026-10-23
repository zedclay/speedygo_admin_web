/** Half-open report window helpers — Backend expects RFC3339 instants, interval [from, to). */

export type ReportWindow = { from: string; to: string }

export function defaultReportWindow(days = 30): ReportWindow {
  const to = new Date()
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
  return { from: from.toISOString(), to: to.toISOString() }
}

/** datetime-local value (local wall clock) from ISO instant */
export function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function datetimeLocalToIso(local: string): string | null {
  if (!local.trim()) return null
  const d = new Date(local)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

/** Half-open [from, to): from must be strictly before to. */
export function isValidReportWindow(from: string, to: string): boolean {
  const a = new Date(from).getTime()
  const b = new Date(to).getTime()
  return Number.isFinite(a) && Number.isFinite(b) && a < b
}

/** Client hint — Backend also rejects windows > 93 days (REPORTS_MAX_WINDOW_MS). */
export const REPORT_WINDOW_MAX_MS = 93 * 24 * 60 * 60 * 1000

export function isReportWindowWithinMax(from: string, to: string): boolean {
  if (!isValidReportWindow(from, to)) return false
  return new Date(to).getTime() - new Date(from).getTime() <= REPORT_WINDOW_MAX_MS
}
