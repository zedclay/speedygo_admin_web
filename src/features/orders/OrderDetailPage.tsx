import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { adminApi } from '../../lib/api/adminApi'
import { formatDzdFromMinor } from '../../lib/money'
import { Button } from '../../components/ui/Button'
import { Badge, statusTone } from '../../components/ui/Badge'
import { Icon } from '../../components/ui/Icon'
import { EntityTabs } from '../../components/ui/EntityTabs'
import { UnavailablePanel } from '../../components/ui/UnavailablePanel'
import { Modal } from '../../components/ui/Modal'
import { Pagination } from '../../components/ui/Pagination'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { PERMS, hasPermission } from '../../lib/permissions'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { useI18n } from '../../lib/i18n/I18nProvider'
import type {
  OrderDetail,
  OrderFinancialSnapshot,
  OrderTimelineEvent,
} from '../../lib/api/types'
import { ApiError } from '../../lib/api/types'
import {
  financeStatusLabel,
  financeStatusTone,
} from '../payments/financeUi'
import {
  formatTimelineClock,
  formatTimelineDateTime,
  timelineEventIcon,
  timelineEventLabelKey,
  timelineEventSubtitle,
} from './orderTimelineUi'
import { PartyAvatar } from './PartyAvatar'

function paymentLabel(method: string | undefined, codLabel: string): string {
  if (!method) return '—'
  if (method === 'COD') return codLabel
  return method
}

function OrderTimelinePanel({
  order,
  events,
}: {
  order: OrderDetail
  events: OrderTimelineEvent[]
}) {
  const { t } = useI18n()
  const customerName = order.customer?.fullName ?? null
  const merchantName = order.merchant?.merchantName ?? null
  const last = events.length > 0 ? events[events.length - 1] : null

  function actorAvatarFor(event: OrderTimelineEvent): {
    name: string | null
    avatarUrl: string | null
  } {
    const actor = event.actorType?.toUpperCase() ?? ''
    if (actor === 'CUSTOMER') {
      return {
        name: customerName,
        avatarUrl: order.customerAvatarUrl ?? order.customer?.avatarUrl ?? null,
      }
    }
    if (actor === 'MERCHANT') {
      return { name: merchantName, avatarUrl: null }
    }
    if (actor === 'DRIVER' || event.driverFullName || event.driverId) {
      return { name: event.driverFullName, avatarUrl: null }
    }
    return { name: actor || t('timelineActorUnknown'), avatarUrl: null }
  }

  return (
    <div className="order-timeline-layout">
      <div className="card order-timeline-main">
        <div className="card-header">
          <strong>{t('tabTimelineActivity')}</strong>
        </div>
        <div className="card-body">
          {events.length === 0 ? (
            <EmptyState label={t('timelineEmpty')} />
          ) : (
            <ol className="order-timeline">
              {events.map((event, index) => {
                const isCurrent = index === events.length - 1
                const labelKey = timelineEventLabelKey(event.eventType)
                const title = labelKey ? t(labelKey) : event.eventType
                const subtitle = timelineEventSubtitle({
                  event,
                  t,
                  customerName,
                  merchantName,
                })
                const actor = actorAvatarFor(event)
                return (
                  <li
                    key={`${event.source}-${event.eventType}-${event.occurredAt}-${index}`}
                    className={`order-timeline__item${isCurrent ? ' order-timeline__item--current' : ''}`}
                  >
                    <span
                      className={`order-timeline__dot order-timeline__dot--${event.source === 'ORDER_STATUS' ? 'order' : 'delivery'}`}
                      aria-hidden
                    />
                    <div
                      className={`order-timeline__body${isCurrent ? ' order-timeline__body--current' : ''}`}
                    >
                      <div className="order-timeline__row">
                        <div className="order-timeline__content">
                          <span className="order-timeline__actor" aria-hidden>
                            <PartyAvatar
                              name={actor.name}
                              avatarUrl={actor.avatarUrl}
                              size={32}
                            />
                            <span className="order-timeline__icon">
                              <Icon name={timelineEventIcon(event.eventType)} />
                            </span>
                          </span>
                          <div>
                            <strong className="order-timeline__title">{title}</strong>
                            <p className="muted text-metadata">{subtitle}</p>
                          </div>
                        </div>
                        <div className="order-timeline__meta">
                          <time dateTime={event.occurredAt}>
                            {formatTimelineClock(event.occurredAt)}
                          </time>
                          {isCurrent ? (
                            <span className="order-timeline__current-badge">
                              {t('timelineCurrent')}
                            </span>
                          ) : null}
                          <button
                            type="button"
                            className="icon-btn order-timeline__open-event"
                            disabled
                            title={t('timelineOpenEventUnavailable')}
                          >
                            <Icon name="open_in_new" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>
      <aside className="card order-timeline-aside">
        <div className="card-header">
          <strong>{t('timelineAuditContext')}</strong>
        </div>
        <div className="card-body stack">
          <div className="summary-item">
            <label>{t('timelineAuditEvents')}</label>
            <strong>{events.length}</strong>
          </div>
          <div className="summary-item">
            <label>{t('timelineAuditLastEvent')}</label>
            <strong>
              {last ? formatTimelineDateTime(last.occurredAt) : '—'}
            </strong>
          </div>
          <div className="summary-item">
            <label>{t('timelineAuditOrderStatus')}</label>
            <strong>{order.status}</strong>
          </div>
          <div className="summary-item">
            <label>{t('timelineAuditFulfillment')}</label>
            <strong>{order.fulfillmentStatus}</strong>
          </div>
          <div className="summary-item">
            <label>{t('timelineAuditPayment')}</label>
            <strong>
              {order.payment
                ? `${order.payment.method} · ${order.payment.status}`
                : '—'}
            </strong>
          </div>
          <div className="summary-item">
            <label>{t('auditSessionUnavailable')}</label>
            <strong className="muted">—</strong>
          </div>
          <div className="summary-item">
            <label>{t('auditRiskUnavailable')}</label>
            <strong className="muted">—</strong>
          </div>
          <Button disabled title={t('timelineAuditDownloadUnavailable')}>
            {t('timelineAuditDownloadUnavailable')}
          </Button>
        </div>
      </aside>
    </div>
  )
}

function FinancialBreakdownCard({
  financial,
  title,
  missingLabel,
  disclaimer,
  labels,
  refundAction,
}: {
  financial: OrderFinancialSnapshot | null
  title: string
  missingLabel: string
  disclaimer: string
  labels: {
    commissionSection: string
    deliveryEconomySection: string
    itemsSubtotal: string
    merchantCommission: string
    merchantNet: string
    deliveryFee: string
    customerDeliveryFee: string
    driverRemuneration: string
    speedyGoDeliveryShare: string
    customerPayable: string
  }
  refundAction?: { label: string; onClick: () => void }
}) {
  return (
    <div className="card order-finance-card">
      <div className="card-header">
        <strong>
          <Icon name="payments" /> {title}
        </strong>
      </div>
      <div className="card-body">
        {financial ? (
          <div className="stack">
            <div className="finance-section">
              <p className="finance-section__title">{labels.commissionSection}</p>
              <div className="finance-row">
                <span>{labels.itemsSubtotal}</span>
                <strong>{formatDzdFromMinor(financial.grossMerchandiseSubtotalMinor)}</strong>
              </div>
              <div className="finance-row">
                <span>
                  {labels.merchantCommission} (
                  {(financial.merchantCommissionRateBps / 100).toFixed(2)} %)
                </span>
                <strong className="finance-amount--debit">
                  −{formatDzdFromMinor(financial.merchantCommissionAmountMinor)}
                </strong>
              </div>
              <div className="finance-row finance-row--emphasis">
                <span>{labels.merchantNet}</span>
                <strong className="finance-amount--merchant-net">
                  {formatDzdFromMinor(financial.merchantNetAmountMinor)}
                </strong>
              </div>
            </div>
            <div className="finance-section">
              <p className="finance-section__title">{labels.deliveryEconomySection}</p>
              <div className="finance-row">
                <span>{labels.customerDeliveryFee}</span>
                <strong>{formatDzdFromMinor(financial.customerDeliveryFeeMinor)}</strong>
              </div>
              <div className="finance-row">
                <span>{labels.driverRemuneration}</span>
                <strong>{formatDzdFromMinor(financial.driverRemunerationMinor)}</strong>
              </div>
              <div className="finance-row finance-row--emphasis">
                <span>{labels.speedyGoDeliveryShare}</span>
                <strong className="finance-amount--platform">
                  {formatDzdFromMinor(financial.speedyGoDeliveryShareMinor)}
                </strong>
              </div>
            </div>
            <p className="order-finance-disclaimer">{disclaimer}</p>
            {refundAction ? (
              <div className="order-finance-actions">
                <Button variant="secondary" size="sm" onClick={refundAction.onClick}>
                  <Icon name="receipt_long" /> {refundAction.label}
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <UnavailablePanel title={title} detail={missingLabel} />
            {refundAction ? (
              <div className="order-finance-actions">
                <Button variant="secondary" size="sm" onClick={refundAction.onClick}>
                  <Icon name="receipt_long" /> {refundAction.label}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

function AuditContextCard({
  order,
  canReadAudit,
}: {
  order: OrderDetail
  canReadAudit: boolean
}) {
  const { t } = useI18n()
  const auditQ = useQuery({
    queryKey: ['audit', 'order', order.id],
    queryFn: () =>
      adminApi.listAudit({
        targetType: 'Order',
        targetId: order.id,
        limit: 5,
        offset: 0,
      }),
    enabled: canReadAudit,
  })

  const latest = auditQ.data?.items[0]
  const lastUpdate = latest
    ? new Date(latest.createdAt).toLocaleString()
    : null

  return (
    <div className="card order-audit-card">
      <div className="card-header">
        <strong>
          <Icon name="policy" /> {t('auditContext')}
        </strong>
      </div>
      <div className="card-body stack">
        <div className="summary-item">
          <label>
            <Icon name="schedule" /> {t('auditLastUpdate')}
          </label>
          <strong>
            {canReadAudit
              ? auditQ.isLoading
                ? t('loading')
                : (lastUpdate ?? t('auditEmpty'))
              : t('auditPermissionDenied')}
          </strong>
        </div>
        <div className="summary-item">
          <label>
            <Icon name="badge" /> {t('auditOperator')}
          </label>
          <strong className="mono">
            {canReadAudit && latest ? latest.adminId : t('auditEmpty')}
          </strong>
        </div>
        <div className="order-audit-alerts">
          <label>{t('auditSecurityAlerts')}</label>
          <p className="muted text-metadata">{t('auditAlertsEmpty')}</p>
        </div>
        <div className="order-audit-actions">
          <label>{t('auditQuickActions')}</label>
          <Button disabled title={t('actionUnavailableHint')} className="order-audit-action">
            <Icon name="flag" /> {t('auditReportDelay')}
          </Button>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: string
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="order-metric-card" title={hint || undefined}>
      <div className="order-metric-card__icon" aria-hidden>
        <Icon name={icon} />
      </div>
      <div className="order-metric-card__text">
        <span className="order-metric-card__label">{label}</span>
        <strong className="order-metric-card__value">{value}</strong>
        {hint ? (
          <span className="order-metric-card__hint muted">{hint}</span>
        ) : null}
      </div>
    </div>
  )
}

type OrderTab = 'overview' | 'items' | 'timeline' | 'refund' | 'notes'
type OrderAction = 'assign' | 'reassign' | 'status' | 'cancel' | null

export function OrderDetailPage() {
  const { id = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const permissions = useSessionStore((s) => s.me?.permissions)
  const canReadAudit = hasPermission(permissions, PERMS.AUDIT_READ)
  const canAssign = hasPermission(permissions, PERMS.ORDERS_ASSIGN)
  const canCancel = hasPermission(permissions, PERMS.ORDERS_CANCEL)
  const canReadDrivers = hasPermission(permissions, PERMS.DRIVERS_READ)
  const [tab, setTab] = useState<OrderTab>('overview')
  const [action, setAction] = useState<OrderAction>(null)
  const [actionReason, setActionReason] = useState('')
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionInfo, setActionInfo] = useState<string | null>(null)
  const [refundOffset, setRefundOffset] = useState(0)
  const refundLimit = 20

  useEffect(() => {
    const dialog = searchParams.get('dialog')
    if (
      dialog === 'assign' ||
      dialog === 'reassign' ||
      dialog === 'status' ||
      dialog === 'cancel'
    ) {
      setActionReason('')
      setSelectedDriverId('')
      setActionError(null)
      setActionInfo(null)
      setAction(dialog)
      const next = new URLSearchParams(searchParams)
      next.delete('dialog')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const tabs = useMemo(
    () => [
      { id: 'overview', label: t('tabOverview') },
      { id: 'items', label: t('tabItems') },
      { id: 'timeline', label: t('tabTimelineActivity') },
      { id: 'notes', label: t('tabNotes') },
    ],
    [t],
  )
  const refundAction = {
    label: t('tabRefund'),
    onClick: () => setTab('refund'),
  }

  const actionTitle =
    action === 'assign'
      ? t('assignDriver')
      : action === 'reassign'
        ? t('reassignDriver')
        : action === 'status'
          ? t('changeOrderStatus')
          : action === 'cancel'
            ? t('cancelOrder')
            : ''

  function openAction(next: OrderAction) {
    setActionReason('')
    setSelectedDriverId('')
    setActionError(null)
    setActionInfo(null)
    setAction(next)
  }

  const q = useQuery({
    queryKey: ['order', id],
    queryFn: () => adminApi.getOrder(id),
    enabled: Boolean(id),
  })

  const driversQ = useQuery({
    queryKey: ['drivers', 'assign-picker'],
    queryFn: () =>
      adminApi.listDrivers({
        limit: 50,
        offset: 0,
        verificationStatus: 'APPROVED',
      }),
    enabled:
      canReadDrivers &&
      (action === 'assign' || action === 'reassign'),
  })

  const refundsQ = useQuery({
    queryKey: ['refunds', 'order', id, refundOffset],
    queryFn: () =>
      adminApi.listRefunds({ orderId: id, limit: refundLimit, offset: refundOffset }),
    enabled: Boolean(id) && tab === 'refund',
  })

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!id || !selectedDriverId) throw new Error('missing')
      return adminApi.assignOrderOffer(id, {
        driverId: selectedDriverId,
        reason: actionReason.trim(),
      })
    },
    onSuccess: async () => {
      setActionError(null)
      setActionInfo(t('orderActionSuccessAssign'))
      setAction(null)
      setActionReason('')
      setSelectedDriverId('')
      await queryClient.invalidateQueries({ queryKey: ['order', id] })
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (err) => {
      if (err instanceof ApiError && (err.status === 409 || err.status === 404)) {
        setActionError(t('orderActionConflict'))
        return
      }
      setActionError(err instanceof ApiError ? err.message : t('error'))
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('missing')
      return adminApi.cancelOrder(id, { reason: actionReason.trim() })
    },
    onSuccess: async () => {
      setActionError(null)
      setActionInfo(t('orderActionSuccessCancel'))
      setAction(null)
      setActionReason('')
      await queryClient.invalidateQueries({ queryKey: ['order', id] })
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (err) => {
      if (err instanceof ApiError && (err.status === 409 || err.status === 404)) {
        setActionError(t('orderActionConflict'))
        return
      }
      setActionError(err instanceof ApiError ? err.message : t('error'))
    },
  })

  if (q.isLoading) return <LoadingState />
  if (q.isError || !q.data) return <ErrorState onRetry={() => void q.refetch()} />
  const o = q.data
  const deliverySearching = o.delivery?.status === 'SEARCHING_DRIVER'
  const openOffer =
    Boolean(o.driver) &&
    o.driver?.assignmentStatus === 'OFFERED' &&
    deliverySearching
  const midMissionAccepted =
    o.driver?.assignmentStatus === 'ACCEPTED' ||
    (Boolean(o.delivery) &&
      o.delivery!.status !== 'SEARCHING_DRIVER' &&
      o.delivery!.status !== 'CANCELLED' &&
      o.delivery!.status !== 'FAILED')
  const earlyCancelEligible =
    o.status === 'CREATED' &&
    o.fulfillmentStatus === 'PENDING_ACCEPTANCE' &&
    (!o.delivery ||
      o.delivery.status === 'CANCELLED' ||
      o.delivery.status === 'FAILED')

  const actionConsequence =
    action === 'assign'
      ? t('orderActionConsequenceAssign')
      : action === 'reassign'
        ? openOffer
          ? t('orderActionBlockerReassignOffer')
          : t('orderActionConsequenceReassign')
        : action === 'status'
          ? t('orderActionConsequenceStatus')
          : action === 'cancel'
            ? t('orderActionConsequenceCancel')
            : ''

  let actionBlocker = ''
  let actionEnabled = false
  if (action === 'assign') {
    if (!canAssign) actionBlocker = t('orderActionBlockerAssignPerm')
    else if (!deliverySearching) actionBlocker = t('orderActionBlockerAssignState')
    else if (!selectedDriverId || !actionReason.trim())
      actionBlocker = t('orderActionBlockerAssign')
    else actionEnabled = true
  } else if (action === 'reassign') {
    if (midMissionAccepted && !openOffer) {
      actionBlocker = t('orderActionBlockerReassign')
    } else if (!canAssign) {
      actionBlocker = t('orderActionBlockerAssignPerm')
    } else if (!openOffer && !deliverySearching) {
      actionBlocker = t('orderActionBlockerReassign')
    } else if (!selectedDriverId || !actionReason.trim()) {
      actionBlocker = t('orderActionBlockerAssign')
    } else {
      actionEnabled = true
    }
  } else if (action === 'status') {
    actionBlocker = t('orderActionBlockerStatus')
  } else if (action === 'cancel') {
    if (!canCancel) actionBlocker = t('orderActionBlockerCancelPerm')
    else if (!earlyCancelEligible) actionBlocker = t('orderActionBlockerCancelState')
    else if (!actionReason.trim()) actionBlocker = t('orderActionBlockerCancel')
    else actionEnabled = true
  }

  const actionBusy = assignMutation.isPending || cancelMutation.isPending
  const showDriverPicker =
    (action === 'assign' || action === 'reassign') &&
    canAssign &&
    deliverySearching &&
    !(midMissionAccepted && !openOffer)
  const financial = o.financial
  const financeLabels = {
    commissionSection: t('commissionSection'),
    deliveryEconomySection: t('deliveryEconomySection'),
    itemsSubtotal: t('itemsSubtotal'),
    merchantCommission: t('merchantCommission'),
    merchantNet: t('merchantNet'),
    deliveryFee: t('deliveryFee'),
    customerDeliveryFee: t('customerDeliveryFeeShort'),
    driverRemuneration: t('driverRemuneration'),
    speedyGoDeliveryShare: t('speedyGoDeliveryShare'),
    customerPayable: t('customerPayable'),
  }

  const fullRef = o.publicReference
  const displayRef = fullRef.replace(/^sgo_/i, '#').startsWith('#')
    ? fullRef.replace(/^sgo_/i, '#')
    : `#${fullRef}`
  const showContextAside = tab === 'overview' || tab === 'items'
  const showPrimaryTabs = tab !== 'refund'

  return (
    <RequirePermission allOf={PERMS.ORDERS_READ}>
      <nav className="breadcrumb order-breadcrumb" aria-label="breadcrumb">
        <Link to="/orders">{t('orders')}</Link>
        <Icon name="chevron_right" />
        <span className="order-breadcrumb__current" title={fullRef}>
          {displayRef}
        </span>
      </nav>

      <header className="order-detail-hero card">
        <div className="order-detail-hero__top">
          <div>
            <div className="order-detail-hero__title-row">
              <h1>
                {t('orderTitlePrefix')}{' '}
                <span className="order-ref" title={fullRef}>
                  {displayRef}
                </span>
              </h1>
              <Badge tone={statusTone(o.status)}>{o.status}</Badge>
            </div>
            <p className="order-ref-full" title={fullRef}>
              {fullRef}
            </p>
            <p className="order-detail-hero__when">
              <Icon name="calendar_today" />
              <span>{new Date(o.createdAt).toLocaleString()}</span>
              {o.fulfillmentStatus ? (
                <span className="muted">· {o.fulfillmentStatus}</span>
              ) : null}
            </p>
          </div>
          <div className="page-actions order-detail-actions">
            {!o.driver ? (
              <Button variant="secondary" size="sm" onClick={() => openAction('assign')}>
                <Icon name="person_add" /> {t('assignDriver')}
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => openAction('reassign')}>
                <Icon name="swap_horiz" /> {t('reassignDriver')}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => openAction('status')}>
              <Icon name="update" /> {t('changeOrderStatus')}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => openAction('cancel')}>
              <Icon name="cancel" /> {t('cancelOrder')}
            </Button>
          </div>
        </div>
      </header>

      <div className="order-metric-grid">
        <MetricCard
          icon="receipt_long"
          label={t('orderTotalLabel')}
          value={
            financial ? formatDzdFromMinor(financial.customerPayableMinor) : '—'
          }
          hint={financial ? undefined : t('financialSnapshotMissing')}
        />
        <MetricCard
          icon="local_shipping"
          label={t('deliveryFee')}
          value={
            financial
              ? formatDzdFromMinor(financial.customerDeliveryFeeMinor)
              : '—'
          }
          hint={financial ? undefined : t('financialSnapshotMissing')}
        />
        <MetricCard
          icon="timer"
          label={t('deliveryElapsed')}
          value="—"
          hint={t('durationMetricUnavailable')}
        />
        <MetricCard
          icon="hourglass_top"
          label={t('statusElapsed')}
          value="—"
          hint={t('durationMetricUnavailable')}
        />
        <MetricCard
          icon="payments"
          label={t('partyPayment')}
          value={paymentLabel(o.payment?.method, t('paymentMethodCod'))}
          hint={o.payment?.status}
        />
      </div>

      <div className={showContextAside ? 'order-detail-shell' : 'order-detail-shell order-detail-shell--full'}>
        <div className="order-detail-main stack">
          {showPrimaryTabs ? (
            <EntityTabs tabs={tabs} active={tab} onChange={(next) => setTab(next as OrderTab)} />
          ) : (
            <div className="order-refund-nav">
              <Button variant="secondary" size="sm" onClick={() => setTab('overview')}>
                <Icon name="arrow_back" /> {t('tabOverview')}
              </Button>
              <strong>{t('tabRefund')}</strong>
            </div>
          )}

      {tab === 'overview' ? (
        <div className="stack order-overview-main">
          <div className="party-grid">
            <article className="party-card">
              <h3>
                <Icon name="person" />
                {t('partyCustomer')}
              </h3>
              <div className="identity-cell">
                {o.customer?.avatarUrl ? (
                  <img className="avatar" src={o.customer.avatarUrl} alt="" />
                ) : (
                  <span className="avatar" aria-hidden>
                    {(o.customer?.fullName ?? o.customerId).slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div>
                  <strong>{o.customer?.fullName ?? '—'}</strong>
                  <div className="muted text-metadata">{o.customer?.phone ?? '—'}</div>
                </div>
              </div>
              <div className="party-card__zone">
                <div className="party-card__zone-label">
                  <Icon name="location_on" />
                  {t('deliveryZone')}
                </div>
                <strong>{o.deliveryAddress?.addressText ?? '—'}</strong>
              </div>
            </article>
            <article className="party-card">
              <h3>
                <Icon name="storefront" />
                {t('partyMerchant')}
              </h3>
              {o.merchant ? (
                <>
                  <div className="identity-cell">
                    <span className="avatar avatar-square" aria-hidden>
                      <Icon name="restaurant" />
                    </span>
                    <div>
                      <strong>
                        <Link to={`/merchants/${o.merchant.merchantId}`}>
                          {o.merchant.merchantName}
                        </Link>
                      </strong>
                      <div className="muted text-metadata">{o.merchant.branchName}</div>
                    </div>
                  </div>
                  <div className="party-card__zone">
                    <div className="party-card__zone-label">
                      <Icon name="map" />
                      {t('addressLabel')}
                    </div>
                    <strong>{o.merchant.addressText}</strong>
                  </div>
                </>
              ) : (
                <p className="muted">—</p>
              )}
            </article>
          </div>

          <article className="order-driver-strip">
            {o.driver ? (
              <>
                <div className="identity-cell">
                  <span className="avatar avatar-lg" aria-hidden>
                    {o.driver.fullName.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <div className="order-driver-strip__name">
                      <strong>
                        <Link to={`/drivers/${o.driver.driverId}`}>{o.driver.fullName}</Link>
                      </strong>
                      <Badge tone="info">{o.driver.assignmentStatus}</Badge>
                    </div>
                    <div className="muted text-metadata">{o.driver.deliveryStatus}</div>
                    <div className="muted text-metadata">{t('driverPhotoUnavailable')}</div>
                  </div>
                </div>
                <div className="order-driver-strip__actions" aria-hidden>
                  <button type="button" className="icon-btn" disabled title={t('actionUnavailableHint')}>
                    <Icon name="call" />
                  </button>
                  <button type="button" className="icon-btn" disabled title={t('actionUnavailableHint')}>
                    <Icon name="chat" />
                  </button>
                </div>
              </>
            ) : (
              <div className="order-driver-strip__empty">
                <span className="avatar avatar-lg" aria-hidden>
                  <Icon name="local_shipping" />
                </span>
                <div>
                  <strong>{t('partyDriver')}</strong>
                  <p className="muted">{t('driverUnassigned')}</p>
                </div>
              </div>
            )}
          </article>
        </div>
      ) : null}

      {tab === 'items' ? (
        <div className="card order-items-card">
          <div className="card-header">
            <strong>{t('itemsDetailsTitle')}</strong>
          </div>
          <div className="card-body order-items-card__body">
            {o.items.length === 0 ? <EmptyState /> : null}
            {o.items.length > 0 ? (
              <div className="table-wrap">
                <table className="data items-shell-table">
                  <thead>
                    <tr>
                      <th>{t('itemCol')}</th>
                      <th className="num">{t('qtyCol')}</th>
                      <th className="num">{t('unitPrice')}</th>
                      <th className="num">{t('lineTotal')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.productNameSnapshot}</strong>
                          {item.options.length > 0 ? (
                            <ul className="order-item-options">
                              {item.options.map((opt, idx) => (
                                <li key={`${item.id}-opt-${idx}`}>
                                  {opt.optionNameSnapshot}
                                  <span className="muted">
                                    {' '}
                                    (+{formatDzdFromMinor(opt.additionalPriceMinor)})
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </td>
                        <td className="num">{item.quantity}</td>
                        <td className="num">{formatDzdFromMinor(item.unitPriceMinor)}</td>
                        <td className="num">{formatDzdFromMinor(item.lineTotalMinor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
          <div className="items-totals">
            <div className="finance-row">
              <span>{t('itemsSubtotal')}</span>
              <strong>
                {financial
                  ? formatDzdFromMinor(financial.grossMerchandiseSubtotalMinor)
                  : '—'}
              </strong>
            </div>
            <div className="finance-row">
              <span>{t('deliveryFee')}</span>
              <strong>
                {financial
                  ? formatDzdFromMinor(financial.customerDeliveryFeeMinor)
                  : '—'}
              </strong>
            </div>
            <div className="finance-row finance-row--emphasis">
              <span>{t('customerPayable')}</span>
              <strong>
                {financial
                  ? formatDzdFromMinor(financial.customerPayableMinor)
                  : '—'}
              </strong>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'timeline' ? (
        <OrderTimelinePanel order={o} events={o.timeline ?? []} />
      ) : null}

      {tab === 'refund' ? (
        <div className="stack">
          <UnavailablePanel
            title={t('refundEligibility')}
            detail={t('refundEligibilityUnavailable')}
          />
          <div className="card">
            <div className="card-header verify-viewer__toolbar">
              <strong>{t('tabRefund')}</strong>
              <Link
                className="btn btn-secondary btn-sm"
                to={`/collections/refunds?create=1&orderId=${encodeURIComponent(id)}`}
              >
                {t('createRefund')}
              </Link>
            </div>
            <div className="card-body stack">
              <p className="muted text-metadata">{t('orderRefundCreatePathHint')}</p>
              {refundsQ.isLoading ? <LoadingState /> : null}
              {refundsQ.isError ? (
                <ErrorState onRetry={() => void refundsQ.refetch()} />
              ) : null}
              {refundsQ.data?.items.length === 0 ? <EmptyState /> : null}
              {refundsQ.data && refundsQ.data.items.length > 0 ? (
                <>
                  <div className="table-wrap finance-table">
                    <table className="data">
                      <thead>
                        <tr>
                          <th>{t('reference')}</th>
                          <th>{t('status')}</th>
                          <th className="num">{t('totalAmount')}</th>
                          <th>{t('method')}</th>
                          <th>{t('createdAt')}</th>
                          <th className="num">{t('actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {refundsQ.data.items.map((r) => (
                          <tr key={r.id}>
                            <td className="mono">
                              <Link to={`/collections/refunds/${r.id}`}>
                                {r.id.slice(0, 8)}…
                              </Link>
                            </td>
                            <td>
                              <Badge tone={financeStatusTone(r.status)}>
                                {financeStatusLabel(r.status, t)}
                              </Badge>
                            </td>
                            <td className="num money">
                              {formatDzdFromMinor(r.amountMinor)}
                            </td>
                            <td>{financeStatusLabel(r.refundMethod, t)}</td>
                            <td>{new Date(r.createdAt).toLocaleString()}</td>
                            <td className="num">
                              <Link
                                className="btn btn-secondary btn-sm"
                                to={`/collections/refunds/${r.id}`}
                              >
                                {t('details')}
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    offset={refundOffset}
                    limit={refundLimit}
                    total={refundsQ.data.total}
                    onChange={setRefundOffset}
                  />
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'notes' ? (
        <div className="card">
          <div className="card-header">
            <strong>{t('tabNotes')}</strong>
          </div>
          <div className="card-body stack">
            <div className="field">
              <label>{t('tabNotes')}</label>
              <textarea rows={4} disabled placeholder="—" />
            </div>
            <Button disabled title={t('actionUnavailableHint')}>
              {t('save')}
            </Button>
            <UnavailablePanel title={t('tabNotes')} detail={t('notesUnavailable')} />
          </div>
        </div>
      ) : null}
        </div>

        {showContextAside ? (
          <aside className="stack order-detail-aside">
            <FinancialBreakdownCard
              financial={financial}
              title={t('financialBreakdown')}
              missingLabel={t('financialSnapshotMissing')}
              disclaimer={t('financialSnapshotDisclaimer')}
              labels={financeLabels}
              refundAction={refundAction}
            />
            <AuditContextCard order={o} canReadAudit={canReadAudit} />
          </aside>
        ) : null}
      </div>

      {actionInfo ? (
        <div className="banner banner-success" role="status">
          {actionInfo}
        </div>
      ) : null}

      {action ? (
        <Modal
          title={actionTitle}
          onClose={() => {
            if (actionBusy) return
            setAction(null)
            setActionReason('')
            setSelectedDriverId('')
            setActionError(null)
          }}
          footer={
            <>
              <Button
                variant="secondary"
                disabled={actionBusy}
                onClick={() => {
                  setAction(null)
                  setActionReason('')
                  setSelectedDriverId('')
                  setActionError(null)
                }}
              >
                {t('cancel')}
              </Button>
              <Button
                disabled={!actionEnabled || actionBusy}
                title={actionEnabled ? undefined : actionBlocker}
                aria-disabled={!actionEnabled || actionBusy}
                onClick={() => {
                  if (!actionEnabled || actionBusy) return
                  if (action === 'assign' || action === 'reassign') {
                    assignMutation.mutate()
                  } else if (action === 'cancel') {
                    cancelMutation.mutate()
                  }
                }}
              >
                {actionBusy ? t('orderActionBusy') : t('orderActionConfirmLabel')}
              </Button>
            </>
          }
        >
          <div className="stack order-action-dialog">
            <div className="order-action-dialog__ref">
              <span className="muted text-metadata">{t('orderActionOrderRef')}</span>
              <strong className="mono" title={fullRef}>
                {displayRef}
              </strong>
              <span className="muted text-metadata">
                {o.status}
                {o.fulfillmentStatus ? ` · ${o.fulfillmentStatus}` : ''}
                {o.delivery?.status ? ` · ${o.delivery.status}` : ''}
              </span>
            </div>
            <p className="order-action-dialog__consequence">{actionConsequence}</p>
            {showDriverPicker ? (
              <label className="field">
                <span>
                  {t('orderActionDriverLabel')}{' '}
                  <span className="text-error" aria-hidden>
                    *
                  </span>
                </span>
                <select
                  value={selectedDriverId}
                  disabled={actionBusy}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  aria-required
                >
                  <option value="">{t('orderActionDriverPlaceholder')}</option>
                  {(driversQ.data?.items ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {(action === 'assign' ||
              action === 'reassign' ||
              action === 'cancel') &&
            (actionEnabled ||
              showDriverPicker ||
              (action === 'cancel' && canCancel && earlyCancelEligible)) ? (
              <label className="field">
                <span>
                  {t('orderActionReasonLabel')}{' '}
                  <span className="text-error" aria-hidden>
                    *
                  </span>
                </span>
                <textarea
                  rows={3}
                  maxLength={255}
                  value={actionReason}
                  disabled={actionBusy}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder={t('orderActionReasonPlaceholder')}
                  aria-required
                />
                <span className="muted text-metadata">
                  {t('orderActionReasonRequired')}
                </span>
              </label>
            ) : null}
            {actionError ? (
              <div className="banner banner-error" role="alert">
                {actionError}
              </div>
            ) : null}
            {!actionEnabled && actionBlocker ? (
              <div className="banner banner-warn" role="status">
                {actionBlocker}
              </div>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </RequirePermission>
  )
}
