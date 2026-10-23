import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../lib/api/adminApi'
import { ApiError } from '../../lib/api/types'
import { formatDzdFromMinor } from '../../lib/money'
import { Pagination } from '../../components/ui/Pagination'
import { Badge, statusTone } from '../../components/ui/Badge'
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { Button } from '../../components/ui/Button'
import { PERMS, hasPermission } from '../../lib/permissions'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { useI18n } from '../../lib/i18n/I18nProvider'

export function SettlementsPage() {
  const { t } = useI18n()
  const qc = useQueryClient()
  const permissions = useSessionStore((s) => s.me?.permissions)
  const canManage = hasPermission(permissions, PERMS.SETTLEMENTS_MANAGE)
  const [offset, setOffset] = useState(0)
  const limit = 20
  const [merchantId, setMerchantId] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const q = useQuery({
    queryKey: ['settlements', offset],
    queryFn: () => adminApi.listSettlements({ limit, offset }),
  })

  const openDraft = useMutation({
    mutationFn: () =>
      adminApi.openSettlementDraft({
        merchantId: merchantId.trim(),
        periodStart: new Date(periodStart).toISOString(),
        periodEnd: new Date(periodEnd).toISOString(),
      }),
    onSuccess: async () => {
      setMsg(t('success'))
      setErr(null)
      await qc.invalidateQueries({ queryKey: ['settlements'] })
    },
    onError: (e) => {
      setMsg(null)
      setErr(e instanceof ApiError ? e.message : t('error'))
    },
  })

  const action = useMutation({
    mutationFn: async (input: { id: string; kind: 'build' | 'finalize' }) => {
      if (input.kind === 'build') return adminApi.buildSettlementSaleLines(input.id)
      return adminApi.finalizeSettlement(input.id)
    },
    onSuccess: async () => {
      setMsg(t('success'))
      setErr(null)
      await qc.invalidateQueries({ queryKey: ['settlements'] })
    },
    onError: (e) => {
      setMsg(null)
      setErr(e instanceof ApiError ? e.message : t('error'))
    },
  })

  function onOpen(e: FormEvent) {
    e.preventDefault()
    if (!merchantId.trim() || !periodStart || !periodEnd || openDraft.isPending) return
    openDraft.mutate()
  }

  return (
    <RequirePermission allOf={PERMS.SETTLEMENTS_READ}>
      <p className="muted" style={{ marginBottom: 12 }}>
        {t('settlementFinancialHint')}
      </p>
      {msg ? <div className="banner banner-success">{msg}</div> : null}
      {err ? <div className="banner banner-error">{err}</div> : null}
      {canManage ? (
        <form className="card card-body stack" onSubmit={onOpen} style={{ marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>{t('openDraft')}</h3>
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <label>
              {t('merchant')}
              <input
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
                className="mono"
                required
              />
            </label>
            <label>
              {t('periodStart')}
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                required
              />
            </label>
            <label>
              {t('periodEnd')}
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                required
              />
            </label>
          </div>
          <Button type="submit" disabled={openDraft.isPending}>
            {openDraft.isPending ? t('loading') : t('create')}
          </Button>
        </form>
      ) : null}
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
                  <th>{t('merchant')}</th>
                  <th>{t('gms')}</th>
                  <th>{t('commission')}</th>
                  <th>{t('net')}</th>
                  <th>{t('status')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {q.data.items.map((s) => (
                  <tr key={s.id}>
                    <td className="mono">{s.id.slice(0, 8)}…</td>
                    <td className="mono">{s.merchantId.slice(0, 8)}…</td>
                    <td className="money">{formatDzdFromMinor(s.grossSalesMinor)}</td>
                    <td className="money">{formatDzdFromMinor(s.commissionMinor)}</td>
                    <td className="money">{formatDzdFromMinor(s.netPayableMinor)}</td>
                    <td>
                      <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                    </td>
                    <td>
                      {canManage && s.status === 'DRAFT' ? (
                        <div className="row" style={{ gap: 4 }}>
                          <Button
                            size="sm"
                            disabled={action.isPending}
                            onClick={() => action.mutate({ id: s.id, kind: 'build' })}
                          >
                            {t('buildLines')}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={action.isPending}
                            onClick={() => action.mutate({ id: s.id, kind: 'finalize' })}
                          >
                            {t('finalize')}
                          </Button>
                        </div>
                      ) : null}
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
