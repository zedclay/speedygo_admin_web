import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { adminApi } from '../../lib/api/adminApi'
import { ApiError } from '../../lib/api/types'
import {
  formatCentimesAsDzdV2,
  formatDzdFromMinor,
  parseDzdInputToMinorInt,
} from '../../lib/money'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Icon } from '../../components/ui/Icon'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/StateBoxes'
import { UnavailablePanel } from '../../components/ui/UnavailablePanel'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { Modal } from '../../components/ui/Modal'
import { PERMS, hasPermission } from '../../lib/permissions'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { useI18n } from '../../lib/i18n/I18nProvider'
import {
  financeStatusLabel,
  financeStatusTone,
  remittanceRemainderMinor,
} from './financeUi'

export function CodDriverSummaryDetailPage() {
  const { driverId = '' } = useParams()
  const { t } = useI18n()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const permissions = useSessionStore((s) => s.me?.permissions)
  const [selected, setSelected] = useState<{ id: string; submitted: string } | null>(
    null,
  )
  const [amount, setAmount] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const summaryQ = useQuery({
    queryKey: ['cod', 'driver-summary', driverId],
    queryFn: () => adminApi.getCodDriverSummary(driverId),
    enabled: Boolean(driverId),
  })
  const remittancesQ = useQuery({
    queryKey: ['cod', 'remittances', 'driver', driverId],
    queryFn: () =>
      adminApi.listCodRemittances({ driverId, limit: 50, offset: 0 }),
    enabled: Boolean(driverId),
  })

  const confirm = useMutation({
    mutationFn: () => {
      const cents = parseDzdInputToMinorInt(amount)
      if (cents === null) {
        throw new ApiError(400, 'Invalid DZD amount', 'MONEY_INVALID')
      }
      return adminApi.confirmCodRemittance(
        selected!.id,
        formatCentimesAsDzdV2(cents),
      )
    },
    onSuccess: async () => {
      setSelected(null)
      setErr(null)
      await qc.invalidateQueries({ queryKey: ['cod'] })
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : t('error')),
  })

  if (summaryQ.isLoading) return <LoadingState />
  if (summaryQ.isError || !summaryQ.data) {
    return <ErrorState onRetry={() => void summaryQ.refetch()} />
  }
  const s = summaryQ.data

  return (
    <RequirePermission allOf={PERMS.COD_READ}>
      {err ? <div className="banner banner-error">{err}</div> : null}

      <nav className="breadcrumb order-breadcrumb" aria-label="breadcrumb">
        <Link to="/collections/cod">{t('cod')}</Link>
        <Icon name="chevron_right" />
        <span className="order-breadcrumb__current" title={s.driverId}>
          {s.fullName}
        </span>
      </nav>

      <div className="verify-page-header">
        <div>
          <h1 className="text-page-title">{t('codReconciliation')}</h1>
          <p className="muted">
            <Link to={`/drivers/${s.driverId}`}>{s.fullName}</Link>
            <span className="mono muted"> · {s.driverId.slice(0, 8)}…</span>
          </p>
        </div>
        <div className="page-actions">
          <Badge tone={financeStatusTone(s.reconciliationStatus)}>
            {financeStatusLabel(s.reconciliationStatus, t)}
          </Badge>
          <Button variant="secondary" onClick={() => navigate('/collections/cod')}>
            <Icon name="arrow_back" /> {t('back')}
          </Button>
        </div>
      </div>

      <div className="finance-bilan-grid">
        <article className="finance-bilan-card">
          <span className="muted text-metadata">{t('codExpectedAmount')}</span>
          <strong className="money">{formatDzdFromMinor(s.collectedAmountMinor)}</strong>
          <span className="muted text-metadata">
            {t('codOrdersCount')}: {s.collectedOrderCount}
          </span>
        </article>
        <article className="finance-bilan-card">
          <span className="muted text-metadata">{t('codRemittedAmount')}</span>
          <strong className="money">
            {formatDzdFromMinor(s.confirmedAllocatedMinor)}
          </strong>
        </article>
        <article className="finance-bilan-card">
          <span className="muted text-metadata">{t('codOutstandingAmount')}</span>
          <strong className="money">
            {formatDzdFromMinor(s.outstandingCustodyMinor)}
          </strong>
        </article>
        <article className="finance-bilan-card">
          <span className="muted text-metadata">{t('openDeclaredCount')}</span>
          <strong>{s.openDeclaredCount}</strong>
          <span className="muted text-metadata">
            {t('codFilterGap')}: {s.discrepancyRemittanceCount}
          </span>
        </article>
      </div>

      <div className="finance-detail-layout">
        <div className="stack">
          <div className="card">
            <div className="card-header">
              <strong>{t('codDriverRemittances')}</strong>
            </div>
            <div className="card-body">
              {remittancesQ.isLoading ? <LoadingState /> : null}
              {remittancesQ.isError ? (
                <ErrorState onRetry={() => void remittancesQ.refetch()} />
              ) : null}
              {remittancesQ.data?.items.length === 0 ? <EmptyState /> : null}
              {remittancesQ.data && remittancesQ.data.items.length > 0 ? (
                <div className="table-wrap finance-table">
                  <table className="data">
                    <thead>
                      <tr>
                        <th>{t('reference')}</th>
                        <th className="num">{t('submitted')}</th>
                        <th className="num">{t('confirmed')}</th>
                        <th className="num">{t('codRemainder')}</th>
                        <th>{t('status')}</th>
                        <th className="num">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {remittancesQ.data.items.map((r) => {
                        const rem = remittanceRemainderMinor(
                          r.submittedAmountMinor,
                          r.confirmedAmountMinor,
                        )
                        return (
                          <tr key={r.id}>
                            <td className="mono">
                              <Link to={`/collections/cod/remittances/${r.id}`}>
                                {r.reference ?? `${r.id.slice(0, 8)}…`}
                              </Link>
                            </td>
                            <td className="num money">
                              {formatDzdFromMinor(r.submittedAmountMinor)}
                            </td>
                            <td className="num money">
                              {r.confirmedAmountMinor
                                ? formatDzdFromMinor(r.confirmedAmountMinor)
                                : '—'}
                            </td>
                            <td className="num money">
                              {rem != null ? formatDzdFromMinor(rem) : '—'}
                            </td>
                            <td>
                              <Badge tone={financeStatusTone(r.status)}>
                                {financeStatusLabel(r.status, t)}
                              </Badge>
                            </td>
                            <td className="num">
                              <div
                                className="row"
                                style={{ gap: 6, justifyContent: 'flex-end' }}
                              >
                                <Link
                                  className="btn btn-secondary btn-sm"
                                  to={`/collections/cod/remittances/${r.id}`}
                                >
                                  {t('details')}
                                </Link>
                                {hasPermission(
                                  permissions,
                                  PERMS.COD_REMITTANCE_CONFIRM,
                                ) && r.status === 'DECLARED' ? (
                                  <Button
                                    size="sm"
                                    disabled={confirm.isPending}
                                    onClick={() => {
                                      setSelected({
                                        id: r.id,
                                        submitted: r.submittedAmountMinor,
                                      })
                                      setAmount(
                                        formatCentimesAsDzdV2(
                                          r.submittedAmountMinor,
                                        ),
                                      )
                                      setErr(null)
                                    }}
                                  >
                                    {t('remittanceConfirm')}
                                  </Button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </div>
          <UnavailablePanel
            title={t('codOrdersAllocation')}
            detail={t('codOrdersAllocationUnavailable')}
          />
        </div>
        <aside className="stack">
          <UnavailablePanel
            title={t('codRecordPayment')}
            detail={t('codRecordPaymentUnavailable')}
          />
          <div className="card">
            <div className="card-header">
              <strong>{t('gapResolution')}</strong>
            </div>
            <div className="card-body">
              <p className="muted text-metadata">{t('gapResolutionHint')}</p>
            </div>
          </div>
        </aside>
      </div>

      {selected ? (
        <Modal
          title={t('remittanceConfirm')}
          onClose={() => !confirm.isPending && setSelected(null)}
          footer={
            <>
              <Button
                variant="secondary"
                disabled={confirm.isPending}
                onClick={() => setSelected(null)}
              >
                {t('cancel')}
              </Button>
              <Button
                disabled={confirm.isPending || amount === ''}
                onClick={() => confirm.mutate()}
              >
                {confirm.isPending ? t('busy') : t('confirm')}
              </Button>
            </>
          }
        >
          <p className="muted">
            {t('submitted')}: {formatDzdFromMinor(selected.submitted)}
          </p>
          <div className="field">
            <label>{t('confirmAmount')}</label>
            <input
              inputMode="numeric"
              value={amount}
              disabled={confirm.isPending}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
            />
          </div>
          <p className="muted text-metadata">{t('codConfirmCustodyHint')}</p>
        </Modal>
      ) : null}
    </RequirePermission>
  )
}
