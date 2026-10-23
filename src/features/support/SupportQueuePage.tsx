import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminApi } from '../../lib/api/adminApi'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { Badge, statusTone } from '../../components/ui/Badge'
import { Icon } from '../../components/ui/Icon'
import {
  LoadingState,
  EmptyState,
  ErrorState,
} from '../../components/ui/StateBoxes'
import { UnavailablePanel } from '../../components/ui/UnavailablePanel'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { PERMS } from '../../lib/permissions'
import { useI18n } from '../../lib/i18n/I18nProvider'

const SUPPORT_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_CUSTOMER',
  'RESOLVED',
  'CLOSED',
] as const

const SUPPORT_PRIORITIES = ['LOW', 'NORMAL', 'HIGH'] as const

export function SupportQueuePage() {
  const { t } = useI18n()
  const [offset, setOffset] = useState(0)
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const limit = 20
  const q = useQuery({
    queryKey: ['support', offset, status, priority],
    queryFn: () =>
      adminApi.listSupport({
        limit,
        offset,
        status: status || undefined,
        priority: priority || undefined,
      }),
  })

  return (
    <RequirePermission allOf={PERMS.SUPPORT_READ}>
      <PageHeader
        title={t('supportQueueTitle')}
        subtitle={t('supportQueueHint')}
        actions={
          <Button variant="secondary" size="sm" onClick={() => void q.refetch()}>
            {t('refresh')}
          </Button>
        }
      />
      <div className="toolbar filter-bar promo-filter-chips">
        <span className="period-chip-row__label">{t('status')}</span>
        <button
          type="button"
          className={`period-chip${!status ? ' period-chip--active' : ''}`}
          onClick={() => {
            setStatus('')
            setOffset(0)
          }}
        >
          {t('supportStatusAll')}
        </button>
        {SUPPORT_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            className={`period-chip${status === s ? ' period-chip--active' : ''}`}
            onClick={() => {
              setStatus(s)
              setOffset(0)
            }}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="toolbar filter-bar promo-filter-chips">
        <span className="period-chip-row__label">{t('priority')}</span>
        <button
          type="button"
          className={`period-chip${!priority ? ' period-chip--active' : ''}`}
          onClick={() => {
            setPriority('')
            setOffset(0)
          }}
        >
          {t('supportPriorityAll')}
        </button>
        {SUPPORT_PRIORITIES.map((p) => (
          <button
            key={p}
            type="button"
            className={`period-chip${priority === p ? ' period-chip--active' : ''}`}
            onClick={() => {
              setPriority(p)
              setOffset(0)
            }}
          >
            {p}
          </button>
        ))}
        {q.data ? (
          <span className="muted text-metadata">
            {t('ordersMatchingCount')}: {q.data.total}
          </span>
        ) : null}
      </div>
      <UnavailablePanel title={t('supportEntityUnavailable')} />
      {q.isLoading ? <LoadingState /> : null}
      {q.isError ? <ErrorState onRetry={() => void q.refetch()} /> : null}
      {q.data?.items.length === 0 ? <EmptyState /> : null}
      {q.data && q.data.items.length > 0 ? (
        <>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th className="col-ref">{t('reference')}</th>
                  <th className="col-party">{t('subject')}</th>
                  <th className="col-status">{t('status')}</th>
                  <th className="col-status">{t('priority')}</th>
                  <th className="col-meta">{t('supportAssignedTo')}</th>
                  <th className="col-date">{t('createdAt')}</th>
                  <th className="col-actions">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {q.data.items.map((ticket) => (
                  <tr key={ticket.id} className="row-actions-hover">
                    <td className="col-ref mono">
                      <Link to={`/support/${ticket.id}`}>
                        {ticket.publicReference}
                      </Link>
                    </td>
                    <td className="col-party">
                      {ticket.subject ?? ticket.topicCode ?? '—'}
                    </td>
                    <td className="col-status">
                      <Badge tone={statusTone(ticket.status)}>{ticket.status}</Badge>
                    </td>
                    <td className="col-status">
                      <Badge
                        tone={
                          ticket.priority === 'HIGH'
                            ? 'error'
                            : ticket.priority === 'LOW'
                              ? 'neutral'
                              : 'info'
                        }
                      >
                        {ticket.priority}
                      </Badge>
                    </td>
                    <td className="col-meta mono muted text-metadata">
                      {ticket.assignedAdminId
                        ? `${ticket.assignedAdminId.slice(0, 8)}…`
                        : t('supportUnassigned')}
                    </td>
                    <td className="col-date">
                      {new Date(ticket.createdAt).toLocaleString()}
                    </td>
                    <td className="col-actions">
                      <div className="row-actions">
                        <Link
                          to={`/support/${ticket.id}`}
                          className="icon-btn"
                          title={t('details')}
                        >
                          <Icon name="open_in_new" />
                        </Link>
                      </div>
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
