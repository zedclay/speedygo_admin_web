import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminApi } from '../../lib/api/adminApi'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge, statusTone } from '../../components/ui/Badge'
import { UnavailablePanel } from '../../components/ui/UnavailablePanel'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { PERMS } from '../../lib/permissions'
import { useI18n } from '../../lib/i18n/I18nProvider'

export function OperationsPage() {
  const { t } = useI18n()
  const active = useQuery({
    queryKey: ['orders', 'ops', 'ACTIVE'],
    queryFn: () => adminApi.listOrders({ limit: 50, offset: 0, status: 'ACTIVE' }),
  })

  return (
    <RequirePermission anyOf={[PERMS.ORDERS_READ]}>
      <PageHeader
        title={t('liveOps')}
        subtitle={t('overview')}
        actions={
          <Button variant="secondary" size="sm" onClick={() => void active.refetch()}>
            {t('refresh')}
          </Button>
        }
      />
      <div className="toolbar">
        <span className="muted">{t('orders')} — ACTIVE</span>
      </div>
      {active.isLoading ? <LoadingState /> : null}
      {active.isError ? <ErrorState onRetry={() => void active.refetch()} /> : null}
      {active.data?.items.length === 0 ? <EmptyState /> : null}
      {active.data && active.data.items.length > 0 ? (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t('reference')}</th>
                <th>{t('status')}</th>
                <th>{t('type')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {active.data.items.map((o) => (
                <tr key={o.id}>
                  <td className="mono">{o.publicReference}</td>
                  <td>
                    <Badge tone={statusTone(o.status)}>{o.status}</Badge>
                  </td>
                  <td>{o.fulfillmentStatus}</td>
                  <td>
                    <Link to={`/orders/${o.id}`}>{t('details')}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="map-placeholder" style={{ marginTop: 24 }}>
        <UnavailablePanel title={t('mapUnavailable')} detail={t('mapUnavailableHint')} />
      </div>
    </RequirePermission>
  )
}
