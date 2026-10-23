import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../lib/api/adminApi'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge, statusTone } from '../../components/ui/Badge'
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { PERMS } from '../../lib/permissions'
import { useI18n } from '../../lib/i18n/I18nProvider'
import type { MessageKey } from '../../lib/i18n/messages'
import { relativeAgeLabel } from '../dashboard/dashboardModel'

export type OrderQueueKind = 'delayed' | 'unassigned' | 'failure'

const COPY: Record<
  OrderQueueKind,
  { title: MessageKey; subtitle: MessageKey; refLabel: string }
> = {
  delayed: {
    title: 'queueDelayedTitle',
    subtitle: 'queueDelayedSubtitle',
    refLabel: 'A050',
  },
  unassigned: {
    title: 'queueUnassignedTitle',
    subtitle: 'queueUnassignedSubtitle',
    refLabel: 'A051',
  },
  failure: {
    title: 'queueFailureTitle',
    subtitle: 'queueFailureSubtitle',
    refLabel: 'A052',
  },
}

/**
 * Distinct queue workspaces for A050–A052.
 * Layout-complete presentation; no dedicated queue API — ACTIVE orders as read-only context only.
 * Functional queue filtering / delay metrics remain contract-blocked.
 */
export function OrderQueuePage({ kind }: { kind: OrderQueueKind }) {
  const { t } = useI18n()
  const copy = COPY[kind]
  const q = useQuery({
    queryKey: ['orders', 'queue-context', kind],
    queryFn: () => adminApi.listOrders({ limit: 20, offset: 0, status: 'ACTIVE' }),
  })

  return (
    <RequirePermission allOf={PERMS.ORDERS_READ}>
      <nav className="breadcrumb text-metadata" aria-label="Breadcrumb">
        <Link to="/orders">{t('orders')}</Link>
        <span aria-hidden> › </span>
        <span>{t(copy.title)}</span>
      </nav>
      <PageHeader
        title={t(copy.title)}
        subtitle={`${t(copy.subtitle)} · ${copy.refLabel}`}
        actions={
          <>
            <Link className="btn btn-secondary btn-sm" to="/orders">
              {t('back')}
            </Link>
            <Button variant="secondary" size="sm" onClick={() => void q.refetch()}>
              {t('refresh')}
            </Button>
          </>
        }
      />
      <div className="banner banner-info">{t('queuePresentationOnly')}</div>
      <p className="muted text-metadata" style={{ marginTop: -8 }}>
        {t('queueApiMissing')}
      </p>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <strong>{t('filters')}</strong>
        </div>
        <div className="card-body toolbar">
          <label>
            {t('status')}
            <select disabled value="ACTIVE" title={t('queueApiMissing')}>
              <option>ACTIVE</option>
            </select>
          </label>
          <label>
            {t('merchant')}
            <select disabled title={t('queueApiMissing')}>
              <option>{t('allStatuses')}</option>
            </select>
          </label>
          <label>
            {t('situation')}
            <select disabled title={t('queueApiMissing')}>
              <option>{t('allStatuses')}</option>
            </select>
          </label>
          <Button variant="secondary" size="sm" disabled title={t('queueApiMissing')}>
            {t('resetFilters')}
          </Button>
        </div>
      </div>

      {q.isLoading ? <LoadingState /> : null}
      {q.isError ? <ErrorState onRetry={() => void q.refetch()} /> : null}
      {q.data?.items.length === 0 ? <EmptyState /> : null}
      {q.data && q.data.items.length > 0 ? (
        <div className="card">
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data">
              <thead>
                <tr>
                  <th>{t('orderCol')}</th>
                  <th>{t('situation')}</th>
                  <th>{t('customer')}</th>
                  <th>{t('merchant')}</th>
                  <th>{t('driver')}</th>
                  <th>{t('zone')}</th>
                  <th>{t('since')}</th>
                  <th className="num">{t('amount')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {q.data.items.map((o) => (
                  <tr key={o.id}>
                    <td className="mono">{o.publicReference}</td>
                    <td>
                      <Badge tone={statusTone(o.status)}>{o.status}</Badge>
                    </td>
                    <td className="mono muted" title={o.customerId}>
                      {o.customerId.slice(0, 8)}…
                    </td>
                    <td className="mono muted" title={o.merchantBranchId}>
                      {o.merchantBranchId.slice(0, 8)}…
                    </td>
                    <td className="muted">—</td>
                    <td className="muted">—</td>
                    <td className="muted">{relativeAgeLabel(o.createdAt)}</td>
                    <td className="num muted">—</td>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <Link className="btn btn-primary btn-sm" to={`/orders/${o.id}`}>
                          {t('open')}
                        </Link>
                        <Button size="sm" variant="secondary" disabled title={t('actionUnavailableHint')}>
                          {t('assignDriver')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card-body" style={{ borderTop: '1px solid #e4e8f0' }}>
            <span className="muted text-metadata">
              {q.data.items.length} / {q.data.total} · {t('queuePresentationOnly')}
            </span>
          </div>
        </div>
      ) : null}
    </RequirePermission>
  )
}
