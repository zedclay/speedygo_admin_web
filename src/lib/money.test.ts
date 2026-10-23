import { describe, expect, it } from 'vitest'
import { formatDzdFromMinor, parseMinorInputToInt } from './money'

describe('formatDzdFromMinor', () => {
  it('formats integer minor units without float math', () => {
    expect(formatDzdFromMinor('140000')).toBe('1\u00a0400,00 DZD')
    expect(formatDzdFromMinor(0)).toBe('0,00 DZD')
    expect(formatDzdFromMinor('99')).toBe('0,99 DZD')
  })

  it('rejects unsafe float conversion path by accepting only integer strings', () => {
    expect(formatDzdFromMinor('abc')).toBe('—')
    expect(formatDzdFromMinor(null)).toBe('—')
  })
})

describe('parseMinorInputToInt', () => {
  it('parses DZD majors to centimes', () => {
    expect(parseMinorInputToInt('1400')).toBe(140000)
    expect(parseMinorInputToInt('14.00')).toBe(1400)
    expect(parseMinorInputToInt('14,00')).toBe(1400)
    expect(parseMinorInputToInt('')).toBeNull()
  })
})
