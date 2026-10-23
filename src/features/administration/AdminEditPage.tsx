import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../lib/api/adminApi'
import { ApiError, type AdminAccountStatus } from '../../lib/api/types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { LoadingState, ErrorState } from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { PERMS, hasPermission } from '../../lib/permissions'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { useI18n } from '../../lib/i18n/I18nProvider'
import { AdministrationHubNav } from './AdministrationHubNav'

/** A083 — edit administrator (PATCH /admin/admins/:id). */
export function AdminEditPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const qc = useQueryClient()
  const me = useSessionStore((s) => s.me)
  const isSelf = Boolean(me?.adminProfileId && me.adminProfileId === id)
  const canReadRoles = hasPermission(me?.permissions, PERMS.ROLES_READ)

  const [displayName, setDisplayName] = useState('')
  const [roleId, setRoleId] = useState('')
  const [accountStatus, setAccountStatus] = useState<AdminAccountStatus>('ACTIVE')
  const [formError, setFormError] = useState<string | null>(null)
  const [formOk, setFormOk] = useState<string | null>(null)

  const adminQ = useQuery({
    queryKey: ['admin', id],
    queryFn: () => adminApi.getAdmin(id),
    enabled: Boolean(id),
  })

  const rolesQ = useQuery({
    queryKey: ['admin-roles-options'],
    queryFn: () => adminApi.listRoles({ limit: 100, offset: 0 }),
    enabled: canReadRoles,
  })

  useEffect(() => {
    if (!adminQ.data) return
    setDisplayName(adminQ.data.displayName)
    setRoleId(adminQ.data.roleId)
    const status = adminQ.data.accountStatus
    if (status === 'ACTIVE' || status === 'SUSPENDED' || status === 'DISABLED') {
      setAccountStatus(status)
    }
  }, [adminQ.data])

  const save = useMutation({
    mutationFn: () => {
      const body: {
        displayName?: string
        roleId?: string
        accountStatus?: AdminAccountStatus
      } = { displayName: displayName.trim() }
      if (!isSelf) {
        body.roleId = roleId
        body.accountStatus = accountStatus
      }
      return adminApi.updateAdmin(id, body)
    },
    onSuccess: async (updated) => {
      setFormError(null)
      setFormOk(t('adminUpdatedSuccess'))
      setDisplayName(updated.displayName)
      setRoleId(updated.roleId)
      if (
        updated.accountStatus === 'ACTIVE' ||
        updated.accountStatus === 'SUSPENDED' ||
        updated.accountStatus === 'DISABLED'
      ) {
        setAccountStatus(updated.accountStatus)
      }
      await qc.invalidateQueries({ queryKey: ['admin', id] })
      await qc.invalidateQueries({ queryKey: ['admins'] })
    },
    onError: (e) => {
      setFormOk(null)
      setFormError(e instanceof ApiError ? e.message : t('error'))
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (save.isPending || !displayName.trim()) return
    save.mutate()
  }

  const busy = save.isPending
  const loading = adminQ.isLoading || rolesQ.isLoading

  return (
    <RequirePermission allOf={PERMS.ADMINS_MANAGE}>
      <div className="form-page form-page-narrow admin-form-page">
        <nav className="breadcrumb text-metadata" aria-label="Breadcrumb">
          <Link to="/administration">{t('administration')}</Link>
          <span aria-hidden> › </span>
          <Link to="/administration/admins">{t('admins')}</Link>
          <span aria-hidden> › </span>
          <span>{t('adminEditTitle')}</span>
        </nav>
        <AdministrationHubNav active="admins" />
        <div className="row" style={{ marginBottom: 8 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/administration/admins/${id}`)}
            disabled={busy}
          >
            ← {t('backToAdmins')}
          </Button>
        </div>
        <PageHeader
          title={t('adminEditTitle')}
          subtitle={adminQ.data?.displayName ?? t('adminEditSubtitle')}
        />

        {isSelf ? (
          <div className="banner banner-warn">{t('adminSelfEditLockHint')}</div>
        ) : null}
        <div className="banner banner-warn">{t('adminAccountStatusScopeHint')}</div>
        {formOk ? <div className="banner banner-success">{formOk}</div> : null}
        {formError ? <div className="banner banner-error">{formError}</div> : null}

        {loading ? <LoadingState /> : null}
        {adminQ.isError ? <ErrorState onRetry={() => void adminQ.refetch()} /> : null}
        {rolesQ.isError ? <ErrorState onRetry={() => void rolesQ.refetch()} /> : null}

        {adminQ.data && rolesQ.data ? (
          <form className="stack" onSubmit={onSubmit}>
            <section className="card">
              <div className="card-header">
                <h2 className="text-section-title">{t('adminIdentitySection')}</h2>
              </div>
              <div className="card-body stack">
                <div className="field">
                  <label htmlFor="edit-name">{t('adminFullName')}</label>
                  <input
                    id="edit-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={busy}
                    required
                  />
                </div>
                <div className="admin-form-row">
                  <div className="field">
                    <label htmlFor="edit-email">{t('adminEmail')}</label>
                    <input
                      id="edit-email"
                      type="email"
                      value={adminQ.data.email ?? ''}
                      disabled
                      readOnly
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="edit-phone">{t('adminPhone')}</label>
                    <input
                      id="edit-phone"
                      value={adminQ.data.phone ?? ''}
                      disabled
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="card-header">
                <h2 className="text-section-title">{t('adminRoleAccess')}</h2>
              </div>
              <div className="card-body stack">
                <div className="field">
                  <label htmlFor="edit-role">{t('adminPrimaryRole')}</label>
                  <select
                    id="edit-role"
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    disabled={busy || isSelf}
                  >
                    {(rolesQ.data.items ?? []).map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                        {!r.active ? ` (${t('inactive')})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="edit-status">{t('status')}</label>
                  <select
                    id="edit-status"
                    value={accountStatus}
                    onChange={(e) =>
                      setAccountStatus(e.target.value as AdminAccountStatus)
                    }
                    disabled={busy || isSelf}
                  >
                    <option value="ACTIVE">{t('accountStatusActive')}</option>
                    <option value="SUSPENDED">{t('accountStatusSuspended')}</option>
                    <option value="DISABLED">{t('accountStatusDisabled')}</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="card-header">
                <h2 className="text-section-title">{t('adminSecuritySection')}</h2>
              </div>
              <div className="card-body stack">
                <div className="field">
                  <label>{t('adminTwoFactor')}</label>
                  <input
                    value={
                      adminQ.data.twoFactorEnabled
                        ? t('adminTwoFactorOn')
                        : t('adminTwoFactorOff')
                    }
                    disabled
                    readOnly
                  />
                  <p className="muted text-metadata">{t('admin2faReadOnlyHint')}</p>
                </div>
              </div>
            </section>

            <div className="form-actions sticky-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(`/administration/admins/${id}`)}
                disabled={busy}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={busy || !displayName.trim()}>
                {busy ? t('saving') : t('save')}
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </RequirePermission>
  )
}
