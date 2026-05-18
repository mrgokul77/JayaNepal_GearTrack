import { useCallback, useEffect, useState } from 'react'
import api from '../../services/api'

function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data?.title && data?.detail) return `${data.title}: ${data.detail}`
  return fallback
}

const money = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

function formatMoney(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '\u2014'
  return money.format(Number(n))
}

function formatDateTime(value) {
  if (!value) return '\u2014'
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return String(value)
  }
}

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
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">Loyalty program</h1>
          <p className="page-subtitle">
            GearTrack awards <strong>10% off</strong> when a single purchase exceeds <strong>$5,000</strong> (before the
            loyalty discount is applied).
          </p>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      {loading ? (
        <div className="loading-state">
          <span className="spinner" aria-hidden="true" /> Loading loyalty statistics&hellip;
        </div>
      ) : stats ? (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-icon stat-icon-primary" aria-hidden="true">{'\u{1F465}'}</div>
              <div className="stat-body">
                <div className="stat-label">Customers with a discount</div>
                <div className="stat-value">{stats.totalCustomers ?? 0}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-success" aria-hidden="true">{'\u{1F4B0}'}</div>
              <div className="stat-body">
                <div className="stat-label">Total discount given</div>
                <div className="stat-value">{formatMoney(stats.totalDiscountGiven)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-warning" aria-hidden="true">{'\u{1F3F7}'}</div>
              <div className="stat-body">
                <div className="stat-label">Discounted invoices</div>
                <div className="stat-value">{stats.discountedInvoices?.length ?? 0}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Top customers by discount received</div>
            </div>
            {!stats.topCustomers?.length ? (
              <div className="empty-state">
                <div className="empty-state-icon" aria-hidden="true">{'\u{1F3C5}'}</div>
                <div className="empty-state-title">No loyalty discounts recorded yet</div>
                <div className="empty-state-desc">Discounts are applied automatically when a sale exceeds $5,000.</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th className="num">Discounted orders</th>
                      <th className="num">Total discount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topCustomers.map((row, idx) => (
                      <tr key={row.customerId}>
                        <td><strong>{row.customerName || '\u2014'}</strong></td>
                        <td className="num">{row.discountedInvoiceCount}</td>
                        <td className="num">{formatMoney(row.totalDiscountReceived)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">All discounted invoices</div>
            </div>
            {!stats.discountedInvoices?.length ? (
              <p className="muted">No invoices with loyalty discount yet.</p>
            ) : (
              <div className="table-wrap">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Date</th>
                      <th className="num">Subtotal</th>
                      <th className="num">Loyalty discount</th>
                      <th className="num">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.discountedInvoices.map((inv) => (
                      <tr key={inv.invoiceId}>
                        <td>{inv.customerName || '\u2014'}</td>
                        <td className="muted">{formatDateTime(inv.saleDate)}</td>
                        <td className="num">{formatMoney(inv.grossBeforeDiscount)}</td>
                        <td className="num text-success">{formatMoney(inv.discountApplied)}</td>
                        <td className="num"><strong>{formatMoney(inv.netPaid)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="muted">No data.</p>
      )}
    </section>
  )
}

export default LoyaltyStats
