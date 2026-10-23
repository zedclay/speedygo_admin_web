import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminApi } from '../../lib/api/adminApi'
import { formatDzdFromMinor } from '../../lib/money'
import { Badge, statusTone } from '../../components/ui/Badge'
import { Icon } from '../../components/ui/Icon'
import { Pagination } from '../../components/ui/Pagination'
import {
  EmptyState,
  ErrorState,
  ForbiddenState,
  LoadingState,
} from '../../components/ui/StateBoxes'
import { PERMS, hasPermission } from '../../lib/permissions'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { useI18n } from '../../lib/i18n/I18nProvider'
import { relativeAgeLabel } from '../dashboard/dashboardModel'
import { PartyAvatar } from './PartyAvatar'
import { orderPeriodBounds, type OrderPeriodPreset } from './orderPeriod'
import { orderStatusLabelKey } from './orderStatusUi'

const ORDER_STATUSES = [
  'CREATED',
  'CONFIRMED',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'FAILED',
] as const

type Scope =
  | { kind: 'customer'; customerId: string }
  | { kind: 'merchant'; merchantId: string }

const PERIODS: { id: OrderPeriodPreset; labelKey: 'periodAll' | 'periodToday' | 'period7d' | 'period30d' }[] =
  [
    { id: 'all', labelKey: 'periodAll' },
    { id: 'today', labelKey: 'periodToday' },
    { id: '7d', labelKey: 'period7d' },
    { id: '30d', labelKey: 'period30d' },
  ]

/**
 * Nested order history (A015 customer / A037 merchant).
 * Status + period filters applied server-side before pagination.
 */
export function ScopedOrdersPanel({
  scope,
  partyColumn,
  compact = false,
}: {
  scope: Scope
  partyColumn: 'merchant' | 'customer'
  compact?: boolean
}) {
  const { t } = useI18n()
  const permissions = useSessionStore((s) => s.me?.permissions)
  const canRead = hasPermission(permissions, PERMS.ORDERS_READ)
  const [offset, setOffset] = useState(0)
  const [status, setStatus] = useState('')
  const [period, setPeriod] = useState<OrderPeriodPreset>('all')
  const limit = compact ? 5 : 20
  const periodBounds = useMemo(() => orderPeriodBounds(period), [period])

  const q = useQuery({
    queryKey: [
      'scoped-orders',
      scope.kind,
      scope.kind === 'customer' ? scope.customerId : scope.merchantId,
      offset,
      status,
      period,
      limit,
    ],
    queryFn: () =>
      adminApi.listOrders({
        limit,
        offset: compact ? 0 : offset,
        status: status || undefined,
        ...periodBounds,
        ...(scope.kind === 'customer'
          ? { customerId: scope.customerId }
          : { merchantId: scope.merchantId }),
      }),
    enabled: canRead,
  })

  if (!canRead) {
    return <ForbiddenState message={t('ordersReadRequired')} />
  }

  return (
    <div className="stack">
      {!compact ? (
        <div className="toolbar filter-bar scoped-orders-toolbar">
          <label className="scoped-orders-search">
            {t('search')}
            <input
              disabled
              placeholder={t('searchOrderPlaceholder')}
              title={t('orderSearchUnavailable')}
            />
          </label>
          <label>
            {t('status')}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setOffset(0)
              }}
            >
              <option value="">{t('allStatuses')}</option>
              {ORDER_STATUSES.map((s) => {
                const labelKey = orderStatusLabelKey(s)
                return (
                  <option key={s} value={s}>
                    {labelKey ? t(labelKey) : s}
                  </option>
                )
              })}
            </select>
          </label>
          <div className="period-chip-row" role="group" aria-label={t('period')}>
            <span className="period-chip-row__label">
              <Icon name="date_range" /> {t('period')}
            </span>
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`period-chip${period === p.id ? ' period-chip--active' : ''}`}
                onClick={() => {
                  setPeriod(p.id)
                  setOffset(0)
                }}
              >
                {t(p.labelKey)}
              </button>
            ))}
          </div>
          {q.data ? (
            <span className="muted text-metadata">
              {t('ordersMatchingCount')}: {q.data.total}
            </span>
          ) : null}
        </div>
      ) : null}
      {q.isLoading ? <LoadingState /> : null}
      {q.isError ? <ErrorState onRetry={() => void q.refetch()} /> : null}
      {q.data && q.data.items.length === 0 ? (
        <EmptyState label={t('ordersHistoryEmpty')} />
      ) : null}
      {q.data && q.data.items.length > 0 ? (
        <>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th className="col-ref">{t('reference')}</th>
                  <th className="col-party">
                    {partyColumn === 'merchant' ? t('merchant') : t('customer')}
                  </th>
                  <th className="col-date">{t('createdAt')}</th>
                  <th className="col-amount">{t('totalAmount')}</th>
                  <th className="col-status">{t('status')}</th>
                  <th className="col-actions">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {q.data.items.map((o) => {
                  const partyName =
                    partyColumn === 'merchant'
                      ? o.merchantName ?? o.merchantBranchName
                      : o.customerFullName
                  const partyTitle =
                    partyColumn === 'merchant'
                      ? [o.merchantName, o.merchantBranchName]
                          .filter(Boolean)
                          .join(' · ') || o.merchantBranchId
                      : o.customerFullName ?? o.customerId
                  const statusKey = orderStatusLabelKey(o.status)
                  return (
                    <tr key={o.id} className="row-actions-hover">
                      <td className="col-ref mono">
                        <Link to={`/orders/${o.id}`}>{o.publicReference}</Link>
                      </td>
                      <td className="col-party" title={partyTitle}>
                        <span className="party-cell">
                          <PartyAvatar
                            name={partyName}
                            avatarUrl={
                              partyColumn === 'customer'
                                ? o.customerAvatarUrl
                                : null
                            }
                          />
                          <span>
                            {partyName ?? (
                              <span className="mono muted">
                                {partyColumn === 'merchant'
                                  ? `${o.merchantBranchId.slice(0, 8)}…`
                                  : `${o.customerId.slice(0, 8)}…`}
                              </span>
                            )}
                          </span>
                        </span>
                      </td>
                      <td className="col-date muted">
                        {relativeAgeLabel(o.createdAt)}
                      </td>
                      <td className="col-amount">
                        {o.customerPayableMinor != null
                          ? formatDzdFromMinor(o.customerPayableMinor)
                          : '—'}
                      </td>
                      <td className="col-status">
                        <Badge tone={statusTone(o.status)}>
                          {statusKey ? t(statusKey) : o.status}
                        </Badge>
                      </td>
                      <td className="col-actions">
                        <div className="row-actions">
                          <Link
                            to={`/orders/${o.id}`}
                            className="icon-btn"
                            title={t('details')}
                          >
                            <Icon name="open_in_new" />
                          </Link>
                          <button
                            type="button"
                            className="icon-btn"
                            disabled
                            title={t('orderRowMenuUnavailable')}
                          >
                            <Icon name="more_vert" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {!compact ? (
            <Pagination
              total={q.data.total}
              limit={limit}
              offset={offset}
              onChange={setOffset}
            />
          ) : q.data.total > limit ? (
            <p className="muted text-metadata">
              {t('ordersMatchingCount')}: {q.data.total}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

/** Server-filtered order total for entity KPI — never page length. */
export function useScopedOrdersTotal(
  scope: Scope | null,
  enabled: boolean,
): { total: number | null; isLoading: boolean } {
  const permissions = useSessionStore((s) => s.me?.permissions)
  const canRead = hasPermission(permissions, PERMS.ORDERS_READ)
  const q = useQuery({
    queryKey: [
      'scoped-orders-total',
      scope?.kind,
      scope?.kind === 'customer' ? scope.customerId : scope?.merchantId,
    ],
    queryFn: () =>
      adminApi.listOrders({
        limit: 1,
        offset: 0,
        ...(scope!.kind === 'customer'
          ? { customerId: scope!.customerId }
          : { merchantId: scope!.merchantId }),
      }),
    enabled: Boolean(scope) && enabled && canRead,
  })
  return {
    total: q.data?.total ?? null,
    isLoading: q.isLoading,
  }
}
