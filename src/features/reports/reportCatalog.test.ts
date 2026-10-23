import { describe, expect, it } from 'vitest'
import {
  PRIMARY_REPORT_VIEWS,
  REPORT_VIEWS,
} from './reportCatalog'

describe('reportCatalog', () => {
  it('maps primary Stitch surfaces without A072p', () => {
    expect(PRIMARY_REPORT_VIEWS).toContain('hub')
    expect(PRIMARY_REPORT_VIEWS).toContain('orders')
    expect(PRIMARY_REPORT_VIEWS).toContain('revenue')
    expect(PRIMARY_REPORT_VIEWS).toContain('customers')
    expect(PRIMARY_REPORT_VIEWS).toContain('export')
    for (const id of PRIMARY_REPORT_VIEWS) {
      for (const ref of REPORT_VIEWS[id].stitchRefs) {
        expect(ref).not.toBe('a_072p')
      }
    }
  })

  it('blocks customer aggregates and export history at the catalog layer', () => {
    expect(REPORT_VIEWS.customers.family).toBe('none')
    expect(REPORT_VIEWS.customers.apiPath).toBeUndefined()
    expect(REPORT_VIEWS.export.family).toBe('none')
    expect(REPORT_VIEWS.export.blockedKey).toBe('reportExportHistoryBlocked')
  })

  it('keeps revenue metrics as distinct OFS fields', () => {
    const keys = REPORT_VIEWS.revenue.metrics!.map((m) => m.key)
    expect(keys).toContain('grossMerchandiseMinor')
    expect(keys).toContain('merchantCommissionMinor')
    expect(keys).toContain('merchantNetMinor')
    expect(keys).toContain('customerDeliveryFeeMinor')
    expect(keys).toContain('driverRemunerationMinor')
    expect(keys).not.toContain('revenueTotalMinor')
  })
})
