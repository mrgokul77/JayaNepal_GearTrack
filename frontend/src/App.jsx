import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './layouts/DashboardLayout'
import AdminPage from './pages/AdminPage'
import CustomerPage from './pages/CustomerPage'
import LoginPage from './pages/LoginPage'
import StaffPage from './pages/StaffPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['Staff']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/staff" element={<StaffPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['Customer']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/customer" element={<CustomerPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
