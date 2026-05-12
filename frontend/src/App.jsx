import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './layouts/DashboardLayout'
import AdminPage from './pages/AdminPage'
import PurchaseInvoice from './pages/admin/PurchaseInvoice'
import RegisterStaff from './pages/admin/RegisterStaff'
import VendorManagement from './pages/admin/VendorManagement'
import CustomerPage from './pages/CustomerPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import RegisterCustomer from './pages/staff/RegisterCustomer'
import SearchCustomer from './pages/staff/SearchCustomer'
import CustomerHistory from './pages/staff/CustomerHistory'
import SalesInvoice from './pages/staff/SalesInvoice'
import StaffPage from './pages/StaffPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/register-staff" element={<RegisterStaff />} />
          <Route path="/admin/vendors" element={<VendorManagement />} />
          <Route path="/admin/purchase-invoices" element={<PurchaseInvoice />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['Staff']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/staff/register-customer" element={<RegisterCustomer />} />
          <Route path="/staff/search-customer" element={<SearchCustomer />} />
          <Route path="/staff/customer-history" element={<CustomerHistory />} />
          <Route path="/staff/sales-invoice" element={<SalesInvoice />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['Customer']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/customer" element={<CustomerPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
