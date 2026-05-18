import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../../services/api'

function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data?.title && data?.detail) return `${data.title}: ${data.detail}`
  return fallback
}

const emptyForm = {
  name: '',
  description: '',
  price: '',
  stockQuantity: '',
  vendorId: '',
}

/**
 * Stock-level badge class. >10 success, 5-10 warning, <5 danger.
 */
function stockBadgeClass(stock) {
  const n = Number(stock)
  if (!Number.isFinite(n) || n < 5) return 'badge badge-danger'
  if (n <= 10) return 'badge badge-warning'
  return 'badge badge-success'
}

function stockLabel(stock) {
  const n = Number(stock)
  if (!Number.isFinite(n) || n < 5) return 'Low'
  if (n <= 10) return 'Watch'
  return 'In stock'
}

function PartsManagement() {
  const [vendors, setVendors] = useState([])
  const [parts, setParts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [modal, setModal] = useState({ open: false, mode: 'create', id: null, form: emptyForm })
  const [saving, setSaving] = useState(false)

  const vendorNameById = useMemo(() => {
    const m = new Map()
    vendors.forEach((v) => m.set(v.id, v.name ?? ''))
    return m
  }, [vendors])

  const loadAll = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const [vRes, pRes] = await Promise.all([api.get('/vendors'), api.get('/vehicle-parts')])
      setVendors(Array.isArray(vRes.data) ? vRes.data : [])
      setParts(Array.isArray(pRes.data) ? pRes.data : [])
    } catch (e) {
      setError(getErrorMessage(e, 'Could not load vendors or parts.'))
      setVendors([])
      setParts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const openCreate = () => {
    setError('')
    setSuccess('')
    setModal({ open: true, mode: 'create', id: null, form: emptyForm })
  }

  const openEdit = (row) => {
    setError('')
    setSuccess('')
    setModal({
      open: true,
      mode: 'edit',
      id: row.id,
      form: {
        name: row.name ?? '',
        description: row.description ?? '',
        price: String(row.price ?? ''),
        stockQuantity: String(row.stockQuantity ?? ''),
        vendorId: String(row.vendorId ?? ''),
      },
    })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this part?')) {
      return
    }
    setError('')
    setSuccess('')
    try {
      await api.delete(`/vehicle-parts/${id}`)
      setSuccess('Part deleted.')
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete part.'))
    }
  }

  const closeModal = () => {
    if (saving) return
    setModal({ open: false, mode: 'create', id: null, form: emptyForm })
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setModal((prev) => ({ ...prev, form: { ...prev.form, [name]: value } }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    const vid = Number(modal.form.vendorId)
    const price = Number(modal.form.price)
    const stock = Number(modal.form.stockQuantity)
    if (!modal.form.name.trim() || Number.isNaN(vid) || vid <= 0) {
      setError('Name and vendor are required.')
      return
    }
    if (Number.isNaN(price) || price < 0 || Number.isNaN(stock) || stock < 0) {
      setError('Enter a valid price and stock quantity (zero or more).')
      return
    }
    setSaving(true)
    const payload = {
      name: modal.form.name.trim(),
      description: modal.form.description.trim(),
      price,
      stockQuantity: Math.floor(stock),
      vendorId: vid,
    }
    try {
      if (modal.mode === 'edit' && modal.id != null) {
        await api.put(`/vehicle-parts/${modal.id}`, payload)
        setSuccess('Part updated.')
      } else {
        await api.post('/vehicle-parts', payload)
        setSuccess('Part created.')
      }
      setModal({ open: false, mode: 'create', id: null, form: emptyForm })
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save part.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">Vehicle parts</h1>
          <p className="page-subtitle">
            Catalog used by sales and purchase invoices. Stock badges flag items that need attention.
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <span aria-hidden="true">{'\u2795'}</span> Add part
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="loading-state">
            <span className="spinner" aria-hidden="true" /> Loading catalog&hellip;
          </div>
        ) : parts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">{'\u2699'}</div>
            <div className="empty-state-title">No parts yet</div>
            <div className="empty-state-desc">Add your first part to start tracking inventory.</div>
          </div>
        ) : (
          <div className="table-wrap" style={{ border: 'none' }}>
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Vendor</th>
                  <th className="num">Price</th>
                  <th className="num">Stock</th>
                  <th>Status</th>
                  <th className="num">Actions</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((p) => (
                  <tr key={p.id}>
                    <td className="muted">#{p.id}</td>
                    <td>
                      <strong>{p.name}</strong>
                      {p.description ? <div className="muted" style={{ fontSize: '0.8rem' }}>{p.description}</div> : null}
                    </td>
                    <td>{vendorNameById.get(p.vendorId) || `Vendor #${p.vendorId}`}</td>
                    <td className="num">{Number(p.price).toFixed(2)}</td>
                    <td className="num"><strong>{p.stockQuantity}</strong></td>
                    <td>
                      <span className={stockBadgeClass(p.stockQuantity)}>{stockLabel(p.stockQuantity)}</span>
                    </td>
                    <td>
                      <div className="actions">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>
                          Edit
                        </button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal.open ? (
        <div className="modal-overlay" role="presentation" onClick={closeModal}>
          <div
            className="modal modal-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="part-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="part-modal-title" className="modal-title">
                {modal.mode === 'edit' ? `Edit part #${modal.id}` : 'Add part'}
              </h2>
              <button type="button" className="modal-close" onClick={closeModal} aria-label="Close">
                {'\u00D7'}
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="pname">Name</label>
                    <input id="pname" name="name" className="form-input" value={modal.form.name} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pvendor">Vendor</label>
                    <select
                      id="pvendor"
                      name="vendorId"
                      className="form-select"
                      value={modal.form.vendorId}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select vendor&hellip;</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pprice">Price</label>
                    <input
                      id="pprice"
                      name="price"
                      className="form-input"
                      type="number"
                      min={0}
                      step="0.01"
                      value={modal.form.price}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pstock">Stock quantity</label>
                    <input
                      id="pstock"
                      name="stockQuantity"
                      className="form-input"
                      type="number"
                      min={0}
                      step={1}
                      value={modal.form.stockQuantity}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group form-grid-full">
                    <label className="form-label" htmlFor="pdesc">Description</label>
                    <textarea
                      id="pdesc"
                      name="description"
                      className="form-textarea"
                      rows={3}
                      value={modal.form.description}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="spinner" aria-hidden="true" /> Saving&hellip;
                    </>
                  ) : modal.mode === 'edit' ? 'Save changes' : 'Create part'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default PartsManagement
