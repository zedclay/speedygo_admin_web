import { ApiError, type ApiErrorBody, type AuthTokens } from './types'

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

export function getApiBaseUrl(): string {
  return apiBaseUrl
}

type TokenProvider = {
  getAccessToken: () => string | null
  getRefreshToken: () => string | null
  setTokens: (tokens: AuthTokens) => void
  clearSession: () => void
}

let tokenProvider: TokenProvider | null = null
let refreshInFlight: Promise<string | null> | null = null

export function bindTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider
}

async function peekErrorCode(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.clone().json()) as ApiErrorBody
    return body.error?.code
  } catch {
    return undefined
  }
}

async function parseError(response: Response): Promise<ApiError> {
  let message = `Request failed: ${response.status}`
  let code: string | undefined
  try {
    const body = (await response.json()) as ApiErrorBody
    if (body.error?.message) message = body.error.message
    code = body.error?.code
  } catch {
    // ignore
  }
  return new ApiError(response.status, message, code)
}

async function refreshAccessToken(): Promise<string | null> {
  if (!tokenProvider) return null
  const refreshToken = tokenProvider.getRefreshToken()
  if (!refreshToken) return null
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-SpeedyGo-App': 'ADMIN',
          },
          body: JSON.stringify({ refreshToken }),
        })
        if (!response.ok) {
          tokenProvider?.clearSession()
          return null
        }
        const tokens = (await response.json()) as AuthTokens
        tokenProvider?.setTokens(tokens)
        return tokens.accessToken
      } catch {
        tokenProvider?.clearSession()
        return null
      } finally {
        refreshInFlight = null
      }
    })()
  }
  return refreshInFlight
}

export type RequestOptions = {
  method?: string
  body?: unknown
  auth?: boolean
  headers?: Record<string, string>
  signal?: AbortSignal
  /** Skip JSON parse — return Response for binary downloads */
  raw?: boolean
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const method = options.method ?? 'GET'
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-SpeedyGo-Money-Contract': 'dzd-v2',
    'X-SpeedyGo-App': 'ADMIN',
    ...options.headers,
  }
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const withAuth = options.auth !== false
  let accessToken = withAuth ? tokenProvider?.getAccessToken() ?? null : null
  if (withAuth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const doFetch = () =>
    fetch(`${apiBaseUrl}${path}`, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    })

  let response = await doFetch()

  if (withAuth && response.status === 401) {
    let code = await peekErrorCode(response)
    // Refresh cannot bind audience onto a pre-audience session.
    if (code !== 'AUTH_AUDIENCE_LEGACY_REJECTED') {
      const next = await refreshAccessToken()
      if (next) {
        headers.Authorization = `Bearer ${next}`
        response = await doFetch()
        if (response.status === 401) {
          code = await peekErrorCode(response)
        }
      }
    }
    if (response.status === 401 && code === 'AUTH_AUDIENCE_LEGACY_REJECTED') {
      tokenProvider?.clearSession()
    }
  }

  if (!response.ok) {
    throw await parseError(response)
  }

  if (options.raw) {
    return response as unknown as T
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export async function apiGet<T>(path: string, auth = true): Promise<T> {
  return apiRequest<T>(path, { auth })
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
  auth = true,
): Promise<T> {
  return apiRequest<T>(path, { method: 'POST', body: body ?? {}, auth })
}

export async function apiPut<T>(
  path: string,
  body?: unknown,
  auth = true,
): Promise<T> {
  return apiRequest<T>(path, { method: 'PUT', body: body ?? {}, auth })
}

export async function apiPatch<T>(
  path: string,
  body?: unknown,
  auth = true,
): Promise<T> {
  return apiRequest<T>(path, { method: 'PATCH', body: body ?? {}, auth })
}
