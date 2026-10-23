import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminApi } from '../../lib/api/adminApi'
import { formatDzdFromMinor } from '../../lib/money'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { Badge, statusTone } from '../../components/ui/Badge'
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { PERMS } from '../../lib/permissions'
import { useI18n } from '../../lib/i18n/I18nProvider'

export function PaymentsListPage() {
  const { t } = useI18n()
  const [offset, setOffset] = useState(0)
  const limit = 20
  const q = useQuery({
    queryKey: ['payments', offset],
    queryFn: () => adminApi.listPayments({ limit, offset }),
  })
  return (
    <RequirePermission allOf={PERMS.PAYMENTS_READ}>
      <div className="toolbar">
        <Button variant="secondary" size="sm" onClick={() => void q.refetch()}>
          {t('refresh')}
        </Button>
      </div>
      {q.isLoading ? <LoadingState /> : null}
      {q.isError ? <ErrorState onRetry={() => void q.refetch()} /> : null}
      {q.data?.items.length === 0 ? <EmptyState /> : null}
      {q.data && q.data.items.length > 0 ? (
        <>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t('reference')}</th>
                  <th>{t('order')}</th>
                  <th>{t('method')}</th>
                  <th>{t('amount')}</th>
                  <th>{t('status')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {q.data.items.map((p) => (
                  <tr key={p.id}>
                    <td className="mono">
                      <Link to={`/collections/payments/${p.id}`}>{p.id.slice(0, 8)}…</Link>
                    </td>
                    <td className="mono">{p.orderId.slice(0, 8)}…</td>
                    <td>{p.method}</td>
                    <td className="money">{formatDzdFromMinor(p.amountMinor)}</td>
                    <td>
                      <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                    </td>
                    <td>
                      <Link to={`/collections/payments/${p.id}`}>{t('details')}</Link>
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
