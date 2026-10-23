import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { adminApi, authApi } from '../../lib/api/adminApi'
import { ApiError } from '../../lib/api/types'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { useI18n } from '../../lib/i18n/I18nProvider'
import { Button } from '../../components/ui/Button'

function detectChannel(identifier: string): 'PHONE' | 'EMAIL' {
  return identifier.includes('@') ? 'EMAIL' : 'PHONE'
}

function normalizeIdentifier(raw: string, channel: 'PHONE' | 'EMAIL'): string {
  const trimmed = raw.trim()
  if (channel === 'EMAIL') return trimmed.toLowerCase()
  const digits = trimmed.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) return digits
  if (digits.startsWith('0') && digits.length === 10) {
    return `+213${digits.slice(1)}`
  }
  if (digits.startsWith('213')) return `+${digits}`
  return digits.startsWith('+') ? digits : `+${digits}`
}

export function LoginPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const tokens = useSessionStore((s) => s.tokens)
  const setTokens = useSessionStore((s) => s.setTokens)
  const setMe = useSessionStore((s) => s.setMe)
  const clearSession = useSessionStore((s) => s.clearSession)

  const [identifier, setIdentifier] = useState('')
  const [code, setCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (tokens) return <Navigate to="/" replace />

  async function onRequestOtp(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const channel = detectChannel(identifier)
      await authApi.requestOtp({
        channel,
        identifier: normalizeIdentifier(identifier, channel),
      })
      setOtpSent(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('error'))
    } finally {
      setBusy(false)
    }
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const channel = detectChannel(identifier)
      const id = normalizeIdentifier(identifier, channel)
      const nextTokens = await authApi.verifyOtp({
        channel,
        identifier: id,
        code: code.trim(),
        deviceId: crypto.randomUUID(),
      })
      setTokens(nextTokens)
      try {
        const me = await adminApi.me()
        setMe(me)
        if (me.preferredLocale === 'ar' || me.preferredLocale === 'fr') {
          // Locale applied on next shell load via ProtectedRoute sync.
          localStorage.setItem('speedygo.admin.locale', me.preferredLocale)
        }
        navigate('/', { replace: true })
      } catch (err) {
        clearSession()
        const message =
          err instanceof ApiError && err.status === 403
            ? t('forbidden')
            : err instanceof ApiError
              ? err.message
              : t('forbidden')
        setError(message)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>{t('loginTitle')}</h1>
        <p className="muted">{t('loginSubtitle')}</p>
        {error ? <div className="banner banner-error">{error}</div> : null}
        {!otpSent ? (
          <form className="stack" onSubmit={onRequestOtp}>
            <div className="field">
              <label htmlFor="identifier">{t('identifier')}</label>
              <input
                id="identifier"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={busy || !identifier.trim()}>
              {t('sendOtp')}
            </Button>
          </form>
        ) : (
          <form className="stack" onSubmit={onVerify}>
            <div className="field">
              <label htmlFor="otp">{t('otpCode')}</label>
              <input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                minLength={6}
                maxLength={6}
              />
            </div>
            <div className="row">
              <Button type="submit" disabled={busy || code.length !== 6}>
                {t('verify')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setOtpSent(false)
                  setCode('')
                }}
              >
                {t('back')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
