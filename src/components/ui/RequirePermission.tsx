import type { ReactNode } from 'react'
import { useSessionStore } from '../../lib/auth/sessionStore'
import {
  hasAnyPermission,
  hasPermission,
  type PermissionCode,
} from '../../lib/permissions'
import { ForbiddenState } from './StateBoxes'

export function RequirePermission({
  allOf,
  anyOf,
  children,
}: {
  allOf?: PermissionCode | PermissionCode[]
  anyOf?: PermissionCode[]
  children: ReactNode
}) {
  const permissions = useSessionStore((s) => s.me?.permissions)
  const okAll = allOf ? hasPermission(permissions, allOf) : true
  const okAny = anyOf ? hasAnyPermission(permissions, anyOf) : true
  if (!okAll || !okAny) return <ForbiddenState />
  return <>{children}</>
}
