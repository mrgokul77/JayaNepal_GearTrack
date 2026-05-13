import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import './PurchaseInvoice.css'

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

function PurchaseInvoice() {
  const [vendors, setVendors] = useState([])
  const [parts, setParts] = useState([])
  const [invoices, setInvoices] = useState([])
  const [vendorId, setVendorId] = useState('')
  const [lines, setLines] = useState([newLine()])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
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
    loadLists()
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
          const part = partsForVendor.find((p) => String(p.id) === String(value))
          if (part) {
            next.unitPrice = String(part.price)
          }
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

    setLoading(true)
    try {
      await api.post('/purchase-invoices', { vendorId: vid, items })
      setSuccess('Purchase invoice saved and stock quantities were updated.')
      setLines([newLine()])
      await loadLists()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create purchase invoice.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="purchase-invoice-page">
      <h1>Purchase invoices</h1>
      <p className="purchase-invoice-lead">
        Record stock received from a vendor. Totals are computed from line quantities and unit prices; catalog stock
        increases when you submit.
      </p>

      {success && <div className="purchase-msg-success">{success}</div>}
      {error && <p className="purchase-msg-error">{error}</p>}

      <section className="purchase-invoice-panel" aria-labelledby="new-invoice-title">
        <h2 id="new-invoice-title">New purchase invoice</h2>
        <form onSubmit={handleSubmit}>
          <div className="purchase-form-grid two">
            <div>
              <label htmlFor="vendor">Vendor</label>
              <select
                id="vendor"
                value={vendorId}
                onChange={handleVendorChange}
                disabled={listLoading}
                required
              >
                <option value="">Select vendor…</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="purchase-total">Running total: NPR {formatMoney(runningTotal)}</div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <table className="purchase-line-table">
              <thead>
                <tr>
                  <th>Part</th>
                  <th style={{ width: '110px' }}>Qty</th>
                  <th style={{ width: '130px' }}>Unit price</th>
                  <th style={{ width: '72px' }} />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.key}>
                    <td>
                      <select
                        value={line.partId}
                        onChange={(ev) => updateLine(line.key, 'partId', ev.target.value)}
                        required
                        disabled={!vendorId}
                      >
                        <option value="">{vendorId ? 'Select part…' : 'Select vendor first'}</option>
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
                        value={line.unitPrice}
                        onChange={(ev) => updateLine(line.key, 'unitPrice', ev.target.value)}
                        required
                      />
                    </td>
                    <td>
                      <button type="button" className="btn-ghost" onClick={() => removeLine(line.key)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="purchase-line-actions">
            <button type="button" className="btn-secondary" onClick={addLine}>
              Add line
            </button>
            <button type="submit" className="btn-primary" disabled={loading || listLoading}>
              {loading ? 'Saving…' : 'Create invoice'}
            </button>
            <Link className="link-muted" to="/admin">
              Back to admin
            </Link>
          </div>
        </form>
      </section>

      <section className="purchase-invoice-panel" aria-labelledby="invoice-list-title">
        <h2 id="invoice-list-title">All purchase invoices</h2>
        {listLoading ? (
          <p>Loading…</p>
        ) : invoices.length === 0 ? (
          <p>No invoices yet.</p>
        ) : (
          <ul className="purchase-invoice-list">
            {invoices.map((inv) => (
              <li key={inv.id}>
                <strong>
                  #{inv.id} — {inv.vendorName}
                </strong>
                <span> — NPR {formatMoney(inv.totalAmount)}</span>
                <div className="meta">
                  {new Date(inv.purchaseDate).toLocaleString()} · Admin id {inv.adminId}
                </div>
                {inv.items?.length > 0 && (
                  <ul className="lines">
                    {inv.items.map((it) => (
                      <li key={it.id}>
                        {it.partName} × {it.quantity} @ {formatMoney(it.unitPrice)}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default PurchaseInvoice
