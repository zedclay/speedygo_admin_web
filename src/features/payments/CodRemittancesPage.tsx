import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminApi } from '../../lib/api/adminApi'
import { formatDzdFromMinor } from '../../lib/money'
import { Pagination } from '../../components/ui/Pagination'
import { Badge } from '../../components/ui/Badge'
import { Icon } from '../../components/ui/Icon'
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { PERMS } from '../../lib/permissions'
import { useI18n } from '../../lib/i18n/I18nProvider'
import {
  FinanceKpiGrid,
  FinanceToolbar,
  financeStatusLabel,
  financeStatusTone,
} from './financeUi'

const RECON_FILTERS = ['RECONCILED', 'OUTSTANDING', 'PARTIAL', 'DISCREPANCY'] as const

export function CodRemittancesPage() {
  const { t } = useI18n()
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [recon, setRecon] = useState('')
  const [appliedQ, setAppliedQ] = useState('')
  const limit = 20

  const q = useQuery({
    queryKey: ['cod', 'driver-summaries', offset, appliedQ, recon],
    queryFn: () =>
      adminApi.listCodDriverSummaries({
        limit,
        offset,
        q: appliedQ || undefined,
        reconciliationStatus: recon || undefined,
      }),
  })

  // Platform money KPIs need a dedicated aggregate read — never sum a page of rows.
  const kpis = [
    {
      id: 'collected',
      labelKey: 'codKpiCollected' as const,
      value: '—',
      live: false,
    },
    {
      id: 'remitted',
      labelKey: 'codKpiRemittedDrivers' as const,
      value: '—',
      live: false,
      tone: 'success' as const,
    },
    {
      id: 'pending',
      labelKey: 'codKpiDriversMatching' as const,
      value: q.isLoading ? '—' : String(q.data?.total ?? '—'),
      live: !q.isLoading,
      tone: 'primary' as const,
    },
    {
      id: 'gaps',
      labelKey: 'codKpiGaps' as const,
      value: '—',
      live: false,
      tone: 'danger' as const,
    },
  ]

  return (
    <RequirePermission allOf={PERMS.COD_READ}>
      <FinanceKpiGrid items={kpis} />

      <FinanceToolbar
        onRefresh={() => {
          setAppliedQ(search.trim())
          setOffset(0)
          void q.refetch()
        }}
      >
        <div className="finance-search">
          <Icon name="search" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setAppliedQ(search.trim())
                setOffset(0)
              }
            }}
            placeholder={t('searchDriver')}
            aria-label={t('searchDriver')}
          />
        </div>
        <label className="finance-select">
          <span className="sr-only">{t('status')}</span>
          <select
            value={recon}
            onChange={(e) => {
              setRecon(e.target.value)
              setOffset(0)
            }}
          >
            <option value="">{t('allStatuses')}</option>
            {RECON_FILTERS.map((s) => (
              <option key={s} value={s}>
                {financeStatusLabel(s, t)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="verify-filter-chip"
          disabled
          title={t('filterUnsupported')}
        >
          {t('codFilterGap')}
          <Icon name="expand_more" />
        </button>
      </FinanceToolbar>

      {q.isLoading ? <LoadingState /> : null}
      {q.isError ? <ErrorState onRetry={() => void q.refetch()} /> : null}
      {q.data && q.data.items.length === 0 ? <EmptyState /> : null}
      {q.data && q.data.items.length > 0 ? (
        <>
          <div className="table-wrap finance-table">
            <table className="data">
              <thead>
                <tr>
                  <th>{t('driver')}</th>
                  <th className="num">{t('codOrdersCount')}</th>
                  <th className="num">{t('codExpectedAmount')}</th>
                  <th className="num">{t('codRemittedAmount')}</th>
                  <th className="num">{t('codOutstandingAmount')}</th>
                  <th>{t('status')}</th>
                  <th className="num">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {q.data.items.map((row) => (
                  <tr key={row.driverId}>
                    <td>
                      <Link to={`/drivers/${row.driverId}`}>{row.fullName}</Link>
                      <div className="muted text-metadata mono" title={row.driverId}>
                        {row.driverId.slice(0, 8)}…
                      </div>
                    </td>
                    <td className="num">{row.collectedOrderCount}</td>
                    <td className="num money">
                      {formatDzdFromMinor(row.collectedAmountMinor)}
                    </td>
                    <td className="num money">
                      {formatDzdFromMinor(row.confirmedAllocatedMinor)}
                    </td>
                    <td className="num money">
                      {formatDzdFromMinor(row.outstandingCustodyMinor)}
                    </td>
                    <td>
                      <Badge tone={financeStatusTone(row.reconciliationStatus)}>
                        {financeStatusLabel(row.reconciliationStatus, t)}
                      </Badge>
                    </td>
                    <td className="num">
                      <Link
                        className="btn btn-secondary btn-sm"
                        to={`/collections/cod/drivers/${row.driverId}`}
                      >
                        {t('open')}
                      </Link>
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
