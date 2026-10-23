import type { ReactNode } from 'react'
import { Icon } from '../../components/ui/Icon'
import { Button } from '../../components/ui/Button'
import { useI18n } from '../../lib/i18n/I18nProvider'
import type { MessageKey } from '../../lib/i18n/messages'

export type FinanceKpi = {
  id: string
  labelKey: MessageKey
  value: string
  /** When false, value is a placeholder and detail explains unavailability. */
  live?: boolean
  tone?: 'default' | 'primary' | 'success' | 'danger'
}

export function FinanceKpiGrid({ items }: { items: FinanceKpi[] }) {
  const { t } = useI18n()
  return (
    <div className="finance-kpi-grid">
      {items.map((item) => (
        <article
          key={item.id}
          className={`finance-kpi-card${item.tone === 'danger' ? ' finance-kpi-card--danger' : ''}`}
        >
          <span className="finance-kpi-card__label">{t(item.labelKey)}</span>
          <strong
            className={`finance-kpi-card__value${
              item.tone === 'primary'
                ? ' finance-kpi-card__value--primary'
                : item.tone === 'success'
                  ? ' finance-kpi-card__value--success'
                  : item.tone === 'danger'
                    ? ' finance-kpi-card__value--danger'
                    : ''
            }`}
          >
            {item.value}
          </strong>
          {item.live === false ? (
            <span className="muted text-metadata">{t('metricUnavailable')}</span>
          ) : null}
        </article>
      ))}
    </div>
  )
}

export function FinanceToolbar({
  children,
  onRefresh,
  exportDisabled = true,
}: {
  children?: ReactNode
  onRefresh: () => void
  exportDisabled?: boolean
}) {
  const { t } = useI18n()
  return (
    <div className="finance-toolbar">
      <div className="finance-toolbar__filters">{children}</div>
      <div className="finance-toolbar__actions">
        <Button
          variant="secondary"
          size="sm"
          disabled={exportDisabled}
          title={exportDisabled ? t('exportUnavailable') : undefined}
        >
          <Icon name="download" /> {t('export')}
        </Button>
        <Button variant="secondary" size="sm" onClick={onRefresh}>
          <Icon name="refresh" /> {t('refresh')}
        </Button>
      </div>
    </div>
  )
}

/** Client-side integer minor remainder; never invents balances beyond remittance fields. */
export function remittanceRemainderMinor(
  submitted: string,
  confirmed: string | null | undefined,
): string | null {
  try {
    const s = BigInt(submitted || '0')
    const c = BigInt(confirmed || '0')
    const rem = s - c
    return rem >= 0n ? rem.toString() : null
  } catch {
    return null
  }
}

const FINANCE_STATUS_KEYS: Record<string, MessageKey> = {
  CONFIRMED: 'statusConfirmed',
  DECLARED: 'statusDeclared',
  RECONCILED: 'statusReconciled',
  OUTSTANDING: 'statusOutstandingRemit',
  PARTIAL: 'statusPartialRemit',
  DISCREPANCY: 'statusDiscrepancy',
  REQUESTED: 'statusRequested',
  UNDER_REVIEW: 'statusUnderReview',
  APPROVED: 'statusApproved',
  PROCESSING: 'statusProcessing',
  REFUNDED: 'statusRefunded',
  REJECTED: 'statusRejected',
  MANUAL_COD: 'methodManualCod',
  MANUAL_OTHER: 'methodManualOther',
}

export function financeStatusLabel(
  status: string,
  t: (key: MessageKey) => string,
): string {
  const key = FINANCE_STATUS_KEYS[status.toUpperCase()]
  return key ? t(key) : status
}

export function financeStatusTone(
  status: string,
): 'neutral' | 'success' | 'warning' | 'error' | 'info' {
  const s = status.toUpperCase()
  if (['RECONCILED', 'CONFIRMED', 'REFUNDED', 'APPROVED', 'SUCCEEDED'].includes(s))
    return 'success'
  if (['OUTSTANDING', 'DECLARED', 'REQUESTED', 'UNDER_REVIEW', 'PROCESSING', 'PARTIAL'].includes(s))
    return 'warning'
  if (['DISCREPANCY', 'REJECTED', 'FAILED', 'CANCELLED'].includes(s)) return 'error'
  return 'info'
}
