import { NavLink } from 'react-router-dom'
import { useI18n } from '../../lib/i18n/I18nProvider'
import { PERMS, hasPermission } from '../../lib/permissions'
import { useSessionStore } from '../../lib/auth/sessionStore'

export type AdministrationHubTab = 'admins' | 'roles' | 'audit'

/**
 * Stitch administration family tabs (A081 / A084 hubs).
 * Navigates to supported routes; audit requires audit.read.
 */
export function AdministrationHubNav({ active }: { active: AdministrationHubTab }) {
  const { t } = useI18n()
  const permissions = useSessionStore((s) => s.me?.permissions)
  const canAudit = hasPermission(permissions, PERMS.AUDIT_READ)
  const canRoles = hasPermission(permissions, PERMS.ROLES_READ)
  const canAdmins = hasPermission(permissions, PERMS.ADMINS_READ)

  return (
    <nav className="tabs admin-hub-tabs" aria-label={t('administration')}>
      {canAdmins ? (
        <NavLink
          to="/administration/admins"
          className={() => `tab${active === 'admins' ? ' active' : ''}`}
          end
        >
          {t('admins')}
        </NavLink>
      ) : null}
      {canRoles ? (
        <NavLink
          to="/administration/roles"
          className={() => `tab${active === 'roles' ? ' active' : ''}`}
          end
        >
          {t('rolesHubTitle')}
        </NavLink>
      ) : null}
      {canAudit ? (
        <NavLink
          to="/administration"
          className={() => `tab${active === 'audit' ? ' active' : ''}`}
          end
        >
          {t('auditJournalTitle')}
        </NavLink>
      ) : null}
    </nav>
  )
}

export function adminInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase()
}

export function shortRef(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id
}

export type PermissionGroupItem = {
  id?: string
  code: string
  description: string | null
}

export function groupPermissionCodes(
  codes: readonly PermissionGroupItem[],
): { module: string; items: PermissionGroupItem[] }[] {
  const map = new Map<string, PermissionGroupItem[]>()
  for (const item of codes) {
    const module = item.code.includes('.') ? item.code.split('.')[0]! : 'other'
    const list = map.get(module) ?? []
    list.push(item)
    map.set(module, list)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([module, items]) => ({
      module,
      items: items.sort((x, y) => x.code.localeCompare(y.code)),
    }))
}
