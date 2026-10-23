import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { adminApi } from '../../lib/api/adminApi'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { Badge, statusTone } from '../../components/ui/Badge'
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { PERMS, hasPermission } from '../../lib/permissions'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { useI18n } from '../../lib/i18n/I18nProvider'
import type { AdminAccountStatus } from '../../lib/api/types'
import {
  AdministrationHubNav,
  adminInitials,
  shortRef,
} from './AdministrationHubNav'

function accountStatusLabel(
  status: string,
  t: (k: 'accountStatusActive' | 'accountStatusSuspended' | 'accountStatusDisabled') => string,
): string {
  if (status === 'ACTIVE') return t('accountStatusActive')
  if (status === 'SUSPENDED') return t('accountStatusSuspended')
  if (status === 'DISABLED') return t('accountStatusDisabled')
  return status
}

/** A081 — administrators list (GET /admin/admins). */
export function AdminsListPage() {
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const permissions = useSessionStore((s) => s.me?.permissions)
  const canManage = hasPermission(permissions, PERMS.ADMINS_MANAGE)
  const [offset, setOffset] = useState(0)
  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')
  const [roleId, setRoleId] = useState(() => searchParams.get('roleId') ?? '')
  const [accountStatus, setAccountStatus] = useState<'' | AdminAccountStatus>('')
  const limit = 20

  useEffect(() => {
    const fromUrl = searchParams.get('roleId') ?? ''
    setRoleId(fromUrl)
    setOffset(0)
  }, [searchParams])

  const canReadRoles = hasPermission(permissions, PERMS.ROLES_READ)
  const rolesQ = useQuery({
    queryKey: ['admin-roles-options'],
    queryFn: () => adminApi.listRoles({ limit: 100, offset: 0, active: true }),
    enabled: canReadRoles,
  })

  const listQ = useQuery({
    queryKey: ['admins', offset, q, roleId, accountStatus],
    queryFn: () =>
      adminApi.listAdmins({
        limit,
        offset,
        q: q || undefined,
        roleId: roleId || undefined,
        accountStatus: accountStatus || undefined,
      }),
  })

  function applySearch() {
    setOffset(0)
    setQ(qInput.trim())
  }

  return (
    <RequirePermission allOf={PERMS.ADMINS_READ}>
      <nav className="breadcrumb text-metadata" aria-label="Breadcrumb">
        <Link to="/administration">{t('administration')}</Link>
        <span aria-hidden> › </span>
        <span>{t('admins')}</span>
      </nav>
      <AdministrationHubNav active="admins" />
      <PageHeader
        title={t('admins')}
        subtitle={t('adminsListSubtitle')}
        actions={
          canManage ? (
            <Link className="btn btn-primary btn-sm" to="/administration/admins/new">
              {t('adminNewCta')}
            </Link>
          ) : null
        }
      />
      <div className="admin-list-toolbar">
        <div className="admin-list-toolbar__search">
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applySearch()
            }}
            placeholder={t('searchAdminPlaceholder')}
            aria-label={t('search')}
          />
          <Button variant="secondary" size="sm" onClick={applySearch}>
            {t('search')}
          </Button>
        </div>
        <div className="admin-list-toolbar__filters">
          <select
            value={accountStatus}
            onChange={(e) => {
              setAccountStatus(e.target.value as '' | AdminAccountStatus)
              setOffset(0)
            }}
            aria-label={t('status')}
          >
            <option value="">{t('allStatuses')}</option>
            <option value="ACTIVE">{t('accountStatusActive')}</option>
            <option value="SUSPENDED">{t('accountStatusSuspended')}</option>
            <option value="DISABLED">{t('accountStatusDisabled')}</option>
          </select>
          <select
            value={roleId}
            onChange={(e) => {
              setRoleId(e.target.value)
              setOffset(0)
            }}
            aria-label={t('role')}
          >
            <option value="">{t('allRoles')}</option>
            {(rolesQ.data?.items ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
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
                  <th>{t('administrator')}</th>
                  <th>{t('role')}</th>
                  <th>{t('status')}</th>
                  <th>{t('lastActivity')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {listQ.data.items.map((a) => (
                  <tr key={a.id} className="row-actions-hover">
                    <td>
                      <div className="admin-person-cell">
                        <span className="avatar" aria-hidden>
                          {adminInitials(a.displayName)}
                        </span>
                        <div className="admin-person-cell__text">
                          <div className="text-body-semibold admin-person-cell__name">
                            {a.displayName}
                          </div>
                          <div className="mono muted text-metadata" title={a.id}>
                            {shortRef(a.id)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="admin-cell-ellipsis" title={a.roleName}>
                        {a.roleName}
                      </span>
                      {!a.roleActive ? (
                        <span className="muted text-metadata"> ({t('inactive')})</span>
                      ) : null}
                    </td>
                    <td>
                      <Badge tone={statusTone(a.accountStatus)}>
                        {accountStatusLabel(a.accountStatus, t)}
                      </Badge>
                    </td>
                    <td className="text-metadata">
                      {new Date(a.updatedAt).toLocaleString()}
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link
                          to={`/administration/admins/${a.id}`}
                          className="admin-view-link"
                        >
                          {t('viewAction')}
                        </Link>
                        {canManage ? (
                          <Link
                            to={`/administration/admins/${a.id}/edit`}
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
