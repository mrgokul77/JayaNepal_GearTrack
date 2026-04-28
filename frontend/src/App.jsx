import { Navigate, Route, Routes } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout'
import AdminPage from './pages/AdminPage'
import CustomerPage from './pages/CustomerPage'
import StaffPage from './pages/StaffPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route element={<DashboardLayout />}>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/customer" element={<CustomerPage />} />
      </Route>
    </Routes>
  )
}

export default App
