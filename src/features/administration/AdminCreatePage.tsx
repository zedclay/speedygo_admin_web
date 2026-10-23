import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../lib/api/adminApi'
import { ApiError } from '../../lib/api/types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { LoadingState, ErrorState } from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { PERMS, hasPermission } from '../../lib/permissions'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { useI18n } from '../../lib/i18n/I18nProvider'
import { AdministrationHubNav } from './AdministrationHubNav'

/** A082 — create administrator (POST /admin/admins). OTP login — no invitation. */
export function AdminCreatePage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const permissions = useSessionStore((s) => s.me?.permissions)
  const canReadRoles = hasPermission(permissions, PERMS.ROLES_READ)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [roleId, setRoleId] = useState('')
  const [activateOnCreate, setActivateOnCreate] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)

  const rolesQ = useQuery({
    queryKey: ['admin-roles-options'],
    queryFn: () => adminApi.listRoles({ limit: 100, offset: 0, active: true }),
    enabled: canReadRoles,
  })

  const contactOk = email.trim().includes('@') || phone.trim().length > 0
  const formValid = useMemo(
    () => displayName.trim().length > 1 && roleId.length > 0 && contactOk,
    [displayName, roleId, contactOk],
  )

  const create = useMutation({
    mutationFn: () =>
      adminApi.createAdmin({
        displayName: displayName.trim(),
        roleId,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        accountStatus: activateOnCreate ? 'ACTIVE' : 'SUSPENDED',
      }),
    onSuccess: async (created) => {
      setFormError(null)
      await qc.invalidateQueries({ queryKey: ['admins'] })
      navigate(`/administration/admins/${created.id}`)
    },
    onError: (e) => {
      setFormError(e instanceof ApiError ? e.message : t('error'))
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!formValid || create.isPending) return
    if (!contactOk) {
      setFormError(t('adminContactRequired'))
      return
    }
    create.mutate()
  }

  const busy = create.isPending

  return (
    <RequirePermission allOf={PERMS.ADMINS_MANAGE}>
      <div className="form-page form-page-narrow admin-form-page">
        <nav className="breadcrumb text-metadata" aria-label="Breadcrumb">
          <Link to="/administration">{t('administration')}</Link>
          <span aria-hidden> › </span>
          <Link to="/administration/admins">{t('admins')}</Link>
          <span aria-hidden> › </span>
          <span>{t('adminCreateTitle')}</span>
        </nav>
        <AdministrationHubNav active="admins" />
        <div className="row" style={{ marginBottom: 8 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/administration/admins')}
            disabled={busy}
          >
            ← {t('backToAdmins')}
          </Button>
        </div>
        <PageHeader
          title={t('adminCreateTitle')}
          subtitle={t('adminCreateSubtitle')}
        />

        <div className="banner banner-info">{t('adminInviteHint')}</div>
        <div className="banner banner-warn">{t('adminAccountStatusScopeHint')}</div>
        {formError ? <div className="banner banner-error">{formError}</div> : null}

        {rolesQ.isLoading ? <LoadingState /> : null}
        {rolesQ.isError ? (
          <ErrorState onRetry={() => void rolesQ.refetch()} />
        ) : null}

        {rolesQ.data ? (
          <form className="stack" onSubmit={onSubmit}>
            <section className="card">
              <div className="card-header">
                <h2 className="text-section-title">{t('adminAccountInfo')}</h2>
              </div>
              <div className="card-body stack">
                <div className="field">
                  <label htmlFor="admin-name">{t('adminFullName')} *</label>
                  <input
                    id="admin-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={t('adminNamePlaceholder')}
                    autoComplete="name"
                    required
                    disabled={busy}
                  />
                </div>
                <div className="admin-form-row">
                  <div className="field">
                    <label htmlFor="admin-email">{t('adminEmail')}</label>
                    <input
                      id="admin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('adminEmailPlaceholder')}
                      autoComplete="email"
                      disabled={busy}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="admin-phone">{t('adminPhone')}</label>
                    <input
                      id="admin-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t('adminPhonePlaceholder')}
                      autoComplete="tel"
                      disabled={busy}
                    />
                  </div>
                </div>
                <p className="muted text-metadata">{t('adminContactRequired')}</p>
              </div>
            </section>

            <section className="card">
              <div className="card-header">
                <h2 className="text-section-title">{t('adminRoleAccess')}</h2>
              </div>
              <div className="card-body stack">
                <div className="field">
                  <label htmlFor="admin-role">{t('adminPrimaryRole')} *</label>
                  <select
                    id="admin-role"
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    required
                    disabled={busy}
                  >
                    <option value="">{t('adminSelectRole')}</option>
                    {(rolesQ.data.items ?? []).map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="muted text-metadata">{t('adminPermissionsPreviewHint')}</p>
              </div>
            </section>

            <section className="card">
              <div className="card-header">
                <h2 className="text-section-title">{t('adminSecurity')}</h2>
              </div>
              <div className="card-body stack">
                <label className="toggle-row">
                  <div>
                    <strong>{t('adminActivateOnCreate')}</strong>
                    <p className="muted text-metadata" style={{ margin: '4px 0 0' }}>
                      {t('adminActivateOnCreateHint')}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={activateOnCreate}
                    onChange={(e) => setActivateOnCreate(e.target.checked)}
                    disabled={busy}
                  />
                </label>
                <label className="toggle-row">
                  <div>
                    <strong>{t('adminRequire2fa')}</strong>
                    <p className="muted text-metadata" style={{ margin: '4px 0 0' }}>
                      {t('adminRequire2faHint')}
                    </p>
                  </div>
                  <input type="checkbox" checked={false} disabled title={t('adminRequire2faHint')} />
                </label>
              </div>
            </section>

            <div className="form-actions sticky-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/administration/admins')}
                disabled={busy}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={!formValid || busy}>
                {busy ? t('saving') : t('adminCreateSubmit')}
              </Button>
              {!formValid ? (
                <span className="muted text-metadata">{t('adminFormIncomplete')}</span>
              ) : null}
            </div>
          </form>
        ) : null}
      </div>
    </RequirePermission>
  )
}
