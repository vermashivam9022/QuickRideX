import { Navigate, Route, Routes, BrowserRouter } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import ApprovalPending from './pages/ApprovalPending'

import LoginPage from './pages/Login'
import RegisterPage from './pages/Register'
import StudentDashboardPage from './pages/StudentDashboard'
import StudentBikesPage from './pages/StudentBikes'
import StudentBikeBookingPage from './pages/StudentBikeBooking'
import StudentBookingsPage from './pages/StudentBookings'
import StudentBookingDetailsPage from './pages/StudentBookingDetails'
import AdminDashboardPage from './pages/AdminDashboard'
import AdminBikesPage from './pages/AdminBikes'
import AdminBikeEditPage from './pages/AdminBikeEdit'
import AdminPendingOrdersPage from './pages/AdminPendingOrders'
import AdminBookingsPage from './pages/AdminBookings'
import AdminBookingDetailsPage from './pages/AdminBookingDetails'

function LandingRedirect() {
  const { user, role, isApproved, loading } = useAuth()

  if (loading) return <div className="p-6 text-center text-gray-600">Loading...</div>
  if (!user) return <Navigate to="/login" replace />

  if (role === 'admin') return <Navigate to="/admin/dashboard" replace />
  if (role === 'student') {
    if (isApproved) return <Navigate to="/student/dashboard" replace />
    return <Navigate to="/student/approval" replace />
  }

  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/student/approval" element={<ApprovalPending />} />
          
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute roles={['student']}>
                <StudentDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/bikes"
            element={
              <ProtectedRoute roles={['student']} requireApproved>
                <StudentBikesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/bikes/:bikeId/book"
            element={
              <ProtectedRoute roles={['student']} requireApproved>
                <StudentBikeBookingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/bookings"
            element={
              <ProtectedRoute roles={['student']} requireApproved>
                <StudentBookingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/bookings/:bookingId"
            element={
              <ProtectedRoute roles={['student']} requireApproved>
                <StudentBookingDetailsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/dashboard"
            element={
              // <ProtectedRoute roles={['admin']}>
                <AdminDashboardPage />
              // </ProtectedRoute>
            }
          />
          <Route
            path="/admin/bikes"
            element={
              // <ProtectedRoute roles={['admin']}>
                <AdminBikesPage />
              // </ProtectedRoute>
            }
          />
          <Route
            path="/admin/bikes/:bikeId/edit"
            element={
              // <ProtectedRoute roles={['admin']}>
                <AdminBikeEditPage />
              // </ProtectedRoute>
            }
          />
          <Route
            path="/admin/pending-orders"
            element={
              // <ProtectedRoute roles={['admin']}>
                <AdminPendingOrdersPage />
              // </ProtectedRoute>
            }
          />
          <Route
            path="/admin/bookings"
            element={
              // <ProtectedRoute roles={['admin']}>
                <AdminBookingsPage />
              // </ProtectedRoute>
            }
          />
          <Route
            path="/admin/bookings/:bookingId"
            element={
              // <ProtectedRoute roles={['admin']}>
                <AdminBookingDetailsPage />
              // </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
