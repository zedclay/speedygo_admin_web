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

export function PaymentDetailPage() {
  const { id = '' } = useParams()
  const { t } = useI18n()
  const navigate = useNavigate()
  const q = useQuery({
    queryKey: ['payment', id],
    queryFn: () => adminApi.getPayment(id),
    enabled: Boolean(id),
  })
  if (q.isLoading) return <LoadingState />
  if (q.isError || !q.data) return <ErrorState onRetry={() => void q.refetch()} />
  const p = q.data
  return (
    <RequirePermission allOf={PERMS.PAYMENTS_READ}>
      <PageHeader
        title={t('payments')}
        subtitle={p.id}
        actions={
          <Button variant="secondary" onClick={() => navigate('/collections/payments')}>
            {t('back')}
          </Button>
        }
      />
      <div className="entity-header">
        <div>
          <h1>{formatDzdFromMinor(p.amountMinor)}</h1>
          <div className="entity-meta">
            <Badge tone={statusTone(p.status)}>{p.status}</Badge>
            <span>{p.method}</span>
          </div>
        </div>
      </div>
      <div className="card card-body">
        <div className="summary-grid">
          <div className="summary-item">
            <label>{t('amount')}</label>
            <strong className="money">
              {formatDzdFromMinor(p.amountMinor)} {p.currency}
            </strong>
          </div>
          <div className="summary-item">
            <label>{t('method')}</label>
            <strong>{p.method}</strong>
          </div>
          <div className="summary-item">
            <label>{t('currency')}</label>
            <strong>{p.currency}</strong>
          </div>
          <div className="summary-item">
            <label>{t('order')}</label>
            <strong>
              <Link className="mono" to={`/orders/${p.orderId}`}>
                {p.orderId}
              </Link>
            </strong>
          </div>
        </div>
      </div>
    </RequirePermission>
  )
}
