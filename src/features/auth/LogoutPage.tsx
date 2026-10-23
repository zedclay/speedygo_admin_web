import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../../lib/api/adminApi'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { useI18n } from '../../lib/i18n/I18nProvider'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'

export function LogoutPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const clearSession = useSessionStore((s) => s.clearSession)
  const [busy, setBusy] = useState(false)

  async function confirmLogout() {
    setBusy(true)
    try {
      await authApi.logout()
    } catch {
      // clear locally even if network fails
    } finally {
      clearSession()
      setBusy(false)
      navigate('/login', { replace: true })
    }
  }

  return (
    <div>
      <PageHeader title={t('logout')} subtitle={t('logoutConfirm')} />
      <div className="card card-body row">
        <Button disabled={busy} onClick={confirmLogout}>
          {t('confirm')}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => navigate(-1)}>
          {t('cancel')}
        </Button>
      </div>
    </div>
  )
}
