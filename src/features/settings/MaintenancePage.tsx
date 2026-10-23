import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { UnavailablePanel } from '../../components/ui/UnavailablePanel'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { PERMS } from '../../lib/permissions'
import { useI18n } from '../../lib/i18n/I18nProvider'

/**
 * A091 — maintenance workspace (Stitch hierarchy).
 * Backend has no maintenance key or enforcement; production UI stays unavailable-only.
 * Active-chrome previews live in docs/evidence/ui/harness/ — never this route.
 */
export function MaintenancePage() {
  const { t } = useI18n()

  return (
    <RequirePermission allOf={PERMS.SETTINGS_READ}>
      <div className="form-page form-page-narrow maintenance-page">
        <nav className="breadcrumb text-metadata" aria-label="Breadcrumb">
          <Link to="/settings">{t('settingsHubTitle')}</Link>
          <span aria-hidden> › </span>
          <span>{t('maintenanceTitle')}</span>
        </nav>
        <div className="row" style={{ marginBottom: 8 }}>
          <Link className="btn btn-ghost btn-sm" to="/settings">
            ← {t('backToSettings')}
          </Link>
        </div>
        <PageHeader
          title={t('maintenanceTitle')}
          subtitle={t('maintenanceSubtitle')}
        />

        <div className="banner banner-warn">{t('maintenanceNotImplementedBanner')}</div>

        <UnavailablePanel
          title={t('maintenanceUnavailableTitle')}
          detail={t('maintenanceUnavailableDetail')}
        >
          <p className="muted text-metadata" style={{ marginTop: 8 }}>
            {t('maintenancePolicyDocHint')}
          </p>
        </UnavailablePanel>

        <section className="card" style={{ marginTop: 16 }}>
          <div className="card-header row" style={{ justifyContent: 'space-between' }}>
            <div>
              <h2 className="text-section-title">{t('maintenancePlatformState')}</h2>
              <p className="muted text-metadata" style={{ margin: '4px 0 0' }}>
                {t('maintenancePlatformStateHint')}
              </p>
            </div>
            <label className="toggle-row" style={{ margin: 0 }}>
              <span className="text-metadata">
                <span className="maintenance-status-dot" aria-hidden />
                {t('maintenanceStatusInactive')}
              </span>
              <input
                type="checkbox"
                checked={false}
                disabled
                title={t('maintenanceToggleDisabled')}
              />
            </label>
          </div>
          <div className="card-body">
            <p className="muted text-metadata">{t('maintenanceToggleDisabled')}</p>
          </div>
        </section>

        <section className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <h2 className="text-section-title">{t('maintenanceInterruptConfig')}</h2>
          </div>
          <div className="card-body stack">
            <div className="field">
              <label htmlFor="maint-message">{t('maintenancePublicMessage')}</label>
              <textarea
                id="maint-message"
                rows={3}
                disabled
                placeholder={t('maintenancePublicMessagePlaceholder')}
              />
              <p className="muted text-metadata">{t('maintenancePublicMessageHint')}</p>
            </div>
            <div className="settings-form-row">
              <div className="field">
                <label htmlFor="maint-start">{t('maintenanceStart')}</label>
                <input id="maint-start" disabled placeholder="dd/mm/yyyy, --:--" />
              </div>
              <div className="field">
                <label htmlFor="maint-end">{t('maintenanceEnd')}</label>
                <input id="maint-end" disabled placeholder="dd/mm/yyyy, --:--" />
              </div>
            </div>
            <div className="field">
              <label>{t('maintenanceAllowedRoles')}</label>
              <div className="maintenance-role-chips" aria-disabled>
                <label className="toggle-row">
                  <span>{t('admins')}</span>
                  <input type="checkbox" checked disabled />
                </label>
                <label className="toggle-row">
                  <span>{t('maintenanceRoleSupport')}</span>
                  <input type="checkbox" checked disabled />
                </label>
                <label className="toggle-row">
                  <span>{t('maintenanceRoleLiveOps')}</span>
                  <input type="checkbox" disabled />
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <h2 className="text-section-title">{t('maintenanceGovernance')}</h2>
          </div>
          <div className="card-body stack">
            <div className="field">
              <label htmlFor="maint-reason">{t('maintenanceReason')}</label>
              <select id="maint-reason" disabled defaultValue="">
                <option value="">{t('maintenanceReasonPlaceholder')}</option>
                <option value="update">{t('maintenanceReasonUpdate')}</option>
                <option value="incident">{t('maintenanceReasonIncident')}</option>
                <option value="migration">{t('maintenanceReasonMigration')}</option>
                <option value="other">{t('maintenanceReasonOther')}</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="maint-notes">{t('maintenanceAuditNotes')}</label>
              <textarea id="maint-notes" rows={2} disabled />
            </div>
          </div>
        </section>

        <div className="form-actions sticky-actions">
          <Button type="button" variant="secondary" disabled>
            {t('cancel')}
          </Button>
          <Button type="button" disabled title={t('maintenanceConfigureDisabled')}>
            {t('maintenanceConfigure')}
          </Button>
        </div>
      </div>
    </RequirePermission>
  )
}
