import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { apiFetch } from '../lib/apiClient'
import { clearToken, getToken, setToken } from '../lib/auth'

export type AppRole = 'student' | 'admin'

export type AuthUser = {
  id?: string
  _id?: string
  name?: string
  email?: string
  mobileNo?: string
  role?: AppRole
  isApproved?: boolean
  licenseUrl?: string
  collegeIdUrl?: string
}

type AuthContextValue = {
  user: AuthUser | null
  role: AppRole | null
  isApproved: boolean
  token: string | null
  loading: boolean
  error: string | null
  refreshMe: () => Promise<void>
  login: (payload: { email: string; password: string }) => Promise<void>
  register: (payload: {
    name: string
    email: string
    mobileNo: string
    password: string
    drivingLicenseFile: File
    collegeIdFile: File
  }) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function normalizeUser(me: unknown): AuthUser | null {
  if (!me || typeof me !== 'object') return null
  const u = me as AuthUser
  return {
    ...u,
    id: u.id ?? u._id,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [token, setTokenState] = useState<string | null>(() => getToken())

  const role = user?.role ?? null
  const isApproved = user?.isApproved ?? false

  async function refreshMe() {
    setError(null)
    const t = getToken()
    setTokenState(t)
    if (!t) {
      setUser(null)
      return
    }
    try {
      const me = await apiFetch<AuthUser>('/api/users/me')
      setUser(normalizeUser(me))
    } catch (e) {
      // Keep existing session on transient errors (network/db hiccups).
      // Only clear auth when token is truly invalid/expired.
      const message = e instanceof Error ? e.message : 'Failed to load user'
      const authError =
        message.includes('Access token not found') ||
        message.includes('Invalid or expired access token') ||
        message.toLowerCase().includes('unauthorized')

      if (authError) {
        setUser(null)
        clearToken()
        setTokenState(null)
      }
      setError(e instanceof Error ? e.message : 'Failed to load user')
    }
  }

  useEffect(() => {
    // Initial user load.
    void refreshMe().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      isApproved,
      token,
      loading,
      error,
      refreshMe,
      login: async ({ email, password }) => {
        setError(null)
        const data = await apiFetch<unknown>('/api/auth/login', {
          method: 'POST',
          body: { email, password },
        })

        const obj = (data && typeof data === 'object' ? data : {}) as Record<
          string,
          unknown
        >
        const nextToken =
          (obj.token as string | undefined) ||
          (obj.accessToken as string | undefined) ||
          (obj.jwt as string | undefined) ||
          null

        if (!nextToken) {
          throw new Error('Login succeeded but token was not returned')
        }

        setToken(nextToken)
        setTokenState(nextToken)

        const nextUser = normalizeUser(obj.user)
        if (nextUser) {
          setUser(nextUser)
        } else {
          await refreshMe()
        }
      },
      register: async ({
        name,
        email,
        mobileNo,
        password,
        drivingLicenseFile,
        collegeIdFile,
      }) => {
        setError(null)
        const formData = new FormData()
        formData.append('name', name)
        formData.append('email', email)
        formData.append('mobileNo', mobileNo)
        formData.append('password', password)
        formData.append('drivingLicenseFile', drivingLicenseFile)
        formData.append('collegeIdFile', collegeIdFile)

        const data = await apiFetch<unknown>('/api/auth/register', {
          method: 'POST',
          body: formData,
        })

        const obj = (data && typeof data === 'object' ? data : {}) as Record<
          string,
          unknown
        >
        const nextToken =
          (obj.token as string | undefined) ||
          (obj.accessToken as string | undefined) ||
          (obj.jwt as string | undefined) ||
          null

        // Some backends might auto-login on register, but if not, token can be missing.
        if (nextToken) {
          setToken(nextToken)
          setTokenState(nextToken)
          const nextUser = normalizeUser(obj.user)
          if (nextUser) {
            setUser(nextUser)
            return
          }
        }

        await refreshMe()
      },
      logout: () => {
        clearToken()
        setTokenState(null)
        setUser(null)
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, role, isApproved, token, loading, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

