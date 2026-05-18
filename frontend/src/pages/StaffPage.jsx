import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

const FEATURES = [
  {
    to: '/staff/register-customer',
    icon: '\u{1F464}',
    title: 'Register customer',
    desc: 'Create a new customer account and add their vehicle.',
  },
  {
    to: '/staff/sales-invoice',
    icon: '\u{1F4C4}',
    title: 'Sales invoice',
    desc: 'Sell parts and apply loyalty discount automatically.',
  },
  {
    to: '/staff/search-customer',
    icon: '\u{1F50D}',
    title: 'Search customers',
    desc: 'Look up by name, phone, ID, email or vehicle.',
  },
  {
    to: '/staff/customer-history',
    icon: '\u{1F4DC}',
    title: 'Customer history',
    desc: 'View a customer\u2019s vehicles and sales history.',
  },
  {
    to: '/staff/customer-reports',
    icon: '\u{1F4C8}',
    title: 'Customer reports',
    desc: 'Regular buyers, high spenders, pending credits.',
  },
]

function isSameLocalDay(iso) {
  if (!iso) return false
  const d = new Date(iso)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

function StaffPage() {
  const fullName = localStorage.getItem('fullName')?.trim() || 'Staff'
  const [stats, setStats] = useState({ customers: null, invoicesToday: null, totalInvoices: null })

  useEffect(() => {
    let cancelled = false
    async function load() {
      const safe = async (p) => {
        try {
          const { data } = await p
          return Array.isArray(data) ? data : []
        } catch {
          return null
        }
      }
      const [customers, invoices] = await Promise.all([
        safe(api.get('/customers')),
        safe(api.get('/sales-invoices')),
      ])
      if (cancelled) return
      const invoicesArr = Array.isArray(invoices) ? invoices : []
      setStats({
        customers: customers === null ? null : customers.length,
        totalInvoices: invoices === null ? null : invoicesArr.length,
        invoicesToday: invoices === null ? null : invoicesArr.filter((i) => isSameLocalDay(i.saleDate)).length,
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
          <div className="welcome-title">Hi {fullName}, ready to sell?</div>
          <p className="welcome-subtitle">
            Search customers, process sales, and view purchase history. Loyalty discounts are applied automatically.
          </p>
        </div>
        <div className="welcome-meta">
          <span className="welcome-pill">Staff</span>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-primary" aria-hidden="true">{'\u{1F465}'}</div>
          <div className="stat-body">
            <div className="stat-label">Total customers</div>
            <div className="stat-value">{fmt(stats.customers)}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-success" aria-hidden="true">{'\u{1F4C5}'}</div>
          <div className="stat-body">
            <div className="stat-label">Invoices today</div>
            <div className="stat-value">{fmt(stats.invoicesToday)}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-info" aria-hidden="true">{'\u{1F4DC}'}</div>
          <div className="stat-body">
            <div className="stat-label">All time invoices</div>
            <div className="stat-value">{fmt(stats.totalInvoices)}</div>
          </div>
        </div>
      </div>

      <div className="page-header">
        <div>
          <h2 className="page-title">Quick actions</h2>
          <p className="page-subtitle">The most common staff tasks, one click away.</p>
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

export default StaffPage
