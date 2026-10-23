import type { MessageKey } from '../../lib/i18n/messages'

const STATUS_LABEL: Record<string, MessageKey> = {
  OPEN: 'supportStatusOpen',
  IN_PROGRESS: 'supportStatusInProgress',
  WAITING_CUSTOMER: 'supportStatusWaitingCustomer',
  RESOLVED: 'supportStatusResolved',
  CLOSED: 'supportStatusClosed',
}

const PRIORITY_LABEL: Record<string, MessageKey> = {
  LOW: 'supportPriorityLow',
  NORMAL: 'supportPriorityNormal',
  HIGH: 'supportPriorityHigh',
}

export function supportStatusLabelKey(status: string): MessageKey | null {
  return STATUS_LABEL[status] ?? null
}

export function supportPriorityLabelKey(priority: string): MessageKey | null {
  return PRIORITY_LABEL[priority] ?? null
}

/** Age from authoritative createdAt — concise FR/AR-friendly string. */
export function formatTicketAge(
  createdAt: string,
  labels: { hours: string; minutes: string; unavailable: string },
): string {
  const created = new Date(createdAt).getTime()
  if (!Number.isFinite(created)) return labels.unavailable
  const ms = Date.now() - created
  if (!Number.isFinite(ms) || ms < 0) return labels.unavailable
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h <= 0) return `${m} ${labels.minutes}`
  return `${h} ${labels.hours} ${m} ${labels.minutes}`
}

export function shortId(id: string | null | undefined): string {
  if (!id) return '—'
  return id.length > 10 ? `${id.slice(0, 8)}…` : id
}

/** Prefer display name; avoid prominent raw UUIDs. */
export function resolveAuthorLabel(
  displayName: string | null | undefined,
  id: string | null | undefined,
  selfId: string | null | undefined,
  selfName: string | null | undefined,
  fallback: string,
): string {
  if (displayName?.trim()) return displayName.trim()
  if (id && selfId && id === selfId && selfName?.trim()) return selfName.trim()
  if (id) return shortId(id)
  return fallback
}
