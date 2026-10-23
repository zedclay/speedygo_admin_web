import { describe, expect, it } from 'vitest'
import {
  canLoadSection,
  completionRatioPercent,
  parseCodFinanceReport,
  parseOrdersOpsReport,
  relativeAgeLabel,
  todayUtcWindowIso,
} from './dashboardModel'

describe('dashboardModel', () => {
  it('gates sections by permission', () => {
    expect(canLoadSection(['orders.read'], 'orders')).toBe(true)
    expect(canLoadSection(['orders.read'], 'cod')).toBe(false)
    expect(canLoadSection(undefined, 'orders')).toBe(false)
  })

  it('limits merchant-only admins to merchant sections', () => {
    const limited = ['merchants.read', 'merchants.verify'] as const
    expect(canLoadSection(limited, 'merchants')).toBe(true)
    expect(canLoadSection(limited, 'orders')).toBe(false)
    expect(canLoadSection(limited, 'drivers')).toBe(false)
    expect(canLoadSection(limited, 'cod')).toBe(false)
    expect(canLoadSection(limited, 'support')).toBe(false)
    expect(canLoadSection(limited, 'reportsOps')).toBe(false)
    expect(canLoadSection(limited, 'reportsFinance')).toBe(false)
  })

  it('builds today UTC window without inventing local offsets in ISO date', () => {
    const now = new Date('2026-10-16T11:30:00.000Z')
    const w = todayUtcWindowIso(now)
    expect(w.from).toBe('2026-10-16T00:00:00.000Z')
    expect(w.to).toBe('2026-10-16T11:30:00.000Z')
  })

  it('parses orders ops report fields', () => {
    const s = parseOrdersOpsReport({
      ordersCreatedCount: 77,
      ordersCompletedCount: 1,
      ordersCancelledCount: 47,
      ordersFailedCount: 0,
      ordersCreatedByStatus: { ACTIVE: 1, CONFIRMED: 28 },
    })
    expect(s.created).toBe(77)
    expect(s.completed).toBe(1)
    expect(s.cancelled).toBe(47)
    expect(s.activeInByStatus).toBe(1)
  })

  it('parses COD finance minors as strings', () => {
    const s = parseCodFinanceReport({
      codCollectedDuringPeriodMinor: '140000',
      codOutstandingCustodyAsOfToMinor: '140000',
      codDiscrepancyCreatedDuringPeriodCount: 0,
    })
    expect(s.collectedMinor).toBe('140000')
    expect(s.discrepancyCount).toBe(0)
  })

  it('computes completion ratio only with valid denominator', () => {
    expect(completionRatioPercent(94, 6)).toBe(94)
    expect(completionRatioPercent(0, 0)).toBeNull()
    expect(completionRatioPercent(null, 1)).toBeNull()
  })

  it('formats relative ages', () => {
    const now = Date.parse('2026-10-16T12:00:00.000Z')
    expect(relativeAgeLabel('2026-10-16T11:48:00.000Z', now)).toBe('12 min')
  })
})
