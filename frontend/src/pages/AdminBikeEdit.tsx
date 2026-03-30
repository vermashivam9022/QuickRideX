import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { apiFetch, resolveApiAssetUrl } from '../lib/apiClient'

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
}

function bikeId(b: Bike): string {
  return b._id ?? b.id ?? ''
}

export default function AdminBikeEdit() {
  const navigate = useNavigate()
  const { bikeId: routeBikeId = '' } = useParams()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [mutationSuccess, setMutationSuccess] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [numberPlate, setNumberPlate] = useState('')
  const [pricePerHour, setPricePerHour] = useState<string>('')
  const [pricePerDay, setPricePerDay] = useState<string>('')
  const [category, setCategory] = useState<'bike' | 'scooty'>('bike')
  const [bikePhotoUrl, setBikePhotoUrl] = useState('')
  const [bikePhotoFile, setBikePhotoFile] = useState<File | null>(null)
  const [isAvailable, setIsAvailable] = useState(true)

  async function uploadBikePhotoFile(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('bikePhoto', file)

    const data = await apiFetch<{ bikePhotoUrl?: string }>('/api/bikes/upload-photo', {
      method: 'POST',
      body: formData,
    })

    const uploadedUrl = data?.bikePhotoUrl ?? ''
    if (!uploadedUrl) throw new Error('Upload did not return photo URL')
    return uploadedUrl
  }

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)

      try {
        const bikes = await apiFetch<Bike[]>('/api/bikes')
        const bike = (Array.isArray(bikes) ? bikes : []).find((b) => bikeId(b) === routeBikeId)

        if (!bike) {
          setError('Bike not found.')
          return
        }

        setName(bike.name ?? '')
        setNumberPlate(bike.numberPlate ?? '')
        setPricePerHour(
          typeof bike.pricePerHour === 'number' ? String(bike.pricePerHour) : '',
        )
        setPricePerDay(
          typeof bike.pricePerDay === 'number' ? String(bike.pricePerDay) : '',
        )
        setCategory(bike.category === 'scooty' ? 'scooty' : 'bike')
        setBikePhotoUrl(bike.bikePhotoUrl ?? '')
        setIsAvailable(Boolean(bike.isAvailable))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load bike details')
      } finally {
        setLoading(false)
      }
    })()
  }, [routeBikeId])

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

      await apiFetch(`/api/bikes/${routeBikeId}`, {
        method: 'PATCH',
        body: formData,
      })

      setBikePhotoFile(null)
      setMutationSuccess('Bike updated successfully.')
      navigate('/admin/bikes')
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : 'Bike update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell>
      <div className="rounded-xl border border-gray-200 bg-white/70 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Edit Bike</h1>
          <Link
            to="/admin/bikes"
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
        ) : (
          <div className="mt-6 rounded border border-gray-200 bg-white p-5">
            {mutationError && (
              <p className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {mutationError}
              </p>
            )}
            {mutationSuccess && (
              <p className="mb-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                {mutationSuccess}
              </p>
            )}

            <div className="space-y-3">
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
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Price / Day</label>
                  <input
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                    value={pricePerDay}
                    onChange={(e) => setPricePerDay(e.target.value)}
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
                  {saving ? 'Saving...' : 'Update bike'}
                </button>
                <Link
                  to="/admin/bikes"
                  className="rounded border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Cancel
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
