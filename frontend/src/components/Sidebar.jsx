import { NavLink } from 'react-router-dom'

const navByRole = {
  Admin: [
    { path: '/admin', label: 'Admin' },
    { path: '/admin/register-staff', label: 'Register Staff' },
    { path: '/admin/vendors', label: 'Vendors' },
    { path: '/admin/purchase-invoices', label: 'Purchase Invoices' },
  ],
  Staff: [
    { path: '/staff', label: 'Staff' },
    { path: '/staff/search-customer', label: 'Search Customers' },
    { path: '/staff/customer-history', label: 'Customer History' },
    { path: '/staff/customer-reports', label: 'Customer Reports' },
    { path: '/staff/register-customer', label: 'Register Customer' },
  ],
  Customer: [
    { path: '/customer', label: 'Customer' },
    { path: '/customer/profile', label: 'My Profile' },
    { path: '/customer/appointments', label: 'Appointments' },
    { path: '/customer/part-requests', label: 'Part Requests' },
    { path: '/customer/reviews', label: 'Reviews' },
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
