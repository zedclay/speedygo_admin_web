import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type ShellChromeState = {
  title: string | null
  setTitle: (title: string | null) => void
}

const ShellChromeContext = createContext<ShellChromeState | null>(null)

export function ShellChromeProvider({ children }: { children: ReactNode }) {
  const [title, setTitleState] = useState<string | null>(null)
  const setTitle = useCallback((next: string | null) => {
    setTitleState(next)
  }, [])
  const value = useMemo(() => ({ title, setTitle }), [title, setTitle])
  return (
    <ShellChromeContext.Provider value={value}>
      {children}
    </ShellChromeContext.Provider>
  )
}

export function useShellChromeTitle(): string | null {
  return useContext(ShellChromeContext)?.title ?? null
}

/** Sets a contextual top-bar title for the current route; clears on unmount. */
export function useSetShellTitle(title: string | null): void {
  const setTitle = useContext(ShellChromeContext)?.setTitle
  useEffect(() => {
    if (!setTitle) return
    setTitle(title)
    return () => setTitle(null)
  }, [setTitle, title])
}
