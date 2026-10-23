import { NavLink, useLocation } from 'react-router-dom'
import { useI18n } from '../../lib/i18n/I18nProvider'
import { useSessionStore } from '../../lib/auth/sessionStore'
import {
  SIDEBAR_NAV,
  matchSidebarId,
  navItemVisible,
} from '../../lib/nav/navConfig'
import { Icon } from '../ui/Icon'

export function Sidebar() {
  const { t } = useI18n()
  const me = useSessionStore((s) => s.me)
  const location = useLocation()
  const activeId = matchSidebarId(location.pathname)

  return (
    <aside className="sidebar" aria-label="Navigation principale">
      <div className="sidebar-brand">
        <div className="sidebar-brand-row">
          <Icon name="bolt" />
          <span>SpeedyGo</span>
        </div>
        <div className="sidebar-brand-tag">Admin</div>
      </div>
      <button
        type="button"
        className="sidebar-cta"
        disabled
        title={t('newOrderUnavailable')}
      >
        {t('newOrder')}
      </button>
      <nav className="sidebar-nav">
        {SIDEBAR_NAV.filter((item) =>
          navItemVisible(item, me?.permissions),
        ).map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={() =>
              `sidebar-link${activeId === item.id ? ' active' : ''}`
            }
            end={item.path === '/'}
          >
            <Icon name={item.icon} />
            <span>{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <NavLink to="/logout" className="sidebar-link">
          <Icon name="logout" />
          <span>{t('logout')}</span>
        </NavLink>
      </div>
    </aside>
  )
}
