import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { adminApi } from '../../lib/api/adminApi'
import { formatDzdFromMinor } from '../../lib/money'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge, statusTone } from '../../components/ui/Badge'
import { LoadingState, ErrorState } from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { PERMS } from '../../lib/permissions'
import { useI18n } from '../../lib/i18n/I18nProvider'

export function RefundDetailPage() {
  const { id = '' } = useParams()
  const { t } = useI18n()
  const navigate = useNavigate()
  const q = useQuery({
    queryKey: ['refund', id],
    queryFn: () => adminApi.getRefund(id),
    enabled: Boolean(id),
  })
  if (q.isLoading) return <LoadingState />
  if (q.isError || !q.data) return <ErrorState onRetry={() => void q.refetch()} />
  const r = q.data
  return (
    <RequirePermission allOf={PERMS.REFUNDS_READ}>
      <PageHeader
        title={t('refunds')}
        subtitle={r.id}
        actions={
          <Button variant="secondary" onClick={() => navigate('/collections/refunds')}>
            {t('back')}
          </Button>
        }
      />
      <div className="entity-header">
        <div>
          <h1>{formatDzdFromMinor(r.amountMinor)}</h1>
          <div className="entity-meta">
            <Badge tone={statusTone(r.status)}>{r.status}</Badge>
            <span>{r.refundMethod}</span>
          </div>
        </div>
      </div>
      <div className="card card-body">
        <div className="summary-grid">
          <div className="summary-item">
            <label>{t('amount')}</label>
            <strong className="money">{formatDzdFromMinor(r.amountMinor)}</strong>
          </div>
          <div className="summary-item">
            <label>{t('method')}</label>
            <strong>{r.refundMethod}</strong>
          </div>
          <div className="summary-item">
            <label>{t('order')}</label>
            <strong>
              <Link className="mono" to={`/orders/${r.orderId}`}>
                {r.orderId}
              </Link>
            </strong>
          </div>
          <div className="summary-item">
            <label>{t('reason')}</label>
            <strong>{r.reason}</strong>
          </div>
          <div className="summary-item">
            <label>{t('internalNote')}</label>
            <strong>{r.internalNote ?? '—'}</strong>
          </div>
        </div>
      </div>
    </RequirePermission>
  )
}
