import { Fragment, useCallback, useState } from 'react'
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

function formatMoney(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return money.format(0)
  return money.format(n)
}

function formatDateTime(value) {
  if (!value) return '\u2014'
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return String(value)
  }
}

function statusBadgeClass(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'pending') return 'badge badge-warning'
  if (s === 'confirmed' || s === 'completed' || s === 'fulfilled') return 'badge badge-success'
  if (s === 'cancelled' || s === 'canceled' || s === 'rejected') return 'badge badge-danger'
  return 'badge badge-neutral'
}

function initials(name) {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?'
}

function CustomerHistory() {
  const [customerIdInput, setCustomerIdInput] = useState('')
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [expandedInvoiceId, setExpandedInvoiceId] = useState(null)

  const loadProfile = useCallback(async () => {
    const raw = customerIdInput.trim()
    const id = Number.parseInt(raw, 10)
    setError('')
    setExpandedInvoiceId(null)

    if (!raw || Number.isNaN(id) || id < 1) {
      setDetail(null)
      setError('Enter a valid numeric customer ID.')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.get(`/customer-history/${id}`)
      setDetail(data)
    } catch (requestError) {
      setDetail(null)
      if (requestError.response?.status === 404) {
        setError('No customer found with that ID.')
      } else {
        setError(getErrorMessage(requestError, 'Could not load customer history.'))
      }
    } finally {
      setLoading(false)
    }
  }, [customerIdInput])

  const handleSubmit = (event) => {
    event.preventDefault()
    void loadProfile()
  }

  const toggleInvoice = (invoiceId) => {
    setExpandedInvoiceId((current) => (current === invoiceId ? null : invoiceId))
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer history</h1>
          <p className="page-subtitle">
            Enter a customer ID to view their profile, registered vehicles, and past sales.
          </p>
        </div>
      </div>

      <form className="search-toolbar" onSubmit={handleSubmit} noValidate>
        <span style={{ paddingLeft: 8, color: 'var(--color-text-soft)' }} aria-hidden="true">{'\u{1F50D}'}</span>
        <input
          id="customer-id"
          name="customerId"
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          autoComplete="off"
          className="form-input"
          placeholder="Customer ID (e.g. 1)"
          value={customerIdInput}
          onChange={(e) => setCustomerIdInput(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner" aria-hidden="true" /> Loading&hellip;
            </>
          ) : (
            'Load'
          )}
        </button>
      </form>

      {error ? <div className="alert alert-error">{error}</div> : null}

      {detail ? (
        <>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Profile</div>
            </div>
            <div className="flex gap-3" style={{ alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <div className="avatar avatar-lg" aria-hidden="true">{initials(detail.fullName)}</div>
              <div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{detail.fullName}</div>
                <div className="muted">{detail.email}</div>
                <div className="muted" style={{ fontSize: '0.8125rem' }}>Customer #{detail.id}</div>
              </div>
            </div>
            <dl className="dl-grid">
              <dt>Phone</dt>
              <dd>{detail.phone || '\u2014'}</dd>
              <dt>Address</dt>
              <dd>{detail.address || '\u2014'}</dd>
              <dt>Member since</dt>
              <dd>{formatDateTime(detail.createdAt)}</dd>
            </dl>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Vehicles</div>
            </div>
            {detail.vehicles?.length ? (
              <div className="table-wrap">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Number</th>
                      <th>Brand</th>
                      <th>Model</th>
                      <th>Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.vehicles.map((v) => (
                      <tr key={v.id}>
                        <td><strong>{v.vehicleNumber}</strong></td>
                        <td>{v.brand}</td>
                        <td>{v.model}</td>
                        <td>{v.year}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">No vehicles on file.</p>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Purchase history</div>
                <div className="card-subtitle">Click a row to expand line items.</div>
              </div>
            </div>
            {detail.purchaseHistory?.length ? (
              <div className="table-wrap">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th className="num">Total</th>
                      <th className="num">Discount</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {detail.purchaseHistory.map((inv) => (
                      <Fragment key={inv.id}>
                        <tr
                          className="row-expandable"
                          onClick={() => toggleInvoice(inv.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              toggleInvoice(inv.id)
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-expanded={expandedInvoiceId === inv.id}
                        >
                          <td className="muted">{formatDateTime(inv.saleDate)}</td>
                          <td className="num">{formatMoney(inv.totalAmount)}</td>
                          <td className="num">
                            {Number(inv.discountApplied) > 0 ? (
                              <span className="badge badge-success">{formatMoney(inv.discountApplied)}</span>
                            ) : (
                              <span className="muted">{'\u2014'}</span>
                            )}
                          </td>
                          <td className="text-right muted">{expandedInvoiceId === inv.id ? 'Hide' : 'View items'}</td>
                        </tr>
                        {expandedInvoiceId === inv.id ? (
                          <tr className="row-detail">
                            <td colSpan={4}>
                              <div>
                                <h3 style={{ fontSize: '0.875rem', marginBottom: 'var(--space-2)' }}>Line items</h3>
                                {inv.items?.length ? (
                                  <table className="line-table">
                                    <thead>
                                      <tr>
                                        <th>Part</th>
                                        <th className="num">Qty</th>
                                        <th className="num">Unit price</th>
                                        <th className="num">Subtotal</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {inv.items.map((line, idx) => (
                                        <tr key={`${inv.id}-line-${idx}`}>
                                          <td>{line.partName}</td>
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
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">No sales on record for this customer.</p>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Service appointments</div>
            </div>
            {detail.appointments?.length ? (
              <div className="table-wrap">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Service type</th>
                      <th>Status</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.appointments.map((row) => (
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
            ) : (
              <p className="muted">No service appointments on record.</p>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Part requests</div>
            </div>
            {detail.partRequests?.length ? (
              <div className="table-wrap">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Part</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.partRequests.map((row) => (
                      <tr key={row.id}>
                        <td><strong>{row.partName}</strong></td>
                        <td className="muted">{row.description || '\u2014'}</td>
                        <td>
                          <span className={statusBadgeClass(row.status)}>{row.status || 'Unknown'}</span>
                        </td>
                        <td className="muted">{formatDateTime(row.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">No part requests on record.</p>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Service reviews</div>
            </div>
            {detail.serviceReviews?.length ? (
              <ul className="notification-list">
                {detail.serviceReviews.map((row) => {
                  const rating = Math.min(5, Math.max(0, Number(row.rating) || 0))
                  return (
                    <li key={row.id} className="notification-item">
                      <div className="notification-header">
                        <span className="star-display" aria-label={`${rating} of 5 stars`}>
                          {'\u2605'.repeat(rating)}
                          <span style={{ color: '#d1d5db' }}>{'\u2605'.repeat(5 - rating)}</span>
                        </span>
                        <span className="notification-meta">{formatDateTime(row.createdAt)}</span>
                      </div>
                      {row.comment ? <p className="notification-message">{row.comment}</p> : null}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="muted">No service reviews on record.</p>
            )}
          </div>
        </>
      ) : null}
    </section>
  )
}

export default CustomerHistory
