/** Server-bound period presets for Admin order list (filters before pagination). */
export type OrderPeriodPreset = 'all' | 'today' | '7d' | '30d'

export function orderPeriodBounds(
  preset: OrderPeriodPreset,
  now = new Date(),
): { createdFrom?: string; createdTo?: string } {
  if (preset === 'all') return {}
  const end = new Date(now)
  const start = new Date(now)
  if (preset === 'today') {
    start.setHours(0, 0, 0, 0)
  } else if (preset === '7d') {
    start.setTime(end.getTime() - 7 * 24 * 60 * 60 * 1000)
  } else {
    start.setTime(end.getTime() - 30 * 24 * 60 * 60 * 1000)
  }
  return {
    createdFrom: start.toISOString(),
    createdTo: end.toISOString(),
  }
}
