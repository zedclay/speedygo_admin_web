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

/** A031 merchant list — category/wilaya/store state unavailable stay —. */
export function MerchantsListPage() {
  const { t } = useI18n()
  const [offset, setOffset] = useState(0)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const limit = 20
  const q = useQuery({
    queryKey: ['merchants', offset, status],
    queryFn: () => adminApi.listMerchants({ limit, offset, status: status || undefined }),
  })
  const queue = useQuery({
    queryKey: ['merchants', 'queue', 'badge'],
    queryFn: () => adminApi.merchantVerificationQueue({ limit: 1, offset: 0 }),
  })

  const filtered = useMemo(() => {
    const items = q.data?.items ?? []
    const s = search.trim().toLowerCase()
    if (!s) return items
    return items.filter(
      (m) =>
        m.name.toLowerCase().includes(s) ||
        m.id.toLowerCase().includes(s) ||
        (m.publicReference ?? '').toLowerCase().includes(s),
    )
  }, [q.data?.items, search])

  function resetFilters() {
    setStatus('')
    setSearch('')
    setOffset(0)
  }

  return (
    <RequirePermission anyOf={[PERMS.MERCHANTS_READ]}>
      <PageHeader
        title={t('merchantsListTitle')}
        subtitle={t('merchantsListSubtitle')}
        actions={
          <>
            <Link className="btn btn-secondary btn-sm" to="/merchants/verification">
              {t('verificationQueue')}
              {queue.data ? <span className="count-badge">{queue.data.total}</span> : null}
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
            placeholder={t('searchMerchantPlaceholder')}
          />
        </label>
        <label>
          {t('verification')}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setOffset(0)
            }}
          >
            <option value="">{t('allStatuses')}</option>
            <option value="PENDING_REVIEW">PENDING_REVIEW</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </label>
        <label>
          {t('category')}
          <select disabled title={t('metricUnavailable')}>
            <option>{t('allStatuses')}</option>
          </select>
        </label>
        <label>
          {t('wilaya')}
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
                  <th>{t('merchant')}</th>
                  <th>{t('category')}</th>
                  <th>{t('wilaya')}</th>
                  <th>{t('verification')}</th>
                  <th>{t('storeState')}</th>
                  <th>{t('ordersCount')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="row-actions-hover">
                    <td>
                      <div className="identity-cell">
                        <span className="avatar">{m.name.slice(0, 1)}</span>
                        <div>
                          <div className="text-body-semibold">{m.name}</div>
                          <div className="mono muted">{m.publicReference ?? `${m.id.slice(0, 8)}…`}</div>
                        </div>
                      </div>
                    </td>
                    <td className="muted">—</td>
                    <td className="muted">—</td>
                    <td>
                      <Badge tone={statusTone(m.status)}>{m.status}</Badge>
                    </td>
                    <td className="muted">—</td>
                    <td className="muted">—</td>
                    <td>
                      <div className="row-actions">
                        <Link
                          to={`/merchants/${m.id}`}
                          className="icon-btn"
                          title={t('details')}
                        >
                          <Icon name="storefront" />
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
