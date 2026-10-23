import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { useI18n } from '../../lib/i18n/I18nProvider'

export function HelpPage() {
  const { t } = useI18n()
  return (
    <div>
      <PageHeader title={t('help')} />
      <div className="card card-body stack">
        <p>
          {t('helpSupportLink')}{' '}
          <Link to="/support">{t('support')}</Link>.
        </p>
        <p className="muted">{t('helpOtpHint')}</p>
      </div>
    </div>
  )
}
