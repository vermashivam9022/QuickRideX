import { resolveApiAssetUrl } from '../lib/apiClient'

type BikeCardProps = {
  bike: {
    name?: string
    numberPlate?: string
    pricePerHour?: number
    pricePerDay?: number
    isAvailable?: boolean
    bikePhotoUrl?: string
    averageRating?: number
    ratingCount?: number
  }
  active?: boolean
  onSelect: () => void
  disabled?: boolean
}

export default function BikeCard({
  bike,
  active,
  onSelect,
  disabled,
}: BikeCardProps) {
  const isUnavailable = bike.isAvailable === false
  const averageRating = typeof bike.averageRating === 'number' ? bike.averageRating : 0
  const ratingCount = typeof bike.ratingCount === 'number' ? bike.ratingCount : 0

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={[
        'relative w-full overflow-hidden rounded-lg border text-left transition',
        active
          ? 'border-gray-900 bg-gray-50 shadow-sm'
          : 'border-gray-200 bg-white hover:bg-gray-50',
        disabled ? 'cursor-not-allowed' : '',
        isUnavailable ? 'opacity-60' : '',
      ].join(' ')}
    >
      <div className="aspect-[4/3] w-full bg-gray-100">
        {bike.bikePhotoUrl ? (
          <img
            src={resolveApiAssetUrl(bike.bikePhotoUrl)}
            alt={bike.name ?? 'Bike'}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
            No photo
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold">{bike.name}</div>
            <div className="text-sm text-gray-600">{bike.numberPlate}</div>
          </div>
          <div className="text-right text-xs text-gray-700">
            <div>{bike.pricePerHour} / hour</div>
            <div>{bike.pricePerDay} / day</div>
          </div>
        </div>

        <div className="mt-2 text-xs text-gray-600">
          {ratingCount > 0
            ? `Rating: ${averageRating.toFixed(1)}/5 (${ratingCount} ratings)`
            : 'Rating: Not rated yet'}
        </div>
      </div>

      {isUnavailable && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/35">
          <span className="rounded bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            Unavailable
          </span>
        </div>
      )}
    </button>
  )
}

