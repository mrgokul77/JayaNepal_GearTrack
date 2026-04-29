import { Navigate, Outlet } from 'react-router-dom'

function ProtectedRoute({ allowedRoles }) {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (!role || !allowedRoles?.includes(role)) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
