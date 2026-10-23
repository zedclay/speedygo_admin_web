import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { useI18n } from '../../lib/i18n/I18nProvider'

export function ProfilePage() {
  const { t } = useI18n()
  const me = useSessionStore((s) => s.me)
  return (
    <div>
      <PageHeader
        title={t('profile')}
        actions={
          <Link className="btn btn-secondary btn-sm" to="/settings/language">
            {t('languageSettingsLink')}
          </Link>
        }
      />
      {me ? (
        <>
          <div className="entity-header">
            <div>
              <h1>{me.displayName}</h1>
              <div className="entity-meta">
                <span>
                  {t('role')}: {me.roleName}
                </span>
                <span className="mono">{me.adminProfileId}</span>
              </div>
            </div>
          </div>
          <div className="card card-body">
            <h3 style={{ marginTop: 0 }}>{t('permissions')}</h3>
            <ul style={{ margin: 0, paddingInlineStart: 20 }}>
              {me.permissions.map((p) => (
                <li key={p} className="mono">
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <div className="banner banner-warn">{t('sessionMissing')}</div>
      )}
    </div>
  )
}
