import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { adminApi } from '../../lib/api/adminApi'
import { ApiError } from '../../lib/api/types'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { useI18n } from '../../lib/i18n/I18nProvider'
import type { Locale } from '../../lib/i18n/messages'

/**
 * A008 — dedicated language settings workspace (not topbar-only toggle).
 * Save persists AdminProfile.preferredLocale (drives future IN_APP emit locale)
 * and local I18nProvider; Cancel restores draft to saved value.
 */
export function LanguageSettingsPage() {
  const { t, locale, setLocale, dir } = useI18n()
  const navigate = useNavigate()
  const setMe = useSessionStore((s) => s.setMe)
  const [draft, setDraft] = useState<Locale>(locale)
  const [savedFlash, setSavedFlash] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDraft(locale)
  }, [locale])

  const dirty = draft !== locale

  function onCancel() {
    setDraft(locale)
    navigate('/settings')
  }

  async function onSave() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const me = await adminApi.updatePreferredLocale(draft)
      setMe(me)
      setLocale(draft)
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 2000)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="form-page form-page-narrow">
      <nav className="breadcrumb text-metadata" aria-label="Breadcrumb">
        <Link to="/profile">{t('profile')}</Link>
        <span aria-hidden> › </span>
        <span>{t('languagePageTitle')}</span>
      </nav>
      <PageHeader
        title={t('languagePageTitle')}
        subtitle={t('languagePageSubtitle')}
      />
      {savedFlash ? (
        <div className="banner banner-success">{t('languageSaved')}</div>
      ) : null}
      {error ? (
        <div className="banner banner-error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="card card-body stack">
        <h2 className="text-section-title">{t('languageAvailable')}</h2>
        <div className="lang-options">
          <label
            className={`lang-option${draft === 'fr' ? ' selected' : ''}`}
          >
            <input
              type="radio"
              name="lang"
              value="fr"
              checked={draft === 'fr'}
              onChange={() => setDraft('fr')}
            />
            <div className="lang-option-body">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <strong>Français</strong>
                {locale === 'fr' ? (
                  <span className="badge badge-success">{t('activeBadge')}</span>
                ) : null}
              </div>
              <p className="muted text-body-base" style={{ margin: '4px 0 0' }}>
                {t('languageFrHint')}
              </p>
            </div>
          </label>
          <label
            className={`lang-option${draft === 'ar' ? ' selected' : ''}`}
          >
            <input
              type="radio"
              name="lang"
              value="ar"
              checked={draft === 'ar'}
              onChange={() => setDraft('ar')}
            />
            <div className="lang-option-body">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <strong>العربية</strong>
                {locale === 'ar' ? (
                  <span className="badge badge-success">{t('activeBadge')}</span>
                ) : null}
              </div>
              <p className="muted text-body-base" style={{ margin: '4px 0 0' }}>
                {t('languageArHint')}
              </p>
            </div>
          </label>
        </div>

        <div className="banner banner-info" style={{ marginBottom: 0 }}>
          {t('languageNotifLocaleHint')}
        </div>
        <div className="banner banner-info" style={{ marginBottom: 0 }}>
          {t('languageRtlInfo')}
        </div>

        <div className="card card-body" style={{ background: 'var(--sg-canvas)' }}>
          <h3 className="text-body-semibold" style={{ marginTop: 0 }}>
            {t('languagePreviewTitle')}
          </h3>
          <p className="text-body-base" style={{ margin: 0 }} dir={draft === 'ar' ? 'rtl' : 'ltr'}>
            {draft === 'ar' ? t('languagePreviewAr') : t('languagePreviewFr')}
          </p>
          <p className="muted text-metadata" style={{ marginTop: 8 }}>
            {t('languageCurrentDir')}: {dir.toUpperCase()} →{' '}
            {draft === 'ar' ? 'RTL' : 'LTR'}
          </p>
        </div>
      </div>

      <div className="form-actions">
        <Button variant="secondary" onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button onClick={() => void onSave()} disabled={!dirty || busy}>
          {busy ? t('saving') : t('save')}
        </Button>
      </div>
    </div>
  )
}
