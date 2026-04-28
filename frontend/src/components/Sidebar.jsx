import { NavLink } from 'react-router-dom'

const navItems = [
  { path: '/admin', label: 'Admin' },
  { path: '/staff', label: 'Staff' },
  { path: '/customer', label: 'Customer' },
]

function Sidebar() {
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
