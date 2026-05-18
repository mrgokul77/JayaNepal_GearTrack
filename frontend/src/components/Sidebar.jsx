import { NavLink } from 'react-router-dom'
import logo from '../assets/logo.png'
import LogoutButton from './LogoutButton'

/**
 * Role-scoped navigation items. The icons are lightweight unicode/emoji
 * glyphs so we don't pull a heavy icon font into the bundle.
 */
const navByRole = {
  Admin: [
    { path: '/admin', label: 'Dashboard', icon: '\u25A3' },
    { path: '/admin/register-staff', label: 'Staff', icon: '\u{1F465}' },
    { path: '/admin/appointments', label: 'Appointments', icon: '\u{1F4C5}' },
    { path: '/admin/part-requests', label: 'Part Requests', icon: '\u2709' },
    { path: '/admin/reviews', label: 'Reviews', icon: '\u2B50' },
    { path: '/admin/vendors', label: 'Vendors', icon: '\u{1F3E2}' },
    { path: '/admin/parts', label: 'Parts', icon: '\u2699' },
    { path: '/admin/purchase-invoices', label: 'Purchase Invoices', icon: '\u{1F4E6}' },
    { path: '/admin/financial-reports', label: 'Financial Reports', icon: '\u{1F4CA}' },
    { path: '/admin/notifications', label: 'Notifications', icon: '\u{1F514}' },
    { path: '/admin/loyalty', label: 'Loyalty Program', icon: '\u2605' },
  ],
  Staff: [
    { path: '/staff', label: 'Dashboard', icon: '\u25A3' },
    { path: '/staff/register-customer', label: 'Register Customer', icon: '\u2795' },
    { path: '/staff/sales-invoice', label: 'Sales Invoice', icon: '\u{1F4C4}' },
    { path: '/staff/customer-history', label: 'Customer History', icon: '\u{1F4DC}' },
    { path: '/staff/search-customer', label: 'Search Customers', icon: '\u{1F50D}' },
    { path: '/staff/customer-reports', label: 'Customer Reports', icon: '\u{1F4C8}' },
  ],
  Customer: [
    { path: '/customer', label: 'Home', icon: '\u2302' },
    { path: '/customer/profile', label: 'My Profile', icon: '\u{1F464}' },
    { path: '/customer/appointments', label: 'Appointments', icon: '\u{1F4C5}' },
    { path: '/customer/part-requests', label: 'Part Requests', icon: '\u2709' },
    { path: '/customer/reviews', label: 'Reviews', icon: '\u2B50' },
    { path: '/customer/history', label: 'My History', icon: '\u{1F4DC}' },
    { path: '/customer/loyalty', label: 'My Loyalty', icon: '\u{1F3C5}' },
  ],
}

const sectionTitleByRole = {
  Admin: 'Admin workspace',
  Staff: 'Staff workspace',
  Customer: 'Customer portal',
}

function Sidebar() {
  const role = localStorage.getItem('role')
  const navItems = navByRole[role] ?? []
  const sectionTitle = sectionTitleByRole[role] ?? 'Workspace'

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src={logo} alt="GearTrack" style={{ height: '40px', width: 'auto', filter: 'brightness(0) invert(1)' }} />
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">GearTrack</span>
          <span className="sidebar-brand-subtitle">Vehicle Parts System</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        <span className="sidebar-section-label">{sectionTitle}</span>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/admin' || item.path === '/staff' || item.path === '/customer'}
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            <span className="nav-link-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <LogoutButton />
      </div>
    </aside>
  )
}

export default Sidebar
