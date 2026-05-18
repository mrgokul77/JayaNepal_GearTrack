import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../../services/api'

function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
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

function formatDateTime(value) {
  if (!value) return '\u2014'
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return String(value)
  }
}

function PurchaseInvoice() {
  const [vendors, setVendors] = useState([])
  const [parts, setParts] = useState([])
  const [invoices, setInvoices] = useState([])
  const [vendorId, setVendorId] = useState('')
  const [lines, setLines] = useState([newLine()])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [listLoading, setListLoading] = useState(true)

  const loadLists = useCallback(async () => {
    setListLoading(true)
    setError('')
    try {
      const [vRes, pRes, iRes] = await Promise.all([
        api.get('/vendors'),
        api.get('/vehicle-parts'),
        api.get('/purchase-invoices'),
      ])
      setVendors(vRes.data ?? [])
      setParts(pRes.data ?? [])
      setInvoices(iRes.data ?? [])
    } catch (e) {
      setError(getErrorMessage(e, 'Could not load vendors, parts, or invoices.'))
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadLists()
  }, [loadLists])

  const partsForVendor = useMemo(() => {
    const vid = Number(vendorId)
    if (!vendorId || Number.isNaN(vid)) return []
    return parts.filter((p) => p.vendorId === vid)
  }, [parts, vendorId])

  const runningTotal = useMemo(() => {
    return lines.reduce((sum, line) => {
      const qty = Number(line.quantity) || 0
      const price = Number(line.unitPrice) || 0
      return sum + qty * price
    }, 0)
  }, [lines])

  const addLine = () => setLines((prev) => [...prev, newLine()])
  const removeLine = (key) => setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)))

  const updateLine = (key, field, value) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) return line
        const next = { ...line, [field]: value }
        if (field === 'partId') {
          const part = partsForVendor.find((p) => String(p.id) === String(value))
          if (part) next.unitPrice = String(part.price)
        }
        return next
      }),
    )
  }

  const handleVendorChange = (e) => {
    setVendorId(e.target.value)
    setLines([newLine()])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    const vid = Number(vendorId)
    if (!vendorId || Number.isNaN(vid)) {
      setError('Please select a vendor.')
      return
    }
    const items = lines
      .map((line) => ({
        partId: Number(line.partId),
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
      }))
      .filter((row) => row.partId > 0 && row.quantity > 0 && !Number.isNaN(row.unitPrice) && row.unitPrice >= 0)
    if (items.length === 0) {
      setError('Add at least one line with a part, quantity, and unit price.')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/purchase-invoices', { vendorId: vid, items })
      setSuccess('Purchase invoice saved and stock quantities were updated.')
      setLines([newLine()])
      await loadLists()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create purchase invoice.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchase invoices</h1>
          <p className="page-subtitle">
            Record stock received from a vendor. Submitting will increase the part stock quantities.
          </p>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}

      <div className="card">
        <div className="card-header">
          <div className="card-title">New purchase invoice</div>
          <span className="badge badge-info">Running total: {formatMoney(runningTotal)}</span>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="vendor">Vendor</label>
              <select
                id="vendor"
                className="form-select"
                value={vendorId}
                onChange={handleVendorChange}
                disabled={listLoading}
                required
              >
                <option value="">{listLoading ? 'Loading vendors\u2026' : 'Select vendor\u2026'}</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
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
                          disabled={!vendorId}
                        >
                          <option value="">{vendorId ? 'Select part\u2026' : 'Select vendor first'}</option>
                          {partsForVendor.map((p) => (
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
                          step={1}
                          className="form-input"
                          value={line.quantity}
                          onChange={(ev) => updateLine(line.key, 'quantity', ev.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className="form-input"
                          value={line.unitPrice}
                          onChange={(ev) => updateLine(line.key, 'unitPrice', ev.target.value)}
                          required
                        />
                      </td>
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

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={addLine}>
              <span aria-hidden="true">{'\u2795'}</span> Add line
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting || listLoading}>
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
          <div className="card-title">All purchase invoices</div>
          <span className="muted">{invoices.length} record(s)</span>
        </div>
        {listLoading ? (
          <div className="loading-state">
            <span className="spinner" aria-hidden="true" /> Loading&hellip;
          </div>
        ) : invoices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">{'\u{1F4E6}'}</div>
            <div className="empty-state-title">No purchase invoices yet</div>
            <div className="empty-state-desc">Create one above to start tracking stock intake.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Date</th>
                  <th className="num">Total</th>
                  <th className="num">Items</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.vendorName}</td>
                    <td className="muted">{formatDateTime(inv.purchaseDate)}</td>
                    <td className="num"><strong>{formatMoney(inv.totalAmount)}</strong></td>
                    <td className="num">{inv.items?.length ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

export default PurchaseInvoice
