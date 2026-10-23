import { describe, expect, it } from 'vitest'
import { orderPeriodBounds } from './orderPeriod'

describe('orderPeriodBounds', () => {
  it('returns empty bounds for all', () => {
    expect(orderPeriodBounds('all')).toEqual({})
  })

  it('uses local midnight start through now for today', () => {
    const now = new Date('2026-10-17T15:00:00.000Z')
    const bounds = orderPeriodBounds('today', now)
    expect(bounds.createdFrom).toBeDefined()
    expect(bounds.createdTo).toBe(now.toISOString())
    const start = new Date(bounds.createdFrom!)
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(start.getSeconds()).toBe(0)
  })

  it('spans ~7 days for 7d preset', () => {
    const now = new Date('2026-10-17T12:00:00.000Z')
    const bounds = orderPeriodBounds('7d', now)
    const ms =
      new Date(bounds.createdTo!).getTime() -
      new Date(bounds.createdFrom!).getTime()
    expect(ms).toBe(7 * 24 * 60 * 60 * 1000)
  })
})
