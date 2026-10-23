import { Button } from './Button'
import { useI18n } from '../../lib/i18n/I18nProvider'

export function Pagination({
  total,
  limit,
  offset,
  onChange,
  rangeLabel,
  integrated = false,
}: {
  total: number
  limit: number
  offset: number
  onChange: (offset: number) => void
  /** Optional full range sentence (e.g. promo footer). */
  rangeLabel?: string
  /** Border-top footer flush with a table card. */
  integrated?: boolean
}) {
  const { t } = useI18n()
  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(offset + limit, total)
  const label =
    rangeLabel ??
    (total === 0
      ? t('empty')
      : `${from}–${to} / ${total}`)
  return (
    <div
      className={
        integrated
          ? 'table-pagination-footer'
          : 'row table-pagination-row'
      }
    >
      <span className="muted text-metadata">{label}</span>
      <div className="row" style={{ gap: 8 }}>
        <Button
          variant="secondary"
          size="sm"
          disabled={offset <= 0}
          onClick={() => onChange(Math.max(0, offset - limit))}
        >
          {t('paginationPrev')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={offset + limit >= total}
          onClick={() => onChange(offset + limit)}
        >
          {t('paginationNext')}
        </Button>
      </div>
    </div>
  )
}
