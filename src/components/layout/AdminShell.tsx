import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { ShellChromeProvider } from './ShellChromeContext'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AdminShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <ShellChromeProvider>
      <div
        className={`admin-shell${collapsed ? ' sidebar-collapsed' : ''}${
          mobileOpen ? ' mobile-open' : ''
        }`}
      >
        <Sidebar />
        <div className="shell-main">
          <TopBar
            onToggleSidebar={() => {
              if (window.matchMedia('(max-width: 900px)').matches) {
                setMobileOpen((v) => !v)
              } else {
                setCollapsed((v) => !v)
              }
            }}
          />
          <main className="page">
            <Outlet />
          </main>
        </div>
        {mobileOpen ? (
          <button
            type="button"
            aria-label="Close menu"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.35)',
              border: 0,
              zIndex: 30,
            }}
            onClick={() => setMobileOpen(false)}
          />
        ) : null}
      </div>
    </ShellChromeProvider>
  )
}
