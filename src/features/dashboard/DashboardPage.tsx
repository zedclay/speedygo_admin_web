import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminApi } from '../../lib/api/adminApi'
import { formatDzdFromMinor } from '../../lib/money'
import { useI18n } from '../../lib/i18n/I18nProvider'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge, statusTone } from '../../components/ui/Badge'
import { Icon } from '../../components/ui/Icon'
import { PERMS, hasPermission } from '../../lib/permissions'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { orderStatusLabelKey } from '../orders/orderStatusUi'
import { supportStatusLabelKey } from '../support/supportTicketUi'
import {
  canLoadSection,
  completionRatioPercent,
  parseCodFinanceReport,
  parseOrdersOpsReport,
  relativeAgeLabel,
  todayUtcWindowIso,
} from './dashboardModel'

function MetricUnavailable({ hint }: { hint: string }) {
  return (
    <p className="dash-metric-unavailable" title={hint}>
      {hint}
    </p>
  )
}

function PartyCell({
  name,
  fallbackId,
  titleExtra,
}: {
  name: string | null
  fallbackId: string
  titleExtra?: string | null
}) {
  const title = [name, titleExtra, fallbackId].filter(Boolean).join(' · ')
  if (name) {
    return (
      <span className="dash-party-name" title={title} dir="auto">
        {name}
      </span>
    )
  }
  return (
    <span className="dash-ref-copy mono muted" title={title} dir="ltr">
      {fallbackId.slice(0, 8)}…
    </span>
  )
}

function OrderRefCell({
  orderId,
  publicReference,
}: {
  orderId: string
  publicReference: string
}) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  async function copyRef() {
    try {
      await navigator.clipboard.writeText(publicReference)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard may be denied; detail link still exposes full ref via title */
    }
  }

  return (
    <div className="dash-ref-cell">
      <Link
        className="dash-ref-link mono"
        to={`/orders/${orderId}`}
        title={publicReference}
        dir="ltr"
      >
        {publicReference}
      </Link>
      <button
        type="button"
        className="dash-ref-copy-btn"
        onClick={() => void copyRef()}
        aria-label={copied ? t('referenceCopied') : t('copyReference')}
        title={copied ? t('referenceCopied') : t('copyReference')}
      >
        <Icon name={copied ? 'check' : 'content_copy'} />
      </button>
    </div>
  )
}

/**
 * A009 operational command center — layout matches Stitch reference structure.
 * Values bind only to meaning-preserving Backend reads; unavailable metrics keep chrome.
 */
export function DashboardPage() {
  const { t } = useI18n()
  const permissions = useSessionStore((s) => s.me?.permissions)
  const canOrders = canLoadSection(permissions, 'orders')
  const canDrivers = canLoadSection(permissions, 'drivers')
  const canMerchants = canLoadSection(permissions, 'merchants')
  const canCod = canLoadSection(permissions, 'cod')
  const canSupport = canLoadSection(permissions, 'support')
  const canReportsOps = canLoadSection(permissions, 'reportsOps')
  const canReportsFin = canLoadSection(permissions, 'reportsFinance')
  const canVerifyM = hasPermission(permissions, PERMS.MERCHANTS_VERIFY)
  const canVerifyD = hasPermission(permissions, PERMS.DRIVERS_VERIFY)

  const windowIso = useMemo(() => todayUtcWindowIso(), [])

  const ordersActive = useQuery({
    queryKey: ['orders', 'dash', 'ACTIVE'],
    queryFn: () => adminApi.listOrders({ limit: 8, offset: 0, status: 'ACTIVE' }),
    enabled: canOrders,
  })
  const driversList = useQuery({
    queryKey: ['drivers', 'dash', 'total'],
    queryFn: () => adminApi.listDrivers({ limit: 1, offset: 0 }),
    enabled: canDrivers,
  })
  const merchantsList = useQuery({
    queryKey: ['merchants', 'dash', 'total'],
    queryFn: () => adminApi.listMerchants({ limit: 1, offset: 0 }),
    enabled: canMerchants,
  })
  const remittances = useQuery({
    queryKey: ['cod', 'dash', 'list'],
    queryFn: () => adminApi.listCodRemittances({ limit: 5, offset: 0 }),
    enabled: canCod,
  })
  const support = useQuery({
    queryKey: ['support', 'dash'],
    queryFn: () => adminApi.listSupport({ limit: 3, offset: 0 }),
    enabled: canSupport,
  })
  const queueM = useQuery({
    queryKey: ['merchants', 'queue', 'dash'],
    queryFn: () => adminApi.merchantVerificationQueue({ limit: 1, offset: 0 }),
    enabled: canVerifyM,
  })
  const queueD = useQuery({
    queryKey: ['drivers', 'queue', 'dash'],
    queryFn: () => adminApi.driverVerificationQueue({ limit: 1, offset: 0 }),
    enabled: canVerifyD,
  })
  const ordersReport = useQuery({
    queryKey: ['reports', 'ops', 'orders', 'today', windowIso.from],
    queryFn: () =>
      adminApi.reportsOperations('orders', {
        from: windowIso.from,
        to: windowIso.to,
      }),
    enabled: canReportsOps,
  })
  const codReport = useQuery({
    queryKey: ['reports', 'fin', 'cod', 'today', windowIso.from],
    queryFn: () =>
      adminApi.reportsFinance('cod', {
        from: windowIso.from,
        to: windowIso.to,
      }),
    enabled: canReportsFin,
  })

  const ops = parseOrdersOpsReport(ordersReport.data)
  const codFin = parseCodFinanceReport(codReport.data)
  const successPct = completionRatioPercent(ops.completed, ops.failed)

  const merchantQueueTotal =
    canVerifyM && queueM.data && !queueM.isError ? queueM.data.total : null
  const driverQueueTotal =
    canVerifyD && queueD.data && !queueD.isError ? queueD.data.total : null
  const codDiscrepancy =
    canReportsFin && codFin.discrepancyCount !== null
      ? codFin.discrepancyCount
      : null
  const hasSupportedAlert =
    (merchantQueueTotal !== null && merchantQueueTotal > 0) ||
    (driverQueueTotal !== null && driverQueueTotal > 0) ||
    (codDiscrepancy !== null && codDiscrepancy > 0)

  const flowWeights = useMemo(() => {
    const parts = [
      ops.created,
      ops.completed,
      ops.cancelled,
      ops.failed,
    ] as const
    if (parts.some((n) => n === null)) return null
    const nums = parts as unknown as number[]
    const sum = nums.reduce((a, b) => a + b, 0)
    if (sum <= 0) return null
    return nums.map((n) => Math.max(n, 0))
  }, [ops.created, ops.completed, ops.cancelled, ops.failed])

  function refreshAll() {
    void ordersActive.refetch()
    void driversList.refetch()
    void merchantsList.refetch()
    void remittances.refetch()
    void support.refetch()
    void queueM.refetch()
    void queueD.refetch()
    void ordersReport.refetch()
    void codReport.refetch()
  }

  const updatedLabel = t('dataUpdatedJustNow')

  return (
    <div className="dashboard-a009">
      <nav className="breadcrumb text-metadata" aria-label="Breadcrumb">
        <span>{t('dashboardBreadcrumbRoot')}</span>
        <span aria-hidden> › </span>
        <span>{t('overview')}</span>
      </nav>

      <PageHeader
        title={t('overview')}
        subtitle={t('dashboardSubtitleLive')}
        actions={
          <>
            <span className="muted text-metadata">{updatedLabel}</span>
            <Button variant="secondary" size="sm" disabled title={t('dateFilterUnavailable')}>
              <Icon name="calendar_today" /> {t('today')}
            </Button>
            <Button variant="secondary" size="sm" onClick={refreshAll}>
              <Icon name="refresh" /> {t('refresh')}
            </Button>
            <Button variant="secondary" size="sm" disabled title={t('exportUnavailable')}>
              <Icon name="download" /> {t('export')}
            </Button>
          </>
        }
      />

      {/* KPI grid — 6 cards matching reference roles */}
      <div className="dash-kpi-grid">
        <article className="dash-kpi-card" data-kpi="active">
          <div className="dash-kpi-head">
            <span>{t('kpiActiveOrders')}</span>
            <Icon name="shopping_bag" />
          </div>
          {!canOrders ? (
            <MetricUnavailable hint={t('sectionPermissionDenied')} />
          ) : ordersActive.isError ? (
            <MetricUnavailable hint={t('sectionLoadFailed')} />
          ) : ordersActive.isPending ? (
            <div className="dash-kpi-value muted">{t('loading')}</div>
          ) : (
            <>
              <div className="dash-kpi-value" dir="ltr">
                {ordersActive.data ? ordersActive.data.total : '—'}
              </div>
              <MetricUnavailable hint={t('kpiActiveOrdersBreakdownUnavailable')} />
            </>
          )}
        </article>

        <article className="dash-kpi-card" data-kpi="priority">
          <div className="dash-kpi-head">
            <span>{t('kpiOrdersToHandle')}</span>
            <Icon name="priority_high" />
          </div>
          <div className="dash-kpi-value">—</div>
          <MetricUnavailable hint={t('kpiOrdersToHandleUnavailable')} />
          <Link className="dash-kpi-link" to="/orders/queues/delayed">
            {t('seePriorities')}
          </Link>
        </article>

        <article className="dash-kpi-card" data-kpi="drivers">
          <div className="dash-kpi-head">
            <span>{t('kpiDriversFleet')}</span>
            <Icon name="directions_bike" />
          </div>
          {!canDrivers ? (
            <MetricUnavailable hint={t('sectionPermissionDenied')} />
          ) : driversList.isError ? (
            <MetricUnavailable hint={t('sectionLoadFailed')} />
          ) : driversList.isPending ? (
            <div className="dash-kpi-value muted">{t('loading')}</div>
          ) : (
            <>
              <div className="dash-kpi-value" dir="ltr">
                <span>—</span>
                <span className="dash-kpi-suffix">
                  {' '}
                  / {driversList.data ? driversList.data.total : '—'}{' '}
                  {t('registeredShort')}
                </span>
              </div>
              <div className="dash-progress" aria-hidden>
                <span style={{ width: '0%' }} />
              </div>
              <MetricUnavailable hint={t('kpiDriversLiveUnavailable')} />
            </>
          )}
        </article>

        <article className="dash-kpi-card" data-kpi="success">
          <div className="dash-kpi-head">
            <span>{t('kpiSuccessRate')}</span>
            <Icon name="check_circle" />
          </div>
          {!canReportsOps ? (
            <MetricUnavailable hint={t('sectionPermissionDenied')} />
          ) : ordersReport.isError ? (
            <MetricUnavailable hint={t('sectionLoadFailed')} />
          ) : ordersReport.isPending ? (
            <div className="dash-kpi-value muted">{t('loading')}</div>
          ) : successPct === null ? (
            <>
              <div className="dash-kpi-value">—</div>
              <MetricUnavailable hint={t('kpiSuccessRateUnavailable')} />
            </>
          ) : (
            <>
              <div className="dash-kpi-value" dir="ltr">
                {successPct}%
              </div>
              <p className="dash-kpi-foot">
                {ops.completed ?? '—'} {t('completedDeliveriesReport')}
              </p>
              <p className="muted text-metadata">{t('reportWindowTodayHint')}</p>
            </>
          )}
        </article>

        <article className="dash-kpi-card" data-kpi="cancel">
          <div className="dash-kpi-head">
            <span>{t('kpiCancellations')}</span>
            <Icon name="cancel" />
          </div>
          {!canReportsOps ? (
            <MetricUnavailable hint={t('sectionPermissionDenied')} />
          ) : ordersReport.isError ? (
            <MetricUnavailable hint={t('sectionLoadFailed')} />
          ) : ordersReport.isPending ? (
            <div className="dash-kpi-value muted">{t('loading')}</div>
          ) : (
            <>
              <div className="dash-kpi-value" dir="ltr">
                {ops.cancelled !== null ? ops.cancelled : '—'}
              </div>
              <p className="muted text-metadata">{t('reportWindowTodayHint')}</p>
            </>
          )}
        </article>

        <article className="dash-kpi-card" data-kpi="collections">
          <div className="dash-kpi-head">
            <span>{t('kpiCollectionsToday')}</span>
            <Icon name="account_balance_wallet" />
          </div>
          {!canReportsFin ? (
            <MetricUnavailable hint={t('sectionPermissionDenied')} />
          ) : codReport.isError ? (
            <MetricUnavailable hint={t('sectionLoadFailed')} />
          ) : codReport.isPending ? (
            <div className="dash-kpi-value muted">{t('loading')}</div>
          ) : (
            <>
              <div className="dash-kpi-value dash-kpi-value-sm" dir="ltr">
                {codFin.collectedMinor
                  ? formatDzdFromMinor(codFin.collectedMinor)
                  : '—'}
              </div>
              <p className="dash-kpi-foot">
                {t('codToReconcile')}:{' '}
                {codFin.outstandingCustodyMinor
                  ? formatDzdFromMinor(codFin.outstandingCustodyMinor)
                  : '—'}
              </p>
              <div className="dash-kpi-footer-row">
                <span
                  className={
                    codDiscrepancy !== null && codDiscrepancy > 0
                      ? 'text-error text-metadata'
                      : 'muted text-metadata'
                  }
                >
                  {codDiscrepancy !== null && codDiscrepancy > 0
                    ? `${codDiscrepancy} ${t('codGapsToCheck')}`
                    : t('noCodGap')}
                </span>
                <Link className="dash-kpi-link" to="/collections/cod">
                  {t('see')}
                </Link>
              </div>
              <p className="muted text-metadata">{t('reportWindowTodayHint')}</p>
            </>
          )}
        </article>
      </div>

      {/* Health strip */}
      <div className="dash-health-strip">
        <div className="dash-health-item">
          <Icon name="storefront" />
          <strong>{t('merchants')}:</strong>
          {!canMerchants ? (
            <span className="muted">{t('sectionPermissionDenied')}</span>
          ) : merchantsList.isError ? (
            <span className="muted">{t('sectionLoadFailed')}</span>
          ) : merchantsList.isPending ? (
            <span className="muted">{t('loading')}</span>
          ) : (
            <span className="muted">
              {merchantsList.data ? merchantsList.data.total : '—'}{' '}
              {t('registeredShort')}
              {' · '}
              {t('merchantOpenStatusUnavailable')}
            </span>
          )}
        </div>
        <div className="dash-health-sep" aria-hidden />
        <div className="dash-health-item">
          <Icon name="electric_moped" />
          <strong>{t('driverAssignment')}:</strong>
          <span className="muted">{t('assignmentMetricsUnavailable')}</span>
        </div>
        <div className="dash-health-sep" aria-hidden />
        <div className="dash-health-item">
          <Icon name="schedule" />
          <strong>{t('delivery')}:</strong>
          <span className="muted">{t('deliveryEtaUnavailable')}</span>
        </div>
        <div className="dash-health-sep" aria-hidden />
        <div className="dash-health-item">
          <Icon name="support_agent" />
          <strong>{t('support')}:</strong>
          {!canSupport ? (
            <span className="muted">{t('sectionPermissionDenied')}</span>
          ) : support.isError ? (
            <span className="muted">{t('sectionLoadFailed')}</span>
          ) : support.isPending ? (
            <span className="muted">{t('loading')}</span>
          ) : (
            <span className="muted">
              {support.data ? support.data.total : '—'} {t('openTickets')}
            </span>
          )}
        </div>
      </div>

      {/* Active orders table + alerts */}
      <div className="dash-main-split">
        <section className="card dash-priority">
          <div className="card-header dash-priority-header">
            <div className="dash-priority-heading">
              <h2 className="text-section-title">{t('priorityOps')}</h2>
              <p className="dash-priority-limit">{t('priorityOpsLimitation')}</p>
            </div>
            <Link to="/operations">{t('seeAll')}</Link>
          </div>
          {!canOrders ? (
            <div className="card-body">
              <MetricUnavailable hint={t('sectionPermissionDenied')} />
            </div>
          ) : ordersActive.isError ? (
            <div className="card-body">
              <MetricUnavailable hint={t('sectionLoadFailed')} />
            </div>
          ) : ordersActive.isPending ? (
            <div className="card-body">
              <p className="muted">{t('loading')}</p>
            </div>
          ) : (
            <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
              <table className="data">
                <thead>
                  <tr>
                    <th className="dash-col-ref">{t('orderCol')}</th>
                    <th className="dash-col-party">{t('customer')}</th>
                    <th className="dash-col-party">{t('merchant')}</th>
                    <th className="dash-col-situation">{t('situation')}</th>
                    <th className="dash-col-since">{t('since')}</th>
                    <th className="num dash-col-amount">{t('amount')}</th>
                    <th className="dash-col-actions">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(ordersActive.data?.items ?? []).map((o) => {
                    const statusKey = orderStatusLabelKey(o.status)
                    const merchantLabel =
                      o.merchantName ?? o.merchantBranchName ?? null
                    return (
                      <tr key={o.id}>
                        <td className="dash-col-ref">
                          <OrderRefCell
                            orderId={o.id}
                            publicReference={o.publicReference}
                          />
                        </td>
                        <td className="dash-col-party">
                          <PartyCell
                            name={o.customerFullName}
                            fallbackId={o.customerId}
                          />
                        </td>
                        <td className="dash-col-party">
                          <PartyCell
                            name={merchantLabel}
                            fallbackId={o.merchantBranchId}
                            titleExtra={
                              o.merchantName && o.merchantBranchName
                                ? o.merchantBranchName
                                : null
                            }
                          />
                        </td>
                        <td className="dash-situation dash-col-situation">
                          <Badge tone={statusTone(o.status)}>
                            {statusKey ? t(statusKey) : o.status}
                          </Badge>
                        </td>
                        <td className="muted dash-elapsed dash-col-since" dir="ltr">
                          {relativeAgeLabel(o.createdAt)}
                        </td>
                        <td className="num dash-col-amount" dir="ltr">
                          {o.customerPayableMinor != null
                            ? formatDzdFromMinor(o.customerPayableMinor)
                            : '—'}
                        </td>
                        <td className="dash-col-actions">
                          <div className="dash-row-actions">
                            <Link
                              className="btn btn-secondary btn-sm"
                              to={`/orders/${o.id}`}
                              title={t('dashAssignUnavailableHint')}
                            >
                              {t('open')}
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {ordersActive.data && ordersActive.data.items.length === 0 ? (
                    <tr>
                      <td colSpan={7}>{t('empty')}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card dash-alerts">
          <div
            className={
              hasSupportedAlert
                ? 'card-header dash-alerts-header'
                : 'card-header dash-alerts-header is-calm'
            }
          >
            <h2 className="text-section-title">
              <Icon name="warning" /> {t('alertCenter')}
            </h2>
          </div>
          <div className="card-body stack">
            <div className="dash-alert-item">
              <Icon name="timer" />
              <div>
                <p>{t('alertDelayedUnavailable')}</p>
                <Link to="/orders/queues/delayed">{t('examine')}</Link>
              </div>
            </div>
            <div className="dash-alert-item">
              <Icon name="person_off" />
              <div>
                <p>{t('alertUnassignedUnavailable')}</p>
                <Link to="/orders/queues/unassigned">{t('assignDriver')}</Link>
              </div>
            </div>
            {merchantQueueTotal !== null && merchantQueueTotal > 0 ? (
              <div className="dash-alert-item warning">
                <Icon name="storefront" />
                <div>
                  <p>
                    {t('kpiMerchantQueue')}: {merchantQueueTotal}
                  </p>
                  <Link to="/merchants/verification">{t('see')}</Link>
                </div>
              </div>
            ) : (
              <div className="dash-alert-item">
                <Icon name="storefront" />
                <div>
                  <p>{t('alertMerchantLateUnavailable')}</p>
                  {!canVerifyM ? (
                    <span className="muted text-metadata">
                      {t('sectionPermissionDenied')}
                    </span>
                  ) : queueM.isError ? (
                    <span className="muted text-metadata">
                      {t('sectionLoadFailed')}
                    </span>
                  ) : (
                    <span className="muted text-metadata">
                      {t('metricUnavailable')}
                    </span>
                  )}
                </div>
              </div>
            )}
            {codDiscrepancy !== null && codDiscrepancy > 0 ? (
              <div className="dash-alert-item warning">
                <Icon name="account_balance_wallet" />
                <div>
                  <p>
                    {codDiscrepancy} {t('codGapsToCheck')}
                  </p>
                  <Link to="/collections/cod">{t('reconcile')}</Link>
                </div>
              </div>
            ) : canCod && remittances.data ? (
              <div className="dash-alert-item">
                <Icon name="account_balance_wallet" />
                <div>
                  <p>
                    {t('kpiCod')}: {remittances.data.total}
                  </p>
                  <Link to="/collections/cod">{t('reconcile')}</Link>
                </div>
              </div>
            ) : (
              <div className="dash-alert-item">
                <Icon name="account_balance_wallet" />
                <div>
                  <p>{t('alertCodGapUnavailable')}</p>
                  {!canCod && !canReportsFin ? (
                    <span className="muted text-metadata">
                      {t('sectionPermissionDenied')}
                    </span>
                  ) : null}
                </div>
              </div>
            )}
            {driverQueueTotal !== null && driverQueueTotal > 0 ? (
              <div className="dash-alert-item warning">
                <Icon name="how_to_reg" />
                <div>
                  <p>
                    {t('kpiDriverQueue')}: {driverQueueTotal}
                  </p>
                  <Link to="/drivers/verification">{t('see')}</Link>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {/* Secondary widgets */}
      <div className="dash-secondary-grid">
        <article className="card card-body dash-widget">
          <h3 className="text-body-semibold">{t('orderFlowChart')}</h3>
          <div className="dash-flow-bar" aria-hidden>
            {flowWeights ? (
              <>
                <span className="seg a" style={{ flex: flowWeights[0] || 0.001 }} />
                <span className="seg c" style={{ flex: flowWeights[1] || 0.001 }} />
                <span className="seg d" style={{ flex: flowWeights[2] || 0.001 }} />
                <span className="seg e" style={{ flex: flowWeights[3] || 0.001 }} />
              </>
            ) : (
              <>
                <span className="seg a" style={{ flex: 1 }} />
                <span className="seg b" style={{ flex: 1 }} />
                <span className="seg c" style={{ flex: 1 }} />
                <span className="seg d" style={{ flex: 1 }} />
                <span className="seg e" style={{ flex: 1 }} />
              </>
            )}
          </div>
          {!canReportsOps ? (
            <MetricUnavailable hint={t('sectionPermissionDenied')} />
          ) : ordersReport.isError ? (
            <MetricUnavailable hint={t('sectionLoadFailed')} />
          ) : (
            <ul className="dash-flow-legend">
              <li>
                <span>{t('received')}</span>
                <strong>{ops.created ?? '—'}</strong>
              </li>
              <li>
                <span>{t('completed')}</span>
                <strong>{ops.completed ?? '—'}</strong>
              </li>
              <li>
                <span>{t('cancelled')}</span>
                <strong>{ops.cancelled ?? '—'}</strong>
              </li>
              <li>
                <span>{t('failed')}</span>
                <strong>{ops.failed ?? '—'}</strong>
              </li>
            </ul>
          )}
          <p className="muted text-metadata">{t('reportWindowTodayHint')}</p>
          {!flowWeights ? (
            <p className="muted text-metadata">{t('chartUnavailableHint')}</p>
          ) : null}
        </article>

        <article className="card card-body dash-widget">
          <h3 className="text-body-semibold">{t('driverAvailabilityWidget')}</h3>
          <div className="dash-avail-grid">
            <div>
              <label>{t('registered')}</label>
              <strong>
                {canDrivers && driversList.data ? driversList.data.total : '—'}
              </strong>
            </div>
            <div>
              <label>{t('activePlural')}</label>
              <strong>—</strong>
            </div>
            <div className="avail-ok">
              <label>{t('available')}</label>
              <strong>—</strong>
            </div>
            <div className="avail-mission">
              <label>{t('onMission')}</label>
              <strong>—</strong>
            </div>
          </div>
          <MetricUnavailable hint={t('kpiDriversLiveUnavailable')} />
        </article>

        <article className="card card-body dash-widget">
          <h3 className="text-body-semibold">{t('merchantActivityWidget')}</h3>
          <div className="dash-merchant-stats">
            <div>
              <span>{t('registered')}</span>
              <strong>
                {canMerchants && merchantsList.data ? merchantsList.data.total : '—'}
              </strong>
            </div>
            <div>
              <span>{t('openStores')}</span>
              <strong>—</strong>
            </div>
            <div>
              <span>{t('closedStores')}</span>
              <strong>—</strong>
            </div>
            <div>
              <span>{t('lateMerchants')}</span>
              <strong>—</strong>
            </div>
          </div>
          <MetricUnavailable hint={t('merchantActivityUnavailable')} />
        </article>
      </div>

      <div className="dash-bottom-grid">
        <article className="card card-body dash-widget">
          <h3 className="text-body-semibold">{t('collectionsPaymentsWidget')}</h3>
          {!canReportsFin && !canCod ? (
            <MetricUnavailable hint={t('sectionPermissionDenied')} />
          ) : (
            <>
              <p className="dash-kpi-value dash-kpi-value-sm">
                {canReportsFin && codFin.collectedMinor
                  ? formatDzdFromMinor(codFin.collectedMinor)
                  : '—'}{' '}
                <span className="dash-kpi-suffix">{t('processed')}</span>
              </p>
              <ul className="dash-flow-legend">
                <li>
                  <span>{t('codCollected')}</span>
                  <strong>
                    {canReportsFin && codFin.collectedMinor
                      ? formatDzdFromMinor(codFin.collectedMinor)
                      : '—'}
                  </strong>
                </li>
                <li>
                  <span>{t('codToReconcile')}</span>
                  <strong>
                    {canReportsFin && codFin.outstandingCustodyMinor
                      ? formatDzdFromMinor(codFin.outstandingCustodyMinor)
                      : '—'}
                  </strong>
                </li>
                <li>
                  <span>{t('electronicPaymentsShare')}</span>
                  <strong>—</strong>
                </li>
              </ul>
              <p className="muted text-metadata">{t('reportWindowTodayHint')}</p>
            </>
          )}
        </article>

        <article className="card card-body dash-widget">
          <h3 className="text-body-semibold">{t('supportOverview')}</h3>
          {!canSupport ? (
            <MetricUnavailable hint={t('sectionPermissionDenied')} />
          ) : support.isError ? (
            <MetricUnavailable hint={t('sectionLoadFailed')} />
          ) : (
            <>
              <div className="dash-support-stats">
                <div>
                  <strong>{support.data ? support.data.total : '—'}</strong>
                  <span>{t('openTickets')}</span>
                </div>
                <div>
                  <strong>—</strong>
                  <span>{t('highPriority')}</span>
                </div>
                <div>
                  <strong>—</strong>
                  <span>{t('avgReplyTime')}</span>
                </div>
              </div>
              <MetricUnavailable hint={t('supportPriorityUnavailable')} />
              {(support.data?.items ?? []).slice(0, 1).map((ticket) => {
                const ticketStatusKey = supportStatusLabelKey(ticket.status)
                return (
                  <div className="dash-support-preview" key={ticket.id}>
                    <div>
                      <p
                        className="text-body-semibold mono dash-ref-link"
                        title={ticket.publicReference ?? ticket.id}
                        dir="ltr"
                      >
                        {ticket.publicReference ?? `${ticket.id.slice(0, 12)}…`}
                      </p>
                      <p className="muted text-metadata">
                        {ticketStatusKey ? t(ticketStatusKey) : ticket.status}
                      </p>
                    </div>
                    <Link to={`/support/${ticket.id}`}>{t('see')}</Link>
                  </div>
                )
              })}
            </>
          )}
        </article>
      </div>
    </div>
  )
}
