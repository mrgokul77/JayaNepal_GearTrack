import { Fragment, useCallback, useEffect, useState } from 'react'
import api from '../../services/api'

function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data?.title && data?.detail) return `${data.title}: ${data.detail}`
  return fallback
}

function formatDateTime(value) {
  if (!value) return '\u2014'
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return String(value)
  }
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

function statusBadgeClass(status) {
  const s = (status || '').toLowerCase()
  if (s === 'pending') return 'badge badge-warning'
  if (s === 'completed' || s === 'confirmed') return 'badge badge-success'
  if (s === 'cancelled' || s === 'canceled') return 'badge badge-danger'
  return 'badge badge-neutral'
}

function PurchaseHistory() {
  const [tab, setTab] = useState('purchases')
  const [purchases, setPurchases] = useState([])
  const [services, setServices] = useState([])
  const [error, setError] = useState('')
  const [loadingPurchases, setLoadingPurchases] = useState(true)
  const [loadingServices, setLoadingServices] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  const loadPurchases = useCallback(async () => {
    setError('')
    setLoadingPurchases(true)
    try {
      const { data } = await api.get('/purchase-history')
      setPurchases(Array.isArray(data) ? data : [])
    } catch (e) {
      setPurchases([])
      setError(getErrorMessage(e, 'Could not load purchase history.'))
    } finally {
      setLoadingPurchases(false)
    }
  }, [])

  const loadServices = useCallback(async () => {
    setError('')
    setLoadingServices(true)
    try {
      const { data } = await api.get('/purchase-history/services')
      setServices(Array.isArray(data) ? data : [])
    } catch (e) {
      setServices([])
      setError(getErrorMessage(e, 'Could not load service history.'))
    } finally {
      setLoadingServices(false)
    }
  }, [])

  useEffect(() => {
    void loadPurchases()
  }, [loadPurchases])

  useEffect(() => {
    void loadServices()
  }, [loadServices])

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">My history</h1>
          <p className="page-subtitle">Your past part purchases and scheduled service appointments.</p>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="tabs" role="tablist" aria-label="History type">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'purchases'}
          className={`tab${tab === 'purchases' ? ' active' : ''}`}
          onClick={() => setTab('purchases')}
        >
          Purchases
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'services'}
          className={`tab${tab === 'services' ? ' active' : ''}`}
          onClick={() => setTab('services')}
        >
          Service history
        </button>
      </div>

      {tab === 'purchases' ? (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Sales invoices</div>
            <span className="muted">{purchases.length} record(s)</span>
          </div>
          {loadingPurchases ? (
            <div className="loading-state">
              <span className="spinner" aria-hidden="true" /> Loading&hellip;
            </div>
          ) : purchases.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon" aria-hidden="true">{'\u{1F6CD}'}</div>
              <div className="empty-state-title">No purchases yet</div>
              <div className="empty-state-desc">Your completed sales will appear here.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th className="num">Total</th>
                    <th className="num">Discount</th>
                    <th className="num">Final amount</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((inv) => (
                    <Fragment key={inv.id}>
                      <tr
                        className="row-expandable"
                        onClick={() => toggleExpand(inv.id)}
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter' || ev.key === ' ') {
                            ev.preventDefault()
                            toggleExpand(inv.id)
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-expanded={expandedId === inv.id}
                      >
                        <td><strong>{formatDateTime(inv.saleDate)}</strong></td>
                        <td className="num">{formatMoney(inv.totalAmount)}</td>
                        <td className="num">
                          {Number(inv.discountApplied) > 0 ? (
                            <span className="badge badge-success">{formatMoney(inv.discountApplied)}</span>
                          ) : (
                            <span className="muted">{'\u2014'}</span>
                          )}
                        </td>
                        <td className="num"><strong>{formatMoney(inv.finalAmount)}</strong></td>
                        <td className="text-right muted">{expandedId === inv.id ? 'Hide' : 'View items'}</td>
                      </tr>
                      {expandedId === inv.id ? (
                        <tr key={`${inv.id}-detail`} className="row-detail">
                          <td colSpan={5}>
                            <h3 style={{ fontSize: '0.875rem', marginBottom: 'var(--space-2)' }}>Line items</h3>
                            {inv.items?.length ? (
                              <table className="line-table">
                                <thead>
                                  <tr>
                                    <th>Part</th>
                                    <th className="num">Qty</th>
                                    <th className="num">Unit</th>
                                    <th className="num">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {inv.items.map((line, idx) => (
                                    <tr key={`${inv.id}-line-${idx}`}>
                                      <td>{line.partName || '\u2014'}</td>
                                      <td className="num">{line.quantity}</td>
                                      <td className="num">{formatMoney(line.unitPrice)}</td>
                                      <td className="num"><strong>{formatMoney(line.subTotal)}</strong></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <p className="muted">No line items.</p>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Service appointments</div>
            <span className="muted">{services.length} record(s)</span>
          </div>
          {loadingServices ? (
            <div className="loading-state">
              <span className="spinner" aria-hidden="true" /> Loading&hellip;
            </div>
          ) : services.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon" aria-hidden="true">{'\u{1F527}'}</div>
              <div className="empty-state-title">No service history yet</div>
              <div className="empty-state-desc">Book an appointment to see it listed here.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Service type</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((row) => (
                    <tr key={row.id}>
                      <td><strong>{formatDateTime(row.appointmentDate)}</strong></td>
                      <td>{row.serviceType || '\u2014'}</td>
                      <td>
                        <span className={statusBadgeClass(row.status)}>{row.status || 'Unknown'}</span>
                      </td>
                      <td className="muted">{row.notes?.trim() ? row.notes : '\u2014'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default PurchaseHistory
