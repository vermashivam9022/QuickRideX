import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ApprovalPending() {
  const navigate = useNavigate()
  const { user, role, isApproved, loading, logout } = useAuth()

  if (loading) return <div className="p-6 text-center text-gray-600">Loading...</div>

  if (!user) return <Navigate to="/login" replace />
  if (role !== 'student') return <Navigate to="/" replace />
  if (isApproved) return <Navigate to="/student/dashboard" replace />

  return (
    <div className="mx-auto w-full max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">Account pending approval</h1>
      <p className="mt-3 text-gray-600">
        Your Documents are under review. You can start booking once admin approves your account.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800"
          onClick={() => {
            logout()
            navigate('/login')
          }}
        >
          Logout
        </button>
      </div>
    </div>
  )
}

