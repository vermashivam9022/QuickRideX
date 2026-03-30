import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/apiClient'
import AppShell from '../components/AppShell'
import StatusBadge from '../components/StatusBadge'

type Booking = {
  _id?: string
  userId?: string | {
    _id?: string
    name?: string
    email?: string
    mobileNo?: string
    isApproved?: boolean
  }
  bikeId?: string | {
    _id?: string
    name?: string
    numberPlate?: string
    category?: string
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

function studentLabel(bk: Booking): string {
  if (typeof bk.userId === 'string') return bk.userId
  if (!bk.userId) return '—'
  return bk.userId.name || bk.userId.email || '—'
}

function bikeLabel(bk: Booking): string {
  if (typeof bk.bikeId === 'string') return bk.bikeId
  if (!bk.bikeId) return '—'
  const name = bk.bikeId.name ?? 'Bike'
  const plate = bk.bikeId.numberPlate
  return plate ? `${name} (${plate})` : name
}

export default function AdminPendingOrders() {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

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
  }, [])

  const pendingBookings = useMemo(
    () => bookings.filter((b) => b.status === 'pending'),
    [bookings],
  )

  async function updateStatus(id: string, status: 'confirmed' | 'cancelled') {
    setUpdatingId(id)
    setError(null)
    setMessage(null)
    try {
      await apiFetch(`/api/bookings/${id}/status`, {
        method: 'PATCH',
        body: { status },
      })

      setBookings((prev) =>
        prev.map((b) => (b._id === id ? { ...b, status } : b)),
      )
      setMessage(status === 'confirmed' ? 'Booking confirmed.' : 'Booking rejected.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update booking status')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <AppShell>
      <div className="rounded-xl border border-gray-200 bg-white/70 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-gray-800">Pending Orders</h1>
          <div className="flex gap-2">
            <button
              className="rounded border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60 text-gray-900"
              onClick={() => void loadBookings()}
              disabled={loading}
            >
              Refresh
            </button>
            <Link
              to="/admin/bookings"
              className="rounded border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50 text-gray-900"
            >
              All Bookings
            </Link>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {message}
          </p>
        )}

        {loading ? (
          <p className="mt-5 text-gray-600">Loading...</p>
        ) : pendingBookings.length === 0 ? (
          <p className="mt-5 text-gray-600">No pending booking requests.</p>
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
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingBookings.map((bk) => {
                  const id = bk._id ?? ''
                  const isUpdating = updatingId === id
                  const isVerified = typeof bk.userId === 'object' && bk.userId?.isApproved === true
                  return (
                    <tr
                      key={id || `${bk.startTime}-${bk.endTime}`}
                      className="cursor-pointer border-b last:border-b-0 hover:bg-gray-50  text-gray-900"
                      onClick={() => {
                        if (!id) return
                        navigate(`/admin/bookings/${id}?from=pending`)
                      }}
                    >
                      <td className="py-3 pr-4 text-gray-800">
                        <div className="font-medium">{studentLabel(bk)}</div>
                        <span
                          className={[
                            'mt-1 inline-flex whitespace-nowrap py-0.5 text-xs font-medium',
                            isVerified
                              ? 'text-green-800'
                              : ' text-red-800',
                          ].join(' ')}
                        >
                          {isVerified ? 'Verified' : 'Not Verified'}
                        </span>
                      </td>
                      <td className="py-3 pr-4">{bikeLabel(bk)}</td>
                      <td className="py-3 pr-4">{formatDateTime(bk.startTime)}</td>
                      <td className="py-3 pr-4">{formatDateTime(bk.endTime)}</td>
                      <td className="py-3 pr-4">{bk.totalPrice ?? '—'}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={bk.status} />
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="rounded border border-green-300 bg-green-50 px-3 py-1 text-xs text-green-800 hover:bg-green-100 disabled:opacity-60"
                            disabled={!id || isUpdating}
                            onClick={(e) => {
                              e.stopPropagation()
                              void updateStatus(id, 'confirmed')
                            }}
                          >
                            {isUpdating ? 'Updating...' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            className="rounded border border-red-300 bg-red-50 px-3 py-1 text-xs text-red-800 hover:bg-red-100 disabled:opacity-60"
                            disabled={!id || isUpdating}
                            onClick={(e) => {
                              e.stopPropagation()
                              void updateStatus(id, 'cancelled')
                            }}
                          >
                            {isUpdating ? 'Updating...' : 'Reject'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  )
}
