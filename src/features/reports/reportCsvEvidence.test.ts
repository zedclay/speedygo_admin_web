import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  averageBasketMinorFromCompletedOrders,
  buildReportCsv,
  describeReportCsvScope,
} from './reportExport'

const EV = path.resolve(
  __dirname,
  '../../../docs/evidence/api/mutations',
)

describe('report CSV live evidence (when sources present)', () => {
  it('writes and inspects downloaded CSV artifacts from live JSON sources', () => {
    const ordersPath = path.join(EV, 'reports_csv_source_orders.json')
    const finPath = path.join(EV, 'reports_csv_source_completed_orders.json')
    const merPath = path.join(EV, 'reports_csv_source_merchants_page.json')
    if (![ordersPath, finPath, merPath].every((p) => existsSync(p))) {
      // Sources produced by verification shell; skip if absent in CI/offline.
      expect(true).toBe(true)
      return
    }

    const orders = JSON.parse(readFileSync(ordersPath, 'utf8'))
    const fin = JSON.parse(readFileSync(finPath, 'utf8'))
    const mer = JSON.parse(readFileSync(merPath, 'utf8'))

    const ordersCsv = buildReportCsv({
      reportId: 'orders',
      from: orders.window.from,
      to: orders.window.to,
      data: orders,
      expectedWindow: { from: orders.window.from, to: orders.window.to },
    })
    writeFileSync(path.join(EV, 'reports_csv_downloaded_orders.csv'), ordersCsv)

    const finCsv = buildReportCsv({
      reportId: 'revenue',
      from: fin.window.from,
      to: fin.window.to,
      data: fin,
      expectedWindow: { from: fin.window.from, to: fin.window.to },
    })
    writeFileSync(
      path.join(EV, 'reports_csv_downloaded_completed_orders.csv'),
      finCsv,
    )

    const pageMeta = {
      total: mer.total,
      limit: mer.limit,
      offset: mer.offset,
    }
    const merCsv = buildReportCsv({
      reportId: 'merchants',
      from: mer.window.from,
      to: mer.window.to,
      data: mer,
      pageMeta,
      expectedWindow: { from: mer.window.from, to: mer.window.to },
    })
    writeFileSync(
      path.join(EV, 'reports_csv_downloaded_merchants_page.csv'),
      merCsv,
    )

    const scope = describeReportCsvScope(mer, pageMeta)
    const basket = averageBasketMinorFromCompletedOrders(fin)
    let staleRejected = false
    try {
      buildReportCsv({
        reportId: 'orders',
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-02-01T00:00:00.000Z',
        data: orders,
        expectedWindow: {
          from: '2026-01-01T00:00:00.000Z',
          to: '2026-02-01T00:00:00.000Z',
        },
      })
    } catch {
      staleRejected = true
    }

    const inspection = {
      orders: {
        header: ordersCsv.split('\n')[0],
        scope: describeReportCsvScope(orders).kind,
        containsCreated: ordersCsv.includes(
          `ordersCreatedCount,${orders.ordersCreatedCount}`,
        ),
        moneyNote: ordersCsv.includes('money=minor-unit-decimal-strings'),
      },
      revenue: {
        gmsInCsv: finCsv.includes(
          `grossMerchandiseMinor,${fin.grossMerchandiseMinor}`,
        ),
        averageBasketMinor: basket,
        averageBasketFormulaOk:
          basket ===
          String(
            BigInt(String(fin.grossMerchandiseMinor).split('.')[0]) /
              BigInt(fin.completedOrderCount),
          ),
      },
      merchantsPage: {
        scope,
        metaLine: merCsv.split('\n').find((l) => l.startsWith('# exportedRowCount')),
        dataHeader: merCsv.split('\n').find((l) => l.startsWith('merchantId')),
        exportedRowCount: scope.exportedRowCount,
        serverTotal: scope.kind === 'current-page' ? scope.serverTotal : null,
        displayedItems: mer.items.length,
      },
      staleRejected,
    }
    writeFileSync(
      path.join(EV, 'reports_csv_inspection.json'),
      JSON.stringify(inspection, null, 2) + '\n',
    )

    expect(inspection.orders.containsCreated).toBe(true)
    expect(inspection.orders.moneyNote).toBe(true)
    expect(inspection.revenue.gmsInCsv).toBe(true)
    expect(inspection.revenue.averageBasketFormulaOk).toBe(true)
    expect(inspection.merchantsPage.exportedRowCount).toBe(mer.items.length)
    expect(inspection.staleRejected).toBe(true)
  })
})
