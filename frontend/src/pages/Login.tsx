import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login, error, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setLocalError(null)
    try {
      await login({ email, password })
      navigate('/')
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 via-white to-cyan-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-20 top-0 h-56 w-56 rounded-full bg-cyan-200/35 blur-3xl sm:h-72 sm:w-72" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-56 w-56 rounded-full bg-orange-200/35 blur-3xl sm:h-72 sm:w-72" />

      <div className="relative w-full max-w-md sm:max-w-lg">
        <div className="rounded-2xl border-2 border-black/10 bg-white/85 p-5 shadow-xl shadow-slate-200/70 backdrop-blur-sm sm:p-7">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Login</h1>
          <form className="mt-5 space-y-5" onSubmit={onSubmit}>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {(localError || error) && (
              <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {localError || error}
              </p>
            )}

            <button
              className="w-full rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-60"
              type="submit"
              disabled={loading || submitting}
            >
              {submitting ? 'Logging in...' : 'Login'}
            </button>

            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                className="text-sm font-medium text-gray-700 underline hover:text-gray-900"
                onClick={() => {
                  // Placeholder: password reset flow will be added on backend.
                  window.alert('Forgot password is not set up yet.')
                }}
              >
                Forgot password?
              </button>
            </div>
          </form>

          <div className="mt-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <div className="text-xs font-medium text-gray-500">OR</div>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <button
            type="button"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-60"
            disabled={loading || submitting}
            onClick={() => {
              // Placeholder: OAuth wiring will be added on backend.
              window.alert('Google sign-in is not set up yet.')
            }}
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-gray-900 text-xs font-semibold text-white">
              G
            </span>
            Sign in with Google
          </button>

          <p className="mt-4 text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link className="font-medium text-gray-900 underline" to="/register">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

