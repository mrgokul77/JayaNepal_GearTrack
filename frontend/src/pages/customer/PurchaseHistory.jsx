import { Fragment, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import './CustomerProfile.css'
import './PurchaseHistory.css'

/** Maps Axios / ASP.NET error payloads to a single user-facing string. */
function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data?.title && data?.detail) return `${data.title}: ${data.detail}`
  return fallback
}

function formatDateTime(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return String(value)
  }
}

const money = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

function formatMoney(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—'
  return money.format(Number(n))
}

/**
 * Customer purchase and service history: sales invoices with expandable line items, and appointments list.
 */
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
    <section className="customer-profile-page">
      <Link to="/customer" className="customer-profile-back">
        ← Customer portal
      </Link>
      <h1>My history</h1>
      <p className="customer-profile-lead">View your past part purchases and scheduled service appointments.</p>

      {error ? <div className="customer-profile-error">{error}</div> : null}

      <div className="purchase-history-tabs" role="tablist" aria-label="History type">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'purchases'}
          className={`purchase-history-tab${tab === 'purchases' ? ' active' : ''}`}
          onClick={() => setTab('purchases')}
        >
          Purchase history
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'services'}
          className={`purchase-history-tab${tab === 'services' ? ' active' : ''}`}
          onClick={() => setTab('services')}
        >
          Service history
        </button>
      </div>

      {tab === 'purchases' ? (
        <div className="customer-profile-card">
          <h2>Purchases</h2>
          {loadingPurchases ? (
            <p className="customer-profile-muted">Loading…</p>
          ) : purchases.length === 0 ? (
            <p className="purchase-history-empty">No history yet — your completed sales will appear here.</p>
          ) : (
            <div className="purchase-history-table-wrap">
              <table className="purchase-history-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col" className="purchase-history-num">
                      Total
                    </th>
                    <th scope="col" className="purchase-history-num">
                      Discount
                    </th>
                    <th scope="col" className="purchase-history-num">
                      Final amount
                    </th>
                    <th scope="col" aria-label="Expand" />
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((inv) => (
                    <Fragment key={inv.id}>
                      <tr
                        className={`purchase-history-row-expandable${expandedId === inv.id ? ' expanded' : ''}`}
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
                        aria-label={`Invoice ${inv.id}, ${formatDateTime(inv.saleDate)}`}
                      >
                        <td>{formatDateTime(inv.saleDate)}</td>
                        <td className="purchase-history-num">{formatMoney(inv.totalAmount)}</td>
                        <td className="purchase-history-num">{formatMoney(inv.discountApplied)}</td>
                        <td className="purchase-history-num">{formatMoney(inv.finalAmount)}</td>
                        <td>
                          <span className="purchase-history-expand-hint">{expandedId === inv.id ? 'Hide' : 'Items'}</span>
                        </td>
                      </tr>
                      {expandedId === inv.id ? (
                        <tr key={`${inv.id}-detail`} className="purchase-history-detail-row">
                          <td colSpan={5}>
                            <div className="purchase-history-detail-inner">
                              <h3>Line items</h3>
                              {inv.items?.length ? (
                                <table className="purchase-history-items-mini">
                                  <thead>
                                    <tr>
                                      <th scope="col">Part</th>
                                      <th scope="col" className="purchase-history-num">
                                        Qty
                                      </th>
                                      <th scope="col" className="purchase-history-num">
                                        Unit
                                      </th>
                                      <th scope="col" className="purchase-history-num">
                                        Subtotal
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {inv.items.map((line, idx) => (
                                      <tr key={`${inv.id}-line-${idx}`}>
                                        <td>{line.partName || '—'}</td>
                                        <td className="purchase-history-num">{line.quantity}</td>
                                        <td className="purchase-history-num">{formatMoney(line.unitPrice)}</td>
                                        <td className="purchase-history-num">{formatMoney(line.subTotal)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <p className="customer-profile-muted">No line items.</p>
                              )}
                            </div>
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
        <div className="customer-profile-card">
          <h2>Service appointments</h2>
          {loadingServices ? (
            <p className="customer-profile-muted">Loading…</p>
          ) : services.length === 0 ? (
            <p className="purchase-history-empty">No history yet — book an appointment to see it listed here.</p>
          ) : (
            <div className="purchase-history-table-wrap">
              <table className="purchase-history-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Service type</th>
                    <th scope="col">Status</th>
                    <th scope="col">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDateTime(row.appointmentDate)}</td>
                      <td>{row.serviceType || '—'}</td>
                      <td>{row.status || '—'}</td>
                      <td>{row.notes?.trim() ? row.notes : '—'}</td>
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
