import { describe, expect, it } from 'vitest'
import {
  averageBasketMinorFromCompletedOrders,
  buildReportCsv,
  describeReportCsvScope,
  reportCsvFilename,
  reportDataMatchesWindow,
} from './reportExport'

describe('reportExport', () => {
  it('flattens aggregate metrics and labels scope', () => {
    const data = {
      window: {
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-10-01T00:00:00.000Z',
        interval: '[from, to)',
      },
      ordersCreatedCount: 10,
      ordersCancelledCount: 3,
      ordersCreatedByStatus: { CANCELLED: 3, ACTIVE: 7 },
    }
    const scope = describeReportCsvScope(data)
    expect(scope.kind).toBe('aggregate')
    expect(scope.exportedRowCount).toBe(0)
    expect(scope.serverTotal).toBeNull()

    const csv = buildReportCsv({
      reportId: 'orders',
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-10-01T00:00:00.000Z',
      data,
      expectedWindow: {
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-10-01T00:00:00.000Z',
      },
    })
    expect(csv).toContain('scope=aggregate')
    expect(csv).toContain('money=minor-unit-decimal-strings')
    expect(csv).toContain('ordersCreatedCount,10')
    expect(csv).toContain('ordersCreatedByStatus.CANCELLED,3')
    expect(csv).toContain('ordersCreatedByStatus.ACTIVE,7')
  })

  it('exports current page with exportedRowCount separate from serverTotal', () => {
    const data = {
      items: [
        {
          merchantId: 'm1',
          completedOrderCount: 2,
          grossMerchandiseMinor: '1000',
        },
        {
          merchantId: 'm,2',
          completedOrderCount: 1,
          grossMerchandiseMinor: '500',
        },
      ],
      total: 99,
      limit: 20,
      offset: 0,
    }
    const scope = describeReportCsvScope(data, {
      total: 99,
      limit: 20,
      offset: 0,
    })
    expect(scope.kind).toBe('current-page')
    expect(scope.exportedRowCount).toBe(2)
    expect(scope.serverTotal).toBe(99)

    const csv = buildReportCsv({
      reportId: 'merchants',
      from: 'a',
      to: 'b',
      data,
      pageMeta: { total: 99, limit: 20, offset: 0 },
    })
    expect(csv).toContain('exportedRowCount=2')
    expect(csv).toContain('serverTotal=99')
    expect(csv).toContain('exportedRowCount is NOT serverTotal')
    expect(csv).toContain('merchantId')
    expect(csv).toContain('"m,2"')
  })

  it('rejects stale window payloads', () => {
    expect(() =>
      buildReportCsv({
        reportId: 'orders',
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-02-01T00:00:00.000Z',
        data: {
          window: {
            from: '2026-09-01T00:00:00.000Z',
            to: '2026-10-01T00:00:00.000Z',
          },
          ordersCreatedCount: 1,
        },
        expectedWindow: {
          from: '2026-01-01T00:00:00.000Z',
          to: '2026-02-01T00:00:00.000Z',
        },
      }),
    ).toThrow('STALE_REPORT_WINDOW')
  })

  it('matches windows across Backend formatting', () => {
    expect(
      reportDataMatchesWindow(
        {
          window: {
            from: '2026-09-01 00:00:00+00',
            to: '2026-10-01 00:00:00+00',
          },
        },
        '2026-09-01T00:00:00.000Z',
        '2026-10-01T00:00:00.000Z',
      ),
    ).toBe(true)
  })

  it('derives average basket only from completed-orders cohort fields', () => {
    expect(
      averageBasketMinorFromCompletedOrders({
        completedOrderCount: 2,
        grossMerchandiseMinor: '120000',
      }),
    ).toBe('60000')
    expect(
      averageBasketMinorFromCompletedOrders({
        completedOrderCount: 0,
        grossMerchandiseMinor: '120000',
      }),
    ).toBeNull()
  })

  it('builds a safe filename', () => {
    expect(
      reportCsvFilename(
        'orders',
        '2026-01-01T00:00:00.000Z',
        '2026-02-01T00:00:00.000Z',
      ),
    ).toMatch(/^speedygo-report-orders_/)
  })
})
