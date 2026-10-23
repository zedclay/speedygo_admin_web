import type { MessageKey } from '../../lib/i18n/messages'

const STATUS_LABEL: Record<string, MessageKey> = {
  CREATED: 'orderStatusCreated',
  CONFIRMED: 'orderStatusConfirmed',
  ACTIVE: 'orderStatusActive',
  COMPLETED: 'orderStatusCompleted',
  CANCELLED: 'orderStatusCancelled',
  FAILED: 'orderStatusFailed',
}

export function orderStatusLabelKey(status: string): MessageKey | null {
  return STATUS_LABEL[status] ?? null
}
