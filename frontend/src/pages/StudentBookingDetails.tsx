import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import StatusBadge from '../components/StatusBadge'
import { apiFetch } from '../lib/apiClient'

type Booking = {
  _id?: string
  bikeId?: string | {
    _id?: string
    name?: string
    numberPlate?: string
    category?: string
    pricePerHour?: number
    pricePerDay?: number
  }
  startTime?: string
  endTime?: string
  totalPrice?: number
  status?: string
  rating?: number | null
  ratedAt?: string | null
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

export default function StudentBookingDetails() {
  const { bookingId = '' } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [booking, setBooking] = useState<Booking | null>(null)
  const [ratingSaving, setRatingSaving] = useState(false)
  const [ratingMessage, setRatingMessage] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await apiFetch<Booking>(`/api/bookings/my/${bookingId}`)
        setBooking(data ?? null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load booking details')
      } finally {
        setLoading(false)
      }
    })()
  }, [bookingId])

  const bikeObj = typeof booking?.bikeId === 'object' ? booking?.bikeId : null
  const bikeName = typeof booking?.bikeId === 'string' ? booking.bikeId : bikeObj?.name || '—'
  const currentRating = typeof booking?.rating === 'number' ? booking.rating : 0
  const endTimeMs = booking?.endTime ? new Date(booking.endTime).getTime() : Number.NaN
  const isRideCompleted = Number.isFinite(endTimeMs) && endTimeMs <= Date.now()
  const canRate = booking?.status === 'confirmed' && isRideCompleted

  async function submitRating(nextRating: number) {
    if (!bookingId || !canRate) return
    setRatingSaving(true)
    setRatingMessage(null)
    try {
      const data = await apiFetch<Booking>(`/api/bookings/my/${bookingId}/rating`, {
        method: 'PATCH',
        body: { rating: nextRating },
      })
      setBooking(data)
      setRatingMessage('Rating saved successfully.')
    } catch (e) {
      setRatingMessage(e instanceof Error ? e.message : 'Failed to submit rating')
    } finally {
      setRatingSaving(false)
    }
  }

  return (
    <AppShell>
      <div className="rounded-xl border border-gray-200 bg-white/70 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-gray-800">Booking Details</h1>
          <Link
            to="/student/bookings"
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            Back
          </Link>
        </div>

        {loading ? (
          <p className="mt-4 text-gray-600">Loading...</p>
        ) : error ? (
          <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>
        ) : !booking ? (
          <p className="mt-4 text-gray-600">Booking not found.</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded border border-gray-200 bg-white p-4">
              <div className="text-xs text-gray-500">Bike Name</div>
              <div className="mt-1 font-semibold text-gray-900">{bikeName}</div>
            </div>
            <div className="rounded border border-gray-200 bg-white p-4">
              <div className="text-xs text-gray-500">Number Plate</div>
              <div className="mt-1 font-semibold text-gray-900">{bikeObj?.numberPlate || '—'}</div>
            </div>
            <div className="rounded border border-gray-200 bg-white p-4">
              <div className="text-xs text-gray-500">Category</div>
              <div className="mt-1 font-semibold text-gray-900">{bikeObj?.category || '—'}</div>
            </div>
            <div className="rounded border border-gray-200 bg-white p-4">
              <div className="text-xs text-gray-500">Status</div>
              <div className="mt-1">
                <StatusBadge status={getStudentDisplayStatus(booking.status, booking.endTime)} />
              </div>
            </div>
            <div className="rounded border border-gray-200 bg-white p-4">
              <div className="text-xs text-gray-500">Start Time</div>
              <div className="mt-1 font-semibold text-gray-900">{formatDateTime(booking.startTime)}</div>
            </div>
            <div className="rounded border border-gray-200 bg-white p-4">
              <div className="text-xs text-gray-500">End Time</div>
              <div className="mt-1 font-semibold text-gray-900">{formatDateTime(booking.endTime)}</div>
            </div>
            <div className="rounded border border-gray-200 bg-white p-4 sm:col-span-2">
              <div className="text-xs text-gray-500">Total Price</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">{booking.totalPrice ?? '—'}</div>
            </div>

            <div className="rounded border border-gray-200 bg-white p-4 sm:col-span-2">
              <div className="text-xs text-gray-500">Rate This Booking</div>
              {!canRate ? (
                <p className="mt-2 text-sm text-gray-600">
                  Rating is available only after booking is confirmed and ride end time has passed.
                </p>
              ) : (
                <div className="mt-2 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      disabled={ratingSaving}
                      onClick={() => void submitRating(star)}
                      className={[
                        'rounded px-1 text-2xl leading-none transition disabled:opacity-60',
                        star <= currentRating
                          ? 'text-amber-500'
                          : 'text-gray-300 hover:text-amber-400',
                      ].join(' ')}
                      aria-label={`Rate ${star} star`}
                    >
                      {'\u2605'}
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-600">
                    {currentRating > 0 ? `${currentRating}/5` : 'Not rated yet'}
                  </span>
                </div>
              )}

              {ratingMessage && (
                <p className="mt-2 text-sm text-gray-700">{ratingMessage}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
