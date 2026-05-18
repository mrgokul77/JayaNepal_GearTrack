import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

const FEATURES = [
  {
    to: '/admin/register-staff',
    icon: '\u{1F465}',
    title: 'Staff management',
    desc: 'Create, edit, and remove Staff and Admin accounts.',
  },
  {
    to: '/admin/appointments',
    icon: '\u{1F4C5}',
    title: 'Appointments',
    desc: 'View all customer service appointments.',
  },
  {
    to: '/admin/part-requests',
    icon: '\u2709',
    title: 'Part requests',
    desc: 'Track all unavailable-part requests from customers.',
  },
  {
    to: '/admin/reviews',
    icon: '\u2B50',
    title: 'Service reviews',
    desc: 'Monitor customer feedback and ratings.',
  },
  {
    to: '/admin/vendors',
    icon: '\u{1F3E2}',
    title: 'Vendors',
    desc: 'Manage suppliers and their contact details.',
  },
  {
    to: '/admin/parts',
    icon: '\u2699',
    title: 'Vehicle parts',
    desc: 'Catalog used for sales and purchase invoices.',
  },
  {
    to: '/admin/purchase-invoices',
    icon: '\u{1F4E6}',
    title: 'Purchase invoices',
    desc: 'Record stock received and update inventory.',
  },
  {
    to: '/admin/financial-reports',
    icon: '\u{1F4CA}',
    title: 'Financial reports',
    desc: 'Daily, monthly, and yearly sales vs purchases.',
  },
  {
    to: '/admin/notifications',
    icon: '\u{1F514}',
    title: 'Notifications',
    desc: 'Low-stock alerts and credit reminders.',
  },
  {
    to: '/admin/loyalty',
    icon: '\u{1F3C5}',
    title: 'Loyalty program',
    desc: '10% off when a sale crosses the $5K threshold.',
  },
]

function AdminPage() {
  const fullName = localStorage.getItem('fullName')?.trim() || 'Administrator'
  const [stats, setStats] = useState({
    vendors: null,
    parts: null,
    staff: null,
    unread: 0,
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      const settle = async (promise) => {
        try {
          const { data } = await promise
          return Array.isArray(data) ? data : []
        } catch {
          return null
        }
      }
      const [vendors, parts, staff, notifications] = await Promise.all([
        settle(api.get('/vendors')),
        settle(api.get('/vehicle-parts')),
        settle(api.get('/admin/staff')),
        settle(api.get('/notifications')),
      ])
      if (cancelled) return
      setStats({
        vendors: vendors === null ? null : vendors.length,
        parts: parts === null ? null : parts.length,
        staff: staff === null ? null : staff.length,
        unread: Array.isArray(notifications) ? notifications.filter((n) => !n.isRead).length : 0,
      })
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const fmt = (n) => (n === null ? '—' : String(n))

  return (
    <section>
      <div className="welcome-card">
        <div>
          <div className="welcome-title">Welcome back, {fullName}.</div>
          <p className="welcome-subtitle">
            You have full access to inventory, vendors, financial reports and customer loyalty insights.
          </p>
        </div>
        <div className="welcome-meta">
          <span className="welcome-pill">Administrator</span>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-primary" aria-hidden="true">{'\u{1F3E2}'}</div>
          <div className="stat-body">
            <div className="stat-label">Vendors</div>
            <div className="stat-value">{fmt(stats.vendors)}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-success" aria-hidden="true">{'\u2699'}</div>
          <div className="stat-body">
            <div className="stat-label">Parts in catalog</div>
            <div className="stat-value">{fmt(stats.parts)}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-info" aria-hidden="true">{'\u{1F465}'}</div>
          <div className="stat-body">
            <div className="stat-label">Staff accounts</div>
            <div className="stat-value">{fmt(stats.staff)}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-warning" aria-hidden="true">{'\u{1F514}'}</div>
          <div className="stat-body">
            <div className="stat-label">Unread notifications</div>
            <div className="stat-value">{stats.unread}</div>
          </div>
        </div>
      </div>

      <div className="page-header">
        <div>
          <h2 className="page-title">Quick actions</h2>
          <p className="page-subtitle">Jump straight to common admin tasks.</p>
        </div>
      </div>

      <div className="feature-grid">
        {FEATURES.map((f) => (
          <Link key={f.to} to={f.to} className="feature-card">
            <div className="feature-icon" aria-hidden="true">
              {f.icon}
            </div>
            <div className="feature-title">{f.title}</div>
            <div className="feature-desc">{f.desc}</div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default AdminPage
