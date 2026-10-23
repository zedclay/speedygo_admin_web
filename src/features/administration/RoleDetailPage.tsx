import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../lib/api/adminApi'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { PERMS, hasPermission } from '../../lib/permissions'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { useI18n } from '../../lib/i18n/I18nProvider'
import {
  AdministrationHubNav,
  groupPermissionCodes,
} from './AdministrationHubNav'

/** A085 — role detail (GET /admin/roles/:id). */
export function RoleDetailPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const permissions = useSessionStore((s) => s.me?.permissions)
  const canManage = hasPermission(permissions, PERMS.ROLES_MANAGE)

  const q = useQuery({
    queryKey: ['admin-role', id],
    queryFn: () => adminApi.getRole(id),
    enabled: Boolean(id),
  })

  const role = q.data
  const permGroups = useMemo(
    () =>
      groupPermissionCodes(
        (role?.permissionCodes ?? []).map((code) => ({
          code,
          description: null,
        })),
      ),
    [role?.permissionCodes],
  )

  return (
    <RequirePermission allOf={PERMS.ROLES_READ}>
      <div className="form-page admin-detail-page">
        <nav className="breadcrumb text-metadata" aria-label="Breadcrumb">
          <Link to="/administration">{t('administration')}</Link>
          <span aria-hidden> › </span>
          <Link to="/administration/roles">{t('rolesHubTitle')}</Link>
          <span aria-hidden> › </span>
          <span>{role?.name ?? t('roleDetailTitle')}</span>
        </nav>
        <AdministrationHubNav active="roles" />
        <div className="row" style={{ marginBottom: 8 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/administration/roles')}
          >
            ← {t('backToRoles')}
          </Button>
        </div>

        {q.isLoading ? <LoadingState /> : null}
        {q.isError ? <ErrorState onRetry={() => void q.refetch()} /> : null}
        {!q.isLoading && !q.isError && !role ? <EmptyState /> : null}

        {role ? (
          <>
            <PageHeader
              title={
                <span className="admin-title-with-badge">
                  <span className="admin-person-cell__name">{role.name}</span>
                  <Badge tone={role.active ? 'success' : 'neutral'}>
                    {role.active ? t('active') : t('inactive')}
                  </Badge>
                </span>
              }
              subtitle={role.description ?? t('roleDetailSubtitle')}
              actions={
                canManage ? (
                  <Link
                    className="btn btn-primary btn-sm"
                    to={`/administration/roles/${role.id}/edit`}
                  >
                    {t('edit')}
                  </Link>
                ) : null
              }
            />

            <div className="admin-detail-grid">
              <section className="card">
                <div className="card-header">
                  <h2 className="text-section-title admin-cell-ellipsis" title={role.name}>
                    {role.name}
                  </h2>
                </div>
                <div className="card-body stack">
                  <p className="muted">{role.description ?? '—'}</p>
                  <div className="admin-role-access-row">
                    <div className="admin-soft-tile">
                      <span className="text-metadata muted">{t('assignedAdmins')}</span>
                      <strong>{role.memberCount}</strong>
                    </div>
                    <div className="admin-soft-tile">
                      <span className="text-metadata muted">{t('permissions')}</span>
                      <strong>{role.permissionCodes.length}</strong>
                    </div>
                  </div>
                </div>
              </section>

              <section className="card">
                <div className="card-header">
                  <h2 className="text-section-title">{t('adminsUsingRole')}</h2>
                </div>
                <div className="card-body stack">
                  <p className="muted text-metadata">
                    {t('assignedAdmins')}: <strong>{role.memberCount}</strong>
                  </p>
                  <p className="muted text-metadata">{t('roleMembersListUnavailable')}</p>
                  <Link
                    className="admin-view-link"
                    to={`/administration/admins?roleId=${encodeURIComponent(role.id)}`}
                  >
                    {t('viewAllAdmins')}
                  </Link>
                </div>
              </section>

              <section className="card admin-detail-grid__full">
                <div className="card-header">
                  <h2 className="text-section-title">{t('accessByModule')}</h2>
                  <p className="muted text-metadata" style={{ margin: '4px 0 0' }}>
                    {t('accessByModuleHint')}
                  </p>
                </div>
                <div className="card-body">
                  {role.permissionCodes.length === 0 ? (
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
              </section>
            </div>
          </>
        ) : null}
      </div>
    </RequirePermission>
  )
}
