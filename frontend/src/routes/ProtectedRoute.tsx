import type { ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { AppRole } from '../context/AuthContext'

type ProtectedRouteProps = {
  roles?: AppRole[]
  requireApproved?: boolean
  children: ReactElement
}

export default function ProtectedRoute({
  roles,
  requireApproved,
  children,
}: ProtectedRouteProps) {
  const location = useLocation()
  const { user, role, isApproved, loading, token } = useAuth()

  if (loading) {
    return <div className="p-6 text-center text-gray-600">Loading...</div>
  }

  if (!token || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    )
  }

  if (roles && role && !roles.includes(role)) {
    return <Navigate to="/" replace />
  }

  if (requireApproved && role === 'student' && !isApproved) {
    return <Navigate to="/student/approval" replace />
  }

  return children
}

