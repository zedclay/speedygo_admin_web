import type { ReactNode } from 'react'
import { Button } from './Button'
import { useI18n } from '../../lib/i18n/I18nProvider'

export function Modal({
  title,
  children,
  onClose,
  footer,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  footer?: ReactNode
}) {
  const { t } = useI18n()
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">{title}</div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          {footer ?? (
            <Button variant="secondary" onClick={onClose}>
              {t('cancel')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
