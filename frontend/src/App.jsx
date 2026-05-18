import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './layouts/DashboardLayout'
import AdminPage from './pages/AdminPage'
import AppointmentsAdmin from './pages/admin/AppointmentsAdmin'
import FinancialReports from './pages/admin/FinancialReports'
import LoyaltyStats from './pages/admin/LoyaltyStats'
import Notifications from './pages/admin/Notifications'
import PartRequestsAdmin from './pages/admin/PartRequestsAdmin'
import PurchaseInvoice from './pages/admin/PurchaseInvoice'
import PartsManagement from './pages/admin/PartsManagement'
import RegisterStaff from './pages/admin/RegisterStaff'
import ServiceReviewsAdmin from './pages/admin/ServiceReviewsAdmin'
import VendorManagement from './pages/admin/VendorManagement'
import CustomerPage from './pages/CustomerPage'
import Appointments from './pages/customer/Appointments'
import PartRequests from './pages/customer/PartRequests'
import ProfilePage from './pages/customer/ProfilePage'
import LoyaltyBenefits from './pages/customer/LoyaltyBenefits'
import PurchaseHistory from './pages/customer/PurchaseHistory'
import ServiceReviews from './pages/customer/ServiceReviews'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import RegisterCustomer from './pages/staff/RegisterCustomer'
import SearchCustomer from './pages/staff/SearchCustomer'
import CustomerHistory from './pages/staff/CustomerHistory'
import CustomerReports from './pages/staff/CustomerReports'
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
          <Route path="/admin/appointments" element={<AppointmentsAdmin />} />
          <Route path="/admin/part-requests" element={<PartRequestsAdmin />} />
          <Route path="/admin/reviews" element={<ServiceReviewsAdmin />} />
          <Route path="/admin/vendors" element={<VendorManagement />} />
          <Route path="/admin/parts" element={<PartsManagement />} />
          <Route path="/admin/purchase-invoices" element={<PurchaseInvoice />} />
          <Route path="/admin/notifications" element={<Notifications />} />
          <Route path="/admin/loyalty" element={<LoyaltyStats />} />
          <Route path="/admin/financial-reports" element={<FinancialReports />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['Staff']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/staff/register-customer" element={<RegisterCustomer />} />
          <Route path="/staff/search-customer" element={<SearchCustomer />} />
          <Route path="/staff/customer-history" element={<CustomerHistory />} />
          <Route path="/staff/customer-reports" element={<CustomerReports />} />
          <Route path="/staff/sales-invoice" element={<SalesInvoice />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['Customer']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/customer" element={<CustomerPage />} />
          <Route path="/customer/appointments" element={<Appointments />} />
          <Route path="/customer/part-requests" element={<PartRequests />} />
          <Route path="/customer/reviews" element={<ServiceReviews />} />
          <Route path="/customer/profile" element={<ProfilePage />} />
          <Route path="/customer/history" element={<PurchaseHistory />} />
          <Route path="/customer/loyalty" element={<LoyaltyBenefits />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
