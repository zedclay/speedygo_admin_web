import { isRecord } from './reportCatalog'

/**
 * Client-side CSV of the **already-loaded** report payload for the applied window.
 * Not a Backend export job. Not persisted history.
 *
 * Money columns remain Backend minor-unit decimal strings (no float conversion).
 * Paginated lists export only the current page; `exportedRowCount` ≠ `serverTotal`.
 */

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function flattenValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value
  if (isRecord(value)) return JSON.stringify(value)
  return String(value)
}

export type ReportCsvPageMeta = {
  total: number
  limit: number
  offset: number
}

export type ReportCsvInput = {
  reportId: string
  from: string
  to: string
  data: unknown
  /** When exporting a paginated list page */
  pageMeta?: ReportCsvPageMeta
  /** Must match response window when present — reject stale payloads upstream */
  expectedWindow?: { from: string; to: string }
}

export type ReportCsvScope =
  | {
      kind: 'aggregate'
      label: string
      exportedRowCount: number
      serverTotal: null
    }
  | {
      kind: 'current-page'
      label: string
      exportedRowCount: number
      serverTotal: number
      offset: number
      limit: number
    }

export function describeReportCsvScope(
  data: unknown,
  pageMeta?: ReportCsvPageMeta,
): ReportCsvScope {
  if (isRecord(data) && Array.isArray(data.items)) {
    const exportedRowCount = data.items.length
    const total =
      pageMeta?.total ??
      (typeof data.total === 'number' ? data.total : exportedRowCount)
    const offset =
      pageMeta?.offset ?? (typeof data.offset === 'number' ? data.offset : 0)
    const limit =
      pageMeta?.limit ?? (typeof data.limit === 'number' ? data.limit : exportedRowCount)
    return {
      kind: 'current-page',
      label: `current-page-only exportedRowCount=${exportedRowCount} serverTotal=${total} offset=${offset} limit=${limit}`,
      exportedRowCount,
      serverTotal: total,
      offset,
      limit,
    }
  }
  const keys =
    isRecord(data) ?
      Object.keys(data).filter((k) => k !== 'window').length
    : 0
  return {
    kind: 'aggregate',
    label: `aggregate-snapshot metricKeys≈${keys} (not a row list)`,
    exportedRowCount: 0,
    serverTotal: null,
  }
}

/** True when payload window matches the applied filter (stale guard). */
export function reportDataMatchesWindow(
  data: unknown,
  from: string,
  to: string,
): boolean {
  if (!isRecord(data)) return true
  const w = data.window
  if (!isRecord(w)) return true
  const wf = typeof w.from === 'string' ? w.from : null
  const wt = typeof w.to === 'string' ? w.to : null
  if (!wf || !wt) return true
  // Compare as instants — Backend may format with space vs T
  return Date.parse(wf) === Date.parse(from) && Date.parse(wt) === Date.parse(to)
}

export function buildReportCsv(input: ReportCsvInput): string {
  if (
    input.expectedWindow &&
    !reportDataMatchesWindow(
      input.data,
      input.expectedWindow.from,
      input.expectedWindow.to,
    )
  ) {
    throw new Error('STALE_REPORT_WINDOW')
  }

  const scope = describeReportCsvScope(input.data, input.pageMeta)
  const lines: string[] = []
  lines.push(
    [
      '# SpeedyGo Admin report snapshot',
      `report=${input.reportId}`,
      `from=${input.from}`,
      `to=${input.to}`,
      'interval=[from,to)',
      'timezone=UTC_INSTANTS',
      'source=client-snapshot-of-loaded-authorized-response',
      'not=server-export-job',
      'not=persisted-history',
      `scope=${scope.kind}`,
      `dataset=${scope.label}`,
      'money=minor-unit-decimal-strings',
    ].join(' '),
  )

  if (!isRecord(input.data)) {
    lines.push('key,value')
    lines.push(`payload,${csvEscape(flattenValue(input.data))}`)
    return lines.join('\n') + '\n'
  }

  const items = input.data.items
  if (Array.isArray(items)) {
    lines.push(
      `# exportedRowCount=${scope.exportedRowCount} serverTotal=${scope.kind === 'current-page' ? scope.serverTotal : 'n/a'} (exportedRowCount is NOT serverTotal)`,
    )
    if (items.length === 0) {
      lines.push('key,value')
      lines.push('items,(empty page)')
      return lines.join('\n') + '\n'
    }
    const keys = Object.keys(items[0] as object)
    lines.push(keys.map(csvEscape).join(','))
    for (const row of items) {
      if (!isRecord(row)) continue
      lines.push(keys.map((k) => csvEscape(flattenValue(row[k]))).join(','))
    }
    return lines.join('\n') + '\n'
  }

  lines.push('key,value')
  for (const [key, value] of Object.entries(input.data)) {
    if (key === 'window' && isRecord(value)) {
      for (const [wk, wv] of Object.entries(value)) {
        lines.push(`window.${wk},${csvEscape(flattenValue(wv))}`)
      }
      continue
    }
    if (isRecord(value) && !Array.isArray(value)) {
      for (const [sk, sv] of Object.entries(value)) {
        lines.push(`${key}.${sk},${csvEscape(flattenValue(sv))}`)
      }
      continue
    }
    lines.push(`${csvEscape(key)},${csvEscape(flattenValue(value))}`)
  }
  return lines.join('\n') + '\n'
}

export function downloadCsvFile(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function reportCsvFilename(reportId: string, from: string, to: string): string {
  const safe = (s: string) => s.replace(/[:.]/g, '-').slice(0, 24)
  return `speedygo-report-${reportId}_${safe(from)}_${safe(to)}.csv`
}

/**
 * Average basket from completed-orders OFS cohort only:
 * grossMerchandiseMinor / completedOrderCount (integer minor ÷ count).
 * Returns null when count is 0 or fields missing — never invents growth.
 */
export function averageBasketMinorFromCompletedOrders(data: unknown): string | null {
  if (!isRecord(data)) return null
  const count = data.completedOrderCount
  const gms = data.grossMerchandiseMinor
  if (typeof count !== 'number' || count <= 0) return null
  if (gms === null || gms === undefined) return null
  try {
    const minor = BigInt(String(gms).split('.')[0] ?? gms)
    return String(minor / BigInt(count))
  } catch {
    return null
  }
}
