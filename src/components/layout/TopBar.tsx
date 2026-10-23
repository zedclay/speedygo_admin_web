import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { adminApi } from '../../lib/api/adminApi'
import { useI18n } from '../../lib/i18n/I18nProvider'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { Icon } from '../ui/Icon'
import { useShellChromeTitle } from './ShellChromeContext'

function initials(name: string | undefined): string {
  if (!name) return 'SG'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'SG'
}

export function TopBar({
  onToggleSidebar,
}: {
  onToggleSidebar: () => void
}) {
  const { t, locale, setLocale } = useI18n()
  const me = useSessionStore((s) => s.me)
  const setMe = useSessionStore((s) => s.setMe)
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [localeBusy, setLocaleBusy] = useState(false)
  const contextTitle = useShellChromeTitle()
  const unreadQ = useQuery({
    queryKey: ['admin-notifications-unread', me?.accountId],
    queryFn: () => adminApi.adminNotificationsUnreadCount(),
    enabled: Boolean(me?.accountId),
    refetchInterval: 60_000,
  })
  const unread = unreadQ.data?.unreadCount ?? 0

  function onSearch(e: FormEvent) {
    e.preventDefault()
    const trimmed = q.trim()
    navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search')
  }

  async function onToggleLocale() {
    if (localeBusy) return
    const next = locale === 'fr' ? 'ar' : 'fr'
    setLocaleBusy(true)
    try {
      const updated = await adminApi.updatePreferredLocale(next)
      setMe(updated)
      setLocale(next)
    } catch {
      /* keep current locale on failure */
    } finally {
      setLocaleBusy(false)
    }
  }

  return (
    <header className={`topbar${contextTitle ? ' topbar--context' : ''}`}>
      <div className="row topbar-leading" style={{ flex: 1, minWidth: 0 }}>
        <button
          type="button"
          className="icon-btn"
          onClick={onToggleSidebar}
          aria-label="Menu"
        >
          <Icon name="menu" />
        </button>
        {contextTitle ? (
          <h2 className="topbar-context-title">{contextTitle}</h2>
        ) : (
          <form className="topbar-search" onSubmit={onSearch}>
            <Icon name="search" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('searchPlaceholder')}
              aria-label={t('search')}
            />
          </form>
        )}
      </div>
      <div className="topbar-actions">
        {contextTitle ? (
          <form className="topbar-search topbar-search--compact" onSubmit={onSearch}>
            <Icon name="search" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('searchPlaceholder')}
              aria-label={t('search')}
            />
          </form>
        ) : null}
        <Link
          to="/notifications"
          className="icon-btn"
          title={t('notifications')}
          aria-label={
            unread > 0
              ? `${t('notifications')} (${unread})`
              : t('notifications')
          }
        >
          <Icon name="notifications" />
          {unread > 0 ? (
            <span className="badge badge-danger" style={{ marginInlineStart: 4 }}>
              {unread > 99 ? '99+' : unread}
            </span>
          ) : null}
        </Link>
        <Link to="/help" className="icon-btn" title={t('help')}>
          <Icon name="help" />
        </Link>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={localeBusy}
          onClick={() => void onToggleLocale()}
        >
          {locale === 'fr' ? 'AR' : 'FR'}
        </button>
        <Link
          to="/profile"
          className="profile-chip"
          title={me?.displayName ?? t('profile')}
        >
          <span className="avatar">{initials(me?.displayName)}</span>
          <span className="profile-chip__name">
            {me?.displayName ?? t('profile')}
          </span>
          <Icon name="expand_more" />
        </Link>
      </div>
    </header>
  )
}
