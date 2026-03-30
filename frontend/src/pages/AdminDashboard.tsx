import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../lib/apiClient'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'

type Bike = {
  category?: 'bike' | 'scooty'
  isAvailable?: boolean
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [togglingShop, setTogglingShop] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [earnings, setEarnings] = useState(0)
  const [confirmedBookings, setConfirmedBookings] = useState(0)
  const [pendingBookings, setPendingBookings] = useState(0)
  const [bikeCount, setBikeCount] = useState(0)
  const [bikeAvailableCount, setBikeAvailableCount] = useState(0)
  const [scootyCount, setScootyCount] = useState(0)
  const [scootyAvailableCount, setScootyAvailableCount] = useState(0)
  const [isShopOpen, setIsShopOpen] = useState(true)

  async function loadDashboardData() {
    setLoading(true)
    setSummaryError(null)
    try {
      const data = await apiFetch<{ status?: string; totalPrice?: number }[]>('/api/bookings')
      const next = Array.isArray(data) ? data : []
      const confirmed = next.filter((b) => b.status === 'confirmed').length
      const pending = next.filter((b) => b.status === 'pending').length
      const sum = next
        .filter((b) => b.status === 'confirmed')
        .reduce(
          (acc, b) => acc + (typeof b.totalPrice === 'number' ? b.totalPrice : 0),
          0,
        )

      const bikesData = await apiFetch<Bike[]>('/api/bikes')
      const fleet = Array.isArray(bikesData) ? bikesData : []
      const bikesOnly = fleet.filter((b) => (b.category ?? 'bike') === 'bike')
      const scootiesOnly = fleet.filter((b) => b.category === 'scooty')

      const shopData = await apiFetch<{ isOpen?: boolean }>('/api/admin/shop-status')
      const shopOpen = Boolean(shopData?.isOpen)

      setConfirmedBookings(confirmed)
      setPendingBookings(pending)
      setEarnings(sum)
      setBikeCount(bikesOnly.length)
      setBikeAvailableCount(
        shopOpen ? bikesOnly.filter((b) => b.isAvailable === true).length : 0,
      )
      setScootyCount(scootiesOnly.length)
      setScootyAvailableCount(
        shopOpen ? scootiesOnly.filter((b) => b.isAvailable === true).length : 0,
      )
      setIsShopOpen(shopOpen)
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : 'Failed to load summary')
    } finally {
      setLoading(false)
    }
  }

  async function toggleShopStatus() {
    setTogglingShop(true)
    setSummaryError(null)
    try {
      await apiFetch('/api/admin/shop-status', {
        method: 'PATCH',
        body: { isOpen: !isShopOpen },
      })
      await loadDashboardData()
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : 'Failed to update shop status')
    } finally {
      setTogglingShop(false)
    }
  }

  useEffect(() => {
    void loadDashboardData()
  }, [])

  const totalBookings = useMemo(
    () => confirmedBookings + pendingBookings,
    [confirmedBookings, pendingBookings],
  )

  return (
    <AppShell>
      <div className="rounded-xl border border-gray-200 bg-white/70 p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-600">Admin Dashboard</h1>
            <p className="mt-1 text-gray-600">
              Signed in as <span className="font-medium">{user?.email}</span>
            </p>
          </div>
          <button
            type="button"
            className={[
              'rounded px-4 py-2 text-sm font-medium text-white disabled:opacity-60',
              isShopOpen ? 'bg-green-700 hover:bg-green-600' : 'bg-red-700 hover:bg-red-600',
            ].join(' ')}
            onClick={() => void toggleShopStatus()}
            disabled={togglingShop || loading}
          >
            {togglingShop ? 'Updating...' : isShopOpen ? 'Shop Open' : 'Shop Closed'}
          </button>
        </div>

      {summaryError && (
        <p className="mt-4 rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          {summaryError}
        </p>
      )}

      <div className="mt-6 rounded border border-gray-200 bg-white p-4">
        <div className="text-sm text-gray-600">Current shop status</div>
        <div className={['mt-1 text-lg font-semibold', isShopOpen ? 'text-green-700' : 'text-red-700'].join(' ')}>
          {isShopOpen ? 'Open' : 'Closed'}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <div className="rounded border border-gray-200 bg-white p-5">
          <div className="text-sm text-gray-600">Total bookings</div>
          <div className="mt-1 text-xl font-semibold md:text-2xl">
            {loading ? '—' : totalBookings}
          </div>
        </div>
        <div className="rounded border border-gray-200 bg-white p-5">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="mt-1 text-xl font-semibold md:text-2xl">
            {loading ? '—' : pendingBookings}
          </div>
        </div>
        <div className="col-span-2 rounded border border-gray-200 bg-white p-5 md:col-span-1">
          <div className="text-sm text-gray-600">Earnings (confirmed)</div>
          <div className="mt-1 text-xl font-semibold md:text-2xl">
            {loading ? '—' : earnings}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <div className="rounded border border-gray-200 bg-white p-5">
          <div className="text-sm text-gray-600">Total Bikes</div>
          <div className="mt-1 text-xl font-semibold md:text-2xl">{loading ? '—' : bikeCount}</div>
        </div>
        <div className="rounded border border-gray-200 bg-white p-5">
          <div className="text-sm text-gray-600">Available Bikes</div>
          <div className="mt-1 text-xl font-semibold md:text-2xl">
            {loading ? '—' : bikeAvailableCount}
          </div>
        </div>
        <div className="rounded border border-gray-200 bg-white p-5">
          <div className="text-sm text-gray-600">Total Scooty</div>
          <div className="mt-1 text-xl font-semibold md:text-2xl">{loading ? '—' : scootyCount}</div>
        </div>
        <div className="rounded border border-gray-200 bg-white p-5">
          <div className="text-sm text-gray-600">Available Scooty</div>
          <div className="mt-1 text-xl font-semibold md:text-2xl">
            {loading ? '—' : scootyAvailableCount}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          to="/admin/bikes"
          className="rounded border border-gray-200 bg-white p-5 hover:shadow-sm"
        >
          <h2 className="font-semibold text-gray-600">Manage Bikes</h2>
          <p className="mt-1 text-sm text-gray-600">
            Add/update/delete bikes 
          </p>
        </Link>
        <Link
          to="/admin/pending-orders"
          className="rounded border border-gray-200 bg-white p-5 hover:shadow-sm"
        >
          <h2 className="font-semibold text-gray-600">Pending Orders</h2>
          <p className="mt-1 text-sm text-gray-600">
            Review and approve/reject pending booking requests.
          </p>
        </Link>
        <Link
          to="/admin/bookings"
          className="rounded border border-gray-200 bg-white p-5 hover:shadow-sm"
        >
          <h2 className="font-semibold text-gray-600">View Bookings</h2>
          <p className="mt-1 text-sm text-gray-600">
            Track status and total earnings from confirmed bookings.
          </p>
        </Link>
      </div>
      </div>
    </AppShell>
  )
}

