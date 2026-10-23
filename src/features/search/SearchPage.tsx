import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/ui/StateBoxes'
import { adminApi } from '../../lib/api/adminApi'
import type {
  AdminSearchEntityType,
  AdminSearchGroup,
} from '../../lib/api/types'
import { useI18n } from '../../lib/i18n/I18nProvider'
import type { MessageKey } from '../../lib/i18n/messages'

const GROUP_TITLE: Record<AdminSearchEntityType, MessageKey> = {
  customers: 'searchGroupCustomers',
  merchants: 'searchGroupMerchants',
  drivers: 'searchGroupDrivers',
  orders: 'searchGroupOrders',
  support: 'searchGroupSupport',
}

function hrefFor(type: AdminSearchEntityType, id: string): string {
  switch (type) {
    case 'customers':
      return `/customers/${id}`
    case 'merchants':
      return `/merchants/${id}`
    case 'drivers':
      return `/drivers/${id}`
    case 'orders':
      return `/orders/${id}`
    case 'support':
      return `/support/${id}`
  }
}

function openLabel(type: AdminSearchEntityType, t: (k: MessageKey) => string) {
  switch (type) {
    case 'customers':
      return t('searchOpenCustomer')
    case 'merchants':
      return t('searchOpenMerchant')
    case 'drivers':
      return t('searchOpenDriver')
    case 'orders':
      return t('searchOpenOrder')
    case 'support':
      return t('searchOpenSupport')
  }
}

function hitTitle(group: AdminSearchGroup, index: number): string {
  const item = group.items[index] as Record<string, unknown>
  switch (group.type) {
    case 'customers':
      return String(item.fullName ?? item.id)
    case 'merchants':
      return String(item.name ?? item.id)
    case 'drivers':
      return String(item.fullName ?? item.id)
    case 'orders':
      return String(item.publicReference ?? item.id)
    case 'support':
      return String(item.publicReference ?? item.id)
  }
}

function hitSubtitle(
  group: AdminSearchGroup,
  index: number,
  t: (k: MessageKey) => string,
): string {
  const item = group.items[index] as Record<string, unknown>
  switch (group.type) {
    case 'customers': {
      const phone = item.phone ? String(item.phone) : '—'
      return `${phone} · ${String(item.accountStatus ?? '')}`
    }
    case 'merchants':
      return `${String(item.publicReference ?? '')} · ${String(item.status ?? '')}`
    case 'drivers':
      return String(item.verificationStatus ?? '')
    case 'orders': {
      const parts = [
        item.customerFullName ? String(item.customerFullName) : null,
        item.merchantName ? String(item.merchantName) : null,
        item.status ? String(item.status) : null,
      ].filter(Boolean)
      return parts.join(' · ') || t('searchOrderFallback')
    }
    case 'support': {
      const subject = item.subject ? String(item.subject) : t('searchNoSubject')
      return `${subject} · ${String(item.status ?? '')}`
    }
  }
}

/** A005 — Admin global search workspace (permission-gated Backend groups). */
export function SearchPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const urlQ = params.get('q') ?? ''
  const [draft, setDraft] = useState(urlQ)

  useEffect(() => {
    setDraft(urlQ)
  }, [urlQ])

  const q = urlQ.trim()
  const searchQ = useQuery({
    queryKey: ['admin-global-search', q],
    queryFn: () => adminApi.globalSearch(q ? { q, limitPerType: 8 } : {}),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next = draft.trim()
    setParams(next ? { q: next } : {})
  }

  const data = searchQ.data

  return (
    <div className="stack">
      <PageHeader
        title={t('searchGlobalTitle')}
        subtitle={t('searchGlobalSubtitle')}
        actions={
          <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
            {t('back')}
          </Button>
        }
      />

      <form className="card" onSubmit={onSubmit}>
        <div className="card-body row" style={{ gap: 8, alignItems: 'stretch' }}>
          <div className="field" style={{ flex: 1, margin: 0 }}>
            <label htmlFor="global-search-q">{t('search')}</label>
            <div className="row" style={{ gap: 8 }}>
              <span className="muted" aria-hidden>
                <Icon name="search" />
              </span>
              <input
                id="global-search-q"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t('searchGlobalPlaceholder')}
                autoFocus
              />
            </div>
          </div>
          <Button type="submit" disabled={searchQ.isFetching}>
            {searchQ.isFetching ? t('busy') : t('search')}
          </Button>
        </div>
      </form>

      {q ? (
        <p className="muted text-metadata">
          {t('searchResultsFor')} « {q} »
        </p>
      ) : (
        <div className="banner banner-info">{t('searchPrompt')}</div>
      )}

      {searchQ.isLoading ? <LoadingState /> : null}
      {searchQ.isError ? (
        <ErrorState onRetry={() => void searchQ.refetch()} />
      ) : null}

      {data && !searchQ.isError && !searchQ.isLoading ? (
        <>
          {data.emptyReason === 'NO_SEARCHABLE_PERMISSIONS' ? (
            <div className="banner banner-danger">
              {t('searchNoPermissions')}
            </div>
          ) : null}
          {data.emptyReason === 'NO_MATCHES' ? (
            <EmptyState label={t('searchNoMatches')} />
          ) : null}
          {data.emptyReason === 'QUERY_REQUIRED' &&
          data.permittedTypes.length > 0 ? (
            <p className="muted">{t('searchPermittedHint')}</p>
          ) : null}

          {data.groups.map((group) => (
            <section key={group.type} className="card">
              <div
                className="card-header row"
                style={{ justifyContent: 'space-between' }}
              >
                <strong>
                  {t(GROUP_TITLE[group.type])}
                  {` (${group.total})`}
                </strong>
                {group.total > group.limit ? (
                  <span className="muted text-metadata">
                    {t('searchPreviewBound')} {group.limit}/{group.total}
                  </span>
                ) : null}
              </div>
              <div className="card-body stack">
                {group.items.length === 0 ? (
                  <p className="muted">{t('searchGroupEmpty')}</p>
                ) : (
                  group.items.map((item, index) => (
                    <article
                      key={item.id}
                      className="card"
                      style={{ margin: 0 }}
                    >
                      <div
                        className="card-body row"
                        style={{
                          justifyContent: 'space-between',
                          gap: 12,
                          alignItems: 'center',
                        }}
                      >
                        <div className="stack" style={{ gap: 4, minWidth: 0 }}>
                          <div className="row" style={{ gap: 8 }}>
                            <strong
                              style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {hitTitle(group, index)}
                            </strong>
                            {'exactMatch' in item && item.exactMatch ? (
                              <span className="badge badge-neutral">
                                {t('searchExactMatch')}
                              </span>
                            ) : null}
                          </div>
                          <span className="muted text-metadata">
                            {hitSubtitle(group, index, t)}
                          </span>
                        </div>
                        <Link
                          className="btn btn-secondary btn-sm"
                          to={hrefFor(group.type, item.id)}
                        >
                          {openLabel(group.type, t)}
                        </Link>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          ))}
        </>
      ) : null}
    </div>
  )
}
