import type { ReactNode } from 'react'

/** Prefer {@link UnavailablePanel} or `banner-info` for product-facing contract gaps. */
export function ContractNote({ children }: { children: ReactNode }) {
  return <div className="banner banner-info">{children}</div>
}
