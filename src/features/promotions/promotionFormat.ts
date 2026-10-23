import { formatDzdFromMinor } from '../../lib/money'
import type { MessageKey } from '../../lib/i18n/messages'

export const PROMO_TYPES = [
  'SPEEDYGO_FIXED_MINOR',
  'MERCHANT_FIXED_MINOR',
  'SPEEDYGO_RATE_BPS',
  'MERCHANT_RATE_BPS',
] as const

export type PromoType = (typeof PROMO_TYPES)[number]

export function isRatePromo(type: string): boolean {
  return type.includes('RATE_BPS')
}

export function promoTypeLabelKey(type: string): MessageKey {
  switch (type) {
    case 'SPEEDYGO_FIXED_MINOR':
      return 'promoTypeFixedSpeedyGo'
    case 'MERCHANT_FIXED_MINOR':
      return 'promoTypeFixedMerchant'
    case 'SPEEDYGO_RATE_BPS':
      return 'promoTypeRateSpeedyGo'
    case 'MERCHANT_RATE_BPS':
      return 'promoTypeRateMerchant'
    default:
      return 'type'
  }
}

/** Material icon name for promotion type (existing Icon system). */
export function promoTypeIcon(type: string): string {
  if (isRatePromo(type)) return 'percent'
  return 'payments'
}

/** Format stored promotion value for display (minor units, DZD majors, or BPS). */
export function formatPromoValue(type: string, value: number | string): string {
  if (isRatePromo(type)) {
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(n)) return String(value)
    const pct = (n / 100).toFixed(n % 100 === 0 ? 0 : 2)
    return `${n} bps (${pct} %)`
  }
  return formatDzdFromMinor(value)
}

export type PromoLifecycle = 'active' | 'inactive' | 'scheduled' | 'expired'

/**
 * Derived presentation status — not a Backend enum.
 * `active` flag ∧ window determines effective offer; schedule/expired are UI labels.
 */
export function promoLifecycle(
  p: { active: boolean; startsAt: string; endsAt: string },
  now = new Date(),
): PromoLifecycle {
  const start = new Date(p.startsAt).getTime()
  const end = new Date(p.endsAt).getTime()
  const t = now.getTime()
  if (t >= end) return 'expired'
  if (!p.active) return 'inactive'
  if (t < start) return 'scheduled'
  return 'active'
}

export function promoLifecycleLabelKey(status: PromoLifecycle): MessageKey {
  switch (status) {
    case 'active':
      return 'active'
    case 'inactive':
      return 'inactive'
    case 'scheduled':
      return 'promoStatusScheduled'
    case 'expired':
      return 'promoStatusExpired'
  }
}

export function defaultPromoWindow(): { startsAt: string; endsAt: string } {
  const startsAt = new Date()
  const endsAt = new Date(startsAt.getTime() + 30 * 24 * 60 * 60 * 1000)
  return { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() }
}

/** datetime-local value from ISO */
export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromDatetimeLocalValue(local: string): string | null {
  if (!local) return null
  const d = new Date(local)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}
