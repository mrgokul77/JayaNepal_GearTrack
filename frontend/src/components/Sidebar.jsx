import { NavLink } from 'react-router-dom'

const navByRole = {
  Admin: [
    { path: '/admin', label: 'Dashboard' },
    { path: '/admin/register-staff', label: 'Register Staff' },
    { path: '/admin/vendors', label: 'Vendors' },
    { path: '/admin/parts', label: 'Parts' },
    { path: '/admin/purchase-invoices', label: 'Purchase Invoices' },
    { path: '/admin/financial-reports', label: 'Financial Reports' },
    { path: '/admin/notifications', label: 'Notifications' },
    { path: '/admin/loyalty', label: 'Loyalty Program' },
  ],
  Staff: [
    { path: '/staff', label: 'Dashboard' },
    { path: '/staff/register-customer', label: 'Register Customer' },
    { path: '/staff/sales-invoice', label: 'Sales Invoice' },
    { path: '/staff/customer-history', label: 'Customer History' },
    { path: '/staff/search-customer', label: 'Search Customers' },
    { path: '/staff/customer-reports', label: 'Customer Reports' },
  ],
  Customer: [
    { path: '/customer', label: 'Home' },
    { path: '/customer/profile', label: 'My Profile' },
    { path: '/customer/appointments', label: 'Appointments' },
    { path: '/customer/part-requests', label: 'Part Requests' },
    { path: '/customer/reviews', label: 'Reviews' },
    { path: '/customer/history', label: 'My History' },
    { path: '/customer/loyalty', label: 'My Loyalty' },
  ],
}

function Sidebar() {
  const role = localStorage.getItem('role')
  const navItems = navByRole[role] ?? []

  return (
    <aside className="sidebar">
      <h2>GearTrack</h2>
      <p className="sidebar-subtitle">Vehicle Parts System</p>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
