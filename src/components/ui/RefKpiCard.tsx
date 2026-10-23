import type { ReactNode } from 'react'
import { Icon } from './Icon'

/**
 * Stitch-aligned KPI card (A015/A037/A042 family).
 * Surrounding layout stays even when value is unavailable (— + hint).
 */
export function RefKpiCard({
  icon,
  label,
  value,
  hint,
}: {
  icon?: string
  label: string
  value: ReactNode
  hint?: string
}) {
  return (
    <article className="ref-kpi-card">
      {icon ? (
        <span className="ref-kpi-card__icon" aria-hidden>
          <Icon name={icon} />
        </span>
      ) : null}
      <div className="ref-kpi-card__text">
        <span className="ref-kpi-card__label">{label}</span>
        <strong className="ref-kpi-card__value">{value}</strong>
        {hint ? <span className="ref-kpi-card__hint muted">{hint}</span> : null}
      </div>
    </article>
  )
}

export function RefKpiGrid({ children }: { children: ReactNode }) {
  return <div className="ref-kpi-grid">{children}</div>
}
