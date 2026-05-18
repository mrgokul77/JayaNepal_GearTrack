import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

/** Friendly page titles for the topbar, keyed by the leading route segment. */
const PAGE_TITLES = {
  '/admin': 'Admin dashboard',
  '/admin/register-staff': 'Staff management',
  '/admin/appointments': 'All appointments',
  '/admin/part-requests': 'All part requests',
  '/admin/reviews': 'All reviews',
  '/admin/vendors': 'Vendors',
  '/admin/parts': 'Vehicle parts',
  '/admin/purchase-invoices': 'Purchase invoices',
  '/admin/financial-reports': 'Financial reports',
  '/admin/notifications': 'Notifications',
  '/admin/loyalty': 'Loyalty program',
  '/staff': 'Staff workspace',
  '/staff/register-customer': 'Register customer',
  '/staff/sales-invoice': 'Sales invoice',
  '/staff/customer-history': 'Customer history',
  '/staff/search-customer': 'Search customers',
  '/staff/customer-reports': 'Customer reports',
  '/customer': 'Customer portal',
  '/customer/profile': 'My profile',
  '/customer/appointments': 'Appointments',
  '/customer/part-requests': 'Part requests',
  '/customer/reviews': 'Reviews',
  '/customer/history': 'My history',
  '/customer/loyalty': 'My loyalty',
}

function initialsFrom(name) {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'U'
}

function DashboardLayout() {
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] ?? 'GearTrack'

  const fullName = localStorage.getItem('fullName')?.trim() || 'User'
  const role = localStorage.getItem('role') ?? ''
  const initials = initialsFrom(fullName)

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <header className="topbar">
          <h1 className="topbar-title">{title}</h1>
          <div className="topbar-user">
            <div className="topbar-user-meta">
              <div className="topbar-user-name">{fullName}</div>
              <div className="topbar-user-role">{role}</div>
            </div>
            <div className="topbar-avatar" aria-hidden="true">
              {initials}
            </div>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
