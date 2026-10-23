import { describe, expect, it } from 'vitest'
import {
  formatPromoValue,
  promoLifecycle,
  isRatePromo,
} from './promotionFormat'

describe('promotionFormat', () => {
  it('detects rate types', () => {
    expect(isRatePromo('SPEEDYGO_RATE_BPS')).toBe(true)
    expect(isRatePromo('SPEEDYGO_FIXED_MINOR')).toBe(false)
  })

  it('formats fixed minor as DZD', () => {
    expect(formatPromoValue('SPEEDYGO_FIXED_MINOR', 50000)).toContain('DZD')
    expect(formatPromoValue('SPEEDYGO_FIXED_MINOR', '250.00')).toContain('250')
  })

  it('formats rate as bps', () => {
    expect(formatPromoValue('MERCHANT_RATE_BPS', 1000)).toContain('bps')
  })

  it('derives lifecycle from active + window', () => {
    const now = new Date('2026-10-17T12:00:00.000Z')
    expect(
      promoLifecycle(
        {
          active: true,
          startsAt: '2026-10-01T00:00:00.000Z',
          endsAt: '2026-11-01T00:00:00.000Z',
        },
        now,
      ),
    ).toBe('active')
    expect(
      promoLifecycle(
        {
          active: true,
          startsAt: '2026-11-01T00:00:00.000Z',
          endsAt: '2026-12-01T00:00:00.000Z',
        },
        now,
      ),
    ).toBe('scheduled')
    expect(
      promoLifecycle(
        {
          active: true,
          startsAt: '2026-08-01T00:00:00.000Z',
          endsAt: '2026-09-01T00:00:00.000Z',
        },
        now,
      ),
    ).toBe('expired')
    expect(
      promoLifecycle(
        {
          active: false,
          startsAt: '2026-10-01T00:00:00.000Z',
          endsAt: '2026-11-01T00:00:00.000Z',
        },
        now,
      ),
    ).toBe('inactive')
  })
})
