import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { adminApi } from '../../lib/api/adminApi'
import { ApiError } from '../../lib/api/types'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { useI18n } from '../../lib/i18n/I18nProvider'
import { applyPreferredLocaleLocally } from '../../lib/i18n/syncPreferredLocale'
import { LoadingState, ForbiddenState } from '../../components/ui/StateBoxes'

export function ProtectedRoute() {
  const location = useLocation()
  const { setLocale } = useI18n()
  const tokens = useSessionStore((s) => s.tokens)
  const me = useSessionStore((s) => s.me)
  const setMe = useSessionStore((s) => s.setMe)
  const clearSession = useSessionStore((s) => s.clearSession)
  const hydrated = useSessionStore((s) => s.hydrated)
  const [checking, setChecking] = useState(true)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!hydrated) {
        return
      }
      if (!tokens) {
        setChecking(false)
        return
      }
      setChecking(true)
      try {
        const next = await adminApi.me()
        if (!cancelled) {
          setMe(next)
          applyPreferredLocaleLocally(next.preferredLocale, setLocale)
          setForbidden(false)
        }
      } catch (err) {
        if (cancelled) return
        if (
          err instanceof ApiError &&
          (err.status === 401 ||
            err.code === 'AUTH_INVALID_TOKEN' ||
            err.code === 'AUTH_AUDIENCE_LEGACY_REJECTED')
        ) {
          clearSession()
        } else if (err instanceof ApiError && err.status === 403) {
          setForbidden(true)
        } else {
          clearSession()
        }
      } finally {
        if (!cancelled) setChecking(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [hydrated, tokens, setMe, clearSession, setLocale])

  if (!hydrated || checking) return <LoadingState />
  if (!tokens) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (forbidden && !me) return <ForbiddenState />
  return <Outlet />
}
