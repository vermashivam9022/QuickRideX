import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const REGISTER_DRAFT_KEY = 'quickridex.register.draft.v1'

type RegisterDraft = {
  name: string
  email: string
  mobileNo: string
  password: string
}

const EMPTY_DRAFT: RegisterDraft = {
  name: '',
  email: '',
  mobileNo: '',
  password: '',
}

function loadDraft(): RegisterDraft {
  if (typeof window === 'undefined') return EMPTY_DRAFT
  try {
    const raw = window.sessionStorage.getItem(REGISTER_DRAFT_KEY)
    if (!raw) return EMPTY_DRAFT
    const parsed = JSON.parse(raw) as Partial<RegisterDraft>
    return {
      name: parsed.name ?? '',
      email: parsed.email ?? '',
      mobileNo: parsed.mobileNo ?? '',
      password: parsed.password ?? '',
    }
  } catch {
    return EMPTY_DRAFT
  }
}

function saveDraft(draft: RegisterDraft) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(REGISTER_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // Ignore draft save failures (private mode, quota, etc.).
  }
}

function clearDraft() {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(REGISTER_DRAFT_KEY)
  } catch {
    // Ignore draft cleanup failures.
  }
}

function isAllowedFileType(file: File): boolean {
  return file.type.startsWith('image/') || file.type === 'application/pdf'
}

function validateUpload(file: File | null, label: string): string | null {
  if (!file) return `Please upload your ${label} file.`
  if (!isAllowedFileType(file)) {
    return `${label} must be an image or PDF file.`
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `${label} must be 5MB or smaller.`
  }
  return null
}

export default function Register() {
  const navigate = useNavigate()
  const { register, error, loading } = useAuth()
  const draft = loadDraft()

  const [name, setName] = useState(draft.name)
  const [email, setEmail] = useState(draft.email)
  const [mobileNo, setMobileNo] = useState(draft.mobileNo)
  const [password, setPassword] = useState(draft.password)
  const [licenseFile, setLicenseFile] = useState<File | null>(null)
  const [collegeIdFile, setCollegeIdFile] = useState<File | null>(null)

  const [localError, setLocalError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    saveDraft({ name, email, mobileNo, password })
  }, [name, email, mobileNo, password])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setLocalError(null)

    const licenseValidationError = validateUpload(licenseFile, 'driving license')
    if (licenseValidationError) {
      setLocalError(licenseValidationError)
      setSubmitting(false)
      return
    }

    const collegeIdValidationError = validateUpload(collegeIdFile, 'college ID')
    if (collegeIdValidationError) {
      setLocalError(collegeIdValidationError)
      setSubmitting(false)
      return
    }

    if (!licenseFile || !collegeIdFile) {
      setLocalError('Please select valid files before submitting.')
      setSubmitting(false)
      return
    }

    try {
      await register({
        name,
        email,
        mobileNo,
        password,
        drivingLicenseFile: licenseFile,
        collegeIdFile,
      })
      clearDraft()
      navigate('/')
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 via-white to-cyan-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-20 top-0 h-56 w-56 rounded-full bg-cyan-200/35 blur-3xl sm:h-72 sm:w-72" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-56 w-56 rounded-full bg-orange-200/35 blur-3xl sm:h-72 sm:w-72" />

      <div className="relative w-full max-w-md sm:max-w-lg">
        <div className="rounded-2xl border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-200/70 backdrop-blur-sm sm:p-7">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Create account
          </h1>
          <form className="mt-5 space-y-5" onSubmit={onSubmit}>
            
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
              <input
                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{10,}"
                title="Enter at least 10 digits"
                value={mobileNo}
                onChange={(e) => setMobileNo(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Driving License
              </label>
              <input
                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                type="file"
                accept="image/*,application/pdf"
                required
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null
                  const validationError = validateUpload(f, 'driving license')
                  if (validationError) {
                    setLicenseFile(null)
                    setLocalError(validationError)
                    return
                  }
                  setLocalError(null)
                  setLicenseFile(f)
                }}
              />
              <div className="text-xs text-gray-500">
                {licenseFile ? licenseFile.name : 'No file selected'}
              </div>
              <div className="text-xs text-gray-500">Allowed: image or PDF, max 5MB</div>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                College ID
              </label>
              <input
                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                type="file"
                accept="image/*,application/pdf"
                required
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null
                  const validationError = validateUpload(f, 'college ID')
                  if (validationError) {
                    setCollegeIdFile(null)
                    setLocalError(validationError)
                    return
                  }
                  setLocalError(null)
                  setCollegeIdFile(f)
                }}
              />
              <div className="text-xs text-gray-500">
                {collegeIdFile ? collegeIdFile.name : 'No file selected'}
              </div>
              <div className="text-xs text-gray-500">Allowed: image or PDF, max 5MB</div>
            </div>

            {(localError || error) && (
              <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {localError || error}
              </p>
            )}

            <button
              className="w-full rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-60"
              type="submit"
              disabled={loading || submitting}
            >
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </form>

          <p className="mt-4 text-sm text-gray-600">
            Already have an account?{' '}
            <Link className="font-medium text-gray-900 underline" to="/login">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

