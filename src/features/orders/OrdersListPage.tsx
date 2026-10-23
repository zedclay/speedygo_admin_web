import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminApi } from '../../lib/api/adminApi'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { Badge, statusTone } from '../../components/ui/Badge'
import { Icon } from '../../components/ui/Icon'
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { PERMS } from '../../lib/permissions'
import { useI18n } from '../../lib/i18n/I18nProvider'
import { formatDzdFromMinor } from '../../lib/money'
import { relativeAgeLabel } from '../dashboard/dashboardModel'

const ORDER_STATUSES = [
  'CREATED',
  'CONFIRMED',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'FAILED',
] as const

/** A041 orders hub — party names / zone / total unavailable stay — or truncated IDs. */
export function OrdersListPage() {
  const { t } = useI18n()
  const [offset, setOffset] = useState(0)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const limit = 20
  const q = useQuery({
    queryKey: ['orders', offset, status],
    queryFn: () => adminApi.listOrders({ limit, offset, status: status || undefined }),
  })

  const filtered = useMemo(() => {
    const items = q.data?.items ?? []
    const s = search.trim().toLowerCase()
    if (!s) return items
    return items.filter(
      (o) =>
        o.publicReference.toLowerCase().includes(s) ||
        o.id.toLowerCase().includes(s) ||
        o.customerId.toLowerCase().includes(s),
    )
  }, [q.data?.items, search])

  function resetFilters() {
    setStatus('')
    setSearch('')
    setOffset(0)
  }

  return (
    <RequirePermission allOf={PERMS.ORDERS_READ}>
      <PageHeader
        title={t('ordersListTitle')}
        subtitle={t('ordersListSubtitle')}
        actions={
          <>
            <Link className="btn btn-secondary btn-sm" to="/operations">
              {t('liveOps')}
            </Link>
            <Link className="btn btn-secondary btn-sm" to="/orders/queues/delayed">
              {t('queueDelayedTitle')}
            </Link>
            <Link className="btn btn-secondary btn-sm" to="/orders/queues/unassigned">
              {t('queueUnassignedTitle')}
            </Link>
            <Button variant="secondary" size="sm" disabled title={t('exportUnavailable')}>
              {t('export')}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void q.refetch()}>
              {t('refresh')}
            </Button>
          </>
        }
      />
      <div className="toolbar filter-bar">
        <label>
          {t('search')}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchOrderPlaceholder')}
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
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('merchant')}
          <select disabled title={t('metricUnavailable')}>
            <option>{t('allStatuses')}</option>
          </select>
        </label>
        <label>
          {t('zone')}
          <select disabled title={t('metricUnavailable')}>
            <option>{t('allStatuses')}</option>
          </select>
        </label>
        <Button variant="secondary" size="sm" onClick={resetFilters}>
          {t('resetFilters')}
        </Button>
      </div>
      {q.isLoading ? <LoadingState /> : null}
      {q.isError ? <ErrorState onRetry={() => void q.refetch()} /> : null}
      {q.data && filtered.length === 0 ? <EmptyState /> : null}
      {q.data && filtered.length > 0 ? (
        <>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t('reference')}</th>
                  <th>{t('status')}</th>
                  <th>{t('customer')}</th>
                  <th>{t('merchant')}</th>
                  <th>{t('driver')}</th>
                  <th>{t('customerZone')}</th>
                  <th>{t('elapsed')}</th>
                  <th className="num">{t('totalAmount')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="row-actions-hover">
                    <td className="mono">{o.publicReference}</td>
                    <td>
                      <Badge tone={statusTone(o.status)}>{o.status}</Badge>
                    </td>
                    <td title={o.customerId}>
                      {o.customerFullName ?? (
                        <span className="mono muted">{o.customerId.slice(0, 8)}…</span>
                      )}
                    </td>
                    <td title={o.merchantBranchId}>
                      {o.merchantName ?? o.merchantBranchName ?? (
                        <span className="mono muted">
                          {o.merchantBranchId.slice(0, 8)}…
                        </span>
                      )}
                    </td>
                    <td className="muted">—</td>
                    <td className="muted">—</td>
                    <td className="muted">{relativeAgeLabel(o.createdAt)}</td>
                    <td className="num">
                      {o.customerPayableMinor != null
                        ? formatDzdFromMinor(o.customerPayableMinor)
                        : '—'}
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link to={`/orders/${o.id}`} className="icon-btn" title={t('details')}>
                          <Icon name="open_in_new" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={q.data.total} limit={limit} offset={offset} onChange={setOffset} />
        </>
      ) : null}
    </RequirePermission>
  )
}
