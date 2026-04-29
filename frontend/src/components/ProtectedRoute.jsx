import { Navigate, Outlet } from 'react-router-dom'

function ProtectedRoute({ allowedRoles }) {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')

  // Redirect unauthenticated or unauthorized users back to login.
  if (!token || !role) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
