import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../lib/apiClient'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'

type Bike = {
  category?: 'bike' | 'scooty'
  isAvailable?: boolean
}

export default function StudentDashboard() {
  const { user, isApproved } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)
  const [confirmedCount, setConfirmedCount] = useState(0)
  const [availableBikeCount, setAvailableBikeCount] = useState(0)
  const [availableScootyCount, setAvailableScootyCount] = useState(0)
  const [isShopOpen, setIsShopOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      if (!user || !isApproved) return
      setLoading(true)
      setError(null)
      try {
        const bookingsData = await apiFetch<{ status?: string }[]>('/api/bookings/my')
        const next = Array.isArray(bookingsData) ? bookingsData : []
        setPendingCount(next.filter((b) => b.status === 'pending').length)
        setConfirmedCount(next.filter((b) => b.status === 'confirmed').length)

        const bikesData = await apiFetch<Bike[]>('/api/bikes')
        const fleet = Array.isArray(bikesData) ? bikesData : []
        setAvailableBikeCount(
          fleet.filter((b) => (b.category ?? 'bike') === 'bike' && b.isAvailable === true)
            .length,
        )
        setAvailableScootyCount(
          fleet.filter((b) => b.category === 'scooty' && b.isAvailable === true).length,
        )

        // Derive shop status from fleet availability to avoid dependency on
        // optional backend route versions.
        setIsShopOpen(fleet.some((b) => b.isAvailable === true))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load booking summary')
      } finally {
        setLoading(false)
      }
    })()
  }, [user, isApproved])

  const totalCount = useMemo(() => pendingCount + confirmedCount, [pendingCount, confirmedCount])

  return (
    <AppShell>
      <div className="rounded-xl border border-gray-200 bg-white/70 p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Student Dashboard</h1>
          <p className="mt-1 text-gray-600">
            Welcome, <span className="font-medium">{user?.name || user?.email}</span>
          </p>
          <div className="mt-3">
            <span
              className={[
                'inline-flex items-center rounded border px-3 py-1 text-xs font-medium',
                isApproved
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800',
              ].join(' ')}
            >
              Verification: {isApproved ? 'Verified' : 'Not Verified'}
            </span>
          </div>
          {!isApproved && (
            <p className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Your account is pending admin approval.
            </p>
          )}
        </div>
      </div>

        {error && (
          <p className="mt-4 rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            {error}
          </p>
        )}

        <div className="mt-4 rounded border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-600">Shop status</div>
          <div className={['mt-1 text-lg font-semibold', isShopOpen ? 'text-green-700' : 'text-red-700'].join(' ')}>
            {loading ? '—' : isShopOpen ? 'Open' : 'Closed'}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="rounded border border-gray-200 bg-white p-5">
            <div className="text-sm text-gray-800">My Bookings</div>
            <div className="mt-1 text-xl font-semibold sm:text-2xl">
              {loading ? '—' : totalCount}
            </div>
          </div>
          <div className="rounded border border-gray-200 bg-white p-5">
            <div className="text-sm text-gray-800">Pending</div>
            <div className="mt-1 text-xl font-semibold sm:text-2xl">
              {loading ? '—' : pendingCount}
            </div>
          </div>
          <div className="col-span-2 rounded border border-gray-200 bg-white p-5 sm:col-span-1">
            <div className="text-sm text-gray-600">Confirmed</div>
            <div className="mt-1 text-xl font-semibold sm:text-2xl">
              {loading ? '—' : confirmedCount}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded border border-gray-200 bg-white p-5">
            <div className="text-sm text-gray-600">Available Bikes</div>
            <div className="mt-1 text-xl font-semibold sm:text-2xl">
              {loading ? '—' : availableBikeCount}
            </div>
          </div>
          <div className="rounded border border-gray-200 bg-white p-5">
            <div className="text-sm text-gray-600">Available Scooty</div>
            <div className="mt-1 text-xl font-semibold sm:text-2xl">
              {loading ? '—' : availableScootyCount}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            to="/student/bikes"
            className="rounded border border-gray-200 bg-white p-5 hover:shadow-sm"
          >
            <h2 className="font-semibold text-gray-800">Find Bikes</h2>
            <p className="mt-1 text-sm text-gray-600">
              Check availability and book hourly/daily.
            </p>
          </Link>
          <Link
            to="/student/bookings"
            className="rounded border border-gray-200 bg-white p-5 hover:shadow-sm"
          >
            <h2 className="font-semibold text-gray-800">My Bookings</h2>
            <p className="mt-1 text-sm text-gray-600">
              Track booking status and history.
            </p>
          </Link>
        </div>
      </div>
    </AppShell>
  )
}

