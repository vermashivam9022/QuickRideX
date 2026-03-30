import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import StatusBadge from '../components/StatusBadge'
import { apiFetch, resolveApiAssetUrl } from '../lib/apiClient'

type Booking = {
  _id?: string
  userId?: string | {
    _id?: string
    name?: string
    email?: string
    mobileNo?: string
    isApproved?: boolean
    licenseUrl?: string
    collegeIdUrl?: string
  }
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

function toDateTimeLocalValue(value?: string) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''

  const pad = (n: number) => String(n).padStart(2, '0')
  const year = d.getFullYear()
  const month = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const hours = pad(d.getHours())
  const minutes = pad(d.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function openNativePicker(input: HTMLInputElement) {
  try {
    input.showPicker?.()
  } catch {
    // Ignore when browser blocks/does not support programmatic picker opening.
  }
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-sm text-gray-900">{value ?? '—'}</div>
    </div>
  )
}

function isPdfDocument(url: string): boolean {
  return /\.pdf($|\?)/i.test(url)
}

function buildAssetCandidates(raw?: string): string[] {
  if (!raw) return []

  const normalized = raw.trim().replace(/\\/g, '/')
  if (!normalized) return []

  const candidates = [resolveApiAssetUrl(normalized)]

  // Compatibility fallback when database path contains accidental API prefix.
  if (normalized.startsWith('/api/uploads/')) {
    candidates.push(resolveApiAssetUrl(normalized.replace('/api/uploads/', '/uploads/')))
  }

  if (normalized.startsWith('api/uploads/')) {
    candidates.push(resolveApiAssetUrl(`/${normalized.replace('api/uploads/', 'uploads/')}`))
  }

  return Array.from(new Set(candidates.filter(Boolean)))
}

function DocumentPreview({ label, url }: { label: string; url: string }) {
  const candidates = buildAssetCandidates(url)
  const [activeIndex, setActiveIndex] = useState(0)
  const activeUrl = candidates[activeIndex] || ''
  const pdf = isPdfDocument(activeUrl)

  useEffect(() => {
    setActiveIndex(0)
  }, [url])

  const canTryNext = activeIndex < candidates.length - 1

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 sm:col-span-2">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2">
        {!activeUrl ? (
          <div className="rounded border border-gray-200 bg-white p-3 text-sm text-gray-600">
            Document URL is missing.
          </div>
        ) : pdf ? (
          <iframe
            src={activeUrl}
            title={label}
            className="h-64 w-full rounded border border-gray-200 bg-white"
          />
        ) : (
          <img
            src={activeUrl}
            alt={label}
            className="h-64 w-full rounded border border-gray-200 object-contain bg-white"
            onError={() => {
              if (canTryNext) {
                setActiveIndex((prev) => prev + 1)
              }
            }}
          />
        )}
      </div>
      <a
        href={activeUrl || url}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-block text-sm text-blue-700 underline"
      >
        Open full document
      </a>
    </div>
  )
}

export default function AdminBookingDetails() {
  const navigate = useNavigate()
  const { bookingId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const source = searchParams.get('from')
  const isReadOnly = source === 'today' || source === 'all'
  const showEndRideButton = source === 'active'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [booking, setBooking] = useState<Booking | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [verificationUpdating, setVerificationUpdating] = useState(false)
  const [timeUpdating, setTimeUpdating] = useState(false)
  const [endingRide, setEndingRide] = useState(false)
  const [startTimeInput, setStartTimeInput] = useState('')
  const [endTimeInput, setEndTimeInput] = useState('')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await apiFetch<Booking>(`/api/bookings/${bookingId}`)
        setBooking(data ?? null)
        setStartTimeInput(toDateTimeLocalValue(data?.startTime))
        setEndTimeInput(toDateTimeLocalValue(data?.endTime))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load booking details')
      } finally {
        setLoading(false)
      }
    })()
  }, [bookingId])

  async function updateStatus(nextStatus: 'confirmed' | 'cancelled') {
    if (!booking?._id) return

    setStatusUpdating(true)
    setStatusMessage(null)
    try {
      await apiFetch(`/api/bookings/${booking._id}/status`, {
        method: 'PATCH',
        body: { status: nextStatus },
      })

      setBooking((prev) => (prev ? { ...prev, status: nextStatus } : prev))
      setStatusMessage(`Booking marked as ${nextStatus}.`)
    } catch (e) {
      setStatusMessage(e instanceof Error ? e.message : 'Failed to update booking status')
    } finally {
      setStatusUpdating(false)
    }
  }

  async function updateVerification(nextApproved: boolean) {
    const userObj = typeof booking?.userId === 'object' ? booking.userId : null
    const userId = userObj?._id
    if (!userId) return

    setVerificationUpdating(true)
    setStatusMessage(null)
    try {
      const data = await apiFetch<{ user?: { isApproved?: boolean } }>(
        `/api/admin/students/${userId}/verification`,
        {
          method: 'PATCH',
          body: { isApproved: nextApproved },
        },
      )

      const approved = Boolean(data?.user?.isApproved)
      setBooking((prev) => {
        if (!prev || typeof prev.userId !== 'object' || !prev.userId) return prev
        return {
          ...prev,
          userId: {
            ...prev.userId,
            isApproved: approved,
          },
        }
      })

      setStatusMessage(approved ? 'Student marked as verified.' : 'Student marked as not verified.')
    } catch (e) {
      setStatusMessage(e instanceof Error ? e.message : 'Failed to update verification')
    } finally {
      setVerificationUpdating(false)
    }
  }

  async function updateBookingTimeAndPrice() {
    if (!booking?._id) return
    if (!startTimeInput || !endTimeInput) {
      setStatusMessage('Please select both start and end time.')
      return
    }

    const startMs = new Date(startTimeInput).getTime()
    const endMs = new Date(endTimeInput).getTime()
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      setStatusMessage('End time must be after start time.')
      return
    }

    setTimeUpdating(true)
    setStatusMessage(null)
    try {
      const updated = await apiFetch<Booking>(`/api/bookings/${booking._id}/time`, {
        method: 'PATCH',
        body: {
          startTime: new Date(startTimeInput).toISOString(),
          endTime: new Date(endTimeInput).toISOString(),
        },
      })

      setBooking(updated ?? booking)
      setStartTimeInput(toDateTimeLocalValue(updated?.startTime))
      setEndTimeInput(toDateTimeLocalValue(updated?.endTime))
      setStatusMessage('Booking time updated and price recalculated.')
    } catch (e) {
      setStatusMessage(e instanceof Error ? e.message : 'Failed to update booking time')
    } finally {
      setTimeUpdating(false)
    }
  }

  async function endRideNow() {
    if (!booking?._id) return

    const startCandidate = startTimeInput || toDateTimeLocalValue(booking.startTime)
    const startDate = new Date(startCandidate)
    const now = new Date()

    if (Number.isNaN(startDate.getTime())) {
      setStatusMessage('Start time is invalid. Please set valid start/end time first.')
      return
    }

    if (now.getTime() <= startDate.getTime()) {
      setStatusMessage('Ride cannot end before or at start time.')
      return
    }

    setEndingRide(true)
    setStatusMessage(null)
    try {
      const updated = await apiFetch<Booking>(`/api/bookings/${booking._id}/time`, {
        method: 'PATCH',
        body: {
          startTime: startDate.toISOString(),
          endTime: now.toISOString(),
        },
      })

      setBooking(updated ?? booking)
      setStartTimeInput(toDateTimeLocalValue(updated?.startTime))
      setEndTimeInput(toDateTimeLocalValue(updated?.endTime))
      setStatusMessage('Ride ended successfully. Fare recalculated from updated end time.')
    } catch (e) {
      setStatusMessage(e instanceof Error ? e.message : 'Failed to end ride')
    } finally {
      setEndingRide(false)
    }
  }

  const userObj = typeof booking?.userId === 'object' ? booking.userId : null
  const bikeObj = typeof booking?.bikeId === 'object' ? booking.bikeId : null
  const bikeImage = resolveApiAssetUrl(bikeObj?.bikePhotoUrl)
  const licenseUrl = resolveApiAssetUrl(userObj?.licenseUrl)
  const collegeIdUrl = resolveApiAssetUrl(userObj?.collegeIdUrl)

  return (
    <AppShell>
      <div className="rounded-xl border border-gray-200 bg-white/70 p-6 shadow-sm">
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 text-gray-900"
          >
            <span aria-hidden="true">&larr;</span>
            <span>Back</span>
          </button>
        </div>

        {isReadOnly ? (
          <div className="mt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-600 mb-2">Status</p>
            <StatusBadge 
              status={
                booking?.status === 'cancelled'
                  ? 'cancelled'
                  : 'completed'
              }
            />
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void updateStatus('confirmed')}
                disabled={statusUpdating || booking?.status === 'confirmed'}
                className="whitespace-nowrap rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800 hover:bg-green-100 disabled:opacity-60"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => void updateStatus('cancelled')}
                disabled={statusUpdating || booking?.status === 'cancelled'}
                className="whitespace-nowrap rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 hover:bg-red-100 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void updateVerification(true)}
                disabled={verificationUpdating || userObj?.isApproved === true}
                className="whitespace-nowrap rounded border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-800 hover:bg-blue-100 disabled:opacity-60"
              >
                Verify
              </button>
              <button
                type="button"
                onClick={() => void updateVerification(false)}
                disabled={verificationUpdating || userObj?.isApproved === false}
                className="whitespace-nowrap rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 hover:bg-amber-100 disabled:opacity-60"
              >
                Not Verify
              </button>
            </div>

            {showEndRideButton ? (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => void endRideNow()}
                  disabled={endingRide || booking?.status === 'cancelled'}
                  className="whitespace-nowrap rounded border border-purple-300 bg-purple-50 px-3 py-2 text-sm text-purple-800 hover:bg-purple-100 disabled:opacity-60"
                >
                  {endingRide ? 'Ending...' : 'End Ride Now'}
                </button>
              </div>
            ) : null}

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-end">
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-600">Start Time</span>
                <input
                  type="datetime-local"
                  value={startTimeInput}
                  onClick={(e) => openNativePicker(e.currentTarget)}
                  onChange={(e) => setStartTimeInput(e.target.value)}
                  className="w-full cursor-pointer rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-600">End Time</span>
                <input
                  type="datetime-local"
                  value={endTimeInput}
                  onClick={(e) => openNativePicker(e.currentTarget)}
                  onChange={(e) => setEndTimeInput(e.target.value)}
                  className="w-full cursor-pointer rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                />
              </label>

              <button
                type="button"
                onClick={() => void updateBookingTimeAndPrice()}
                disabled={timeUpdating}
                className="whitespace-nowrap rounded border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm text-indigo-800 hover:bg-indigo-100 disabled:opacity-60"
              >
                {timeUpdating ? 'Updating...' : 'Update Time & Price'}
              </button>
            </div>
          </div>
        )}

        {loading ? <p className="mt-4 text-gray-600">Loading...</p> : null}
        {error ? (
          <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>
        ) : null}
        {statusMessage ? (
          <p className="mt-3 rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">{statusMessage}</p>
        ) : null}

        {!loading && !error && booking ? (
          <div className="mt-6 space-y-4">
            {bikeImage ? (
              <img
                src={bikeImage}
                alt={bikeObj?.name || 'Bike'}
                className="h-44 w-full rounded-lg border border-gray-200 object-cover sm:h-56"
              />
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailItem label="Booking ID" value={booking._id} />
              <DetailItem label="Status" value={<StatusBadge status={booking.status} />} />
              <DetailItem label="Student Name" value={userObj?.name} />
              <DetailItem
                label="Verification"
                value={<StatusBadge status={userObj?.isApproved ? 'verified' : 'not verified'} />}
              />
              <DetailItem label="Student Email" value={userObj?.email} />
              <DetailItem label="Student Mobile" value={userObj?.mobileNo} />
              <DetailItem label="Bike Name" value={bikeObj?.name} />
              <DetailItem label="Number Plate" value={bikeObj?.numberPlate} />
              <DetailItem label="Start Time" value={formatDateTime(booking.startTime)} />
              <DetailItem label="End Time" value={formatDateTime(booking.endTime)} />
              <DetailItem label="Total Price" value={booking.totalPrice} />
              {licenseUrl ? (
                <DocumentPreview label="Driving License" url={licenseUrl} />
              ) : (
                <DetailItem label="Driving License" value="—" />
              )}
              {collegeIdUrl ? (
                <DocumentPreview label="College ID" url={collegeIdUrl} />
              ) : (
                <DetailItem label="College ID" value="—" />
              )}
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  )
}
