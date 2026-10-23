import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../lib/api/adminApi'
import { ApiError } from '../../lib/api/types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { LoadingState, ErrorState } from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { PERMS } from '../../lib/permissions'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { useI18n } from '../../lib/i18n/I18nProvider'
import {
  AdministrationHubNav,
  groupPermissionCodes,
} from './AdministrationHubNav'

function actorHolds(granted: readonly string[], code: string): boolean {
  return granted.includes(code)
}

/** A085e — role edit with permission checklist (PATCH /admin/roles/:id). */
export function RoleEditPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const qc = useQueryClient()
  const actorPerms = useSessionStore((s) => s.me?.permissions) ?? []

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [active, setActive] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [formError, setFormError] = useState<string | null>(null)
  const [formOk, setFormOk] = useState<string | null>(null)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [pendingActive, setPendingActive] = useState(true)

  const roleQ = useQuery({
    queryKey: ['admin-role', id],
    queryFn: () => adminApi.getRole(id),
    enabled: Boolean(id),
  })

  const permsQ = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: () => adminApi.listPermissions(),
  })

  useEffect(() => {
    if (!roleQ.data) return
    setName(roleQ.data.name)
    setDescription(roleQ.data.description ?? '')
    setActive(roleQ.data.active)
    setPendingActive(roleQ.data.active)
    setSelected(new Set(roleQ.data.permissionCodes))
  }, [roleQ.data])

  const catalogue = useMemo(() => permsQ.data ?? [], [permsQ.data])
  const groups = useMemo(() => groupPermissionCodes(catalogue), [catalogue])

  const save = useMutation({
    mutationFn: (nextActive: boolean) =>
      adminApi.updateRole(id, {
        name: name.trim(),
        description: description.trim() || undefined,
        active: nextActive,
        permissionCodes: Array.from(selected),
      }),
    onSuccess: async (updated) => {
      setFormOk(t('roleUpdatedSuccess'))
      setFormError(null)
      setConfirmDeactivate(false)
      setName(updated.name)
      setDescription(updated.description ?? '')
      setActive(updated.active)
      setPendingActive(updated.active)
      setSelected(new Set(updated.permissionCodes))
      await qc.invalidateQueries({ queryKey: ['admin-role', id] })
      await qc.invalidateQueries({ queryKey: ['admin-roles'] })
      await qc.invalidateQueries({ queryKey: ['admin-roles-options'] })
    },
    onError: (e) => {
      setFormOk(null)
      setFormError(e instanceof ApiError ? e.message : t('error'))
      setConfirmDeactivate(false)
    },
  })

  function toggleCode(code: string) {
    if (!actorHolds(actorPerms, code) && !selected.has(code)) {
      // Cannot grant beyond actor delegation; still allow unchecking held codes.
      return
    }
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (save.isPending || !name.trim()) return
    if (active && !pendingActive) {
      setConfirmDeactivate(true)
      return
    }
    save.mutate(pendingActive)
  }

  const busy = save.isPending
  const loading = roleQ.isLoading || permsQ.isLoading

  return (
    <RequirePermission allOf={PERMS.ROLES_MANAGE}>
      <div className="form-page admin-detail-page">
        <nav className="breadcrumb text-metadata" aria-label="Breadcrumb">
          <Link to="/administration">{t('administration')}</Link>
          <span aria-hidden> › </span>
          <Link to="/administration/roles">{t('rolesHubTitle')}</Link>
          <span aria-hidden> › </span>
          <span>{roleQ.data?.name ?? t('roleEditTitle')}</span>
        </nav>
        <AdministrationHubNav active="roles" />
        <div className="row" style={{ marginBottom: 8 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/administration/roles')}
            disabled={busy}
          >
            ← {t('backToRoles')}
          </Button>
        </div>

        <div className="banner banner-info">{t('adminSharedRoleEditHint')}</div>
        {formOk ? <div className="banner banner-success">{formOk}</div> : null}
        {formError ? <div className="banner banner-error">{formError}</div> : null}

        {loading ? <LoadingState /> : null}
        {roleQ.isError ? <ErrorState onRetry={() => void roleQ.refetch()} /> : null}
        {permsQ.isError ? <ErrorState onRetry={() => void permsQ.refetch()} /> : null}

        {roleQ.data && permsQ.data ? (
          <form className="stack" onSubmit={onSubmit}>
            <PageHeader
              title={
                <span className="admin-title-with-badge">
                  <span className="admin-person-cell__name">
                    {name.trim() || roleQ.data.name}
                  </span>
                  <Badge tone={pendingActive ? 'success' : 'neutral'}>
                    {pendingActive ? t('active') : t('inactive')}
                  </Badge>
                </span>
              }
              subtitle={t('roleEditSubtitle')}
              actions={
                <div className="row" style={{ gap: 8 }}>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/administration/roles/${id}`)}
                    disabled={busy}
                  >
                    {t('cancel')}
                  </Button>
                  <Button type="submit" size="sm" disabled={busy || !name.trim()}>
                    {busy ? t('saving') : t('saveRoleChanges')}
                  </Button>
                </div>
              }
            />

            <div className="admin-detail-grid">
              <section className="card">
                <div className="card-header">
                  <h2 className="text-section-title">{t('role')}</h2>
                </div>
                <div className="card-body stack">
                  <div className="field">
                    <label htmlFor="role-name">{t('roleName')}</label>
                    <input
                      id="role-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={busy}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="role-desc">{t('roleDescription')}</label>
                    <textarea
                      id="role-desc"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                  <div className="admin-role-access-row">
                    <div className="admin-soft-tile">
                      <span className="text-metadata muted">{t('assignedAdmins')}</span>
                      <strong>{roleQ.data.memberCount}</strong>
                    </div>
                  </div>
                  <label className="toggle-row">
                    <div>
                      <strong>{t('roleActiveToggle')}</strong>
                      <p className="muted text-metadata" style={{ margin: '4px 0 0' }}>
                        {t('roleDeactivateWarning')}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={pendingActive}
                      onChange={(e) => setPendingActive(e.target.checked)}
                      disabled={busy}
                    />
                  </label>
                </div>
              </section>

              <section className="card">
                <div className="card-header">
                  <h2 className="text-section-title">{t('adminsUsingRole')}</h2>
                </div>
                <div className="card-body stack">
                  <p className="muted text-metadata">
                    {t('assignedAdmins')}: <strong>{roleQ.data.memberCount}</strong>
                  </p>
                  <p className="muted text-metadata">{t('roleMembersListUnavailable')}</p>
                  <Link
                    className="admin-view-link"
                    to={`/administration/admins?roleId=${encodeURIComponent(roleQ.data.id)}`}
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
                  <p className="muted text-metadata">{t('permissionDelegationHint')}</p>
                </div>
                <div className="card-body stack">
                  {catalogue.length === 0 ? (
                    <p className="muted">{t('adminNoPermissions')}</p>
                  ) : (
                    groups.map((g) => (
                      <div key={g.module} className="admin-perm-module">
                        <h3 className="text-section-title admin-perm-module__title">
                          {g.module}
                        </h3>
                        <div className="admin-perm-check-grid">
                          {g.items.map((p) => {
                            const canGrant = actorHolds(actorPerms, p.code)
                            const checked = selected.has(p.code)
                            const lockedGrant = !canGrant && !checked
                            return (
                              <label
                                key={p.id ?? p.code}
                                className={`toggle-row admin-perm-check${lockedGrant ? ' is-locked' : ''}`}
                                title={
                                  lockedGrant
                                    ? t('permissionGrantForbiddenHint')
                                    : undefined
                                }
                              >
                                <div>
                                  <strong className="mono admin-cell-ellipsis" title={p.code}>
                                    {p.code}
                                  </strong>
                                  {p.description ? (
                                    <p
                                      className="muted text-metadata admin-cell-ellipsis"
                                      style={{ margin: '4px 0 0' }}
                                      title={p.description}
                                    >
                                      {p.description}
                                    </p>
                                  ) : null}
                                </div>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleCode(p.code)}
                                  disabled={busy || lockedGrant}
                                />
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            <div className="form-actions sticky-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(`/administration/roles/${id}`)}
                disabled={busy}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={busy || !name.trim()}>
                {busy ? t('saving') : t('saveRoleChanges')}
              </Button>
            </div>
          </form>
        ) : null}

        {confirmDeactivate ? (
          <Modal
            title={t('roleDeactivateConfirmTitle')}
            onClose={() => setConfirmDeactivate(false)}
            footer={
              <>
                <Button variant="secondary" onClick={() => setConfirmDeactivate(false)}>
                  {t('cancel')}
                </Button>
                <Button onClick={() => save.mutate(false)} disabled={busy}>
                  {t('roleDeactivateConfirm')}
                </Button>
              </>
            }
          >
            <p>{t('roleDeactivateWarning')}</p>
          </Modal>
        ) : null}
      </div>
    </RequirePermission>
  )
}
