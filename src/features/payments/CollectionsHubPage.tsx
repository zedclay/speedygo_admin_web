import { NavLink, Outlet } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { useI18n } from '../../lib/i18n/I18nProvider'

export function CollectionsHubPage() {
  const { t } = useI18n()
  return (
    <div>
      <PageHeader title={t('collections')} subtitle={t('collectionsHubHint')} />
      <div className="tabs finance-tabs" role="tablist">
        <NavLink
          to="/collections/cod"
          className={({ isActive }) => `tab${isActive ? ' active' : ''}`}
        >
          {t('codTracking')}
        </NavLink>
        <NavLink
          to="/collections/payments"
          className={({ isActive }) => `tab${isActive ? ' active' : ''}`}
        >
          {t('electronicPayments')}
        </NavLink>
        <NavLink
          to="/collections/refunds"
          className={({ isActive }) => `tab${isActive ? ' active' : ''}`}
        >
          {t('refunds')}
        </NavLink>
        <NavLink
          to="/collections/settlements"
          className={({ isActive }) => `tab${isActive ? ' active' : ''}`}
        >
          {t('settlements')}
        </NavLink>
      </div>
      <Outlet />
    </div>
  )
}
