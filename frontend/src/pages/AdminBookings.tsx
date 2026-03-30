import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiFetch } from '../lib/apiClient'
import AppShell from '../components/AppShell'
import StatusBadge from '../components/StatusBadge'

type Booking = {
  _id?: string
  userId?: string | { _id?: string; name?: string; email?: string; mobileNo?: string }
  bikeId?: string | {
    _id?: string
    name?: string
    numberPlate?: string
    category?: string
    pricePerHour?: number
    pricePerDay?: number
    isAvailable?: boolean
    bikePhotoUrl?: string
  }
  startTime?: string
  endTime?: string
  totalPrice?: number
  status?: string
  createdAt?: string
}

function formatDateTime(value?: string) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString()
}

const SCROLL_POSITION_KEY = 'admin_bookings_scroll'

export default function AdminBookings() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  const initialTab: 'active' | 'today' | 'all' =
    tabFromUrl === 'today' || tabFromUrl === 'all' ? tabFromUrl : 'active'
  const [bookings, setBookings] = useState<Booking[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'today' | 'all'>(initialTab)

  async function loadBookings() {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<Booking[]>('/api/bookings')
      setBookings(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadBookings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const scrollY = window.sessionStorage.getItem(SCROLL_POSITION_KEY)
    if (scrollY) {
      const y = Number.parseInt(scrollY, 10)
      window.scrollTo(0, y)
      window.sessionStorage.removeItem(SCROLL_POSITION_KEY)
    }
  }, [activeTab, bookings])

  useEffect(() => {
    const current = searchParams.get('tab')
    if (activeTab === 'active') {
      if (current) {
        const next = new URLSearchParams(searchParams)
        next.delete('tab')
        setSearchParams(next, { replace: true })
      }
      return
    }

    if (current !== activeTab) {
      const next = new URLSearchParams(searchParams)
      next.set('tab', activeTab)
      setSearchParams(next, { replace: true })
    }
  }, [activeTab, searchParams, setSearchParams])

  const activeBookings = useMemo(() => {
    const now = new Date()

    return bookings.filter((booking) => {
      const start = booking.startTime ? new Date(booking.startTime) : null
      const end = booking.endTime ? new Date(booking.endTime) : null
      if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return false
      }

      const isStarted = start.getTime() <= now.getTime()
      const isNotEnded = end.getTime() > now.getTime()
      const isNotCancelled = booking.status !== 'cancelled'

      return isStarted && isNotEnded && isNotCancelled
    })
  }, [bookings])

  const todayBookings = useMemo(() => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    return bookings.filter((booking) => {
      const start = booking.startTime ? new Date(booking.startTime) : null
      const end = booking.endTime ? new Date(booking.endTime) : null
      if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return false
      }

      const overlapsToday = start <= endOfToday && end >= startOfToday
      const isOngoing = end.getTime() > now.getTime() && booking.status !== 'cancelled'
      return overlapsToday || isOngoing
    })
  }, [bookings])

  const visibleBookings =
    activeTab === 'active'
      ? activeBookings
      : activeTab === 'today'
        ? todayBookings
        : bookings

  function bikeLabel(bk: Booking): string {
    if (typeof bk.bikeId === 'string') return bk.bikeId
    if (!bk.bikeId) return '—'
    const name = bk.bikeId.name ?? 'Bike'
    const plate = bk.bikeId.numberPlate
    return plate ? `${name} (${plate})` : name
  }

  function studentLabel(bk: Booking): string {
    if (typeof bk.userId === 'string') return bk.userId
    if (!bk.userId) return '—'
    return bk.userId.name || bk.userId.email || '—'
  }

  return (
    <AppShell>
      <div className="rounded-xl border border-gray-200 bg-white/70 p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-gray-700">Admin Bookings</h1>
          <div className="inline-flex rounded-md border border-gray-300 p-1">
            <button
              type="button"
              className={[
                'rounded px-3 py-1 text-sm',
                activeTab === 'active'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100',
              ].join(' ')}
              onClick={() => setActiveTab('active')}
            >
              Active
            </button>
            <button
              type="button"
              className={[
                'rounded px-3 py-1 text-sm',
                activeTab === 'today'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100',
              ].join(' ')}
              onClick={() => setActiveTab('today')}
            >
              Today Booking
            </button>
            <button
              type="button"
              className={[
                'rounded px-3 py-1 text-sm',
                activeTab === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100',
              ].join(' ')}
              onClick={() => setActiveTab('all')}
            >
              All Booking
            </button>
          </div>
        </div>

        <p className="mt-2 text-xs text-gray-500">
          Active shows only currently running rides. Today Booking shows today bookings plus ongoing rides.
        </p>
        
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          className="rounded border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
          onClick={() => void loadBookings()}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

        {loading ? (
          <p className="mt-5 text-gray-600">Loading...</p>
        ) : visibleBookings.length === 0 ? (
          <p className="mt-5 text-gray-600">No bookings found for this view.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b text-gray-600">
                <tr>
                  <th className="py-2 pr-4">Student</th>
                  <th className="py-2 pr-4">Bike</th>
                  <th className="py-2 pr-4">Start</th>
                  <th className="py-2 pr-4">End</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleBookings.map((bk) => {
                  const bookingId = bk._id ?? ''
                  const canOpen = Boolean(bookingId)

                  return (
                  <tr
                    key={bookingId || `${bk.startTime}-${bk.endTime}`}
                    className={[
                      'border-b last:border-b-0 text-gray-800',
                      canOpen ? 'cursor-pointer hover:bg-gray-50' : '',
                    ].join(' ')}
                    onClick={() => {
                      if (!canOpen) return
                      window.sessionStorage.setItem(SCROLL_POSITION_KEY, String(window.scrollY))
                      navigate(`/admin/bookings/${bookingId}?from=${activeTab}`)
                    }}
                    onKeyDown={(e) => {
                      if (!canOpen) return
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        window.sessionStorage.setItem(SCROLL_POSITION_KEY, String(window.scrollY))
                        navigate(`/admin/bookings/${bookingId}?from=${activeTab}`)
                      }
                    }}
                    role={canOpen ? 'button' : undefined}
                    tabIndex={canOpen ? 0 : undefined}
                    aria-label={canOpen ? `Open booking ${bookingId}` : undefined}
                  >
                    <td className="py-3 pr-4 text-gray-800">{studentLabel(bk)}</td>
                    <td className="py-3 pr-4">{bikeLabel(bk)}</td>
                    <td className="py-3 pr-4">{formatDateTime(bk.startTime)}</td>
                    <td className="py-3 pr-4">{formatDateTime(bk.endTime)}</td>
                    <td className="py-3 pr-4">{bk.totalPrice ?? '—'}</td>
                    <td className="py-3">
                      <StatusBadge 
                        status={
                          activeTab === 'active'
                            ? 'running'
                            : bk.status === 'cancelled'
                              ? 'cancelled'
                              : 'completed'
                        }
                      />
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  )
}

