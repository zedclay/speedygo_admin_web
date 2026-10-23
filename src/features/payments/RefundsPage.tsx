import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { adminApi } from '../../lib/api/adminApi'
import { ApiError } from '../../lib/api/types'
import {
  formatCentimesAsDzdV2,
  formatDzdFromMinor,
  parseDzdInputToMinorInt,
} from '../../lib/money'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { Badge } from '../../components/ui/Badge'
import { Icon } from '../../components/ui/Icon'
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { Modal } from '../../components/ui/Modal'
import { UnavailablePanel } from '../../components/ui/UnavailablePanel'
import { PERMS, hasPermission } from '../../lib/permissions'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { useI18n } from '../../lib/i18n/I18nProvider'
import {
  FinanceKpiGrid,
  FinanceToolbar,
  financeStatusLabel,
  financeStatusTone,
} from './financeUi'

const REFUND_METHODS = ['MANUAL_COD', 'MANUAL_OTHER'] as const

export function RefundsPage() {
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const permissions = useSessionStore((s) => s.me?.permissions)
  const qc = useQueryClient()
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [orderId, setOrderId] = useState('')
  const [amountMinor, setAmountMinor] = useState('')
  const [reason, setReason] = useState('')
  const [method, setMethod] = useState<string>('MANUAL_COD')
  const [note, setNote] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const limit = 20

  useEffect(() => {
    const wantCreate = searchParams.get('create') === '1'
    const oid = searchParams.get('orderId')?.trim() ?? ''
    if (!wantCreate && !oid) return
    if (oid) {
      setOrderId(oid)
      setMethod('MANUAL_COD')
    }
    if (wantCreate && hasPermission(permissions, PERMS.REFUNDS_MANAGE)) {
      setCreateOpen(true)
      setErr(null)
    }
    const next = new URLSearchParams(searchParams)
    next.delete('create')
    next.delete('orderId')
    setSearchParams(next, { replace: true })
  }, [permissions, searchParams, setSearchParams])

  const q = useQuery({
    queryKey: ['refunds', offset],
    queryFn: () => adminApi.listRefunds({ limit, offset }),
  })

  const create = useMutation({
    mutationFn: () => {
      const cents = parseDzdInputToMinorInt(amountMinor)
      if (cents === null || cents < 1) {
        throw new ApiError(400, 'Invalid DZD amount', 'MONEY_INVALID')
      }
      return adminApi.createRefund({
        orderId: orderId.trim(),
        amount: formatCentimesAsDzdV2(cents),
        reason: reason.trim(),
        method,
        internalNote: note.trim() || undefined,
      })
    },
    onSuccess: async (body) => {
      setCreatedId(body.id)
      setCreateOpen(false)
      setAmountMinor('')
      setReason('')
      setNote('')
      setErr(null)
      await qc.invalidateQueries({ queryKey: ['refunds'] })
    },
    onError: (e) => {
      setErr(
        e instanceof ApiError
          ? `${e.message} — ${t('refundCreateErrorRetry')}`
          : t('error'),
      )
    },
  })

  const act = useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string
      action: 'approve' | 'reject' | 'confirm'
    }) => {
      if (action === 'approve') return adminApi.approveRefund(id)
      if (action === 'reject') return adminApi.rejectRefund(id)
      return adminApi.confirmManualRefund(id)
    },
    onSuccess: async () => {
      setErr(null)
      await qc.invalidateQueries({ queryKey: ['refunds'] })
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : t('error')),
  })

  const filtered = useMemo(() => {
    const items = q.data?.items ?? []
    const term = search.trim().toLowerCase()
    if (!term) return items
    return items.filter(
      (r) =>
        r.id.toLowerCase().includes(term) ||
        r.orderId.toLowerCase().includes(term) ||
        r.status.toLowerCase().includes(term),
    )
  }, [q.data?.items, search])

  const canCreate = hasPermission(permissions, PERMS.REFUNDS_MANAGE)
  const createValid = Boolean(orderId.trim() && amountMinor && reason.trim())
  const formBusy = create.isPending

  return (
    <RequirePermission anyOf={[PERMS.REFUNDS_READ, PERMS.REFUNDS_MANAGE]}>
      {err ? <div className="banner banner-error">{err}</div> : null}
      {createdId ? (
        <div className="banner banner-success">
          {t('success')}{' '}
          <Link to={`/collections/refunds/${createdId}`}>{createdId.slice(0, 8)}…</Link>
        </div>
      ) : null}

      <FinanceKpiGrid
        items={[
          {
            id: 'total',
            labelKey: 'refundKpiTotal',
            value: q.isLoading ? '—' : String(q.data?.total ?? '—'),
            live: !q.isLoading,
            tone: 'primary',
          },
          {
            id: 'pending',
            labelKey: 'refundKpiPending',
            value: '—',
            live: false,
          },
          {
            id: 'approved',
            labelKey: 'refundKpiApproved',
            value: '—',
            live: false,
            tone: 'success',
          },
          {
            id: 'manual',
            labelKey: 'refundKpiManual',
            value: '—',
            live: false,
          },
        ]}
      />

      <FinanceToolbar onRefresh={() => void q.refetch()}>
        <div className="finance-search">
          <Icon name="search" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchRefund')}
            aria-label={t('searchRefund')}
          />
        </div>
        <button
          type="button"
          className="verify-filter-chip"
          disabled
          title={t('filterUnsupported')}
        >
          {t('method')}
          <Icon name="expand_more" />
        </button>
        <button
          type="button"
          className="verify-filter-chip"
          disabled
          title={t('filterUnsupported')}
        >
          {t('status')}
          <Icon name="expand_more" />
        </button>
        {canCreate ? (
          <Button
            size="sm"
            disabled={formBusy}
            onClick={() => {
              setErr(null)
              setCreatedId(null)
              setCreateOpen(true)
            }}
          >
            <Icon name="add" /> {t('createRefund')}
          </Button>
        ) : null}
      </FinanceToolbar>

      {q.isLoading ? <LoadingState /> : null}
      {q.isError ? <ErrorState onRetry={() => void q.refetch()} /> : null}
      {q.data && filtered.length === 0 ? <EmptyState /> : null}
      {q.data && filtered.length > 0 ? (
        <>
          <div className="table-wrap finance-table">
            <table className="data">
              <thead>
                <tr>
                  <th>{t('reference')}</th>
                  <th>{t('order')}</th>
                  <th>{t('amount')}</th>
                  <th>{t('method')}</th>
                  <th>{t('status')}</th>
                  <th className="num">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="mono">
                      <Link to={`/collections/refunds/${r.id}`}>{r.id.slice(0, 8)}…</Link>
                    </td>
                    <td className="mono">
                      <Link to={`/orders/${r.orderId}`}>{r.orderId.slice(0, 8)}…</Link>
                    </td>
                    <td className="money">{formatDzdFromMinor(r.amountMinor)}</td>
                    <td>
                      <Badge tone="neutral">
                        {financeStatusLabel(r.refundMethod, t)}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={financeStatusTone(r.status)}>
                        {financeStatusLabel(r.status, t)}
                      </Badge>
                    </td>
                    <td className="num">
                      <div
                        className="row"
                        style={{ gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}
                      >
                        <Link
                          className="btn btn-secondary btn-sm"
                          to={`/collections/refunds/${r.id}`}
                        >
                          {t('details')}
                        </Link>
                        {hasPermission(permissions, PERMS.REFUNDS_MANAGE) ? (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={act.isPending}
                              onClick={() => act.mutate({ id: r.id, action: 'approve' })}
                            >
                              {t('approve')}
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={act.isPending}
                              onClick={() => act.mutate({ id: r.id, action: 'reject' })}
                            >
                              {t('reject')}
                            </Button>
                            <Button
                              size="sm"
                              disabled={act.isPending}
                              onClick={() => act.mutate({ id: r.id, action: 'confirm' })}
                            >
                              {t('confirmManualRefund')}
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={q.data.total} limit={limit} offset={offset} onChange={setOffset} />
        </>
      ) : null}

      {createOpen ? (
        <Modal
          title={t('createRefund')}
          onClose={() => !formBusy && setCreateOpen(false)}
          footer={
            <>
              <Button
                variant="secondary"
                disabled={formBusy}
                onClick={() => setCreateOpen(false)}
              >
                {t('cancel')}
              </Button>
              <Button
                disabled={formBusy || !createValid}
                title={!createValid ? t('refundCreateValidationHint') : undefined}
                onClick={() => {
                  setErr(null)
                  create.mutate()
                }}
              >
                {formBusy ? t('refundCreateBusy') : t('confirm')}
              </Button>
            </>
          }
        >
          <p className="muted text-metadata">{t('refundCreateContractHint')}</p>
          <UnavailablePanel
            title={t('refundMaxEligible')}
            detail={t('refundMaxEligibleUnavailable')}
          />
          {err && createOpen ? (
            <div className="banner banner-error" role="alert">
              {err}
            </div>
          ) : null}
          <div className="field">
            <label>{t('orderId')}</label>
            <input
              value={orderId}
              disabled={formBusy}
              onChange={(e) => setOrderId(e.target.value.trim())}
              className="mono"
            />
          </div>
          <div className="field">
            <label>{t('confirmAmount')}</label>
            <input
              inputMode="numeric"
              value={amountMinor}
              disabled={formBusy}
              onChange={(e) =>
                setAmountMinor(e.target.value.replace(/[^\d.,]/g, ''))
              }
            />
          </div>
          <div className="field">
            <label>{t('reason')}</label>
            <input
              value={reason}
              disabled={formBusy}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="field">
            <label>{t('method')}</label>
            <select
              value={method}
              disabled={formBusy}
              onChange={(e) => setMethod(e.target.value)}
            >
              {REFUND_METHODS.map((m) => (
                <option key={m} value={m}>
                  {financeStatusLabel(m, t)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>{t('internalNote')}</label>
            <textarea
              value={note}
              disabled={formBusy}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <p className="muted">
            {t('amount')}:{' '}
            {formatDzdFromMinor(
              String(parseDzdInputToMinorInt(amountMinor) ?? 0),
            )}
          </p>
        </Modal>
      ) : null}
    </RequirePermission>
  )
}
