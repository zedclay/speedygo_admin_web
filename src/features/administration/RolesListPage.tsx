import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../lib/api/adminApi'
import { ApiError } from '../../lib/api/types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { Badge } from '../../components/ui/Badge'
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { PERMS, hasPermission } from '../../lib/permissions'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { useI18n } from '../../lib/i18n/I18nProvider'
import { AdministrationHubNav } from './AdministrationHubNav'

/** A084 — roles list (GET /admin/roles) + optional create. */
export function RolesListPage() {
  const { t } = useI18n()
  const permissions = useSessionStore((s) => s.me?.permissions)
  const canManage = hasPermission(permissions, PERMS.ROLES_MANAGE)
  const qc = useQueryClient()
  const [offset, setOffset] = useState(0)
  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [formOk, setFormOk] = useState<string | null>(null)
  const limit = 20

  const listQ = useQuery({
    queryKey: ['admin-roles', offset, q, activeFilter],
    queryFn: () =>
      adminApi.listRoles({
        limit,
        offset,
        q: q || undefined,
        active: activeFilter === 'all' ? undefined : activeFilter === 'true',
      }),
  })

  const create = useMutation({
    mutationFn: () =>
      adminApi.createRole({
        name: name.trim(),
        description: description.trim() || undefined,
        active: true,
        permissionCodes: [],
      }),
    onSuccess: async () => {
      setFormOk(t('roleCreatedSuccess'))
      setFormError(null)
      setName('')
      setDescription('')
      setShowCreate(false)
      await qc.invalidateQueries({ queryKey: ['admin-roles'] })
      await qc.invalidateQueries({ queryKey: ['admin-roles-options'] })
    },
    onError: (e) => {
      setFormOk(null)
      setFormError(e instanceof ApiError ? e.message : t('error'))
    },
  })

  function applySearch() {
    setOffset(0)
    setQ(qInput.trim())
  }

  function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || create.isPending) return
    create.mutate()
  }

  return (
    <RequirePermission allOf={PERMS.ROLES_READ}>
      <nav className="breadcrumb text-metadata" aria-label="Breadcrumb">
        <Link to="/administration">{t('administration')}</Link>
        <span aria-hidden> › </span>
        <span>{t('rolesHubTitle')}</span>
      </nav>
      <AdministrationHubNav active="roles" />
      <PageHeader
        title={t('rolesHubTitle')}
        subtitle={t('rolesHubSubtitle')}
        actions={
          canManage ? (
            <Button
              size="sm"
              onClick={() => {
                setShowCreate((v) => !v)
                setFormError(null)
                setFormOk(null)
              }}
            >
              {t('roleNewCta')}
            </Button>
          ) : null
        }
      />

      {formOk ? <div className="banner banner-success">{formOk}</div> : null}
      {formError ? <div className="banner banner-error">{formError}</div> : null}

      {showCreate && canManage ? (
        <form className="card card-body stack" onSubmit={onCreate} style={{ marginBottom: 16 }}>
          <div className="field">
            <label htmlFor="new-role-name">{t('roleName')} *</label>
            <input
              id="new-role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={create.isPending}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="new-role-desc">{t('roleDescription')}</label>
            <textarea
              id="new-role-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={create.isPending}
            />
          </div>
          <p className="muted text-metadata">{t('roleCreatePermissionsHint')}</p>
          <div className="row" style={{ gap: 8 }}>
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={!name.trim() || create.isPending}>
              {create.isPending ? t('saving') : t('roleCreateTitle')}
            </Button>
          </div>
        </form>
      ) : null}

      <div className="admin-list-toolbar">
        <div className="admin-list-toolbar__search">
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applySearch()
            }}
            placeholder={t('searchRolePlaceholder')}
            aria-label={t('search')}
          />
          <Button variant="secondary" size="sm" onClick={applySearch}>
            {t('search')}
          </Button>
        </div>
        <div className="admin-list-toolbar__filters">
          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value as 'all' | 'true' | 'false')
              setOffset(0)
            }}
            aria-label={t('status')}
          >
            <option value="all">{t('allStatuses')}</option>
            <option value="true">{t('active')}</option>
            <option value="false">{t('inactive')}</option>
          </select>
        </div>
      </div>

      {listQ.isLoading ? <LoadingState /> : null}
      {listQ.isError ? <ErrorState onRetry={() => void listQ.refetch()} /> : null}
      {listQ.data && listQ.data.items.length === 0 ? <EmptyState /> : null}
      {listQ.data && listQ.data.items.length > 0 ? (
        <>
          <div className="table-wrap admin-data-card">
            <table className="data">
              <thead>
                <tr>
                  <th>{t('role')}</th>
                  <th>{t('roleDescription')}</th>
                  <th>{t('roleUsersColumn')}</th>
                  <th>{t('status')}</th>
                  <th>{t('lastModified')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {listQ.data.items.map((r) => (
                  <tr key={r.id} className="row-actions-hover">
                    <td>
                      <div className="text-body-semibold admin-cell-ellipsis" title={r.name}>
                        {r.name}
                      </div>
                    </td>
                    <td>
                      <span
                        className="muted text-metadata admin-cell-ellipsis"
                        title={r.description ?? undefined}
                      >
                        {r.description ?? '—'}
                      </span>
                    </td>
                    <td>{r.memberCount}</td>
                    <td>
                      <Badge tone={r.active ? 'success' : 'neutral'}>
                        {r.active ? t('active') : t('inactive')}
                      </Badge>
                    </td>
                    <td className="muted text-metadata" title={t('roleLastModifiedUnavailable')}>
                      —
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link
                          to={`/administration/roles/${r.id}`}
                          className="admin-view-link"
                        >
                          {t('viewAction')}
                        </Link>
                        {canManage ? (
                          <Link
                            to={`/administration/roles/${r.id}/edit`}
                            className="admin-view-link"
                          >
                            {t('edit')}
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            total={listQ.data.total}
            limit={limit}
            offset={offset}
            onChange={setOffset}
          />
        </>
      ) : null}
    </RequirePermission>
  )
}
