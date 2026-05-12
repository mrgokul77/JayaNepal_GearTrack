import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import './SalesInvoice.css'

/** Extract a readable error string from Axios errors. */
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

function newLine() {
  return {
    key: globalThis.crypto?.randomUUID?.() ?? String(Date.now() + Math.random()),
    partId: '',
    quantity: 1,
    unitPrice: '',
  }
}

const LOYALTY_THRESHOLD = 5000
const LOYALTY_RATE = 0.1

function SalesInvoice() {
  const [customers, setCustomers] = useState([])
  const [parts, setParts] = useState([])
  const [invoices, setInvoices] = useState([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [lines, setLines] = useState([newLine()])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [sendingEmailInvoiceId, setSendingEmailInvoiceId] = useState(null)
  const [emailFeedback, setEmailFeedback] = useState(null)

  const loadLists = useCallback(async () => {
    setListLoading(true)
    setError('')
    try {
      const [cRes, pRes, iRes] = await Promise.all([
        api.get('/customers'),
        api.get('/VehicleParts'),
        api.get('/sales-invoices'),
      ])
      setCustomers(cRes.data ?? [])
      setParts(pRes.data ?? [])
      setInvoices(iRes.data ?? [])
    } catch (e) {
      setError(getErrorMessage(e, 'Could not load customers, parts, or sales invoices.'))
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLists()
  }, [loadLists])

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase()
    if (!q) return customers
    return customers.filter(
      (c) =>
        (c.fullName && c.fullName.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && String(c.phone).includes(q)),
    )
  }, [customers, customerSearch])

  const runningSubtotal = useMemo(() => {
    return lines.reduce((sum, line) => {
      const qty = Number(line.quantity) || 0
      const price = Number(line.unitPrice) || 0
      return sum + qty * price
    }, 0)
  }, [lines])

  const loyaltyDiscountPreview =
    runningSubtotal > LOYALTY_THRESHOLD ? runningSubtotal * LOYALTY_RATE : 0
  const amountDuePreview = runningSubtotal - loyaltyDiscountPreview

  const addLine = () => {
    setLines((prev) => [...prev, newLine()])
  }

  const removeLine = (key) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)))
  }

  const updateLine = (key, field, value) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) return line
        const next = { ...line, [field]: value }
        if (field === 'partId') {
          const part = parts.find((p) => String(p.id) === String(value))
          if (part) {
            next.unitPrice = String(part.price)
          } else {
            next.unitPrice = ''
          }
        }
        return next
      }),
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    const cid = Number(selectedCustomerId)
    if (!selectedCustomerId || Number.isNaN(cid)) {
      setError('Please select a customer.')
      return
    }

    const items = lines
      .map((line) => ({
        partId: Number(line.partId),
        quantity: Number(line.quantity),
      }))
      .filter((row) => !Number.isNaN(row.partId) && row.partId > 0 && row.quantity > 0)

    if (items.length === 0) {
      setError('Add at least one part line with a valid part and quantity.')
      return
    }

    const seen = new Set()
    for (const row of items) {
      if (seen.has(row.partId)) {
        setError('Each part can only appear once per invoice. Combine quantities on a single line.')
        return
      }
      seen.add(row.partId)
    }

    setLoading(true)
    try {
      await api.post('/sales-invoices', { customerId: cid, items })
      setSuccess('Sales invoice created successfully.')
      setLines([newLine()])
      setSelectedCustomerId('')
      setCustomerSearch('')
      await loadLists()
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not create sales invoice.'))
    } finally {
      setLoading(false)
    }
  }

  const handleSendInvoiceEmail = async (invoiceId) => {
    setEmailFeedback(null)
    setSendingEmailInvoiceId(invoiceId)
    try {
      const { data } = await api.post(`/sales-invoices/${invoiceId}/send-email`)
      const msg = typeof data?.message === 'string' ? data.message : 'Invoice email was sent to the customer.'
      setEmailFeedback({ type: 'success', text: msg })
    } catch (requestError) {
      setEmailFeedback({
        type: 'error',
        text: getErrorMessage(requestError, 'Could not send invoice email.'),
      })
    } finally {
      setSendingEmailInvoiceId(null)
    }
  }

  return (
    <div className="sales-invoice-page">
      <Link className="sales-back-link" to="/staff">
        ← Staff workspace
      </Link>
      <h1>Create sales invoice</h1>
      <p className="sales-invoice-lead">
        Select a customer, add vehicle parts and quantities. Unit prices come from inventory. A 10% loyalty
        discount applies when the subtotal exceeds {LOYALTY_THRESHOLD.toLocaleString()}.
      </p>

      {error ? <p className="sales-msg-error">{error}</p> : null}
      {success ? <p className="sales-msg-success">{success}</p> : null}

      <section className="sales-invoice-panel">
        <h2>New invoice</h2>
        <form onSubmit={handleSubmit}>
          <div className="sales-form-grid two">
            <div>
              <label htmlFor="customerSearch">Search customer</label>
              <input
                id="customerSearch"
                type="search"
                placeholder="Name, email, or phone"
                value={customerSearch}
                onChange={(ev) => setCustomerSearch(ev.target.value)}
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="customerSelect">Customer</label>
              <select
                id="customerSelect"
                value={selectedCustomerId}
                onChange={(ev) => setSelectedCustomerId(ev.target.value)}
                required
              >
                <option value="">Select customer…</option>
                {filteredCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} — {c.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <h3 style={{ margin: '1.25rem 0 0.5rem', fontSize: '1rem' }}>Line items</h3>
          <table className="sales-line-table">
            <thead>
              <tr>
                <th>Part</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Line total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const qty = Number(line.quantity) || 0
                const price = Number(line.unitPrice) || 0
                const lineTotal = qty * price
                return (
                  <tr key={line.key}>
                    <td>
                      <select
                        value={line.partId}
                        onChange={(ev) => updateLine(line.key, 'partId', ev.target.value)}
                        required
                      >
                        <option value="">Select part…</option>
                        {parts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (stock {p.stockQuantity})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ maxWidth: '5rem' }}>
                      <input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(ev) => updateLine(line.key, 'quantity', ev.target.value)}
                      />
                    </td>
                    <td>{line.unitPrice !== '' ? formatMoney(line.unitPrice) : '—'}</td>
                    <td>{formatMoney(lineTotal)}</td>
                    <td>
                      <button
                        type="button"
                        className="sales-btn sales-btn-danger"
                        onClick={() => removeLine(line.key)}
                        disabled={lines.length <= 1}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="sales-line-actions">
            <button type="button" className="sales-btn sales-btn-secondary" onClick={addLine}>
              Add line
            </button>
            <button type="submit" className="sales-btn sales-btn-primary" disabled={loading}>
              {loading ? 'Saving…' : 'Create invoice'}
            </button>
          </div>

          <div className="sales-totals-row">
            <span>
              Subtotal: <strong>{formatMoney(runningSubtotal)}</strong>
            </span>
            {loyaltyDiscountPreview > 0 ? (
              <>
                <span>
                  Est. loyalty (10%): <strong>−{formatMoney(loyaltyDiscountPreview)}</strong>
                </span>
                <span>
                  Est. amount due: <strong>{formatMoney(amountDuePreview)}</strong>
                </span>
              </>
            ) : null}
          </div>

          {runningSubtotal > LOYALTY_THRESHOLD ? (
            <div className="sales-discount-banner">
              Loyalty discount: 10% applies to this sale (subtotal above {LOYALTY_THRESHOLD.toLocaleString()}).
            </div>
          ) : runningSubtotal > 0 && runningSubtotal <= LOYALTY_THRESHOLD ? (
            <p style={{ marginTop: '0.75rem', color: '#6b7280', fontSize: '0.88rem' }}>
              Add {(LOYALTY_THRESHOLD - runningSubtotal + 0.01).toFixed(2)} more to qualify for 10% loyalty
              discount.
            </p>
          ) : null}
        </form>
      </section>

      <section className="sales-invoice-panel">
        <h2>All sales invoices</h2>
        {emailFeedback?.type === 'success' ? (
          <p className="sales-msg-success" role="status">
            {emailFeedback.text}
          </p>
        ) : null}
        {emailFeedback?.type === 'error' ? (
          <p className="sales-msg-error" role="alert">
            {emailFeedback.text}
          </p>
        ) : null}
        {listLoading ? (
          <p>Loading…</p>
        ) : invoices.length === 0 ? (
          <p>No sales invoices yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="sales-invoice-list-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Staff</th>
                  <th>Subtotal</th>
                  <th>Discount</th>
                  <th>Due</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const due = Number(inv.totalAmount) - Number(inv.discountApplied || 0)
                  const sendingThis = sendingEmailInvoiceId === inv.id
                  return (
                    <tr key={inv.id}>
                      <td>{inv.id}</td>
                      <td>{inv.saleDate ? new Date(inv.saleDate).toLocaleString() : '—'}</td>
                      <td>{inv.customerName}</td>
                      <td>{inv.staffName}</td>
                      <td>{formatMoney(inv.totalAmount)}</td>
                      <td>{formatMoney(inv.discountApplied)}</td>
                      <td>{formatMoney(due)}</td>
                      <td className="sales-invoice-actions-cell">
                        <button
                          type="button"
                          className="sales-btn sales-btn-email"
                          onClick={() => void handleSendInvoiceEmail(inv.id)}
                          disabled={sendingThis}
                        >
                          {sendingThis ? 'Sending…' : 'Send email'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default SalesInvoice
