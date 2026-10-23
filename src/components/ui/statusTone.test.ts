import { describe, expect, it } from 'vitest'
import { statusTone } from './Badge'

describe('statusTone', () => {
  it('does not treat INACTIVE as ACTIVE', () => {
    expect(statusTone('INACTIVE')).toBe('neutral')
    expect(statusTone('inactive')).toBe('neutral')
  })

  it('maps ACTIVE and COMPLETED to success', () => {
    expect(statusTone('ACTIVE')).toBe('success')
    expect(statusTone('COMPLETED')).toBe('success')
  })

  it('maps OPEN / WAITING_CUSTOMER to warning', () => {
    expect(statusTone('OPEN')).toBe('warning')
    expect(statusTone('WAITING_CUSTOMER')).toBe('warning')
  })

  it('maps EXPIRED to neutral', () => {
    expect(statusTone('EXPIRED')).toBe('neutral')
  })
})
