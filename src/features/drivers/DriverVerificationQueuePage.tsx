import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminApi } from '../../lib/api/adminApi'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { Badge, statusTone } from '../../components/ui/Badge'
import { Icon } from '../../components/ui/Icon'
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { VerificationFilterChips } from '../../components/verification/VerificationFilterChips'
import { PERMS } from '../../lib/permissions'
import { useI18n } from '../../lib/i18n/I18nProvider'

const DRIVER_FILTER_CHIPS = [
  { id: 'status', labelKey: 'filterStatus' },
  { id: 'zone', labelKey: 'filterZone' },
  { id: 'vehicle', labelKey: 'filterVehicleType' },
  { id: 'period', labelKey: 'filterPeriod' },
] as const

export function DriverVerificationQueuePage() {
  const { t } = useI18n()
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const limit = 20
  const q = useQuery({
    queryKey: ['drivers', 'queue', offset],
    queryFn: () => adminApi.driverVerificationQueue({ limit, offset }),
  })

  const filtered = useMemo(() => {
    const items = q.data?.items ?? []
    const term = search.trim().toLowerCase()
    if (!term) return items
    return items.filter((d) => d.fullName.toLowerCase().includes(term))
  }, [q.data?.items, search])

  const toReview = q.data?.total ?? 0

  return (
    <RequirePermission allOf={PERMS.DRIVERS_VERIFY}>
      <nav className="breadcrumb order-breadcrumb" aria-label="breadcrumb">
        <Link to="/drivers">{t('drivers')}</Link>
        <Icon name="chevron_right" />
        <span className="order-breadcrumb__current">{t('verificationQueue')}</span>
      </nav>

      <div className="verify-page-header">
        <div>
          <Link className="verify-back-link" to="/drivers">
            <Icon name="arrow_back" /> {t('backToDriversList')}
          </Link>
          <h1 className="text-page-title">{t('verificationQueue')}</h1>
          <p className="muted">{t('driverVerificationQueueHint')}</p>
        </div>
        <Button variant="secondary" size="sm" disabled title={t('exportUnavailable')}>
          <Icon name="download" /> {t('export')}
        </Button>
      </div>

      <div className="verify-kpi-grid">
        <article className="verify-kpi-card">
          <span className="verify-kpi-card__label">{t('queueToReview')}</span>
          <strong className="verify-kpi-card__value verify-kpi-card__value--primary">
            {q.isLoading ? '—' : toReview}
          </strong>
        </article>
        <article className="verify-kpi-card">
          <span className="verify-kpi-card__label">{t('queueToComplete')}</span>
          <strong className="verify-kpi-card__value" title={t('metricUnavailable')}>
            —
          </strong>
          <span className="muted text-metadata">{t('metricUnavailable')}</span>
        </article>
        <article className="verify-kpi-card">
          <span className="verify-kpi-card__label">{t('queueRejectedRecent')}</span>
          <strong className="verify-kpi-card__value" title={t('metricUnavailable')}>
            —
          </strong>
          <span className="muted text-metadata">{t('metricUnavailable')}</span>
        </article>
        <article className="verify-kpi-card">
          <span className="verify-kpi-card__label">{t('queueVerifiedToday')}</span>
          <strong className="verify-kpi-card__value" title={t('metricUnavailable')}>
            —
          </strong>
          <span className="muted text-metadata">{t('metricUnavailable')}</span>
        </article>
      </div>

      <VerificationFilterChips
        search={search}
        onSearchChange={setSearch}
        chips={[...DRIVER_FILTER_CHIPS]}
        onRefresh={() => void q.refetch()}
      />

      {q.isLoading ? <LoadingState /> : null}
      {q.isError ? <ErrorState onRetry={() => void q.refetch()} /> : null}
      {q.data && filtered.length === 0 ? <EmptyState /> : null}
      {q.data && filtered.length > 0 ? (
        <>
          <div className="table-wrap verify-table">
            <table className="data">
              <thead>
                <tr>
                  <th>{t('driver')}</th>
                  <th>{t('reference')}</th>
                  <th>{t('vehicle')}</th>
                  <th>{t('zone')}</th>
                  <th>{t('createdAt')}</th>
                  <th>{t('documentsReceived')}</th>
                  <th>{t('status')}</th>
                  <th className="num">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div className="identity-cell">
                        <span className="avatar" aria-hidden>
                          {d.fullName.slice(0, 2).toUpperCase()}
                        </span>
                        <strong>{d.fullName}</strong>
                      </div>
                    </td>
                    <td className="mono muted" title={d.id}>
                      {d.id.slice(0, 8)}…
                    </td>
                    <td>
                      {d.vehicleType ? (
                        <>
                          <div>{d.vehicleType}</div>
                          {d.vehiclePlate ? (
                            <div className="muted text-metadata mono">
                              {d.vehiclePlate}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="muted" title={t('metricUnavailable')}>
                      —
                    </td>
                    <td>{new Date(d.createdAt).toLocaleDateString()}</td>
                    <td>
                      {typeof d.documentsReceived === 'number' ? (
                        <span className="verify-docs-ok">
                          <Icon name="check_circle" /> {d.documentsReceived}{' '}
                          {t('documents').toLowerCase()}
                        </span>
                      ) : (
                        <span className="muted" title={t('metricUnavailable')}>
                          —
                        </span>
                      )}
                    </td>
                    <td>
                      <Badge tone={statusTone(d.verificationStatus)}>
                        {d.verificationStatus}
                      </Badge>
                    </td>
                    <td className="num">
                      <Link
                        className="btn btn-primary btn-sm"
                        to={`/drivers/${d.id}/verification`}
                      >
                        {t('examineFile')}
                      </Link>
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
