import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../lib/api/adminApi'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge, statusTone } from '../../components/ui/Badge'
import { EntityTabs } from '../../components/ui/EntityTabs'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { PERMS, hasPermission } from '../../lib/permissions'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { useI18n } from '../../lib/i18n/I18nProvider'
import {
  AdministrationHubNav,
  groupPermissionCodes,
  shortRef,
} from './AdministrationHubNav'

type Tab = 'overview' | 'permissions' | 'activity'

function accountStatusLabel(
  status: string,
  t: (k: 'accountStatusActive' | 'accountStatusSuspended' | 'accountStatusDisabled') => string,
): string {
  if (status === 'ACTIVE') return t('accountStatusActive')
  if (status === 'SUSPENDED') return t('accountStatusSuspended')
  if (status === 'DISABLED') return t('accountStatusDisabled')
  return status
}

/** A081p — administrator detail (GET /admin/admins/:id). */
export function AdminDetailPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const permissions = useSessionStore((s) => s.me?.permissions)
  const canManage = hasPermission(permissions, PERMS.ADMINS_MANAGE)
  const [tab, setTab] = useState<Tab>('overview')

  const q = useQuery({
    queryKey: ['admin', id],
    queryFn: () => adminApi.getAdmin(id),
    enabled: Boolean(id),
  })

  const tabs = useMemo(
    () => [
      { id: 'overview', label: t('tabOverview') },
      { id: 'permissions', label: t('permissions') },
      { id: 'activity', label: t('audit') },
    ],
    [t],
  )

  const admin = q.data
  const permGroups = useMemo(
    () =>
      groupPermissionCodes(
        (admin?.permissionCodes ?? []).map((code) => ({
          code,
          description: null,
        })),
      ),
    [admin?.permissionCodes],
  )

  return (
    <RequirePermission allOf={PERMS.ADMINS_READ}>
      <div className="form-page admin-detail-page">
        <nav className="breadcrumb text-metadata" aria-label="Breadcrumb">
          <Link to="/administration">{t('administration')}</Link>
          <span aria-hidden> › </span>
          <Link to="/administration/admins">{t('admins')}</Link>
          <span aria-hidden> › </span>
          <span>{admin?.displayName ?? t('adminDetailTitle')}</span>
        </nav>
        <AdministrationHubNav active="admins" />

        <div className="row" style={{ marginBottom: 8 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/administration/admins')}
          >
            ← {t('backToAdmins')}
          </Button>
        </div>

        {q.isLoading ? <LoadingState /> : null}
        {q.isError ? <ErrorState onRetry={() => void q.refetch()} /> : null}
        {!q.isLoading && !q.isError && !admin ? <EmptyState /> : null}

        {admin ? (
          <>
            <PageHeader
              title={
                <span className="admin-title-with-badge">
                  <span className="admin-person-cell__name">{admin.displayName}</span>
                  <Badge tone={statusTone(admin.accountStatus)}>
                    {accountStatusLabel(admin.accountStatus, t)}
                  </Badge>
                </span>
              }
              subtitle={t('adminDetailSubtitle')}
              actions={
                canManage ? (
                  <Link
                    className="btn btn-primary btn-sm"
                    to={`/administration/admins/${admin.id}/edit`}
                  >
                    {t('edit')}
                  </Link>
                ) : null
              }
            />
            <p className="mono muted text-metadata admin-ref-line" title={admin.id}>
              {shortRef(admin.id)}
            </p>

            <EntityTabs tabs={tabs} active={tab} onChange={(tid) => setTab(tid as Tab)} />

            {tab === 'overview' ? (
              <div className="admin-detail-grid">
                <section className="card">
                  <div className="card-header">
                    <h2 className="text-section-title">{t('adminIdentitySection')}</h2>
                  </div>
                  <div className="card-body">
                    <dl className="admin-dl">
                      <div>
                        <dt>{t('adminFullName')}</dt>
                        <dd className="admin-cell-ellipsis" title={admin.displayName}>
                          {admin.displayName}
                        </dd>
                      </div>
                      <div>
                        <dt>{t('adminReference')}</dt>
                        <dd className="mono" title={admin.id}>
                          {shortRef(admin.id)}
                        </dd>
                      </div>
                      <div>
                        <dt>{t('adminEmail')}</dt>
                        <dd className="admin-cell-ellipsis">{admin.email ?? '—'}</dd>
                      </div>
                      <div>
                        <dt>{t('adminPhone')}</dt>
                        <dd>{admin.phone ?? '—'}</dd>
                      </div>
                      <div>
                        <dt>{t('status')}</dt>
                        <dd>
                          <Badge tone={statusTone(admin.accountStatus)}>
                            {accountStatusLabel(admin.accountStatus, t)}
                          </Badge>
                        </dd>
                      </div>
                      <div>
                        <dt>{t('createdAt')}</dt>
                        <dd>{new Date(admin.createdAt).toLocaleString()}</dd>
                      </div>
                    </dl>
                  </div>
                </section>

                <section className="card">
                  <div className="card-header">
                    <h2 className="text-section-title">{t('adminSecuritySection')}</h2>
                  </div>
                  <div className="card-body stack">
                    <dl className="admin-dl">
                      <div>
                        <dt>{t('adminTwoFactor')}</dt>
                        <dd>
                          {admin.twoFactorEnabled
                            ? t('adminTwoFactorOn')
                            : t('adminTwoFactorOff')}
                        </dd>
                      </div>
                      <div>
                        <dt>{t('updatedAt')}</dt>
                        <dd>{new Date(admin.updatedAt).toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt>{t('adminSessionsLabel')}</dt>
                        <dd className="muted">—</dd>
                      </div>
                      <div>
                        <dt>{t('adminLastLoginLabel')}</dt>
                        <dd className="muted">—</dd>
                      </div>
                    </dl>
                    <p className="muted text-metadata">{t('admin2faReadOnlyHint')}</p>
                    <p className="muted text-metadata">{t('adminSecurityUnavailableHint')}</p>
                  </div>
                </section>

                <section className="card admin-detail-grid__full">
                  <div className="card-header">
                    <h2 className="text-section-title">{t('adminRoleAccess')}</h2>
                  </div>
                  <div className="card-body stack">
                    <div className="admin-role-access-row">
                      <div className="admin-soft-tile">
                        <span className="text-metadata muted">{t('adminPrimaryRole')}</span>
                        <strong className="admin-cell-ellipsis" title={admin.roleName}>
                          {admin.roleName}
                        </strong>
                        <span
                          className={`text-metadata ${admin.roleActive ? 'admin-ok' : 'muted'}`}
                        >
                          {admin.roleActive ? t('active') : t('inactive')}
                        </span>
                      </div>
                      <div className="admin-soft-tile">
                        <span className="text-metadata muted">{t('permissions')}</span>
                        <strong>{admin.permissionCodes.length}</strong>
                      </div>
                    </div>
                    <p className="muted text-metadata">{t('adminPermissionsInheritedHint')}</p>
                    <Link
                      className="admin-view-link"
                      to={`/administration/roles/${admin.roleId}`}
                    >
                      {t('viewRolePermissions')}
                    </Link>
                  </div>
                </section>

                <section className="card admin-detail-grid__full">
                  <div className="card-header">
                    <h2 className="text-section-title">{t('adminRecentActivity')}</h2>
                  </div>
                  <div className="card-body stack">
                    <p className="muted text-metadata">{t('adminActivityAuditHint')}</p>
                    <Link className="admin-view-link" to="/administration">
                      {t('viewAllActivity')}
                    </Link>
                  </div>
                </section>
              </div>
            ) : null}

            {tab === 'permissions' ? (
              <div className="card card-body">
                {admin.permissionCodes.length === 0 ? (
                  <p className="muted">{t('adminNoPermissions')}</p>
                ) : (
                  <div className="admin-perm-modules">
                    {permGroups.map((g) => (
                      <div key={g.module} className="admin-perm-module">
                        <h3 className="text-section-title admin-perm-module__title">
                          {g.module}
                        </h3>
                        <ul className="admin-perm-list">
                          {g.items.map((p) => (
                            <li key={p.code} className="mono">
                              {p.code}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {tab === 'activity' ? (
              <div className="card card-body stack">
                <p className="muted text-metadata">{t('adminActivityAuditHint')}</p>
                <Link className="btn btn-secondary btn-sm" to="/administration">
                  {t('audit')}
                </Link>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </RequirePermission>
  )
}
