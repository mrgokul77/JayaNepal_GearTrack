import { Fragment, useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import './CustomerHistory.css'

function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data?.title && data?.detail) return `${data.title}: ${data.detail}`
  return fallback
}

function formatMoney(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return '0.00'
  return n.toFixed(2)
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
    <section className="customer-history-page">
      <Link to="/staff" className="customer-history-back">
        ← Staff workspace
      </Link>
      <h1>Customer history</h1>
      <p className="customer-history-lead">
        Enter a customer ID to view their profile, registered vehicles, and past sales (purchase history).
      </p>

      <form className="customer-history-toolbar" onSubmit={handleSubmit} noValidate>
        <label htmlFor="customer-id">
          Customer ID
          <input
            id="customer-id"
            name="customerId"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            autoComplete="off"
            placeholder="e.g. 1"
            value={customerIdInput}
            onChange={(e) => setCustomerIdInput(e.target.value)}
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Loading…' : 'Load'}
        </button>
      </form>

      {error ? <div className="customer-history-error">{error}</div> : null}

      {detail ? (
        <>
          <article className="customer-history-card">
            <h2>Customer profile</h2>
            <dl className="customer-history-grid">
              <dt>ID</dt>
              <dd>{detail.id}</dd>
              <dt>Full name</dt>
              <dd>{detail.fullName}</dd>
              <dt>Email</dt>
              <dd>{detail.email}</dd>
              <dt>Phone</dt>
              <dd>{detail.phone || '—'}</dd>
              <dt>Address</dt>
              <dd>{detail.address || '—'}</dd>
              <dt>Member since</dt>
              <dd>{detail.createdAt ? new Date(detail.createdAt).toLocaleString() : '—'}</dd>
            </dl>
          </article>

          <div className="customer-history-section">
            <h2>Vehicles</h2>
            {detail.vehicles?.length ? (
              <div className="customer-history-table-wrap">
                <table className="customer-history-table">
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
                        <td>{v.vehicleNumber}</td>
                        <td>{v.brand}</td>
                        <td>{v.model}</td>
                        <td>{v.year}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="customer-history-empty">No vehicles on file.</p>
            )}
          </div>

          <div className="customer-history-section">
            <h2>Purchase history</h2>
            <p className="customer-history-lead" style={{ marginTop: '-0.35rem', marginBottom: '0.75rem' }}>
              Click a row to show or hide line items for that invoice.
            </p>
            {detail.purchaseHistory?.length ? (
              <div className="customer-history-table-wrap">
                <table className="customer-history-table">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Date</th>
                      <th className="customer-history-num">Total</th>
                      <th className="customer-history-num">Discount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.purchaseHistory.map((inv) => (
                      <Fragment key={inv.id}>
                        <tr
                          className={`customer-history-invoice-row${expandedInvoiceId === inv.id ? ' is-expanded' : ''}`}
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
                          <td>#{inv.id}</td>
                          <td>{inv.saleDate ? new Date(inv.saleDate).toLocaleString() : '—'}</td>
                          <td className="customer-history-num">{formatMoney(inv.totalAmount)}</td>
                          <td className="customer-history-num">{formatMoney(inv.discountApplied)}</td>
                        </tr>
                        {expandedInvoiceId === inv.id ? (
                          <tr className="customer-history-items-row">
                            <td colSpan={4}>
                              <div className="customer-history-items-inner">
                                <h3>Line items</h3>
                                {inv.items?.length ? (
                                  <table className="customer-history-items-table">
                                    <thead>
                                      <tr>
                                        <th>Part</th>
                                        <th className="customer-history-num">Qty</th>
                                        <th className="customer-history-num">Unit price</th>
                                        <th className="customer-history-num">Subtotal</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {inv.items.map((line, idx) => (
                                        <tr key={`${inv.id}-line-${idx}`}>
                                          <td>{line.partName}</td>
                                          <td className="customer-history-num">{line.quantity}</td>
                                          <td className="customer-history-num">{formatMoney(line.unitPrice)}</td>
                                          <td className="customer-history-num">{formatMoney(line.subTotal)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <p className="customer-history-empty" style={{ padding: 0 }}>
                                    No line items.
                                  </p>
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
              <p className="customer-history-empty">No sales on record for this customer.</p>
            )}
          </div>
        </>
      ) : null}
    </section>
  )
}

export default CustomerHistory
