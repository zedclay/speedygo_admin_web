/**
 * Formats API money for display.
 * Accepts legacy minor digit-strings ("65000") OR new DZD decimals ("650.00").
 * Never uses floating-point for authoritative math.
 */
export function formatDzdFromMinor(
  minor: string | number | bigint | null | undefined,
): string {
  if (minor === null || minor === undefined || minor === '') {
    return '—'
  }
  let value: bigint
  try {
    if (typeof minor === 'bigint') {
      value = minor
    } else if (typeof minor === 'number') {
      if (!Number.isSafeInteger(minor)) return '—'
      value = BigInt(minor)
    } else {
      const raw = String(minor).trim()
      if (/^-?\d+\.\d{1,2}$/.test(raw)) {
        const neg = raw.startsWith('-')
        const body = neg ? raw.slice(1) : raw
        const [w, f = ''] = body.split('.')
        value = BigInt(w) * 100n + BigInt(f.padEnd(2, '0'))
        if (neg) value = -value
      } else {
        value = BigInt(raw)
      }
    }
  } catch {
    return '—'
  }
  const negative = value < 0n
  const abs = negative ? -value : value
  const whole = abs / 100n
  const frac = abs % 100n
  const wholeFormatted = whole
    .toString(10)
    .replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')
  const sign = negative ? '-' : ''
  return `${sign}${wholeFormatted},${frac.toString(10).padStart(2, '0')} DZD`
}

/** Parse Admin money field: DZD majors ("650" / "650.00") → centimes int. */
export function parseDzdInputToMinorInt(raw: string): number | null {
  const cleaned = raw.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const [w, f = ''] = cleaned.split('.')
  if (f.length > 2) return null
  const n = Number(w) * 100 + Number(f.padEnd(2, '0') || '0')
  if (!Number.isSafeInteger(n) || n < 0) return null
  return n
}

/** @deprecated Prefer parseDzdInputToMinorInt */
export function parseMinorInputToInt(digits: string): number | null {
  return parseDzdInputToMinorInt(digits)
}

/** Serialize integer centimes as dzd-v2 "650.00". */
export function formatCentimesAsDzdV2(
  centimes: number | bigint | string,
): string {
  const n =
    typeof centimes === 'bigint'
      ? centimes
      : typeof centimes === 'number'
        ? BigInt(centimes)
        : BigInt(centimes)
  const neg = n < 0n
  const abs = neg ? -n : n
  const body = `${abs / 100n}.${(abs % 100n).toString(10).padStart(2, '0')}`
  return neg ? `-${body}` : body
}
