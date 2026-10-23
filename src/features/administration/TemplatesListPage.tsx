import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../lib/api/adminApi'
import type { AdminNotificationTemplate } from '../../lib/api/types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { LoadingState, ErrorState } from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { PERMS } from '../../lib/permissions'
import { useI18n } from '../../lib/i18n/I18nProvider'

function formatUpdated(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : 'fr-DZ', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

/** A087 — Admin IN_APP notification templates list. */
export function TemplatesListPage() {
  const { t, locale } = useI18n()
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>(
    'all',
  )

  const listQ = useQuery({
    queryKey: ['admin-notification-templates'],
    queryFn: () => adminApi.listNotificationTemplates(),
  })

  const items = useMemo(() => {
    const rows = listQ.data?.items ?? []
    const needle = q.trim().toLowerCase()
    return rows.filter((row) => {
      if (statusFilter === 'active' && !row.active) return false
      if (statusFilter === 'inactive' && row.active) return false
      if (!needle) return true
      return (
        row.displayName.toLowerCase().includes(needle) ||
        row.code.toLowerCase().includes(needle) ||
        row.trigger.toLowerCase().includes(needle) ||
        row.locale.toLowerCase().includes(needle)
      )
    })
  }, [listQ.data?.items, q, statusFilter])

  const deferred = listQ.data?.deferredChannels ?? []

  return (
    <RequirePermission allOf={PERMS.SETTINGS_READ}>
      <div>
        <nav className="breadcrumb text-metadata" aria-label="Breadcrumb">
          <Link to="/administration">{t('administration')}</Link>
          <span aria-hidden> › </span>
          <span>{t('templates')}</span>
        </nav>
        <PageHeader
          title={t('templatesHubTitle')}
          subtitle={t('templatesHubSubtitle')}
          actions={
            <Button disabled title={t('templateCreateDisabledHint')}>
              {t('templateCreateDisabled')}
            </Button>
          }
        />

        <div className="banner banner-info" style={{ marginBottom: 12 }}>
          {t('templatesInAppScopeHint')}
        </div>

        {deferred.length > 0 ? (
          <div className="banner banner-warn" style={{ marginBottom: 12 }}>
            {`${t('templatesDeferredChannelsHint')} ${deferred.join(', ')}.`}
          </div>
        ) : null}

        <div className="filters row" style={{ marginBottom: 12, gap: 12 }}>
          <label className="field" style={{ flex: 1, minWidth: 200 }}>
            <span className="sr-only">{t('search')}</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('templateSearchPlaceholder')}
            />
          </label>
          <label className="field">
            <span className="sr-only">{t('status')}</span>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')
              }
            >
              <option value="all">{t('templateFilterAllStatus')}</option>
              <option value="active">{t('active')}</option>
              <option value="inactive">{t('inactive')}</option>
            </select>
          </label>
        </div>

        {listQ.isLoading ? <LoadingState /> : null}
        {listQ.isError ? (
          <ErrorState message={t('error')} onRetry={() => listQ.refetch()} />
        ) : null}

        {!listQ.isLoading && !listQ.isError ? (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t('templateName')}</th>
                  <th>{t('templateAudience')}</th>
                  <th>{t('templateTrigger')}</th>
                  <th>{t('templateChannel')}</th>
                  <th>{t('templateLocale')}</th>
                  <th>{t('status')}</th>
                  <th>{t('templateUpdatedAt')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-metadata">
                      {t('empty')}
                    </td>
                  </tr>
                ) : (
                  items.map((row: AdminNotificationTemplate) => (
                    <tr key={row.id}>
                      <td>
                        <div className="stack" style={{ gap: 2 }}>
                          <strong>{row.displayName}</strong>
                          <span className="text-metadata">{row.code}</span>
                        </div>
                      </td>
                      <td>{row.audience}</td>
                      <td className="text-metadata">{row.trigger}</td>
                      <td>
                        <Badge>{row.channel}</Badge>
                      </td>
                      <td>{row.locale.toUpperCase()}</td>
                      <td>
                        <Badge tone={row.active ? 'success' : 'neutral'}>
                          {row.active ? t('active') : t('inactive')}
                        </Badge>
                      </td>
                      <td className="text-metadata">
                        {formatUpdated(row.updatedAt, locale)}
                      </td>
                      <td>
                        <Link
                          className="btn btn-secondary btn-sm"
                          to={`/administration/templates/${row.id}`}
                        >
                          {t('edit')}
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </RequirePermission>
  )
}
