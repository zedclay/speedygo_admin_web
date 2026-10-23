import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { adminApi } from '../../lib/api/adminApi'
import { formatDzdFromMinor } from '../../lib/money'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Icon } from '../../components/ui/Icon'
import { LoadingState, ErrorState } from '../../components/ui/StateBoxes'
import { UnavailablePanel } from '../../components/ui/UnavailablePanel'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { PERMS } from '../../lib/permissions'
import { useI18n } from '../../lib/i18n/I18nProvider'
import {
  financeStatusLabel,
  financeStatusTone,
  remittanceRemainderMinor,
} from './financeUi'

export function CodRemittanceDetailPage() {
  const { id = '' } = useParams()
  const { t } = useI18n()
  const navigate = useNavigate()
  const q = useQuery({
    queryKey: ['cod', id],
    queryFn: () => adminApi.getCodRemittance(id),
    enabled: Boolean(id),
  })
  if (q.isLoading) return <LoadingState />
  if (q.isError || !q.data) return <ErrorState onRetry={() => void q.refetch()} />
  const r = q.data
  const remainder = remittanceRemainderMinor(
    r.submittedAmountMinor,
    r.confirmedAmountMinor,
  )

  return (
    <RequirePermission allOf={PERMS.COD_READ}>
      <nav className="breadcrumb order-breadcrumb" aria-label="breadcrumb">
        <Link to="/collections/cod">{t('cod')}</Link>
        <Icon name="chevron_right" />
        <span className="order-breadcrumb__current mono" title={r.id}>
          {r.reference ?? `${r.id.slice(0, 8)}…`}
        </span>
      </nav>

      <div className="verify-page-header">
        <div>
          <h1 className="text-page-title">{t('codReconciliation')}</h1>
          <p className="muted">
            {t('driver')}:{' '}
            <Link className="mono" to={`/drivers/${r.driverId}`}>
              {r.driverId.slice(0, 8)}…
            </Link>
          </p>
        </div>
        <div className="page-actions">
          <Badge tone={financeStatusTone(r.status)}>
            {financeStatusLabel(r.status, t)}
          </Badge>
          <Button variant="secondary" onClick={() => navigate('/collections/cod')}>
            <Icon name="arrow_back" /> {t('back')}
          </Button>
        </div>
      </div>

      <div className="finance-bilan-grid">
        <article className="finance-bilan-card">
          <span className="muted text-metadata">{t('submitted')}</span>
          <strong className="money">{formatDzdFromMinor(r.submittedAmountMinor)}</strong>
        </article>
        <article className="finance-bilan-card">
          <span className="muted text-metadata">{t('confirmed')}</span>
          <strong className="money">
            {r.confirmedAmountMinor
              ? formatDzdFromMinor(r.confirmedAmountMinor)
              : '—'}
          </strong>
        </article>
        <article className="finance-bilan-card">
          <span className="muted text-metadata">{t('codRemainder')}</span>
          <strong className="money">
            {remainder != null ? formatDzdFromMinor(remainder) : '—'}
          </strong>
        </article>
        <article className="finance-bilan-card">
          <span className="muted text-metadata">{t('reference')}</span>
          <strong>{r.reference ?? '—'}</strong>
          <span className="muted text-metadata">
            {t('submittedAt')}: {new Date(r.submittedAt).toLocaleString()}
          </span>
        </article>
      </div>

      <div className="finance-detail-layout">
        <div className="stack">
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
              {r.status === 'DECLARED' ? (
                <p className="muted text-metadata">{t('codConfirmFromListHint')}</p>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </RequirePermission>
  )
}
