import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminApi } from '../../lib/api/adminApi'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { Icon } from '../../components/ui/Icon'
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { PERMS } from '../../lib/permissions'
import { useI18n } from '../../lib/i18n/I18nProvider'

/** A012 customer list — Stitch columns; phone/status/counts unavailable stay —. */
export function CustomersListPage() {
  const { t } = useI18n()
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const limit = 20
  const q = useQuery({
    queryKey: ['customers', offset],
    queryFn: () => adminApi.listCustomers({ limit, offset }),
  })

  const filtered = useMemo(() => {
    const items = q.data?.items ?? []
    const s = search.trim().toLowerCase()
    if (!s) return items
    return items.filter(
      (c) => c.fullName.toLowerCase().includes(s) || c.id.toLowerCase().includes(s),
    )
  }, [q.data?.items, search])

  return (
    <RequirePermission allOf={PERMS.CUSTOMERS_READ}>
      <PageHeader
        title={t('customersListTitle')}
        subtitle={t('customersListSubtitle')}
        actions={
          <>
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
            placeholder={t('searchCustomerPlaceholder')}
          />
        </label>
        <label>
          {t('status')}
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
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setSearch('')
            setOffset(0)
          }}
        >
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
                  <th>{t('customer')}</th>
                  <th>{t('phone')}</th>
                  <th>{t('status')}</th>
                  <th>{t('ordersCount')}</th>
                  <th>{t('complaintsCount')}</th>
                  <th>{t('lastActivity')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="row-actions-hover">
                    <td>
                      <div className="identity-cell">
                        {c.avatarUrl ? (
                          <img className="avatar" src={c.avatarUrl} alt="" />
                        ) : (
                          <span className="avatar">{c.fullName.slice(0, 1)}</span>
                        )}
                        <div>
                          <div className="text-body-semibold">{c.fullName}</div>
                          <div className="mono muted">{c.id.slice(0, 8)}…</div>
                        </div>
                      </div>
                    </td>
                    <td>{c.phone ?? '—'}</td>
                    <td>
                      {c.accountStatus === 'ACTIVE'
                        ? t('accountStatusActive')
                        : c.accountStatus === 'SUSPENDED'
                          ? t('accountStatusSuspended')
                          : c.accountStatus === 'DISABLED'
                            ? t('accountStatusDisabled')
                            : (c.accountStatus ?? '—')}
                    </td>
                    <td className="muted">—</td>
                    <td className="muted">—</td>
                    <td>{new Date(c.createdAt).toLocaleString()}</td>
                    <td>
                      <div className="row-actions">
                        <Link
                          to={`/customers/${c.id}`}
                          className="icon-btn"
                          title={t('details')}
                        >
                          <Icon name="person" />
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
