import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import './LoyaltyStats.css'

function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data?.title && data?.detail) return `${data.title}: ${data.detail}`
  return fallback
}

const money = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

function formatMoney(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—'
  return money.format(Number(n))
}

function formatDateTime(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return String(value)
  }
}

/**
 * Admin view: loyalty program KPIs, top customers by discount, and all discounted invoices.
 */
function LoyaltyStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await api.get('/loyalty/stats')
      setStats(data && typeof data === 'object' ? data : null)
    } catch (e) {
      setStats(null)
      setError(getErrorMessage(e, 'Could not load loyalty statistics.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section className="loyalty-stats-page">
      <Link to="/admin" className="loyalty-stats-back">
        ← Admin dashboard
      </Link>
      <h1>Loyalty program</h1>
      <p className="loyalty-stats-lead">
        GearTrack loyalty awards <strong>10% off</strong> the pre-discount subtotal when a single purchase{' '}
        <strong>exceeds $5,000</strong> (before the loyalty discount is applied). Below is program usage across all
        customers.
      </p>

      {error ? <div className="loyalty-stats-banner loyalty-stats-banner-error">{error}</div> : null}

      {loading ? (
        <p className="loyalty-stats-muted">Loading…</p>
      ) : stats ? (
        <>
          <div className="loyalty-stats-kpis">
            <div className="loyalty-stats-kpi">
              <p className="loyalty-stats-kpi-label">Customers with a loyalty discount</p>
              <p className="loyalty-stats-kpi-value">{stats.totalCustomers ?? 0}</p>
            </div>
            <div className="loyalty-stats-kpi">
              <p className="loyalty-stats-kpi-label">Total discount given</p>
              <p className="loyalty-stats-kpi-value">{formatMoney(stats.totalDiscountGiven)}</p>
            </div>
            <div className="loyalty-stats-kpi">
              <p className="loyalty-stats-kpi-label">Discounted invoices</p>
              <p className="loyalty-stats-kpi-value">{stats.discountedInvoices?.length ?? 0}</p>
            </div>
          </div>

          <div className="loyalty-stats-card">
            <h2>Top customers by discount received</h2>
            {!stats.topCustomers?.length ? (
              <p className="loyalty-stats-muted">No loyalty discounts recorded yet.</p>
            ) : (
              <div className="loyalty-stats-table-wrap">
                <table className="loyalty-stats-table">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Customer</th>
                      <th scope="col" className="loyalty-stats-num">
                        Discounted orders
                      </th>
                      <th scope="col" className="loyalty-stats-num">
                        Total discount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topCustomers.map((row, idx) => (
                      <tr key={row.customerId}>
                        <td>{idx + 1}</td>
                        <td>{row.customerName || '—'}</td>
                        <td className="loyalty-stats-num">{row.discountedInvoiceCount}</td>
                        <td className="loyalty-stats-num">{formatMoney(row.totalDiscountReceived)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="loyalty-stats-card">
            <h2>All discounted invoices</h2>
            {!stats.discountedInvoices?.length ? (
              <p className="loyalty-stats-muted">No invoices with loyalty discount yet.</p>
            ) : (
              <div className="loyalty-stats-table-wrap">
                <table className="loyalty-stats-table">
                  <thead>
                    <tr>
                      <th scope="col">Invoice</th>
                      <th scope="col">Customer</th>
                      <th scope="col">Date</th>
                      <th scope="col" className="loyalty-stats-num">
                        Subtotal
                      </th>
                      <th scope="col" className="loyalty-stats-num">
                        Loyalty discount
                      </th>
                      <th scope="col" className="loyalty-stats-num">
                        Net
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.discountedInvoices.map((inv) => (
                      <tr key={inv.invoiceId}>
                        <td>#{inv.invoiceId}</td>
                        <td>{inv.customerName || '—'}</td>
                        <td>{formatDateTime(inv.saleDate)}</td>
                        <td className="loyalty-stats-num">{formatMoney(inv.grossBeforeDiscount)}</td>
                        <td className="loyalty-stats-num">{formatMoney(inv.discountApplied)}</td>
                        <td className="loyalty-stats-num">{formatMoney(inv.netPaid)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="loyalty-stats-muted">No data.</p>
      )}
    </section>
  )
}

export default LoyaltyStats
