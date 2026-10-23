import { useI18n } from '../../lib/i18n/I18nProvider'
import type { MessageKey } from '../../lib/i18n/messages'
import { Icon } from '../ui/Icon'
import { Button } from '../ui/Button'

export type FilterChipSpec = {
  id: string
  labelKey: MessageKey
  /** Only bound filters are interactive; others render disabled. */
  bound?: boolean
}

/**
 * Stitch-style filter row. Bind only supported filters (search is separate).
 * Unsupported chips stay visible but disabled — no invented query params.
 */
export function VerificationFilterChips({
  search,
  onSearchChange,
  searchPlaceholderKey = 'searchVerificationFile',
  chips,
  onRefresh,
}: {
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholderKey?: MessageKey
  chips: FilterChipSpec[]
  onRefresh: () => void
}) {
  const { t } = useI18n()

  return (
    <div className="verify-filters">
      <div className="verify-search">
        <Icon name="search" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t(searchPlaceholderKey)}
          aria-label={t(searchPlaceholderKey)}
        />
      </div>
      <div className="verify-filter-chips" role="group" aria-label={t('filters')}>
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className="verify-filter-chip"
            disabled={!chip.bound}
            title={chip.bound ? undefined : t('filterUnsupported')}
            aria-disabled={!chip.bound}
          >
            {t(chip.labelKey)}
            <Icon name="expand_more" />
          </button>
        ))}
      </div>
      <Button variant="secondary" size="sm" onClick={onRefresh}>
        <Icon name="refresh" /> {t('refresh')}
      </Button>
    </div>
  )
}
