import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

const money = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

function formatMoney(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '\u2014'
  return money.format(Number(n))
}

const FEATURES = [
  {
    to: '/customer/profile',
    icon: '\u{1F464}',
    title: 'My profile',
    desc: 'Update your contact info and manage vehicles.',
  },
  {
    to: '/customer/appointments',
    icon: '\u{1F4C5}',
    title: 'Appointments',
    desc: 'Book a service visit or cancel a pending booking.',
  },
  {
    to: '/customer/part-requests',
    icon: '\u2709',
    title: 'Part requests',
    desc: 'Ask for parts that are out of stock.',
  },
  {
    to: '/customer/reviews',
    icon: '\u2B50',
    title: 'Service reviews',
    desc: 'Rate your experience and leave feedback.',
  },
  {
    to: '/customer/history',
    icon: '\u{1F4DC}',
    title: 'My history',
    desc: 'See your past purchases and service appointments.',
  },
  {
    to: '/customer/loyalty',
    icon: '\u{1F3C5}',
    title: 'My loyalty',
    desc: 'Track 10% loyalty progress and lifetime savings.',
  },
]

function CustomerPage() {
  const fullName = localStorage.getItem('fullName')?.trim() || 'Customer'
  const [loyalty, setLoyalty] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data } = await api.get('/loyalty/my-benefits')
        if (!cancelled) setLoyalty(data && typeof data === 'object' ? data : null)
      } catch {
        if (!cancelled) setLoyalty(null)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section>
      <div className="welcome-card">
        <div>
          <div className="welcome-title">Welcome back, {fullName}.</div>
          <p className="welcome-subtitle">
            Manage your profile, book service appointments, and track loyalty savings on parts purchases.
          </p>
        </div>
        <div className="welcome-meta">
          <span className="welcome-pill">Customer</span>
          {loyalty?.qualifiesForNextDiscount ? (
            <span className="welcome-pill" style={{ background: 'rgba(5, 122, 85, 0.4)' }}>
              {'\u2728'} Loyalty active
            </span>
          ) : null}
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-primary" aria-hidden="true">{'\u{1F6CD}'}</div>
          <div className="stat-body">
            <div className="stat-label">Purchases</div>
            <div className="stat-value">{loyalty?.totalPurchases ?? '\u2014'}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-success" aria-hidden="true">{'\u{1F4B0}'}</div>
          <div className="stat-body">
            <div className="stat-label">Total spent</div>
            <div className="stat-value">{formatMoney(loyalty?.totalSpent)}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-warning" aria-hidden="true">{'\u{1F3C5}'}</div>
          <div className="stat-body">
            <div className="stat-label">Loyalty savings</div>
            <div className="stat-value">{formatMoney(loyalty?.totalDiscountReceived)}</div>
          </div>
        </div>
      </div>

      <div className="page-header">
        <div>
          <h2 className="page-title">What would you like to do?</h2>
          <p className="page-subtitle">All the customer features in one place.</p>
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

export default CustomerPage
