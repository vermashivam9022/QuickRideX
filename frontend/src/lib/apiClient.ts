import { clearToken, getToken, setToken } from './auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.toString() || ''
const REQUEST_TIMEOUT_MS = 30000

type ApiError = {
  message?: string
}

type RefreshResponse = {
  accessToken?: string
  token?: string
}

function buildUrl(endpoint: string): string {
  const trimmed = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return API_BASE_URL ? `${API_BASE_URL}${trimmed}` : trimmed
}

export function resolveApiAssetUrl(assetPath?: string): string {
  if (!assetPath) return ''
  const normalized = assetPath.trim().replace(/\\/g, '/')
  if (!normalized) return ''

  // Keep already-usable URL schemes untouched.
  if (
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('blob:') ||
    normalized.startsWith('data:')
  ) {
    return normalized
  }

  // Backward compatibility for previously stored API-prefixed upload paths.
  if (normalized.startsWith('/api/uploads/')) {
    return buildUrl(normalized.replace('/api/uploads/', '/uploads/'))
  }

  if (normalized.startsWith('api/uploads/')) {
    return buildUrl(`/${normalized.replace('api/uploads/', 'uploads/')}`)
  }

  return buildUrl(normalized)
}

async function parseJsonSafe(res: Response) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

type ApiFetchOptions = Omit<RequestInit, 'body' | 'headers'> & {
  body?: unknown
  headers?: Record<string, string>
}

let refreshTokenPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshTokenPromise) {
    refreshTokenPromise = (async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort('Request timeout'), REQUEST_TIMEOUT_MS)

      let res: Response
      try {
        res = await fetch(buildUrl('/api/auth/refresh-token'), {
          method: 'POST',
          credentials: 'include',
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        })
      } catch {
        clearToken()
        return null
      } finally {
        clearTimeout(timeoutId)
      }

      if (!res.ok) {
        clearToken()
        return null
      }

      const parsed = (await parseJsonSafe(res)) as RefreshResponse | null
      const nextToken = parsed?.accessToken || parsed?.token || null
      if (!nextToken) {
        clearToken()
        return null
      }

      setToken(nextToken)
      return nextToken
    })().finally(() => {
      refreshTokenPromise = null
    })
  }

  return refreshTokenPromise
}

function shouldAttemptRefresh(endpoint: string): boolean {
  const e = endpoint.toLowerCase()
  if (e.includes('/api/auth/login')) return false
  if (e.includes('/api/auth/register')) return false
  if (e.includes('/api/auth/refresh-token')) return false
  return true
}

export async function apiFetch<T>(
  endpoint: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { body: jsonBody, headers: userHeaders, ...requestInit } = options

  const doRequest = async (token: string | null) => {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(userHeaders ?? {}),
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    let body: BodyInit | undefined
    if (jsonBody !== undefined) {
      if (jsonBody instanceof FormData) {
        body = jsonBody
      } else {
        headers['Content-Type'] = 'application/json'
        body = JSON.stringify(jsonBody)
      }
    }

    if (requestInit.signal) {
      return fetch(buildUrl(endpoint), {
        ...requestInit,
        credentials: 'include',
        headers,
        body,
      })
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort('Request timeout'), REQUEST_TIMEOUT_MS)

    try {
      return await fetch(buildUrl(endpoint), {
        ...requestInit,
        credentials: 'include',
        signal: controller.signal,
        headers,
        body,
      })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.')
      }
      throw e
    } finally {
      clearTimeout(timeoutId)
    }
  }

  let currentToken = getToken()
  let res = await doRequest(currentToken)

  if (res.status === 401 && shouldAttemptRefresh(endpoint)) {
    const refreshedToken = await refreshAccessToken()
    if (refreshedToken) {
      currentToken = refreshedToken
      res = await doRequest(currentToken)
    }
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearToken()
    }
    const parsed = (await parseJsonSafe(res)) as ApiError | string | null
    const message =
      typeof parsed === 'string'
        ? parsed
        : parsed?.message || `Request failed with status ${res.status}`
    throw new Error(message)
  }

  const parsed = await parseJsonSafe(res)
  return parsed as T
}

