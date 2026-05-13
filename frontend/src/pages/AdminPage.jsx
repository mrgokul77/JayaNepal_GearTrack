import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

function AdminPage() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await api.get('/notifications')
        if (cancelled || !Array.isArray(data)) return
        setUnreadCount(data.filter((n) => !n.isRead).length)
      } catch {
        if (!cancelled) setUnreadCount(0)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section>
      <h1>Admin Dashboard</h1>
      <p>Manage users, parts catalog, and full inventory insights.</p>
      <p>
        <Link to="/admin/register-staff">Register staff</Link>
        {' · '}
        <Link to="/admin/vendors">Manage vendors</Link>
        {' · '}
        <Link to="/admin/parts">Vehicle parts</Link>
        {' · '}
        <Link to="/admin/purchase-invoices">Purchase invoices</Link>
        {' · '}
        <Link to="/admin/notifications">
          Notifications
          {unreadCount > 0 ? <span className="admin-inline-badge">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
        </Link>
        {' · '}
        <Link to="/admin/loyalty">Loyalty program</Link>
        {' · '}
        <Link to="/admin/financial-reports">Financial reports</Link>
      </p>
    </section>
  )
}

export default AdminPage
