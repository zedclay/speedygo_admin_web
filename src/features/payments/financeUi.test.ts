import { describe, expect, it } from 'vitest'
import {
  financeStatusLabel,
  financeStatusTone,
  remittanceRemainderMinor,
} from './financeUi'

describe('remittanceRemainderMinor', () => {
  it('subtracts confirmed from submitted in minor units', () => {
    expect(remittanceRemainderMinor('10000', '4000')).toBe('6000')
    expect(remittanceRemainderMinor('10000', null)).toBe('10000')
    expect(remittanceRemainderMinor('10000', '10000')).toBe('0')
  })

  it('returns null for invalid or negative remainder', () => {
    expect(remittanceRemainderMinor('abc', '1')).toBeNull()
    expect(remittanceRemainderMinor('100', '200')).toBeNull()
  })
})

describe('financeStatusLabel', () => {
  it('maps known finance codes via i18n keys', () => {
    const t = (key: string) => `L:${key}`
    expect(financeStatusLabel('CONFIRMED', t as never)).toBe('L:statusConfirmed')
    expect(financeStatusLabel('RECONCILED', t as never)).toBe('L:statusReconciled')
    expect(financeStatusLabel('UNKNOWN_X', t as never)).toBe('UNKNOWN_X')
  })

  it('tones reconciliation and refund statuses', () => {
    expect(financeStatusTone('RECONCILED')).toBe('success')
    expect(financeStatusTone('OUTSTANDING')).toBe('warning')
    expect(financeStatusTone('DISCREPANCY')).toBe('error')
  })
})
