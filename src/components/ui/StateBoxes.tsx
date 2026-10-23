import { useI18n } from '../../lib/i18n/I18nProvider'
import { Button } from './Button'

export function LoadingState({ label }: { label?: string }) {
  const { t } = useI18n()
  return <div className="state-box">{label ?? t('loading')}</div>
}

export function EmptyState({ label }: { label?: string }) {
  const { t } = useI18n()
  return <div className="state-box">{label ?? t('empty')}</div>
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="state-box error">
      <p>{message ?? t('error')}</p>
      {onRetry ? (
        <div style={{ marginTop: 12 }}>
          <Button variant="secondary" onClick={onRetry}>
            {t('refresh')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export function ForbiddenState({ message }: { message?: string }) {
  const { t } = useI18n()
  return (
    <div className="state-box forbidden">{message ?? t('forbidden')}</div>
  )
}

export function UnavailableState({
  title,
  detail,
}: {
  title?: string
  detail?: string
}) {
  const { t } = useI18n()
  return (
    <div className="card card-body">
      <h2 style={{ marginTop: 0 }}>{title ?? t('unavailable')}</h2>
      <p className="muted">{detail ?? t('unavailableHint')}</p>
    </div>
  )
}
