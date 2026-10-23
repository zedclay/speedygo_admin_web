import type { ReactNode } from 'react'

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'error' | 'info'
type Tone = BadgeTone

const toneClass: Record<Tone, string> = {
  neutral: '',
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
  info: 'badge-info',
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: Tone
}) {
  return <span className={`badge ${toneClass[tone]}`.trim()}>{children}</span>
}

/**
 * Map status strings to badge tones.
 * Check INACTIVE/EXPIRED before ACTIVE — `INACTIVE`.includes(`ACTIVE`) is true.
 */
export function statusTone(status: string): Tone {
  const s = status.toUpperCase()
  if (s.includes('INACTIVE') || s.includes('EXPIRED') || s.includes('DISABLED')) {
    return 'neutral'
  }
  if (
    [
      'ACTIVE',
      'APPROVED',
      'VERIFIED',
      'SUCCEEDED',
      'COMPLETED',
      'CONFIRMED',
      'COLLECTED',
      'RESOLVED',
      'CLOSED',
      'SUCCESS',
    ].some((x) => s.includes(x))
  ) {
    return 'success'
  }
  if (
    [
      'PENDING',
      'PROCESSING',
      'IN_PROGRESS',
      'WAITING',
      'SUBMITTED',
      'PENDING_REVIEW',
      'OPEN',
      'SCHEDULED',
    ].some((x) => s.includes(x))
  ) {
    return 'warning'
  }
  if (
    ['REJECTED', 'FAILED', 'CANCELLED', 'SUSPENDED', 'ERROR'].some((x) =>
      s.includes(x),
    )
  ) {
    return 'error'
  }
  return 'info'
}
