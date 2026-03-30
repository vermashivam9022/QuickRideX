import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/apiClient'
import LoadingState from '../components/LoadingState'
import ErrorAlert from '../components/ErrorAlert'
import EmptyState from '../components/EmptyState'
import AppShell from '../components/AppShell'
import StatusBadge from '../components/StatusBadge'

type Booking = {
  _id?: string
  bikeId?: string | { _id?: string; name?: string }
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

function getStudentDisplayStatus(status?: string, endTime?: string): string {
  if (status?.toLowerCase() !== 'confirmed') return status || '—'
  const endMs = endTime ? new Date(endTime).getTime() : Number.NaN
  if (Number.isFinite(endMs) && endMs <= Date.now()) {
    return 'completed'
  }
  return 'confirmed'
}

export default function StudentBookings() {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function loadBookings() {
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const data = await apiFetch<Booking[]>('/api/bookings/my')
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

  async function cancelPendingBooking(id: string) {
    const ok = window.confirm('Cancel this pending booking request?')
    if (!ok) return

    setCancellingId(id)
    setError(null)
    setMessage(null)

    try {
      const updated = await apiFetch<Booking>(`/api/bookings/my/${id}/cancel`, {
        method: 'PATCH',
      })

      setBookings((prev) =>
        prev.map((booking) => (booking._id === id ? { ...booking, ...updated } : booking)),
      )
      setMessage('Booking cancelled successfully.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to cancel booking')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <AppShell>
      <div className="rounded-xl border border-gray-200 bg-white/70 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-gray-800">My Bookings</h1>
          <button
            className="rounded border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
            onClick={() => void loadBookings()}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {error && <ErrorAlert message={error} />}
        {message && (
          <p className="mt-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {message}
          </p>
        )}

        {loading ? (
          <LoadingState />
        ) : bookings.length === 0 ? (
          <EmptyState message="No bookings found." />
        ) : (
          <div className="mt-5 space-y-3">
            {bookings.map((bk) => {
              const id = bk._id ?? ''
              const bikeName =
                typeof bk.bikeId === 'string'
                  ? bk.bikeId
                  : bk.bikeId?._id
                    ? bk.bikeId.name || bk.bikeId._id
                    : bk.bikeId && typeof bk.bikeId === 'object'
                      ? bk.bikeId.name
                      : '—'

              return (
                <div
                  key={id || `${bk.startTime}-${bk.endTime}`}
                  className="w-full rounded border border-gray-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge status={getStudentDisplayStatus(bk.status, bk.endTime)} />
                    {bk.status === 'pending' && id ? (
                      <button
                        type="button"
                        onClick={() => void cancelPendingBooking(id)}
                        disabled={cancellingId === id}
                        className="rounded border border-red-300 bg-red-50 px-3 py-1 text-xs text-red-700 hover:bg-red-100 disabled:opacity-60"
                      >
                        {cancellingId === id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!id) return
                      navigate(`/student/bookings/${id}`)
                    }}
                    className="mt-3 w-full text-left"
                  >
                    <div className="text-base font-semibold text-gray-900">{bikeName}</div>
                    <div className="mt-1 text-sm text-gray-600">
                      {formatDateTime(bk.startTime)} to {formatDateTime(bk.endTime)}
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}

