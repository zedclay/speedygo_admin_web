import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/ui/StateBoxes'
import { adminApi } from '../../lib/api/adminApi'
import { ApiError } from '../../lib/api/types'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { useI18n } from '../../lib/i18n/I18nProvider'
import type { MessageKey } from '../../lib/i18n/messages'

type FilterTab = 'all' | 'unread' | 'verification' | 'support'

const PAGE_SIZE = 20

function typeLabel(type: string, t: (k: MessageKey) => string): string {
  switch (type) {
    case 'ADMIN_DRIVER_VERIF':
      return t('notifTypeDriverVerif')
    case 'ADMIN_MERCHANT_VERIF':
      return t('notifTypeMerchantVerif')
    case 'ADMIN_SUPPORT_TICKET':
      return t('notifTypeSupportTicket')
    default:
      return type
  }
}

/** A006 — Admin operational notifications inbox. */
export function NotificationsPage() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const accountId = useSessionStore((s) => s.me?.accountId ?? '')
  const [tab, setTab] = useState<FilterTab>('all')
  const [offset, setOffset] = useState(0)
  const [actionError, setActionError] = useState<string | null>(null)

  const listParams = useMemo(() => {
    const base: {
      limit: number
      offset: number
      unreadOnly?: boolean
      types?: string
    } = { limit: PAGE_SIZE, offset }
    if (tab === 'unread') base.unreadOnly = true
    if (tab === 'verification') {
      base.types = 'ADMIN_DRIVER_VERIF,ADMIN_MERCHANT_VERIF'
    }
    if (tab === 'support') base.types = 'ADMIN_SUPPORT_TICKET'
    return base
  }, [tab, offset])

  const listQ = useQuery({
    queryKey: ['admin-notifications', accountId, listParams],
    queryFn: () => adminApi.listAdminNotifications(listParams),
    enabled: Boolean(accountId),
  })

  const markOne = useMutation({
    mutationFn: (id: string) => adminApi.markAdminNotificationRead(id),
    onSuccess: async () => {
      setActionError(null)
      await queryClient.invalidateQueries({ queryKey: ['admin-notifications'] })
      await queryClient.invalidateQueries({
        queryKey: ['admin-notifications-unread'],
      })
    },
    onError: (err) => {
      setActionError(err instanceof ApiError ? err.message : t('error'))
    },
  })

  const markAll = useMutation({
    mutationFn: () => adminApi.markAllAdminNotificationsRead(),
    onSuccess: async () => {
      setActionError(null)
      await queryClient.invalidateQueries({ queryKey: ['admin-notifications'] })
      await queryClient.invalidateQueries({
        queryKey: ['admin-notifications-unread'],
      })
    },
    onError: (err) => {
      setActionError(err instanceof ApiError ? err.message : t('error'))
    },
  })

  const data = listQ.data
  const noVisibleTypes = data && data.visibleTypes.length === 0

  return (
    <div className="stack">
      <PageHeader
        title={t('notifInboxTitle')}
        subtitle={t('notifInboxSubtitle')}
        actions={
          <Button
            variant="secondary"
            size="sm"
            disabled={
              markAll.isPending || !data || data.unreadCount === 0 || noVisibleTypes
            }
            onClick={() => markAll.mutate()}
          >
            {markAll.isPending ? t('busy') : t('notifMarkAllRead')}
          </Button>
        }
      />

      <div className="banner banner-info">{t('notifScopeBanner')}</div>
      <div className="banner banner-info">{t('notifDeferredControls')}</div>

      {actionError ? (
        <div className="banner banner-danger">{actionError}</div>
      ) : null}

      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        {(
          [
            ['all', 'notifFilterAll'],
            ['unread', 'notifFilterUnread'],
            ['verification', 'notifFilterVerification'],
            ['support', 'notifFilterSupport'],
          ] as const
        ).map(([id, key]) => (
          <Button
            key={id}
            size="sm"
            variant={tab === id ? 'primary' : 'secondary'}
            onClick={() => {
              setTab(id)
              setOffset(0)
            }}
          >
            {t(key)}
            {id === 'unread' && data ? ` (${data.unreadCount})` : null}
          </Button>
        ))}
      </div>

      {listQ.isLoading ? <LoadingState /> : null}
      {listQ.isError ? (
        <ErrorState onRetry={() => void listQ.refetch()} />
      ) : null}

      {data && !listQ.isError ? (
        <>
          {noVisibleTypes ? (
            <div className="banner banner-danger">{t('notifNoPermissions')}</div>
          ) : null}
          {!noVisibleTypes && data.items.length === 0 ? (
            <EmptyState label={t('notifEmpty')} />
          ) : null}

          <div className="stack">
            {data.items.map((item) => (
              <article
                key={item.id}
                className="card"
                style={{
                  margin: 0,
                  opacity: item.read ? 0.85 : 1,
                  borderInlineStart: item.read
                    ? undefined
                    : '3px solid var(--color-primary, #2563eb)',
                }}
              >
                <div className="card-body stack" style={{ gap: 8 }}>
                  <div
                    className="row"
                    style={{ justifyContent: 'space-between', gap: 8 }}
                  >
                    <div className="row" style={{ gap: 8 }}>
                      <span className="badge badge-neutral">
                        {typeLabel(item.type, t)}
                      </span>
                      {!item.read ? (
                        <span className="badge badge-danger">{t('notifUnread')}</span>
                      ) : (
                        <span className="muted text-metadata">{t('notifRead')}</span>
                      )}
                    </div>
                    <span className="muted text-metadata">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <strong>{item.title}</strong>
                  <p style={{ margin: 0 }}>{item.body}</p>
                  <div className="row" style={{ gap: 8 }}>
                    <Link className="btn btn-secondary btn-sm" to={item.href}>
                      {t('notifOpen')}
                    </Link>
                    {!item.read ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={markOne.isPending}
                        onClick={() => markOne.mutate(item.id)}
                      >
                        {t('notifMarkRead')}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {data.total > PAGE_SIZE ? (
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <Button
                variant="secondary"
                size="sm"
                disabled={offset === 0}
                onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              >
                {t('previous')}
              </Button>
              <span className="muted text-metadata">
                {offset + 1}–{Math.min(offset + PAGE_SIZE, data.total)} /{' '}
                {data.total}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={offset + PAGE_SIZE >= data.total}
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
              >
                {t('next')}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
