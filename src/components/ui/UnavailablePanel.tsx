import type { ReactNode } from 'react'
import { useI18n } from '../../lib/i18n/I18nProvider'

export function UnavailablePanel({
  title,
  detail,
  children,
}: {
  title?: string
  detail?: string
  children?: ReactNode
}) {
  const { t } = useI18n()
  const heading = title ?? t('unavailable')
  const body =
    detail !== undefined
      ? detail
      : title
        ? null
        : t('unavailableHint')
  return (
    <div className="unavailable-panel" role="status">
      <h3>{heading}</h3>
      {body ? <p>{body}</p> : null}
      {children}
    </div>
  )
}
