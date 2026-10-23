import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../lib/api/adminApi'
import { ApiError, type PlatformSetting } from '../../lib/api/types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { UnavailablePanel } from '../../components/ui/UnavailablePanel'
import { LoadingState, ErrorState } from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { PERMS, hasPermission } from '../../lib/permissions'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { useI18n } from '../../lib/i18n/I18nProvider'
import { SETTINGS_KEYS } from './settingsKeys'

function settingValue(
  items: PlatformSetting[] | undefined,
  key: string,
): string {
  const row = items?.find((s) => s.key === key)
  if (row == null || row.value == null) return ''
  return typeof row.value === 'string' ? row.value : String(row.value)
}

function settingUpdatedAt(
  items: PlatformSetting[] | undefined,
  keys: string[],
): string | null {
  let latest: string | null = null
  for (const key of keys) {
    const row = items?.find((s) => s.key === key)
    if (row?.updatedAt && (!latest || row.updatedAt > latest)) {
      latest = row.updatedAt
    }
  }
  return latest
}

/** A090 — platform settings hub (allowlisted support contacts + honest unavailable cards). */
export function SettingsPage() {
  const { t } = useI18n()
  const permissions = useSessionStore((s) => s.me?.permissions)
  const canManage = hasPermission(permissions, PERMS.SETTINGS_MANAGE)
  const qc = useQueryClient()

  const q = useQuery({
    queryKey: ['settings'],
    queryFn: () => adminApi.listSettings(),
  })

  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [formOk, setFormOk] = useState<string | null>(null)

  useEffect(() => {
    if (!q.data) return
    setEmail(settingValue(q.data, SETTINGS_KEYS.SUPPORT_EMAIL))
    setPhone(settingValue(q.data, SETTINGS_KEYS.SUPPORT_PHONE))
  }, [q.data])

  const baselineEmail = settingValue(q.data, SETTINGS_KEYS.SUPPORT_EMAIL)
  const baselinePhone = settingValue(q.data, SETTINGS_KEYS.SUPPORT_PHONE)
  const dirty = email !== baselineEmail || phone !== baselinePhone

  const lastUpdated = useMemo(
    () =>
      settingUpdatedAt(q.data, [
        SETTINGS_KEYS.SUPPORT_EMAIL,
        SETTINGS_KEYS.SUPPORT_PHONE,
      ]),
    [q.data],
  )

  const save = useMutation({
    mutationFn: async () => {
      const ops: Promise<unknown>[] = []
      if (email !== baselineEmail) {
        ops.push(adminApi.updateSetting(SETTINGS_KEYS.SUPPORT_EMAIL, email.trim()))
      }
      if (phone !== baselinePhone) {
        ops.push(adminApi.updateSetting(SETTINGS_KEYS.SUPPORT_PHONE, phone.trim()))
      }
      if (ops.length === 0) return []
      return Promise.all(ops)
    },
    onSuccess: async () => {
      setFormError(null)
      setFormOk(t('settingsSaved'))
      await qc.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: (e) => {
      setFormOk(null)
      setFormError(e instanceof ApiError ? e.message : t('error'))
    },
  })

  function onReset() {
    setEmail(baselineEmail)
    setPhone(baselinePhone)
    setFormError(null)
    setFormOk(null)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canManage || !dirty || save.isPending) return
    save.mutate()
  }

  const busy = save.isPending

  return (
    <RequirePermission allOf={PERMS.SETTINGS_READ}>
      <div className="form-page settings-hub">
        <nav className="breadcrumb text-metadata" aria-label="Breadcrumb">
          <Link to="/">{t('overview')}</Link>
          <span aria-hidden> › </span>
          <span>{t('settingsHubTitle')}</span>
        </nav>
        <PageHeader
          title={t('settingsHubTitle')}
          subtitle={t('settingsHubSubtitle')}
          actions={
            <Button variant="secondary" size="sm" onClick={() => void q.refetch()}>
              {t('refresh')}
            </Button>
          }
        />

        {formOk ? <div className="banner banner-success">{formOk}</div> : null}
        {formError ? <div className="banner banner-error">{formError}</div> : null}
        {q.isLoading ? <LoadingState /> : null}
        {q.isError ? <ErrorState onRetry={() => void q.refetch()} /> : null}

        {q.data ? (
          <form className="stack settings-hub__stack" onSubmit={onSubmit}>
            <section className="card">
              <div className="card-header">
                <h2 className="text-section-title">{t('settingsSupportCard')}</h2>
                <p className="muted text-metadata" style={{ margin: '4px 0 0' }}>
                  {t('settingsSupportCardHint')}
                </p>
              </div>
              <div className="card-body stack">
                <div className="settings-form-row">
                  <div className="field">
                    <label htmlFor="settings-email">{t('settingsSupportEmail')}</label>
                    <input
                      id="settings-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={!canManage || busy}
                      placeholder="support@speedygo.dz"
                      autoComplete="off"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="settings-phone">{t('settingsSupportPhone')}</label>
                    <input
                      id="settings-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={!canManage || busy}
                      placeholder="+213555000000"
                      autoComplete="off"
                    />
                    <p className="muted text-metadata">{t('settingsPhoneHint')}</p>
                  </div>
                </div>
                {!canManage ? (
                  <p className="muted text-metadata">{t('settingsManageRequired')}</p>
                ) : null}
                <p className="muted text-metadata">{t('settingsEffectiveHint')}</p>
              </div>
            </section>

            <section className="card">
              <div className="card-header row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <h2 className="text-section-title">{t('languagePageTitle')}</h2>
                  <p className="muted text-metadata" style={{ margin: '4px 0 0' }}>
                    {t('languagePageSubtitle')}
                  </p>
                </div>
                <Link className="btn btn-secondary btn-sm" to="/settings/language">
                  {t('languageSettingsLink')}
                </Link>
              </div>
            </section>

            <section className="card">
              <div className="card-header">
                <h2 className="text-section-title">{t('settingsOpsCard')}</h2>
              </div>
              <div className="card-body">
                <UnavailablePanel
                  title={t('settingsOpsUnavailableTitle')}
                  detail={t('settingsOpsUnavailableDetail')}
                />
                <div className="settings-ghost-grid" aria-hidden>
                  <div className="field">
                    <label>{t('settingsOpsDelayLabel')}</label>
                    <input disabled value="—" />
                  </div>
                  <div className="field">
                    <label>{t('settingsOpsRadiusLabel')}</label>
                    <input disabled value="—" />
                  </div>
                  <div className="field settings-ghost-grid__full">
                    <label>{t('settingsOpsCodCapLabel')}</label>
                    <input disabled value="—" />
                  </div>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="card-header">
                <h2 className="text-section-title">{t('settingsAlertsCard')}</h2>
              </div>
              <div className="card-body">
                <UnavailablePanel
                  title={t('settingsAlertsUnavailableTitle')}
                  detail={t('settingsAlertsUnavailableDetail')}
                />
              </div>
            </section>

            <section className="card">
              <div className="card-header">
                <h2 className="text-section-title">{t('settingsSecurityCard')}</h2>
              </div>
              <div className="card-body">
                <UnavailablePanel
                  title={t('settingsSecurityUnavailableTitle')}
                  detail={t('settingsSecurityUnavailableDetail')}
                />
              </div>
            </section>

            <section className="card">
              <div className="card-header">
                <h2 className="text-section-title">{t('settingsCommissionCard')}</h2>
              </div>
              <div className="card-body">
                <UnavailablePanel
                  title={t('settingsCommissionUnavailableTitle')}
                  detail={t('settingsCommissionUnavailableDetail')}
                />
              </div>
            </section>

            <section className="card">
              <div className="card-header row" style={{ justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <h2 className="text-section-title">{t('templatesHubTitle')}</h2>
                  <p className="muted text-metadata" style={{ margin: '4px 0 0' }}>
                    {t('templatesInAppScopeHint')}
                  </p>
                </div>
                <Link
                  className="btn btn-secondary btn-sm"
                  to="/administration/templates"
                >
                  {t('settingsManageTemplates')}
                </Link>
              </div>
            </section>

            <section className="card">
              <div className="card-header row" style={{ justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                    <h2 className="text-section-title" style={{ margin: 0 }}>
                      {t('maintenanceTitle')}
                    </h2>
                    <span className="badge badge-neutral">{t('maintenanceBadgeOff')}</span>
                  </div>
                  <p className="muted text-metadata" style={{ margin: '4px 0 0' }}>
                    {t('maintenanceHubHint')}
                  </p>
                </div>
                <Link className="btn btn-secondary btn-sm" to="/settings/maintenance">
                  {t('maintenanceConfigure')}
                </Link>
              </div>
            </section>

            <div className="form-actions sticky-actions settings-hub__actions">
              <span className="muted text-metadata">
                {lastUpdated
                  ? `${t('updatedAt')}: ${new Date(lastUpdated).toLocaleString()}`
                  : t('settingsNoPersistedUpdate')}
              </span>
              <div className="row" style={{ gap: 8 }}>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!dirty || busy}
                  onClick={onReset}
                >
                  {t('settingsCancelChanges')}
                </Button>
                <Button type="submit" disabled={!canManage || !dirty || busy}>
                  {busy ? t('saving') : t('settingsSave')}
                </Button>
              </div>
            </div>
          </form>
        ) : null}
      </div>
    </RequirePermission>
  )
}
