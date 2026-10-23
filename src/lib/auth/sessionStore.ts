import { create } from 'zustand'
import { bindTokenProvider } from '../api/client'
import type { AdminMe, AuthTokens } from '../api/types'
import { queryClient } from '../queryClient'

const STORAGE_KEY = 'speedygo.admin.session.v1'

type Persisted = {
  tokens: AuthTokens
  me: AdminMe | null
}

type SessionState = {
  tokens: AuthTokens | null
  me: AdminMe | null
  hydrated: boolean
  setTokens: (tokens: AuthTokens) => void
  setMe: (me: AdminMe | null) => void
  clearSession: () => void
  hydrate: () => void
}

function readStorage(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Persisted
  } catch {
    return null
  }
}

function writeStorage(value: Persisted | null): void {
  if (!value) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

export const useSessionStore = create<SessionState>((set, get) => ({
  tokens: null,
  me: null,
  hydrated: false,
  setTokens: (tokens) => {
    set({ tokens })
    writeStorage({ tokens, me: get().me })
  },
  setMe: (me) => {
    set({ me })
    const tokens = get().tokens
    if (tokens) writeStorage({ tokens, me })
  },
  clearSession: () => {
    set({ tokens: null, me: null })
    writeStorage(null)
    queryClient.clear()
  },
  hydrate: () => {
    const persisted = readStorage()
    set({
      tokens: persisted?.tokens ?? null,
      me: persisted?.me ?? null,
      hydrated: true,
    })
  },
}))

bindTokenProvider({
  getAccessToken: () => useSessionStore.getState().tokens?.accessToken ?? null,
  getRefreshToken: () => useSessionStore.getState().tokens?.refreshToken ?? null,
  setTokens: (tokens) => useSessionStore.getState().setTokens(tokens),
  clearSession: () => useSessionStore.getState().clearSession(),
})
