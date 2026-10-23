import type { ReactNode } from 'react'
import { Button } from './Button'

export function Drawer({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <>
      <button
        type="button"
        className="drawer-backdrop"
        aria-label="Close"
        onClick={onClose}
      />
      <aside className="drawer" role="dialog" aria-modal="true">
        <div className="drawer-header">
          <span>{title}</span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer ? (
          <div className="modal-footer" style={{ borderTop: '1px solid var(--sg-card-border)' }}>
            {footer}
          </div>
        ) : null}
      </aside>
    </>
  )
}
