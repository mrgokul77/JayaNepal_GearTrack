import { NavLink } from 'react-router-dom'

const navByRole = {
  Admin: [{ path: '/admin', label: 'Admin' }],
  Staff: [{ path: '/staff', label: 'Staff' }],
  Customer: [{ path: '/customer', label: 'Customer' }],
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
