import { describe, expect, it } from 'vitest'
import {
  datetimeLocalToIso,
  defaultReportWindow,
  isReportWindowWithinMax,
  isValidReportWindow,
  isoToDatetimeLocal,
} from './reportWindow'

describe('reportWindow', () => {
  it('builds a half-open window with from < to', () => {
    const w = defaultReportWindow(7)
    expect(isValidReportWindow(w.from, w.to)).toBe(true)
    expect(new Date(w.to).getTime() - new Date(w.from).getTime()).toBeGreaterThan(
      6 * 24 * 60 * 60 * 1000,
    )
  })

  it('round-trips datetime-local for a fixed ISO', () => {
    const iso = '2026-10-01T12:30:00.000Z'
    const local = isoToDatetimeLocal(iso)
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    const back = datetimeLocalToIso(local)
    expect(back).toBeTruthy()
    expect(Math.abs(new Date(back!).getTime() - new Date(iso).getTime())).toBeLessThan(
      60_000,
    )
  })

  it('rejects inverted and equal bounds ([from,to) requires from < to)', () => {
    expect(
      isValidReportWindow('2026-10-10T00:00:00.000Z', '2026-10-01T00:00:00.000Z'),
    ).toBe(false)
    expect(
      isValidReportWindow('2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'),
    ).toBe(false)
  })

  it('flags windows beyond Backend 93-day max', () => {
    expect(
      isReportWindowWithinMax(
        '2020-01-01T00:00:00.000Z',
        '2026-01-01T00:00:00.000Z',
      ),
    ).toBe(false)
    expect(
      isReportWindowWithinMax(
        '2026-01-01T00:00:00.000Z',
        '2026-02-01T00:00:00.000Z',
      ),
    ).toBe(true)
  })
})
