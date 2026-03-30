import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, resolveApiAssetUrl } from '../lib/apiClient'
import AppShell from '../components/AppShell'

type Bike = {
  _id?: string
  id?: string
  name?: string
  numberPlate?: string
  pricePerHour?: number
  pricePerDay?: number
  category?: 'bike' | 'scooty'
  bikePhotoUrl?: string
  isAvailable?: boolean
  averageRating?: number
  ratingCount?: number
}

function bikeId(b: Bike): string {
  return b._id ?? b.id ?? ''
}

export default function AdminBikes() {
  const navigate = useNavigate()
  const [bikes, setBikes] = useState<Bike[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [togglingAvailabilityId, setTogglingAvailabilityId] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [mutationSuccess, setMutationSuccess] = useState<string | null>(null)

  const [editingBikeId, setEditingBikeId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [name, setName] = useState('')
  const [numberPlate, setNumberPlate] = useState('')
  const [pricePerHour, setPricePerHour] = useState<string>('')
  const [pricePerDay, setPricePerDay] = useState<string>('')
  const [category, setCategory] = useState<'bike' | 'scooty'>('bike')
  const [bikePhotoUrl, setBikePhotoUrl] = useState('')
  const [bikePhotoFile, setBikePhotoFile] = useState<File | null>(null)
  const [isAvailable, setIsAvailable] = useState(true)

  const selectedEditingBike = useMemo(
    () => (editingBikeId ? bikes.find((b) => bikeId(b) === editingBikeId) ?? null : null),
    [bikes, editingBikeId],
  )

  async function uploadBikePhotoFile(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('bikePhoto', file)

    const data = await apiFetch<{ bikePhotoUrl?: string }>('/api/bikes/upload-photo', {
      method: 'POST',
      body: formData,
    })

    const uploadedUrl = data?.bikePhotoUrl ?? ''
    if (!uploadedUrl) {
      throw new Error('Upload did not return photo URL')
    }

    return uploadedUrl
  }

  async function loadBikes() {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<Bike[]>('/api/bikes')
      setBikes(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bikes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadBikes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function resetForm() {
    setEditingBikeId(null)
    setName('')
    setNumberPlate('')
    setPricePerHour('')
    setPricePerDay('')
    setCategory('bike')
    setBikePhotoUrl('')
    setBikePhotoFile(null)
    setIsAvailable(true)
  }

  function startAddBike() {
    resetForm()
    setMutationError(null)
    setMutationSuccess(null)
    setShowForm(true)
  }

  function startEdit(b: Bike) {
    const id = bikeId(b)
    navigate(`/admin/bikes/${id}/edit`)
  }

  async function uploadBikePhoto() {
    if (!bikePhotoFile) {
      setMutationError('Please choose an image file first.')
      return
    }

    setUploadingPhoto(true)
    setMutationError(null)
    setMutationSuccess(null)

    try {
      const uploadedUrl = await uploadBikePhotoFile(bikePhotoFile)

      setBikePhotoUrl(uploadedUrl)
      setBikePhotoFile(null)
      setMutationSuccess('Bike photo uploaded. Save bike to keep this photo.')
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : 'Photo upload failed')
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function submit() {
    if (!name.trim()) {
      setMutationError('Name is required.')
      return
    }
    if (!numberPlate.trim()) {
      setMutationError('Number plate is required.')
      return
    }

    const pHour = Number(pricePerHour)
    const pDay = Number(pricePerDay)
    if (!Number.isFinite(pHour) || pHour < 0) {
      setMutationError('Price per hour must be a valid number.')
      return
    }
    if (!Number.isFinite(pDay) || pDay < 0) {
      setMutationError('Price per day must be a valid number.')
      return
    }

    setSaving(true)
    setMutationError(null)
    setMutationSuccess(null)

    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('numberPlate', numberPlate)
      formData.append('pricePerHour', String(pHour))
      formData.append('pricePerDay', String(pDay))
      formData.append('category', category)
      formData.append('isAvailable', String(isAvailable))
      if (bikePhotoUrl.trim()) {
        formData.append('bikePhotoUrl', bikePhotoUrl.trim())
      }
      if (bikePhotoFile) {
        formData.append('bikePhoto', bikePhotoFile)
      }

      if (editingBikeId) {
        await apiFetch(`/api/bikes/${editingBikeId}`, {
          method: 'PATCH',
          body: formData,
        })
      } else {
        await apiFetch('/api/bikes', {
          method: 'POST',
          body: formData,
        })
      }

      setBikePhotoFile(null)
      setMutationSuccess(editingBikeId ? 'Bike updated.' : 'Bike added.')
      resetForm()
      setShowForm(false)
      await loadBikes()
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : 'Bike save failed')
    } finally {
      setSaving(false)
    }
  }

  async function removeBike(id: string) {
    const ok = window.confirm('Delete this bike?')
    if (!ok) return

    setSaving(true)
    setMutationError(null)
    setMutationSuccess(null)
    try {
      await apiFetch(`/api/bikes/${id}`, { method: 'DELETE' })
      setMutationSuccess('Bike deleted.')
      resetForm()
      await loadBikes()
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  async function toggleBikeAvailability(id: string, nextIsAvailable: boolean) {
    setTogglingAvailabilityId(id)
    setMutationError(null)
    setMutationSuccess(null)

    try {
      await apiFetch(`/api/bikes/${id}`, {
        method: 'PATCH',
        body: { isAvailable: nextIsAvailable },
      })

      setBikes((prev) =>
        prev.map((bike) =>
          bikeId(bike) === id ? { ...bike, isAvailable: nextIsAvailable } : bike,
        ),
      )
      setMutationSuccess('Bike availability updated.')
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : 'Failed to update availability')
    } finally {
      setTogglingAvailabilityId(null)
    }
  }

  return (
    <AppShell>
      <div className="rounded-xl border border-gray-200 bg-white/70 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-gray-800">Bikes</h1>
          <button
            type="button"
            className="rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-60"
            onClick={() => startAddBike()}
            disabled={saving || uploadingPhoto}
          >
            Add Bike
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        {mutationError && (
          <p className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {mutationError}
          </p>
        )}
        {mutationSuccess && (
          <p className="mt-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {mutationSuccess}
          </p>
        )}

        {showForm && (
          <div className="mt-6 rounded border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">
                {editingBikeId ? 'Edit bike' : 'Add bike'}
              </h2>
              <button
                className="rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                type="button"
                disabled={saving || uploadingPhoto}
                onClick={() => {
                  resetForm()
                  setShowForm(false)
                }}
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Number Plate</label>
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                value={numberPlate}
                onChange={(e) => setNumberPlate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">Price / Hour</label>
                <input
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  value={pricePerHour}
                  onChange={(e) => setPricePerHour(e.target.value)}
                  placeholder="e.g., 50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Price / Day</label>
                <input
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  value={pricePerDay}
                  onChange={(e) => setPricePerDay(e.target.value)}
                  placeholder="e.g., 300"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium">Category</label>
              <select
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                value={category}
                onChange={(e) => setCategory(e.target.value as 'bike' | 'scooty')}
              >
                <option value="bike">Bike</option>
                <option value="scooty">Scooty</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">Bike Photo (upload)</label>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBikePhotoFile(e.target.files?.[0] ?? null)}
                />
                <button
                  className="rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                  type="button"
                  disabled={uploadingPhoto || saving || !bikePhotoFile}
                  onClick={() => void uploadBikePhoto()}
                >
                  {uploadingPhoto ? 'Uploading...' : 'Upload image'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium">Bike Photo URL (optional manual)</label>
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                value={bikePhotoUrl}
                onChange={(e) => setBikePhotoUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            {bikePhotoUrl && (
              <div>
                <label className="block text-sm font-medium">Photo preview</label>
                <img
                  src={resolveApiAssetUrl(bikePhotoUrl)}
                  alt="Bike preview"
                  className="mt-1 h-36 w-full rounded border border-gray-200 object-cover"
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-3 rounded border border-gray-200 p-3">
              <div>
                <div className="text-sm font-medium">Available</div>
                <div className="text-xs text-gray-600">Toggle availability for this bike.</div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                />
                {isAvailable ? 'Yes' : 'No'}
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-60"
                type="button"
                disabled={saving || uploadingPhoto}
                onClick={() => void submit()}
              >
                {saving ? 'Saving...' : editingBikeId ? 'Update bike' : 'Add bike'}
              </button>
              <button
                className="rounded border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                type="button"
                disabled={saving || uploadingPhoto}
                onClick={() => resetForm()}
              >
                Clear
              </button>
            </div>
            {selectedEditingBike && (
              <p className="text-xs text-gray-500">
                Editing: {selectedEditingBike.name} ({selectedEditingBike.numberPlate})
              </p>
            )}
          </div>
          </div>
        )}

        <div className="mt-6 rounded border border-gray-200 bg-white p-5">
           
            {loading ? (
              <p className="mt-4 text-gray-600">Loading...</p>
            ) : bikes.length === 0 ? (
              <div className="mt-4 rounded border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-700">
                No bikes yet. Click `Add Bike` to create the first bike.
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {bikes.map((b) => {
                  const id = bikeId(b)
                  const active = id === editingBikeId
                  const isUnavailable = b.isAvailable === false
                  return (
                    <div
                      key={id}
                      className={[
                        'overflow-hidden rounded-lg border bg-white',
                        active ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200',
                        isUnavailable ? 'bg-red-50/40 border-red-300' : '',
                      ].join(' ')}
                    >
                      <button
                        type="button"
                        onClick={() => startEdit(b)}
                        className="w-full text-left"
                      >
                        <div className="relative aspect-[4/3] w-full bg-gray-100">
                          {b.bikePhotoUrl ? (
                            <img
                              src={resolveApiAssetUrl(b.bikePhotoUrl)}
                              alt={b.name ?? 'Bike'}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
                              No photo
                            </div>
                          )}

                          {isUnavailable && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/40">
                              <span className="rounded bg-red-700/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                                Unavailable
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1 p-3">
                          <p className="font-semibold">{b.name}</p>
                          <p className="text-sm text-gray-600">{b.numberPlate}</p>
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            {b.category ?? 'bike'}
                          </p>
                          <p className="text-xs text-gray-700">{b.pricePerHour} / hour</p>
                          <p className="text-xs text-gray-700">{b.pricePerDay} / day</p>
                          <p className="text-xs text-gray-700">
                            {typeof b.ratingCount === 'number' && b.ratingCount > 0
                              ? `Rating: ${(b.averageRating ?? 0).toFixed(1)}/5 (${b.ratingCount})`
                              : 'Rating: Not rated yet'}
                          </p>
                          <p className="text-xs font-medium">
                            {b.isAvailable ? 'Available' : 'Unavailable'}
                          </p>
                        </div>
                      </button>

                      <div className="flex items-center justify-between gap-2 border-t border-gray-200 p-3">
                        <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                          <input
                            type="checkbox"
                            checked={Boolean(b.isAvailable)}
                            disabled={saving || togglingAvailabilityId === id}
                            onChange={(e) => {
                              void toggleBikeAvailability(id, e.target.checked)
                            }}
                          />
                          {togglingAvailabilityId === id
                            ? 'Updating...'
                            : b.isAvailable
                              ? 'Available'
                              : 'Unavailable'}
                        </label>

                        <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(b)}
                          className="rounded border border-gray-300 bg-white px-3 py-1 text-xs hover:bg-gray-50"
                          disabled={saving}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeBike(id)}
                          className="rounded border border-red-300 bg-white px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
                          disabled={saving}
                        >
                          Delete
                        </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
        </div>
      </div>
    </AppShell>
  )
}

