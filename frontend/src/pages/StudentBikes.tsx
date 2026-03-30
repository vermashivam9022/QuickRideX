import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/apiClient'
import { useAuth } from '../context/AuthContext'
import BikeCard from '../components/BikeCard'
import AppShell from '../components/AppShell'

type Bike = {
  _id?: string
  id?: string
  name?: string
  numberPlate?: string
  pricePerHour?: number
  pricePerDay?: number
  bikePhotoUrl?: string
  isAvailable?: boolean
  averageRating?: number
  ratingCount?: number
}

function bikeId(b: Bike): string {
  return b._id ?? b.id ?? ''
}

export default function StudentBikes() {
  const navigate = useNavigate()
  const { isApproved } = useAuth()

  const [bikes, setBikes] = useState<Bike[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await apiFetch<Bike[]>('/api/bikes')
        const next = Array.isArray(data) ? data : []
        setBikes(next)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load bikes')
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isShopClosed = bikes.length > 0 && bikes.every((b) => b.isAvailable === false)

  return (
    <AppShell>
      <div className="rounded-xl border border-gray-200 bg-white/70 p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-2xl font-semibold text-gray-800">Find Bikes/Scooty</h1>
          {!isApproved && (
            <p className="text-sm text-amber-900">
              Your account is pending approval.
            </p>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

        {loading ? (
          <p className="mt-5 text-gray-600">Loading...</p>
        ) : bikes.length === 0 ? (
          <p className="mt-5 text-gray-600">No bikes found yet.</p>
        ) : (
          <div className="mt-6 rounded border border-gray-200 bg-white p-5">
           

            {isShopClosed && (
              <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
                Shop Closed: booking is currently unavailable.
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {bikes.map((b) => {
                const id = bikeId(b)
                const isUnavailable = b.isAvailable === false
                return (
                  <BikeCard
                    key={id}
                    bike={{
                      name: b.name,
                      numberPlate: b.numberPlate,
                      pricePerHour: b.pricePerHour,
                      pricePerDay: b.pricePerDay,
                      bikePhotoUrl: b.bikePhotoUrl,
                      isAvailable: b.isAvailable,
                      averageRating: b.averageRating,
                      ratingCount: b.ratingCount,
                    }}
                    disabled={isUnavailable}
                    onSelect={() => {
                      if (isUnavailable) return
                      navigate(`/student/bikes/${id}/book`)
                    }}
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

