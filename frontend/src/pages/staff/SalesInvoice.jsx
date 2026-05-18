import { useCallback, useEffect, useMemo, useState } from 'react'
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

function newLine() {
  return {
    key: globalThis.crypto?.randomUUID?.() ?? String(Date.now() + Math.random()),
    partId: '',
    quantity: 1,
    unitPrice: '',
  }
}

function formatDateTime(value) {
  if (!value) return '\u2014'
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return String(value)
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
  const [submitting, setSubmitting] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [sendingEmailInvoiceId, setSendingEmailInvoiceId] = useState(null)
  const [emailFeedback, setEmailFeedback] = useState(null)

  const loadLists = useCallback(async () => {
    setListLoading(true)
    setError('')
    try {
      const [cRes, pRes, iRes] = await Promise.all([
        api.get('/customers'),
        api.get('/vehicle-parts'),
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
    void loadLists()
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

  const loyaltyDiscountPreview = runningSubtotal > LOYALTY_THRESHOLD ? runningSubtotal * LOYALTY_RATE : 0
  const amountDuePreview = runningSubtotal - loyaltyDiscountPreview
  const qualifies = runningSubtotal > LOYALTY_THRESHOLD

  const addLine = () => setLines((prev) => [...prev, newLine()])
  const removeLine = (key) => setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)))

  const updateLine = (key, field, value) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) return line
        const next = { ...line, [field]: value }
        if (field === 'partId') {
          const part = parts.find((p) => String(p.id) === String(value))
          next.unitPrice = part ? String(part.price) : ''
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
      .map((line) => ({ partId: Number(line.partId), quantity: Number(line.quantity) }))
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
    setSubmitting(true)
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
      setSubmitting(false)
    }
  }

  const handleSendInvoiceEmail = async (invoiceId) => {
    setEmailFeedback(null)
    setSendingEmailInvoiceId(invoiceId)
    try {
      await api.post(`/sales-invoices/${invoiceId}/send-email`)
      setEmailFeedback({ type: 'success', text: 'Invoice sent to customer' })
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
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales invoice</h1>
          <p className="page-subtitle">
            Add parts and quantities. Unit prices come from inventory. A 10% loyalty discount applies when the subtotal
            exceeds {formatMoney(LOYALTY_THRESHOLD)}.
          </p>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}

      <div className="card">
        <div className="card-header">
          <div className="card-title">New invoice</div>
          <span className="badge badge-info">Subtotal: {formatMoney(runningSubtotal)}</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="customerSearch">Search customer</label>
              <div className="form-input-icon">
                <span className="form-input-icon-glyph" aria-hidden="true">{'\u{1F50D}'}</span>
                <input
                  id="customerSearch"
                  type="search"
                  className="form-input"
                  placeholder="Name, email, or phone"
                  value={customerSearch}
                  onChange={(ev) => setCustomerSearch(ev.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="customerSelect">Customer</label>
              <select
                id="customerSelect"
                className="form-select"
                value={selectedCustomerId}
                onChange={(ev) => setSelectedCustomerId(ev.target.value)}
                required
              >
                <option value="">Select customer&hellip;</option>
                {filteredCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} &mdash; {c.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-wrap mt-4" style={{ border: '1px solid var(--color-border)' }}>
            <table className="line-table">
              <thead>
                <tr>
                  <th>Part</th>
                  <th className="narrow">Qty</th>
                  <th>Unit price</th>
                  <th className="num">Line total</th>
                  <th className="actions-col" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const qty = Number(line.quantity) || 0
                  const price = Number(line.unitPrice) || 0
                  return (
                    <tr key={line.key}>
                      <td>
                        <select
                          className="form-select"
                          value={line.partId}
                          onChange={(ev) => updateLine(line.key, 'partId', ev.target.value)}
                          required
                        >
                          <option value="">Select part&hellip;</option>
                          {parts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (stock {p.stockQuantity})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          className="form-input"
                          value={line.quantity}
                          onChange={(ev) => updateLine(line.key, 'quantity', ev.target.value)}
                        />
                      </td>
                      <td className="muted">{line.unitPrice !== '' ? formatMoney(line.unitPrice) : '\u2014'}</td>
                      <td className="num"><strong>{formatMoney(qty * price)}</strong></td>
                      <td className="actions-col">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
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
          </div>

          <div className="totals-strip">
            <span>Subtotal: <strong>{formatMoney(runningSubtotal)}</strong></span>
            {qualifies ? (
              <>
                <span className="text-success">Loyalty (10%): <strong>&minus;{formatMoney(loyaltyDiscountPreview)}</strong></span>
                <span>Estimated due: <strong>{formatMoney(amountDuePreview)}</strong></span>
              </>
            ) : null}
          </div>

          {qualifies ? (
            <div className="discount-banner">
              <span aria-hidden="true">{'\u{1F3C5}'}</span> Loyalty discount: 10% applies to this sale (subtotal above {formatMoney(LOYALTY_THRESHOLD)}).
            </div>
          ) : runningSubtotal > 0 && runningSubtotal <= LOYALTY_THRESHOLD ? (
            <p className="muted mt-3">
              Add {formatMoney(LOYALTY_THRESHOLD - runningSubtotal + 0.01)} more to qualify for the 10% loyalty discount.
            </p>
          ) : null}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={addLine}>
              <span aria-hidden="true">{'\u2795'}</span> Add line
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Saving&hellip;
                </>
              ) : (
                'Create invoice'
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">All sales invoices</div>
          <span className="muted">{invoices.length} record(s)</span>
        </div>

        {emailFeedback?.type === 'success' ? <div className="alert alert-success">{emailFeedback.text}</div> : null}
        {emailFeedback?.type === 'error' ? <div className="alert alert-error">{emailFeedback.text}</div> : null}

        {listLoading ? (
          <div className="loading-state">
            <span className="spinner" aria-hidden="true" /> Loading&hellip;
          </div>
        ) : invoices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">{'\u{1F4C4}'}</div>
            <div className="empty-state-title">No sales invoices yet</div>
            <div className="empty-state-desc">Create one above to get started.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Staff</th>
                  <th className="num">Subtotal</th>
                  <th className="num">Discount</th>
                  <th className="num">Due</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const due = Number(inv.totalAmount) - Number(inv.discountApplied || 0)
                  const sendingThis = sendingEmailInvoiceId === inv.id
                  return (
                    <tr key={inv.id}>
                      <td><strong>#{inv.id}</strong></td>
                      <td className="muted">{formatDateTime(inv.saleDate)}</td>
                      <td>{inv.customerName}</td>
                      <td>{inv.staffName}</td>
                      <td className="num">{formatMoney(inv.totalAmount)}</td>
                      <td className="num">
                        {Number(inv.discountApplied) > 0 ? (
                          <span className="badge badge-success">{formatMoney(inv.discountApplied)}</span>
                        ) : (
                          <span className="muted">{'\u2014'}</span>
                        )}
                      </td>
                      <td className="num"><strong>{formatMoney(due)}</strong></td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => void handleSendInvoiceEmail(inv.id)}
                          disabled={sendingThis}
                        >
                          {sendingThis ? (
                            <>
                              <span className="spinner" aria-hidden="true" /> Sending&hellip;
                            </>
                          ) : (
                            <>{'\u{1F4E7}'} Email</>
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

export default SalesInvoice
