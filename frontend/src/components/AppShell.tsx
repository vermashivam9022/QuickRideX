import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { apiFetch } from '../lib/apiClient'
import { useAuth } from '../context/AuthContext'

function NavLink({
  to,
  children,
  active,
}: {
  to: string
  children: ReactNode
  active?: boolean
}) {
  return (
    <Link
      to={to}
      className={[
        'rounded px-3 py-2 text-center text-sm transition',
        active
          ? 'bg-gray-900 text-white'
          : 'text-gray-700 hover:bg-gray-100',
      ].join(' ')}
    >
      {children}
    </Link>
  )
}

export default function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { user, role, isApproved, logout, refreshMe } = useAuth()

  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [mobileNo, setMobileNo] = useState('')
  const [isEditingMobile, setIsEditingMobile] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)

  useEffect(() => {
    setMobileNo(user?.mobileNo ?? '')
  }, [user?.mobileNo])

  async function saveMobileNumber() {
    setSavingProfile(true)
    setProfileError(null)
    setProfileSuccess(null)

    try {
      await apiFetch('/api/users/me', {
        method: 'PATCH',
        body: { mobileNo },
      })
      await refreshMe()
      setIsEditingMobile(false)
      setProfileSuccess('Mobile number updated successfully.')
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : 'Failed to update mobile number')
    } finally {
      setSavingProfile(false)
    }
  }

  const studentLinks = [
    { to: '/student/dashboard', label: 'Dashboard' },
    { to: '/student/bikes', label: 'Bikes' },
    { to: '/student/bookings', label: 'My Bookings' },
  ]

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Dashboard' },
    { to: '/admin/bikes', label: 'Bikes' },
    { to: '/admin/pending-orders', label: 'Pending' },
    { to: '/admin/bookings', label: 'Bookings' },
  ]

  const links = role === 'admin' ? adminLinks : studentLinks
  const isAdminNav = role === 'admin'

  return (
    <div className="min-h-[100svh] bg-gradient-to-b from-gray-50 to-white">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900 text-white font-semibold">
              QRX
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-gray-900">
                QuickRideX
              </div>
              <div className="text-xs text-gray-600">
                {role ? role.toUpperCase() : 'USER'}{' '}
                {role === 'student' && !isApproved ? '(Not Verified)' : ''}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user?.email ? (
              <div className="hidden text-right sm:block">
                <div className="text-xs text-gray-600">Signed in</div>
                <div className="text-sm font-medium text-gray-900">
                  {user.email}
                </div>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setIsProfileOpen(true)
                setIsEditingMobile(false)
                setProfileError(null)
                setProfileSuccess(null)
              }}
              className="inline-flex items-center justify-center rounded border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50"
              aria-label="Open menu"
              title="Open menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <nav
          className={[
            'gap-2',
            isAdminNav
              ? 'flex flex-nowrap items-center justify-between overflow-x-auto'
              : 'flex flex-wrap',
          ].join(' ')}
        >
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              active={
                location.pathname === l.to || location.pathname.startsWith(`${l.to}/`)
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6">{children}</div>
      </div>

      {isProfileOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/30"
            onClick={() => setIsProfileOpen(false)}
            aria-label="Close profile panel backdrop"
          />

          <aside className="fixed left-0 top-0 z-40 h-full w-full max-w-sm border-r border-gray-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-800">User Profile</h2>
              <button
                type="button"
                className="rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50"
                onClick={() => setIsProfileOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <div className="text-gray-500">Name</div>
                <div className="font-medium text-gray-900">{user?.name || '—'}</div>
              </div>
              <div>
                <div className="text-gray-500">Email</div>
                <div className="font-medium text-gray-900">{user?.email || '—'}</div>
              </div>
              <div>
                <div className="text-gray-500">Role</div>
                <div className="font-medium text-gray-900">{role || '—'}</div>
              </div>
            </div>

            <div className="mt-5 border-t border-gray-200 pt-4">
              <label className="block text-sm font-medium text-gray-700">Mobile Number</label>

              {!isEditingMobile ? (
                <div className="mt-2 flex items-center justify-between gap-3 rounded border border-gray-200 bg-gray-50 px-3 py-2">
                  <span className="text-sm font-medium text-gray-900">{user?.mobileNo || '—'}</span>
                  <button
                    type="button"
                    className="rounded border border-gray-300 bg-white px-3 py-1 text-xs hover:bg-gray-50"
                    onClick={() => {
                      setMobileNo(user?.mobileNo ?? '')
                      setIsEditingMobile(true)
                      setProfileError(null)
                      setProfileSuccess(null)
                    }}
                  >
                    Update
                  </button>
                </div>
              ) : (
                <input
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]{10,}"
                  value={mobileNo}
                  onChange={(e) => setMobileNo(e.target.value)}
                />
              )}

              {profileError && (
                <p className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                  {profileError}
                </p>
              )}
              {profileSuccess && (
                <p className="mt-2 rounded border border-green-200 bg-green-50 p-2 text-xs text-green-800">
                  {profileSuccess}
                </p>
              )}

              {isEditingMobile && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="w-full rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-60"
                    onClick={() => void saveMobileNumber()}
                    disabled={savingProfile}
                  >
                    {savingProfile ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="w-full rounded border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
                    onClick={() => {
                      setMobileNo(user?.mobileNo ?? '')
                      setIsEditingMobile(false)
                      setProfileError(null)
                    }}
                    disabled={savingProfile}
                  >
                    Cancel
                  </button>
                </div>
              )}

              <button
                type="button"
                className="mt-4 w-full rounded border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
                onClick={logout}
              >
                Logout
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}

