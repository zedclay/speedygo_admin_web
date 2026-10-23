import { useI18n } from '../../lib/i18n/I18nProvider'
import type { LocalDocDecision } from '../../features/verification/verificationReviewModel'
import { localDecisionLabelKey } from '../../features/verification/verificationReviewModel'
import { Icon } from '../ui/Icon'

/**
 * Per-document local review radios (not persisted). Request-correction stays
 * disabled — complements are not exposed by Admin.
 */
export function DocumentReviewControls({
  documentId,
  persistedStatus,
  value,
  onChange,
}: {
  documentId: string
  persistedStatus: string
  value: LocalDocDecision | undefined
  onChange: (next: LocalDocDecision) => void
}) {
  const { t } = useI18n()
  const group = `doc-decision-${documentId}`

  return (
    <div className="verify-doc-decision">
      <div className="verify-doc-decision__persisted">
        <span className="muted text-metadata">{t('persistedDocumentStatus')}</span>
        <strong>{persistedStatus}</strong>
      </div>
      <div className="verify-doc-decision__local">
        <span className="muted text-metadata">{t('localReviewSelection')}</span>
        <strong>{t(localDecisionLabelKey(value))}</strong>
      </div>

      <fieldset className="verify-doc-decision__radios">
        <legend className="sr-only">{t('auditDecision')}</legend>
        <label className="verify-radio-row">
          <input
            type="radio"
            name={group}
            checked={value === 'approve'}
            onChange={() => onChange('approve')}
          />
          <span>
            <Icon name="check_circle" /> {t('validateDocument')}
          </span>
        </label>
        <label
          className="verify-radio-row verify-radio-row--disabled"
          title={t('actionUnavailableHint')}
        >
          <input type="radio" name={group} disabled checked={false} readOnly />
          <span>
            <Icon name="info" /> {t('requestCorrection')}
          </span>
        </label>
        <label className="verify-radio-row">
          <input
            type="radio"
            name={group}
            checked={value === 'reject'}
            onChange={() => onChange('reject')}
          />
          <span>
            <Icon name="cancel" /> {t('reject')}
          </span>
        </label>
      </fieldset>
    </div>
  )
}
