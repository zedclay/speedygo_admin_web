import type { ReactNode } from 'react'
import { Badge, type BadgeTone } from './Badge'

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase()
}

/**
 * Shared entity hero for customer / merchant / driver / order detail screens.
 * Keeps Stitch hierarchy (avatar, title, status, ref chip, actions) without inventing data.
 */
export function EntityProfileHeader({
  title,
  subtitle,
  status,
  statusTone = 'neutral',
  reference,
  avatarUrl,
  meta,
  actions,
  kpis,
}: {
  title: string
  subtitle?: string
  status?: string
  statusTone?: BadgeTone
  reference?: string | null
  avatarUrl?: string | null
  meta?: ReactNode
  actions?: ReactNode
  kpis?: { label: string; value: ReactNode; hint?: string }[]
}) {
  return (
    <header className="entity-header">
      <div className="entity-header-main">
        <div className="entity-header-identity">
          {avatarUrl ? (
            <img className="avatar avatar-lg" src={avatarUrl} alt="" />
          ) : (
            <span className="avatar avatar-lg" aria-hidden>
              {initials(title)}
            </span>
          )}
          <div>
            <div className="entity-header-title-row">
              <h1>{title}</h1>
              {status ? <Badge tone={statusTone}>{status}</Badge> : null}
            </div>
            {subtitle ? <p className="entity-header-subtitle">{subtitle}</p> : null}
            <div className="entity-meta">
              {reference ? <span className="mono chip-ref">{reference}</span> : null}
              {meta}
            </div>
          </div>
        </div>
      </div>
      {actions ? <div className="page-actions entity-header-actions">{actions}</div> : null}
      {kpis && kpis.length > 0 ? (
        <div className="entity-kpi-strip">
          {kpis.map((k) => (
            <div key={k.label} className="entity-kpi">
              <span className="entity-kpi-label">{k.label}</span>
              <strong className="entity-kpi-value">{k.value}</strong>
              {k.hint ? <span className="muted text-metadata">{k.hint}</span> : null}
            </div>
          ))}
        </div>
      ) : null}
    </header>
  )
}
