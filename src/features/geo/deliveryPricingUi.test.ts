import { describe, expect, it } from 'vitest'
import { dzdMajorsToMinor, speedyGoShareMinor } from './deliveryPricingUi'

describe('speedyGoShareMinor', () => {
  it('matches Backend fee − driver derivation', () => {
    expect(speedyGoShareMinor('20000', '15000')).toBe(5000n)
    expect(speedyGoShareMinor('20000.00', '15000')).toBe(5000n)
  })

  it('returns null when inputs are missing', () => {
    expect(speedyGoShareMinor(null, '1')).toBeNull()
    expect(speedyGoShareMinor('1', undefined)).toBeNull()
  })
})

describe('dzdMajorsToMinor', () => {
  it('converts whole dinars to minor units', () => {
    expect(dzdMajorsToMinor('200')).toBe(20000)
    expect(dzdMajorsToMinor('0')).toBe(0)
  })

  it('rejects empty input', () => {
    expect(dzdMajorsToMinor('')).toBeNull()
  })
})
