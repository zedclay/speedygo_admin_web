import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminApi } from '../../lib/api/adminApi'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { Badge, statusTone } from '../../components/ui/Badge'
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { Icon } from '../../components/ui/Icon'
import { PERMS } from '../../lib/permissions'
import { useI18n } from '../../lib/i18n/I18nProvider'

/** A020 drivers list — KPI tiles from list totals; unknown columns show —. */
export function DriversListPage() {
  const { t } = useI18n()
  const [offset, setOffset] = useState(0)
  const [verificationStatus, setVerificationStatus] = useState('')
  const [search, setSearch] = useState('')
  const limit = 20

  const q = useQuery({
    queryKey: ['drivers', offset, verificationStatus],
    queryFn: () =>
      adminApi.listDrivers({
        limit,
        offset,
        verificationStatus: verificationStatus || undefined,
      }),
  })
  const queue = useQuery({
    queryKey: ['drivers', 'queue', 'badge'],
    queryFn: () => adminApi.driverVerificationQueue({ limit: 1, offset: 0 }),
  })
  const totals = useQuery({
    queryKey: ['drivers', 'kpi'],
    queryFn: async () => {
      const [all, pending, approved, suspended] = await Promise.all([
        adminApi.listDrivers({ limit: 1, offset: 0 }),
        adminApi.listDrivers({ limit: 1, offset: 0, verificationStatus: 'PENDING_REVIEW' }),
        adminApi.listDrivers({ limit: 1, offset: 0, verificationStatus: 'APPROVED' }),
        adminApi.listDrivers({ limit: 1, offset: 0, verificationStatus: 'SUSPENDED' }),
      ])
      return {
        total: all.total,
        pending: pending.total,
        approved: approved.total,
        suspended: suspended.total,
      }
    },
  })

  const filteredItems = useMemo(() => {
    const items = q.data?.items ?? []
    const s = search.trim().toLowerCase()
    if (!s) return items
    return items.filter(
      (d) =>
        d.fullName.toLowerCase().includes(s) ||
        d.id.toLowerCase().includes(s),
    )
  }, [q.data?.items, search])

  function resetFilters() {
    setVerificationStatus('')
    setSearch('')
    setOffset(0)
  }

  return (
    <RequirePermission anyOf={[PERMS.DRIVERS_READ]}>
      <PageHeader
        title={t('driversListTitle')}
        subtitle={t('driversListSubtitle')}
        actions={
          <>
            <Link className="btn btn-secondary btn-sm" to="/drivers/verification">
              {t('verificationQueue')}
              {queue.data ? (
                <span className="count-badge">{queue.data.total}</span>
              ) : null}
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

      <div className="grid-kpi">
        <div className="kpi">
          <div className="kpi-label">{t('kpiDriversTotal')}</div>
          <div className="kpi-value">{totals.data?.total ?? '—'}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">{t('kpiDriversOnline')}</div>
          <div className="kpi-value" title={t('metricUnavailable')}>
            —
          </div>
          <div className="muted text-metadata">{t('metricUnavailable')}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">{t('kpiDriversOnMission')}</div>
          <div className="kpi-value" title={t('metricUnavailable')}>
            —
          </div>
          <div className="muted text-metadata">{t('metricUnavailable')}</div>
        </div>
        <div
          className={`kpi${(totals.data?.pending ?? 0) > 0 ? ' warning' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => {
            setVerificationStatus('PENDING_REVIEW')
            setOffset(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setVerificationStatus('PENDING_REVIEW')
              setOffset(0)
            }
          }}
        >
          <div className="kpi-label">{t('kpiDriversPending')}</div>
          <div className="kpi-value">{totals.data?.pending ?? '—'}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">{t('kpiDriversSuspended')}</div>
          <div className="kpi-value">{totals.data?.suspended ?? '—'}</div>
        </div>
      </div>

      <div className="toolbar filter-bar">
        <label>
          {t('search')}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchDriverPlaceholder')}
          />
        </label>
        <label>
          {t('verification')}
          <select
            value={verificationStatus}
            onChange={(e) => {
              setVerificationStatus(e.target.value)
              setOffset(0)
            }}
          >
            <option value="">{t('allStatuses')}</option>
            <option value="PENDING_REVIEW">PENDING_REVIEW</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="UNVERIFIED">UNVERIFIED</option>
          </select>
        </label>
        <label>
          {t('availability')}
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
      {q.data && filteredItems.length === 0 ? <EmptyState /> : null}
      {q.data && filteredItems.length > 0 ? (
        <>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t('driver')}</th>
                  <th>{t('verification')}</th>
                  <th>{t('vehicle')}</th>
                  <th>{t('availability')}</th>
                  <th>{t('zone')}</th>
                  <th>{t('currentMission')}</th>
                  <th>{t('rating')}</th>
                  <th>{t('lastActivity')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((d) => (
                  <tr key={d.id} className="row-actions-hover">
                    <td>
                      <div className="row" style={{ gap: 10 }}>
                        <span className="avatar">{d.fullName.slice(0, 1)}</span>
                        <div>
                          <div className="text-body-semibold">{d.fullName}</div>
                          <div className="mono muted">{d.id.slice(0, 8)}…</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge tone={statusTone(d.verificationStatus)}>
                        {d.verificationStatus}
                      </Badge>
                    </td>
                    <td className="muted">—</td>
                    <td className="muted">—</td>
                    <td className="muted">—</td>
                    <td className="muted">—</td>
                    <td className="muted">—</td>
                    <td>
                      {d.approvedAt
                        ? new Date(d.approvedAt).toLocaleString()
                        : new Date(d.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link
                          to={`/drivers/${d.id}`}
                          className="icon-btn"
                          title={t('details')}
                        >
                          <Icon name="person" />
                        </Link>
                        <span
                          className="icon-btn"
                          title={t('metricUnavailable')}
                          aria-disabled
                        >
                          <Icon name="visibility" />
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            total={q.data.total}
            limit={limit}
            offset={offset}
            onChange={setOffset}
          />
        </>
      ) : null}
    </RequirePermission>
  )
}
