import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { adminApi } from '../../lib/api/adminApi'
import { ApiError } from '../../lib/api/types'
import { Button } from '../../components/ui/Button'
import { Badge, statusTone } from '../../components/ui/Badge'
import { Icon } from '../../components/ui/Icon'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { PERMS, hasPermission } from '../../lib/permissions'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { useI18n } from '../../lib/i18n/I18nProvider'
import {
  formatTicketAge,
  resolveAuthorLabel,
  supportPriorityLabelKey,
  supportStatusLabelKey,
} from './supportTicketUi'

const PRIORITIES = ['LOW', 'NORMAL', 'HIGH'] as const

type WorkspaceTab = 'conversation' | 'order' | 'history'

export function SupportTicketPage() {
  const { id = '' } = useParams()
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const me = useSessionStore((s) => s.me)
  const [reply, setReply] = useState('')
  const [note, setNote] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [tab, setTab] = useState<WorkspaceTab>('conversation')
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [assignMenuOpen, setAssignMenuOpen] = useState(false)

  const q = useQuery({
    queryKey: ['support', id],
    queryFn: () => adminApi.getSupportTicket(id),
    enabled: Boolean(id),
  })

  const mutate = useMutation({
    mutationFn: async (action: string) => {
      if (action === 'reply') return adminApi.supportReply(id, reply)
      if (action === 'note') return adminApi.supportInternalNote(id, note)
      if (action === 'start') return adminApi.supportStart(id)
      if (action === 'wait') return adminApi.supportWaitCustomer(id)
      if (action === 'resolve') return adminApi.supportResolve(id)
      if (action === 'close') return adminApi.supportClose(id)
      if (action === 'reopen') return adminApi.supportReopen(id)
      if (action === 'assignSelf')
        return adminApi.supportAssign(id, me?.adminProfileId ?? null)
      if (action === 'unassign') return adminApi.supportAssign(id, null)
      if (action.startsWith('priority:')) {
        return adminApi.supportPriority(id, action.slice('priority:'.length))
      }
      throw new Error('unknown')
    },
    onSuccess: async () => {
      setReply('')
      setNote('')
      setErr(null)
      setOk(t('success'))
      await qc.invalidateQueries({ queryKey: ['support', id] })
      await qc.invalidateQueries({ queryKey: ['support'] })
    },
    onError: (e) => {
      setOk(null)
      setErr(e instanceof ApiError ? e.message : t('error'))
    },
  })

  const ticket = q.data
  const statusKey = ticket ? supportStatusLabelKey(ticket.status) : null
  const priorityKey = ticket ? supportPriorityLabelKey(ticket.priority) : null

  const ageLabel = useMemo(() => {
    if (!ticket?.createdAt) return '—'
    return formatTicketAge(ticket.createdAt, {
      hours: t('supportAgeHours'),
      minutes: t('supportAgeMinutes'),
      unavailable: '—',
    })
  }, [ticket?.createdAt, t])

  if (q.isLoading) return <LoadingState />
  if (q.isError || !ticket) return <ErrorState onRetry={() => void q.refetch()} />

  const canManage = hasPermission(me?.permissions, PERMS.SUPPORT_MANAGE)
  const messages = ticket.messages ?? []
  const notes = ticket.internalNotes ?? []
  const subject = ticket.subject ?? ticket.topicCode ?? t('ticket')
  const status = ticket.status

  const canStart = status === 'OPEN'
  const canWait = status === 'OPEN' || status === 'IN_PROGRESS'
  const canResolve =
    status === 'OPEN' ||
    status === 'IN_PROGRESS' ||
    status === 'WAITING_CUSTOMER'
  const canClose = status === 'RESOLVED'
  const canReopen = status === 'RESOLVED' || status === 'CLOSED'
  const canReply = status !== 'RESOLVED' && status !== 'CLOSED'

  const statusLabel = statusKey ? t(statusKey) : status
  const priorityLabel = priorityKey ? t(priorityKey) : ticket.priority
  const dateFmt: Intl.DateTimeFormatOptions = {
    dateStyle: 'short',
    timeStyle: 'short',
  }

  function onStatusAction(value: string) {
    if (!value || mutate.isPending) return
    setStatusMenuOpen(false)
    mutate.mutate(value)
  }

  const statusActions = [
    canStart ? { id: 'start', label: t('start') } : null,
    canWait ? { id: 'wait', label: t('waitCustomer') } : null,
    canResolve ? { id: 'resolve', label: t('resolve') } : null,
    canClose ? { id: 'close', label: t('close') } : null,
    canReopen ? { id: 'reopen', label: t('reopen') } : null,
  ].filter(Boolean) as { id: string; label: string }[]

  return (
    <RequirePermission allOf={PERMS.SUPPORT_READ}>
      <div className="support-ticket">
        <a
          className="support-back"
          href="/support"
          onClick={(e) => {
            e.preventDefault()
            navigate('/support')
          }}
        >
          <Icon name="arrow_back" /> {t('supportBackToQueue')}
        </a>
        <nav className="support-breadcrumb muted text-metadata" aria-label="breadcrumb">
          <Link to="/support">{t('supportClientNav')}</Link>
          <Icon name="chevron_right" />
          <Link to="/support">{t('supportTicketsNav')}</Link>
          <Icon name="chevron_right" />
          <span className="support-breadcrumb__current">{ticket.publicReference}</span>
        </nav>

        {ok ? <div className="banner banner-success">{ok}</div> : null}
        {err ? <div className="banner banner-error">{err}</div> : null}

        <header className="support-ticket-header">
          <div className="support-ticket-header__main">
            <div className="support-ticket-header__title-row">
              <h1>
                {t('ticket')} {ticket.publicReference}
              </h1>
              <Badge tone={statusTone(status)}>{statusLabel}</Badge>
              <Badge
                tone={
                  ticket.priority === 'HIGH'
                    ? 'error'
                    : ticket.priority === 'LOW'
                      ? 'neutral'
                      : 'info'
                }
              >
                {priorityLabel}
              </Badge>
            </div>
            <p className="support-ticket-header__subject">{subject}</p>
          </div>
          <div className="support-ticket-header__actions">
            {canManage ? (
              <>
                <div className="sg-action-menu">
                  <Button
                    variant="secondary"
                    disabled={mutate.isPending || statusActions.length === 0}
                    aria-expanded={statusMenuOpen}
                    aria-haspopup="menu"
                    onClick={() => {
                      setAssignMenuOpen(false)
                      setStatusMenuOpen((v) => !v)
                    }}
                  >
                    <Icon name="edit" /> {t('supportChangeStatus')}
                  </Button>
                  {statusMenuOpen ? (
                    <div className="sg-action-menu__panel" role="menu">
                      {statusActions.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          role="menuitem"
                          disabled={mutate.isPending}
                          onClick={() => onStatusAction(a.id)}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="sg-action-menu">
                  <Button
                    disabled={mutate.isPending}
                    aria-expanded={assignMenuOpen}
                    aria-haspopup="menu"
                    onClick={() => {
                      setStatusMenuOpen(false)
                      setAssignMenuOpen((v) => !v)
                    }}
                  >
                    <Icon name="person_add" /> {t('assign')}
                  </Button>
                  {assignMenuOpen ? (
                    <div className="sg-action-menu__panel" role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        disabled={mutate.isPending}
                        onClick={() => {
                          setAssignMenuOpen(false)
                          mutate.mutate('assignSelf')
                        }}
                      >
                        {t('assign')}
                      </button>
                      {ticket.assignedAdminId ? (
                        <button
                          type="button"
                          role="menuitem"
                          disabled={mutate.isPending}
                          onClick={() => {
                            setAssignMenuOpen(false)
                            mutate.mutate('unassign')
                          }}
                        >
                          {t('unassign')}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <span className="muted text-metadata">{t('supportManageRequired')}</span>
            )}
          </div>
        </header>

        <div className="support-meta-strip">
          <div className="support-meta-strip__item">
            <span className="support-meta-strip__label">{t('supportTicketAge')}</span>
            <strong>
              <Icon name="schedule" /> {ageLabel}
            </strong>
          </div>
          <div className="support-meta-strip__item">
            <span className="support-meta-strip__label">{t('supportAssignedTo')}</span>
            <strong>
              {ticket.assignedAdminId
                ? resolveAuthorLabel(
                    ticket.assignedAdminId === me?.adminProfileId
                      ? me?.displayName
                      : null,
                    ticket.assignedAdminId,
                    me?.adminProfileId,
                    me?.displayName,
                    t('supportAdminFallback'),
                  )
                : t('supportUnassigned')}
            </strong>
          </div>
          <div className="support-meta-strip__item">
            <span className="support-meta-strip__label">{t('supportLinkedOrder')}</span>
            <strong>
              {ticket.order ? (
                <Link to={`/orders/${ticket.order.id}`}>
                  {ticket.order.publicReference} <Icon name="open_in_new" />
                </Link>
              ) : (
                '—'
              )}
            </strong>
          </div>
          <div className="support-meta-strip__item">
            <span className="support-meta-strip__label">{t('supportLinkedCustomer')}</span>
            <strong className="muted" title={t('metricUnavailable')}>
              —
            </strong>
          </div>
          <div className="support-meta-strip__item">
            <span className="support-meta-strip__label">{t('supportSetPriority')}</span>
            {canManage ? (
              <label className="sg-select support-priority-select">
                <span className="sr-only">{t('supportSetPriority')}</span>
                <select
                  value={ticket.priority}
                  disabled={mutate.isPending}
                  onChange={(e) => mutate.mutate(`priority:${e.target.value}`)}
                >
                  {PRIORITIES.map((p) => {
                    const key = supportPriorityLabelKey(p)
                    return (
                      <option key={p} value={p}>
                        {key ? t(key) : p}
                      </option>
                    )
                  })}
                </select>
                <Icon name="expand_more" className="sg-select__chevron" />
              </label>
            ) : (
              <strong>{priorityLabel}</strong>
            )}
          </div>
        </div>

        <div className="support-workspace support-workspace--stitch">
          <section className="support-main-panel">
            <div className="support-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'conversation'}
                className={tab === 'conversation' ? 'active' : ''}
                onClick={() => setTab('conversation')}
              >
                {t('supportTabConversation')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'order'}
                className={tab === 'order' ? 'active' : ''}
                onClick={() => setTab('order')}
              >
                {t('supportTabOrderDetails')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'history'}
                className={tab === 'history' ? 'active' : ''}
                onClick={() => setTab('history')}
              >
                {t('supportTabHistory')}
              </button>
            </div>

            {tab === 'conversation' ? (
              <>
                <div className="support-thread-scroll support-conversation">
                  {messages.length === 0 ? (
                    <EmptyState label={t('auditEmpty')} />
                  ) : null}
                  {messages.map((m) => {
                    const isSelf =
                      Boolean(me?.accountId) && m.authorAccountId === me?.accountId
                    const name = resolveAuthorLabel(
                      m.displayName,
                      m.authorAccountId,
                      me?.accountId,
                      me?.displayName,
                      t('supportAuthorFallback'),
                    )
                    return (
                      <article
                        key={m.id}
                        className={`support-msg${isSelf ? ' support-msg--agent' : ' support-msg--party'}`}
                      >
                        <div className="support-msg__meta">
                          <span className="support-msg__author">
                            {name}
                            {isSelf ? ` (${t('supportAgentRole')})` : ''}
                          </span>
                          <time dateTime={m.createdAt}>
                            {new Date(m.createdAt).toLocaleString(locale, dateFmt)}
                          </time>
                        </div>
                        <div className="support-msg__body">{m.body}</div>
                      </article>
                    )
                  })}
                </div>
                {canManage && canReply ? (
                  <div className="support-composer support-composer--boxed">
                    <div className="support-composer__frame">
                      <div
                        className="support-composer__toolbar"
                        title={t('supportComposerFormatUnavailable')}
                      >
                        <button
                          type="button"
                          disabled
                          title={t('supportComposerFormatUnavailable')}
                        >
                          <Icon name="format_bold" />
                        </button>
                        <button
                          type="button"
                          disabled
                          title={t('supportComposerFormatUnavailable')}
                        >
                          <Icon name="format_italic" />
                        </button>
                        <button
                          type="button"
                          disabled
                          title={t('supportComposerAttachUnavailable')}
                        >
                          <Icon name="attach_file" /> {t('supportAttachShort')}
                        </button>
                      </div>
                      <textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        rows={4}
                        maxLength={4000}
                        placeholder={t('supportComposerPlaceholder')}
                      />
                      <div className="support-composer__footer">
                        <span className="muted text-metadata">
                          {t('supportReplyToCustomer')}
                        </span>
                        <Button
                          disabled={!reply.trim() || mutate.isPending}
                          onClick={() => mutate.mutate('reply')}
                        >
                          <Icon name="send" /> {t('supportSendReply')}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
                {canManage && !canReply ? (
                  <p className="muted text-metadata support-composer-blocked">
                    {statusLabel} — {t('reply')} / {t('reopen')}
                  </p>
                ) : null}
              </>
            ) : null}

            {tab === 'order' ? (
              <div className="support-tab-panel">
                {ticket.order ? (
                  <p>
                    <Link to={`/orders/${ticket.order.id}`}>
                      {ticket.order.publicReference}
                    </Link>
                    <span className="muted"> · {ticket.order.status}</span>
                  </p>
                ) : (
                  <p className="muted">{t('supportTabOrderUnavailable')}</p>
                )}
              </div>
            ) : null}

            {tab === 'history' ? (
              <div className="support-tab-panel">
                <p className="muted">{t('supportTabHistoryUnavailable')}</p>
              </div>
            ) : null}
          </section>

          <aside className="support-sidebar">
            <div className="support-notes-panel">
              <div className="support-notes-panel__head">
                <strong>
                  <Icon name="speaker_notes" /> {t('supportInternalNotes')}
                </strong>
              </div>
              <p className="muted text-metadata support-notes-hint">
                {t('supportInternalNotesHint')}
              </p>
              <div className="support-notes-panel__scroll">
                {notes.length === 0 ? <EmptyState label={t('auditEmpty')} /> : null}
                {notes.map((n) => {
                  const author = resolveAuthorLabel(
                    n.adminId === me?.adminProfileId ? me?.displayName : null,
                    n.adminId,
                    me?.adminProfileId,
                    me?.displayName,
                    t('supportAdminFallback'),
                  )
                  return (
                    <article key={n.id} className="support-bubble support-bubble--internal">
                      <div className="muted text-metadata">
                        {author} ·{' '}
                        {new Date(n.createdAt).toLocaleString(locale, dateFmt)}
                      </div>
                      <p style={{ margin: '4px 0 0' }}>{n.body}</p>
                    </article>
                  )
                })}
              </div>
              {canManage ? (
                <div className="support-note-composer">
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={4000}
                    placeholder={t('internalNote')}
                  />
                  <Button
                    size="sm"
                    disabled={!note.trim() || mutate.isPending}
                    onClick={() => mutate.mutate('note')}
                  >
                    {t('supportAddNote')}
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="support-quick-panel">
              <div className="support-notes-panel__head">
                <strong>
                  <Icon name="build" /> {t('supportQuickActions')}
                </strong>
              </div>
              <div className="support-quick-panel__body">
                <button type="button" className="support-quick-btn" disabled title={t('supportLinkEntityUnavailable')}>
                  <span>
                    <Icon name="link" /> {t('supportLinkEntityUnavailable')}
                  </span>
                  <Icon name="chevron_right" />
                </button>
                <button type="button" className="support-quick-btn" disabled title={t('supportDriverTrackUnavailable')}>
                  <span>
                    <Icon name="local_shipping" /> {t('supportDriverTrackUnavailable')}
                  </span>
                  <Icon name="open_in_new" />
                </button>
                {ticket.order ? (
                  <Link
                    className="support-quick-btn"
                    to={`/orders/${ticket.order.id}?tab=refund`}
                  >
                    <span>
                      <Icon name="receipt_long" /> {t('supportInitRefund')}
                    </span>
                    <Icon name="chevron_right" />
                  </Link>
                ) : (
                  <button type="button" className="support-quick-btn" disabled>
                    <span>
                      <Icon name="receipt_long" /> {t('supportInitRefund')}
                    </span>
                    <Icon name="chevron_right" />
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </RequirePermission>
  )
}
