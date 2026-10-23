import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../lib/api/adminApi'
import { ApiError } from '../../lib/api/types'
import { formatDzdFromMinor } from '../../lib/money'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { EntityTabs } from '../../components/ui/EntityTabs'
import { UnavailablePanel } from '../../components/ui/UnavailablePanel'
import {
  LoadingState,
  EmptyState,
  ErrorState,
  ForbiddenState,
} from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { RefKpiCard, RefKpiGrid } from '../../components/ui/RefKpiCard'
import { Pagination } from '../../components/ui/Pagination'
import { Icon } from '../../components/ui/Icon'
import { PERMS, hasPermission } from '../../lib/permissions'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { useI18n } from '../../lib/i18n/I18nProvider'
import type { MessageKey } from '../../lib/i18n/messages'
import {
  MORE_FIN_VIEWS,
  MORE_OPS_VIEWS,
  PRIMARY_REPORT_VIEWS,
  REPORT_VIEWS,
  isRecord,
  type MetricDef,
  type ReportViewId,
} from './reportCatalog'
import {
  averageBasketMinorFromCompletedOrders,
  buildReportCsv,
  describeReportCsvScope,
  downloadCsvFile,
  reportCsvFilename,
  reportDataMatchesWindow,
} from './reportExport'
import {
  datetimeLocalToIso,
  defaultReportWindow,
  isoToDatetimeLocal,
  isReportWindowWithinMax,
  isValidReportWindow,
} from './reportWindow'

const PAGE_LIMIT = 20

function metricValue(
  data: Record<string, unknown>,
  metric: MetricDef,
  formatMoney: (v: string | number) => string,
  t: (k: MessageKey) => string,
): string {
  const raw = data[metric.key]
  if (raw === null || raw === undefined) return '—'
  if (metric.kind === 'money') {
    if (typeof raw === 'string' || typeof raw === 'number') {
      return formatMoney(raw)
    }
    return '—'
  }
  if (metric.kind === 'average') {
    if (typeof raw === 'number') return raw.toFixed(2)
    if (typeof raw === 'string') return raw
    return '—'
  }
  if (metric.kind === 'count') {
    return String(raw)
  }
  if (metric.kind === 'map') return t('reportBreakdown')
  return String(raw)
}

function MapBreakdown({
  title,
  value,
}: {
  title: string
  value: unknown
}) {
  if (!isRecord(value)) return null
  const entries = Object.entries(value)
  if (entries.length === 0) return <EmptyState />
  return (
    <div className="card card-body">
      <h3 style={{ margin: '0 0 12px' }}>{title}</h3>
      <table className="data">
        <thead>
          <tr>
            <th>Key</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([k, v]) => (
            <tr key={k}>
              <td>{k}</td>
              <td>{String(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ReportsHubPage() {
  const { t, locale } = useI18n()
  const permissions = useSessionStore((s) => s.me?.permissions)
  const canOps = hasPermission(permissions, PERMS.REPORTS_READ)
  const canFin = hasPermission(permissions, PERMS.REPORTS_FINANCE_READ)

  const [view, setView] = useState<ReportViewId>('hub')
  const [applied, setApplied] = useState(() => defaultReportWindow(30))
  const [fromLocal, setFromLocal] = useState(() =>
    isoToDatetimeLocal(defaultReportWindow(30).from),
  )
  const [toLocal, setToLocal] = useState(() =>
    isoToDatetimeLocal(defaultReportWindow(30).to),
  )
  const [windowError, setWindowError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [exportMsg, setExportMsg] = useState<string | null>(null)
  const [exportSource, setExportSource] = useState<ReportViewId>('orders')

  const def = REPORT_VIEWS[view]
  const exportDef = REPORT_VIEWS[exportSource]

  function permitted(id: ReportViewId): boolean {
    const d = REPORT_VIEWS[id]
    if (d.permission === 'none') return true
    if (d.permission === 'either') return canOps || canFin
    if (d.permission === 'reports.read') return canOps
    if (d.permission === 'reports.finance.read') return canFin
    return false
  }

  function applyWindow(next?: { from: string; to: string }) {
    const fromIso = next?.from ?? datetimeLocalToIso(fromLocal)
    const toIso = next?.to ?? datetimeLocalToIso(toLocal)
    if (!fromIso || !toIso || !isValidReportWindow(fromIso, toIso)) {
      setWindowError(t('reportWindowInvalid'))
      return
    }
    if (!isReportWindowWithinMax(fromIso, toIso)) {
      setWindowError(t('reportWindowTooLong'))
      return
    }
    setWindowError(null)
    setApplied({ from: fromIso, to: toIso })
    setFromLocal(isoToDatetimeLocal(fromIso))
    setToLocal(isoToDatetimeLocal(toIso))
    setOffset(0)
    setExportMsg(null)
  }

  function exportReady(
    data: unknown,
    fetching: boolean,
  ): { ok: true } | { ok: false; reason: MessageKey } {
    if (fetching) return { ok: false, reason: 'reportExportStaleLoading' }
    if (!data) return { ok: false, reason: 'reportClientExportNeedData' }
    if (!reportDataMatchesWindow(data, applied.from, applied.to)) {
      return { ok: false, reason: 'reportExportStaleLoading' }
    }
    return { ok: true }
  }

  function applyPreset(days: number) {
    const w = defaultReportWindow(days)
    setFromLocal(isoToDatetimeLocal(w.from))
    setToLocal(isoToDatetimeLocal(w.to))
    applyWindow(w)
  }

  const primaryTabs = useMemo(
    () =>
      PRIMARY_REPORT_VIEWS.map((id) => ({
        id,
        label: t(REPORT_VIEWS[id].labelKey),
        disabled: !permitted(id) && id !== 'customers' && id !== 'export',
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- permissions via canOps/canFin
    [canOps, canFin, t],
  )

  const moreReportOptions = useMemo(() => {
    const ops = MORE_OPS_VIEWS.map((id) => ({
      id,
      label: `${t('reportMoreOps')}: ${t(REPORT_VIEWS[id].labelKey)}`,
      disabled: !canOps,
    }))
    const fin = MORE_FIN_VIEWS.map((id) => ({
      id,
      label: `${t('reportMoreFin')}: ${t(REPORT_VIEWS[id].labelKey)}`,
      disabled: !canFin,
    }))
    return [...ops, ...fin]
  }, [canOps, canFin, t])

  const needsFetch =
    def.family !== 'none' &&
    Boolean(def.apiPath) &&
    permitted(view)

  const reportQ = useQuery({
    queryKey: [
      'reports',
      view,
      def.apiPath,
      applied.from,
      applied.to,
      offset,
      def.paginated,
    ],
    enabled: needsFetch,
    queryFn: async () => {
      const params: Record<string, string | undefined> = {
        from: applied.from,
        to: applied.to,
      }
      if (def.paginated) {
        params.limit = String(PAGE_LIMIT)
        params.offset = String(offset)
      }
      if (def.family === 'finance') {
        return adminApi.reportsFinance(def.apiPath!, params)
      }
      return adminApi.reportsOperations(def.apiPath!, params)
    },
    retry: false,
  })

  const hubOpsQ = useQuery({
    queryKey: ['reports', 'hub-ops', applied.from, applied.to],
    enabled: view === 'hub' && canOps,
    queryFn: () =>
      adminApi.reportsOperations('orders', {
        from: applied.from,
        to: applied.to,
      }),
    retry: false,
  })

  const hubFinQ = useQuery({
    queryKey: ['reports', 'hub-fin', applied.from, applied.to],
    enabled: view === 'hub' && canFin,
    queryFn: () =>
      adminApi.reportsFinance('completed-orders', {
        from: applied.from,
        to: applied.to,
      }),
    retry: false,
  })

  const exportQ = useQuery({
    queryKey: [
      'reports',
      'export-snap',
      exportSource,
      exportDef.apiPath,
      applied.from,
      applied.to,
    ],
    enabled:
      view === 'export' &&
      exportDef.family !== 'none' &&
      Boolean(exportDef.apiPath) &&
      permitted(exportSource),
    queryFn: async () => {
      const params: Record<string, string | undefined> = {
        from: applied.from,
        to: applied.to,
      }
      if (exportDef.paginated) {
        params.limit = String(PAGE_LIMIT)
        params.offset = '0'
      }
      if (exportDef.family === 'finance') {
        return adminApi.reportsFinance(exportDef.apiPath!, params)
      }
      return adminApi.reportsOperations(exportDef.apiPath!, params)
    },
    retry: false,
  })

  function errorMessage(err: unknown): string {
    if (err instanceof ApiError) {
      if (err.status === 403) return t('reportPermDenied')
      return err.message || t('reportLoadError')
    }
    return t('reportLoadError')
  }

  function runClientExport(
    sourceView: ReportViewId,
    data: unknown,
    fetching: boolean,
  ) {
    const sourceDef = REPORT_VIEWS[sourceView]
    if (!data || sourceDef.family === 'none' || !permitted(sourceView)) {
      setExportMsg(t('reportClientExportNeedData'))
      return
    }
    const ready = exportReady(data, fetching)
    if (!ready.ok) {
      setExportMsg(t(ready.reason))
      return
    }
    const pageMeta =
      isRecord(data) &&
      typeof data.total === 'number' &&
      typeof data.limit === 'number' &&
      typeof data.offset === 'number'
        ? {
            total: data.total,
            limit: data.limit,
            offset: data.offset,
          }
        : undefined
    try {
      const scope = describeReportCsvScope(data, pageMeta)
      const csv = buildReportCsv({
        reportId: sourceView,
        from: applied.from,
        to: applied.to,
        data,
        pageMeta,
        expectedWindow: { from: applied.from, to: applied.to },
      })
      downloadCsvFile(
        reportCsvFilename(sourceView, applied.from, applied.to),
        csv,
      )
      if (scope.kind === 'current-page') {
        setExportMsg(
          t('reportClientExportOkPage')
            .replace('{exported}', String(scope.exportedRowCount))
            .replace('{total}', String(scope.serverTotal)),
        )
      } else {
        setExportMsg(t('reportClientExportOkAggregate'))
      }
    } catch {
      setExportMsg(t('reportExportStaleLoading'))
    }
  }

  function exportButtonLabel(data: unknown): string {
    const scope = describeReportCsvScope(
      data,
      isRecord(data) &&
        typeof data.total === 'number' &&
        typeof data.limit === 'number' &&
        typeof data.offset === 'number'
        ? {
            total: data.total,
            limit: data.limit,
            offset: data.offset,
          }
        : undefined,
    )
    if (scope.kind === 'current-page') {
      return t('reportClientExportPage')
        .replace('{exported}', String(scope.exportedRowCount))
        .replace('{total}', String(scope.serverTotal))
    }
    return t('reportClientExportAggregate')
  }

  function renderMetricBlock(data: Record<string, unknown>, metrics: MetricDef[]) {
    const cards = metrics.filter((m) => m.kind !== 'map')
    const maps = metrics.filter((m) => m.kind === 'map')
    return (
      <div className="stack" style={{ gap: 16 }}>
        <RefKpiGrid>
          {cards.map((m) => (
            <RefKpiCard
              key={m.key}
              label={t(m.labelKey)}
              value={metricValue(data, m, formatDzdFromMinor, t)}
              hint={t(m.hintKey)}
            />
          ))}
        </RefKpiGrid>
        {maps.map((m) => (
          <MapBreakdown
            key={m.key}
            title={t(m.labelKey)}
            value={data[m.key]}
          />
        ))}
      </div>
    )
  }

  function renderList() {
    const data = reportQ.data
    if (!isRecord(data) || !Array.isArray(data.items)) {
      return <EmptyState label={t('reportEmptyWindow')} />
    }
    const items = data.items
    const total = typeof data.total === 'number' ? data.total : items.length
    if (items.length === 0) {
      return <EmptyState label={t('reportEmptyWindow')} />
    }

    if (view === 'merchants') {
      return (
        <div className="card">
          <p className="muted" style={{ padding: '12px 16px 0' }}>
            {t('reportPageNote')}
          </p>
          <table className="data">
            <thead>
              <tr>
                <th>ID</th>
                <th>{t('rptMerchantColOrders')}</th>
                <th>{t('rptMerchantColGms')}</th>
                <th>{t('rptMerchantColCommission')}</th>
                <th>{t('rptMerchantColNet')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                if (!isRecord(row)) return null
                const id = String(row.merchantId ?? '')
                return (
                  <tr key={id}>
                    <td className="mono">{id.slice(0, 8)}…</td>
                    <td>{String(row.completedOrderCount ?? '—')}</td>
                    <td>
                      {formatDzdFromMinor(String(row.grossMerchandiseMinor ?? ''))}
                    </td>
                    <td>
                      {formatDzdFromMinor(
                        String(row.merchantCommissionMinor ?? ''),
                      )}
                    </td>
                    <td>
                      {formatDzdFromMinor(String(row.merchantNetMinor ?? ''))}
                    </td>
                    <td>
                      <Link to={`/merchants/${id}`}>{t('reportDetailLink')}</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <Pagination
            total={total}
            limit={PAGE_LIMIT}
            offset={offset}
            onChange={setOffset}
            integrated
          />
        </div>
      )
    }

    return (
      <div className="card">
        <p className="muted" style={{ padding: '12px 16px 0' }}>
          {t('reportPageNote')}
        </p>
        <table className="data">
          <thead>
            <tr>
              <th>ID</th>
              <th>{t('rptCompletedDeliveries')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((row) => {
              if (!isRecord(row)) return null
              const id = String(row.driverId ?? '')
              return (
                <tr key={id}>
                  <td className="mono">{id.slice(0, 8)}…</td>
                  <td>{String(row.completedDeliveryCount ?? '—')}</td>
                  <td>
                    <Link to={`/drivers/${id}`}>{t('reportDetailLink')}</Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <Pagination
          total={total}
          limit={PAGE_LIMIT}
          offset={offset}
          onChange={setOffset}
          integrated
        />
      </div>
    )
  }

  function renderBody() {
    if (view === 'hub') {
      return (
        <div className="stack" style={{ gap: 20 }}>
          <p className="muted">{t('reportHubSubtitle')}</p>
          <div className="report-nav-grid">
            {PRIMARY_REPORT_VIEWS.filter((id) => id !== 'hub').map((id) => (
              <button
                key={id}
                type="button"
                className="card card-body report-nav-card"
                disabled={!permitted(id) && id !== 'customers' && id !== 'export'}
                onClick={() => {
                  setView(id)
                  setOffset(0)
                  setExportMsg(null)
                }}
              >
                <strong>{t(REPORT_VIEWS[id].labelKey)}</strong>
                <span className="muted text-metadata">
                  {REPORT_VIEWS[id].stitchRefs.join(', ') || '—'}
                </span>
              </button>
            ))}
          </div>
          {canOps ? (
            <div>
              <h3 style={{ marginTop: 0 }}>{t('reportOrders')}</h3>
              {hubOpsQ.isLoading ? <LoadingState /> : null}
              {hubOpsQ.isError ? (
                <ErrorState
                  message={errorMessage(hubOpsQ.error)}
                  onRetry={() => void hubOpsQ.refetch()}
                />
              ) : null}
              {hubOpsQ.data && isRecord(hubOpsQ.data)
                ? renderMetricBlock(
                    hubOpsQ.data,
                    REPORT_VIEWS.orders.metrics!.filter((m) => m.kind !== 'map'),
                  )
                : null}
            </div>
          ) : null}
          {!canOps && canFin ? (
            <p className="muted">{t('reportOpsUnavailable')}</p>
          ) : null}
          {canFin ? (
            <div>
              <h3>{t('reportRevenue')}</h3>
              {hubFinQ.isLoading ? <LoadingState /> : null}
              {hubFinQ.isError ? (
                <ErrorState
                  message={errorMessage(hubFinQ.error)}
                  onRetry={() => void hubFinQ.refetch()}
                />
              ) : null}
              {hubFinQ.data && isRecord(hubFinQ.data)
                ? renderMetricBlock(
                    hubFinQ.data,
                    REPORT_VIEWS.revenue.metrics!.slice(0, 4),
                  )
                : null}
            </div>
          ) : canOps ? (
            <p className="muted">{t('reportFinanceUnavailable')}</p>
          ) : null}
        </div>
      )
    }

    if (view === 'customers') {
      return (
        <UnavailablePanel
          title={t('reportCustomers')}
          detail={t('reportCustomersBlocked')}
        />
      )
    }

    if (view === 'export') {
      return (
        <div className="stack" style={{ gap: 16 }}>
          <UnavailablePanel
            title={t('reportExport')}
            detail={t('reportExportHistoryBlocked')}
          />
          <div className="card card-body stack" style={{ gap: 12 }}>
            <h3 style={{ margin: 0 }}>{t('reportClientExport')}</h3>
            <p className="muted">{t('reportClientExportScope')}</p>
            <label className="sg-select" style={{ maxWidth: 280 }}>
              <select
                value={exportSource}
                onChange={(e) => {
                  setExportSource(e.target.value as ReportViewId)
                  setExportMsg(null)
                }}
              >
                {[
                  ...PRIMARY_REPORT_VIEWS,
                  ...MORE_OPS_VIEWS,
                  ...MORE_FIN_VIEWS,
                ]
                  .filter((id) => REPORT_VIEWS[id].family !== 'none')
                  .map((id) => (
                    <option key={id} value={id} disabled={!permitted(id)}>
                      {t(REPORT_VIEWS[id].labelKey)}
                    </option>
                  ))}
              </select>
              <Icon name="expand_more" className="sg-select__chevron" />
            </label>
            {exportQ.isLoading ? <LoadingState /> : null}
            {exportQ.isError ? (
              <ErrorState
                message={errorMessage(exportQ.error)}
                onRetry={() => void exportQ.refetch()}
              />
            ) : null}
            {exportQ.data ? (
              <p className="muted text-metadata">
                {exportButtonLabel(exportQ.data)}
              </p>
            ) : null}
            <Button
              type="button"
              disabled={
                !exportQ.data ||
                exportQ.isFetching ||
                !exportReady(exportQ.data, exportQ.isFetching).ok
              }
              onClick={() => {
                if (exportQ.data) {
                  runClientExport(
                    exportSource,
                    exportQ.data,
                    exportQ.isFetching,
                  )
                } else setExportMsg(t('reportClientExportNeedData'))
              }}
            >
              <Icon name="download" />{' '}
              {exportQ.data
                ? exportButtonLabel(exportQ.data)
                : t('reportClientExport')}
            </Button>
            {exportMsg ? <p className="muted">{exportMsg}</p> : null}
          </div>
        </div>
      )
    }

    if (!permitted(view)) {
      return <ForbiddenState message={t('reportPermDenied')} />
    }

    if (view === 'cancellations') {
      return (
        <div className="stack" style={{ gap: 16 }}>
          <p className="muted">{t('rptHintCancellationsPartial')}</p>
          {reportQ.isLoading ? <LoadingState /> : null}
          {reportQ.isError ? (
            <ErrorState
              message={errorMessage(reportQ.error)}
              onRetry={() => void reportQ.refetch()}
            />
          ) : null}
          {reportQ.data && isRecord(reportQ.data) && def.metrics
            ? renderMetricBlock(reportQ.data, def.metrics)
            : null}
          <div className="row" style={{ gap: 8 }}>
            <Button
              type="button"
              variant="secondary"
              disabled={
                !reportQ.data ||
                reportQ.isFetching ||
                !exportReady(reportQ.data, reportQ.isFetching).ok
              }
              onClick={() =>
                reportQ.data &&
                runClientExport(
                  'cancellations',
                  reportQ.data,
                  reportQ.isFetching,
                )
              }
            >
              <Icon name="download" />{' '}
              {reportQ.data
                ? exportButtonLabel(reportQ.data)
                : t('reportClientExport')}
            </Button>
          </div>
          {exportMsg ? <p className="muted">{exportMsg}</p> : null}
        </div>
      )
    }

    if (reportQ.isLoading) return <LoadingState />
    if (reportQ.isError) {
      return (
        <ErrorState
          message={errorMessage(reportQ.error)}
          onRetry={() => void reportQ.refetch()}
        />
      )
    }
    if (!reportQ.data) return <EmptyState label={t('reportEmptyWindow')} />

    if (def.paginated) {
      return (
        <div className="stack" style={{ gap: 12 }}>
          {renderList()}
          <Button
            type="button"
            variant="secondary"
            disabled={
              reportQ.isFetching ||
              !exportReady(reportQ.data, reportQ.isFetching).ok
            }
            onClick={() =>
              runClientExport(view, reportQ.data, reportQ.isFetching)
            }
          >
            <Icon name="download" /> {exportButtonLabel(reportQ.data)}
          </Button>
          {exportMsg ? <p className="muted">{exportMsg}</p> : null}
        </div>
      )
    }

    if (!isRecord(reportQ.data) || !def.metrics) {
      return <EmptyState />
    }

    const basketMinor =
      view === 'revenue'
        ? averageBasketMinorFromCompletedOrders(reportQ.data)
        : null

    return (
      <div className="stack" style={{ gap: 12 }}>
        {renderMetricBlock(reportQ.data, def.metrics)}
        {view === 'revenue' ? (
          <RefKpiGrid>
            <RefKpiCard
              label={t('rptAverageBasket')}
              value={
                basketMinor !== null ? formatDzdFromMinor(basketMinor) : '—'
              }
              hint={t('rptHintAverageBasket')}
            />
            <RefKpiCard
              label={t('rptGrowth')}
              value="—"
              hint={t('rptHintGrowthBlocked')}
            />
          </RefKpiGrid>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          disabled={
            reportQ.isFetching ||
            !exportReady(reportQ.data, reportQ.isFetching).ok
          }
          onClick={() =>
            runClientExport(view, reportQ.data, reportQ.isFetching)
          }
        >
          <Icon name="download" /> {exportButtonLabel(reportQ.data)}
        </Button>
        {exportMsg ? <p className="muted">{exportMsg}</p> : null}
      </div>
    )
  }

  return (
    <RequirePermission anyOf={[PERMS.REPORTS_READ, PERMS.REPORTS_FINANCE_READ]}>
      <PageHeader
        title={t('reports')}
        subtitle={`${t('reportWindow')}: ${new Date(applied.from).toLocaleString(locale === 'ar' ? 'ar' : 'fr')} → ${new Date(applied.to).toLocaleString(locale === 'ar' ? 'ar' : 'fr')} · [from, to)`}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void reportQ.refetch()
              void hubOpsQ.refetch()
              void hubFinQ.refetch()
            }}
          >
            <Icon name="refresh" /> {t('refresh')}
          </Button>
        }
      />

      <div className="card card-body report-filters" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px' }}>{t('reportFiltersTitle')}</h3>
        <div className="row report-filters__row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <label className="stack" style={{ gap: 4 }}>
            <span className="muted text-metadata">{t('reportFrom')}</span>
            <input
              type="datetime-local"
              value={fromLocal}
              onChange={(e) => setFromLocal(e.target.value)}
            />
          </label>
          <label className="stack" style={{ gap: 4 }}>
            <span className="muted text-metadata">{t('reportTo')}</span>
            <input
              type="datetime-local"
              value={toLocal}
              onChange={(e) => setToLocal(e.target.value)}
            />
          </label>
          <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
            <Button type="button" onClick={() => applyWindow()}>
              {t('reportApplyWindow')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => applyPreset(7)}
            >
              {t('reportPreset7d')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => applyPreset(30)}
            >
              {t('reportPreset30d')}
            </Button>
          </div>
        </div>
        {windowError ? <p className="error-text">{windowError}</p> : null}
      </div>

      <EntityTabs
        tabs={primaryTabs}
        active={PRIMARY_REPORT_VIEWS.includes(view) ? view : '__more__'}
        onChange={(id) => {
          setView(id as ReportViewId)
          setOffset(0)
          setExportMsg(null)
        }}
      />

      <div className="row report-more-row" style={{ gap: 12, margin: '8px 0 16px' }}>
        <label className="sg-select" style={{ minWidth: 260 }}>
          <select
            aria-label={t('reportMoreOps')}
            value={
              MORE_OPS_VIEWS.includes(view) || MORE_FIN_VIEWS.includes(view)
                ? view
                : ''
            }
            onChange={(e) => {
              const id = e.target.value as ReportViewId
              if (!id) return
              setView(id)
              setOffset(0)
            }}
          >
            <option value="">{t('reportMoreOps')} / {t('reportMoreFin')}</option>
            {moreReportOptions.map((opt) => (
              <option key={opt.id} value={opt.id} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <Icon name="expand_more" className="sg-select__chevron" />
        </label>
        {MORE_OPS_VIEWS.includes(view) || MORE_FIN_VIEWS.includes(view) ? (
          <span className="muted text-metadata">
            {t(REPORT_VIEWS[view].labelKey)}
          </span>
        ) : null}
      </div>

      {renderBody()}
    </RequirePermission>
  )
}
