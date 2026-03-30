import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AppShell from '../components/AppShell'
import BookingTimePicker from '../components/BookingTimePicker'
import { apiFetch, resolveApiAssetUrl } from '../lib/apiClient'

type Bike = {
  _id?: string
  id?: string
  name?: string
  numberPlate?: string
  pricePerHour?: number
  pricePerDay?: number
  bikePhotoUrl?: string
  isAvailable?: boolean
}

function bikeId(b: Bike): string {
  return b._id ?? b.id ?? ''
}

function toIsoOrNull(v: string): string | null {
  if (!v) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function toLocalDateTimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function currentLocalSlot(stepMinutes = 15): string {
  const d = new Date()
  d.setSeconds(0, 0)
  const remainder = d.getMinutes() % stepMinutes
  if (remainder !== 0) {
    d.setMinutes(d.getMinutes() + (stepMinutes - remainder))
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function isBeforeNow(isoDate: string): boolean {
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return true
  return d.getTime() < Date.now()
}

function estimateTotalPrice(params: {
  bike: Bike
  startIso: string
  endIso: string
}): number {
  const { bike, startIso, endIso } = params
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  const durationMs = Math.max(0, end - start)
  const hourMs = 1000 * 60 * 60
  const dayMs = hourMs * 24

  const hours = Math.ceil(durationMs / hourMs)
  const days = Math.ceil(durationMs / dayMs)

  const pricePerHour = bike.pricePerHour ?? 0
  const pricePerDay = bike.pricePerDay ?? 0

  if (durationMs >= dayMs) return days * pricePerDay
  return hours * pricePerHour
}

const MAX_STUDENT_BOOKING_MS = 7 * 24 * 60 * 60 * 1000

function exceedsOneWeek(startIso: string, endIso: string): boolean {
  return new Date(endIso).getTime() - new Date(startIso).getTime() > MAX_STUDENT_BOOKING_MS
}

export default function StudentBikeBooking() {
  const navigate = useNavigate()
  const { bikeId: routeBikeId = '' } = useParams()

  const [bike, setBike] = useState<Bike | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [startLocal, setStartLocal] = useState('')
  const [endLocal, setEndLocal] = useState('')

  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityAvailable, setAvailabilityAvailable] = useState<boolean | null>(
    null,
  )
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)

  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [minStartLocal, setMinStartLocal] = useState(currentLocalSlot())

  useEffect(() => {
    const id = window.setInterval(() => {
      setMinStartLocal(currentLocalSlot())
    }, 30000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!startLocal) {
      setStartLocal(minStartLocal)
    }
  }, [minStartLocal, startLocal])

  useEffect(() => {
    if (!startLocal || endLocal) return
    const start = new Date(startLocal)
    if (Number.isNaN(start.getTime())) return

    const end = new Date(start)
    end.setHours(end.getHours() + 1)
    setEndLocal(toLocalDateTimeValue(end))
  }, [startLocal, endLocal])

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)

      try {
        const bikes = await apiFetch<Bike[]>('/api/bikes')
        const selected = (Array.isArray(bikes) ? bikes : []).find(
          (b) => bikeId(b) === routeBikeId,
        )

        if (!selected) {
          setError('Bike not found.')
          setBike(null)
          return
        }

        if (selected.isAvailable === false) {
          setError('This bike is unavailable right now.')
          setBike(selected)
          return
        }

        setBike(selected)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load bike details')
      } finally {
        setLoading(false)
      }
    })()
  }, [routeBikeId])

  const startIso = toIsoOrNull(startLocal)
  const endIso = toIsoOrNull(endLocal)

  const priceEstimate = useMemo(() => {
    if (!bike || !startIso || !endIso) return null
    try {
      return estimateTotalPrice({ bike, startIso, endIso })
    } catch {
      return null
    }
  }, [bike, startIso, endIso])

  async function checkAvailability() {
    if (!bike) return

    setAvailabilityError(null)
    setBookingError(null)

    if (!startIso || !endIso) {
      setAvailabilityAvailable(null)
      setAvailabilityError('Please choose both start and end time.')
      return
    }

    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setAvailabilityAvailable(null)
      setAvailabilityError('End time must be after start time.')
      return
    }

    if (isBeforeNow(startIso)) {
      setAvailabilityAvailable(null)
      setAvailabilityError('Start time cannot be before current time.')
      return
    }

    if (exceedsOneWeek(startIso, endIso)) {
      setAvailabilityAvailable(null)
      setAvailabilityError('Booking duration cannot exceed 1 week.')
      return
    }

    setAvailabilityLoading(true)
    try {
      const params = new URLSearchParams({
        startTime: startIso,
        endTime: endIso,
      })

      const data = await apiFetch<{ available?: boolean }>(
        `/api/bookings/availability/${routeBikeId}?${params.toString()}`,
      )
      setAvailabilityAvailable(Boolean(data?.available))
    } catch (e) {
      setAvailabilityAvailable(null)
      setAvailabilityError(e instanceof Error ? e.message : 'Availability check failed')
    } finally {
      setAvailabilityLoading(false)
    }
  }

  async function createBooking() {
    if (!bike) return

    setBookingError(null)

    if (!startIso || !endIso) {
      setBookingError('Please choose both start and end time.')
      return
    }
    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setBookingError('End time must be after start time.')
      return
    }
    if (isBeforeNow(startIso)) {
      setBookingError('Start time cannot be before current time.')
      return
    }
    if (exceedsOneWeek(startIso, endIso)) {
      setBookingError('Booking duration cannot exceed 1 week.')
      return
    }
    if (availabilityAvailable !== true) {
      setBookingError('Check availability first.')
      return
    }

    setBookingLoading(true)
    try {
      await apiFetch('/api/bookings', {
        method: 'POST',
        body: {
          bikeId: routeBikeId,
          startTime: startIso,
          endTime: endIso,
        },
      })
      navigate('/student/bookings')
    } catch (e) {
      setBookingError(e instanceof Error ? e.message : 'Booking failed')
    } finally {
      setBookingLoading(false)
    }
  }

  return (
    <AppShell>
      <div className="rounded-xl border border-gray-200 bg-white/70 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-gray-800">Book Bike</h1>
          <Link
            to="/student/bikes"
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            Back to bikes
          </Link>
        </div>

        {loading ? (
          <p className="mt-4 text-gray-600">Loading bike details...</p>
        ) : error ? (
          <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        ) : bike ? (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded border border-gray-200 bg-white p-5">
              <div className="aspect-[4/3] w-full overflow-hidden rounded bg-gray-100">
                {bike.bikePhotoUrl ? (
                  <img
                    src={resolveApiAssetUrl(bike.bikePhotoUrl)}
                    alt={bike.name ?? 'Bike'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
                    No photo
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <h2 className="text-lg font-semibold text-gray-800">{bike.name}</h2>
                <p className="text-sm text-gray-600">Plate: {bike.numberPlate}</p>
                <p className="text-sm text-gray-700">{bike.pricePerHour} / hour</p>
                <p className="text-sm text-gray-700">{bike.pricePerDay} / day</p>
              </div>
            </div>

            <div className="rounded border border-gray-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-gray-800">Booking Details</h2>

              <div className="mt-4 space-y-4">
                <BookingTimePicker
                  startLocal={startLocal}
                  endLocal={endLocal}
                  startMin={minStartLocal}
                  endMin={startLocal || minStartLocal}
                  helperText="Start time must be current or future time."
                  onChange={({ startLocal: nextStart, endLocal: nextEnd }) => {
                    setStartLocal(nextStart)
                    setEndLocal(nextEnd)
                    setAvailabilityAvailable(null)
                    setAvailabilityError(null)
                    setBookingError(null)
                  }}
                />

                <div className="flex flex-wrap gap-3">
                  <button
                    className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-60"
                    type="button"
                    disabled={availabilityLoading || bookingLoading}
                    onClick={() => void checkAvailability()}
                  >
                    {availabilityLoading ? 'Checking...' : 'Check availability'}
                  </button>
                  <button
                    className="rounded border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                    type="button"
                    disabled={bookingLoading}
                    onClick={() => {
                      setAvailabilityAvailable(null)
                      setAvailabilityError(null)
                      setBookingError(null)
                    }}
                  >
                    Reset
                  </button>
                </div>

                {availabilityError && (
                  <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    {availabilityError}
                  </p>
                )}

                {availabilityAvailable === true && (
                  <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    Bike is available for the selected time.
                    {priceEstimate !== null && (
                      <>
                        <br />
                        Estimated price: <span className="font-semibold">{priceEstimate}</span>
                      </>
                    )}
                  </p>
                )}

                {availabilityAvailable === false && (
                  <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    Bike is not available for the selected time.
                  </p>
                )}

                <div className="pt-2">
                  <button
                    className="w-full rounded bg-purple-700 px-4 py-2 text-white hover:bg-purple-600 disabled:opacity-60"
                    type="button"
                    disabled={
                      bookingLoading || availabilityAvailable !== true || !startIso || !endIso
                    }
                    onClick={() => void createBooking()}
                  >
                    {bookingLoading ? 'Booking...' : 'Confirm booking'}
                  </button>
                </div>

                {bookingError && (
                  <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    {bookingError}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  )
}
