import { Outlet } from 'react-router-dom'
import LogoutButton from '../components/LogoutButton'
import Sidebar from '../components/Sidebar'

function DashboardLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <header className="dashboard-topbar">
          <LogoutButton />
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
