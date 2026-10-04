import { Link } from 'react-router-dom'
import { useUiStore } from '../../lib/uiStore'
import { getApiBaseUrl } from '../../lib/api'

export function HomePage() {
  const sidebarOpen = useUiStore((state) => state.sidebarOpen)
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen)

  return (
    <main className="shell">
      <header className="shell-header">
        <h1>SpeedyGo Admin</h1>
        <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? 'Hide shell panel' : 'Show shell panel'}
        </button>
      </header>
      {sidebarOpen ? (
        <p>
          Application shell only. Admin screens are not implemented yet. API
          base URL: <code>{getApiBaseUrl()}</code>
        </p>
      ) : null}
      <p>
        <Link to="/">Home</Link>
      </p>
    </main>
  )
}
