import type { MessageKey } from '../../lib/i18n/messages'

/** SpeedyGo share = customer fee − driver pay (same derivation as OFS; display only). */
export function speedyGoShareMinor(
  customerFeeMinor: string | number | null | undefined,
  driverPayMinor: string | number | null | undefined,
): bigint | null {
  try {
    if (customerFeeMinor === null || customerFeeMinor === undefined) return null
    if (driverPayMinor === null || driverPayMinor === undefined) return null
    const fee = BigInt(String(customerFeeMinor).split('.')[0] ?? customerFeeMinor)
    const driver = BigInt(String(driverPayMinor).split('.')[0] ?? driverPayMinor)
    return fee - driver
  } catch {
    return null
  }
}

/** Whole DZD majors → minor units (exact for integer dinars). */
export function dzdMajorsToMinor(majorsDigits: string): number | null {
  const cleaned = majorsDigits.replace(/[^\d]/g, '')
  if (!cleaned) return null
  const majors = Number(cleaned)
  if (!Number.isSafeInteger(majors) || majors < 0) return null
  const minor = majors * 100
  if (!Number.isSafeInteger(minor) || minor > 2_147_483_647) return null
  return minor
}

export function timeBandLabelKey(band: string): MessageKey {
  switch (band) {
    case 'DAY':
      return 'pricingTimeBandDay'
    case 'NIGHT':
      return 'pricingTimeBandNight'
    case 'CUSTOM':
      return 'pricingTimeBandCustom'
    default:
      return 'type'
  }
}

/** Isolated GeoJSON polygon for Admin-created evidence zones (far from DZ ops polygons). */
export const ISOLATED_EVIDENCE_POLYGON = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [12.0, 24.0],
      [12.05, 24.0],
      [12.05, 24.05],
      [12.0, 24.05],
      [12.0, 24.0],
    ],
  ],
}
