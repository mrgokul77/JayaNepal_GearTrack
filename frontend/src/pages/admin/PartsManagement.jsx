import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import './PartsManagement.css'

function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data?.title && data?.detail) return `${data.title}: ${data.detail}`
  return fallback
}

const emptyPart = {
  name: '',
  description: '',
  price: '',
  stockQuantity: '',
  vendorId: '',
}

/**
 * Admin catalog: create and edit vehicle parts (same entities used on sales and purchase invoices).
 */
function PartsManagement() {
  const [vendors, setVendors] = useState([])
  const [parts, setParts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [createForm, setCreateForm] = useState(emptyPart)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(emptyPart)
  const [savingEdit, setSavingEdit] = useState(false)

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

  const handleCreateChange = (e) => {
    const { name, value } = e.target
    setCreateForm((p) => ({ ...p, [name]: value }))
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    const vid = Number(createForm.vendorId)
    const price = Number(createForm.price)
    const stock = Number(createForm.stockQuantity)
    if (!createForm.name.trim() || Number.isNaN(vid) || vid <= 0) {
      setError('Name and vendor are required.')
      return
    }
    if (Number.isNaN(price) || price < 0 || Number.isNaN(stock) || stock < 0) {
      setError('Enter a valid price and stock quantity (zero or more).')
      return
    }
    setCreating(true)
    try {
      await api.post('/vehicle-parts', {
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        price,
        stockQuantity: Math.floor(stock),
        vendorId: vid,
      })
      setSuccess('Part created.')
      setCreateForm(emptyPart)
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create part.'))
    } finally {
      setCreating(false)
    }
  }

  const openEdit = (row) => {
    setError('')
    setSuccess('')
    setEditingId(row.id)
    setEditForm({
      name: row.name ?? '',
      description: row.description ?? '',
      price: String(row.price ?? ''),
      stockQuantity: String(row.stockQuantity ?? ''),
      vendorId: String(row.vendorId ?? ''),
    })
  }

  const closeEdit = () => {
    setEditingId(null)
    setEditForm(emptyPart)
  }

  const handleEditChange = (e) => {
    const { name, value } = e.target
    setEditForm((p) => ({ ...p, [name]: value }))
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editingId) return
    setError('')
    setSuccess('')
    const vid = Number(editForm.vendorId)
    const price = Number(editForm.price)
    const stock = Number(editForm.stockQuantity)
    if (!editForm.name.trim() || Number.isNaN(vid) || vid <= 0) {
      setError('Name and vendor are required.')
      return
    }
    if (Number.isNaN(price) || price < 0 || Number.isNaN(stock) || stock < 0) {
      setError('Enter a valid price and stock quantity.')
      return
    }
    setSavingEdit(true)
    try {
      await api.put(`/vehicle-parts/${editingId}`, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        price,
        stockQuantity: Math.floor(stock),
        vendorId: vid,
      })
      setSuccess('Part updated.')
      closeEdit()
      await loadAll()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not update part.'))
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <section className="parts-page">
      <Link to="/admin" className="parts-back">
        ← Admin dashboard
      </Link>
      <h1>Vehicle parts</h1>
      <p className="parts-lead">
        Manage catalog items tied to vendors. Stock changes from sales and purchase invoices apply to these records.
      </p>

      {error ? <div className="parts-banner parts-banner-error">{error}</div> : null}
      {success ? <div className="parts-banner parts-banner-success">{success}</div> : null}

      <div className="parts-panel">
        <h2>Add part</h2>
        <form onSubmit={handleCreateSubmit}>
          <div className="parts-form-grid">
            <label>
              Name
              <input name="name" value={createForm.name} onChange={handleCreateChange} required />
            </label>
            <label>
              Vendor
              <select
                name="vendorId"
                value={createForm.vendorId}
                onChange={handleCreateChange}
                required
                disabled={loading}
              >
                <option value="">Select vendor…</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Price
              <input name="price" type="number" min={0} step="0.01" value={createForm.price} onChange={handleCreateChange} required />
            </label>
            <label>
              Stock quantity
              <input name="stockQuantity" type="number" min={0} step={1} value={createForm.stockQuantity} onChange={handleCreateChange} required />
            </label>
            <label className="parts-span-2">
              Description
              <textarea name="description" value={createForm.description} onChange={handleCreateChange} rows={3} />
            </label>
          </div>
          <div className="parts-actions">
            <button type="submit" className="parts-btn parts-btn-primary" disabled={creating || loading}>
              {creating ? 'Saving…' : 'Create part'}
            </button>
          </div>
        </form>
      </div>

      <div className="parts-panel">
        <h2>Catalog</h2>
        {loading ? <p className="parts-muted">Loading…</p> : null}
        {!loading && parts.length === 0 ? <p className="parts-muted">No parts yet.</p> : null}
        {!loading && parts.length > 0 ? (
          <div className="parts-table-wrap">
            <table className="parts-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Vendor</th>
                  <th className="parts-num">Price</th>
                  <th className="parts-num">Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.name}</td>
                    <td>{vendorNameById.get(p.vendorId) || `Vendor #${p.vendorId}`}</td>
                    <td className="parts-num">{Number(p.price).toFixed(2)}</td>
                    <td className="parts-num">{p.stockQuantity}</td>
                    <td>
                      <button type="button" className="parts-btn" onClick={() => openEdit(p)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {editingId ? (
        <div className="parts-panel" role="dialog" aria-modal="true" aria-labelledby="edit-part-title">
          <h2 id="edit-part-title">Edit part #{editingId}</h2>
          <form onSubmit={handleEditSubmit}>
            <div className="parts-form-grid">
              <label>
                Name
                <input name="name" value={editForm.name} onChange={handleEditChange} required />
              </label>
              <label>
                Vendor
                <select name="vendorId" value={editForm.vendorId} onChange={handleEditChange} required>
                  <option value="">Select vendor…</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Price
                <input name="price" type="number" min={0} step="0.01" value={editForm.price} onChange={handleEditChange} required />
              </label>
              <label>
                Stock quantity
                <input name="stockQuantity" type="number" min={0} step={1} value={editForm.stockQuantity} onChange={handleEditChange} required />
              </label>
              <label className="parts-span-2">
                Description
                <textarea name="description" value={editForm.description} onChange={handleEditChange} rows={3} />
              </label>
            </div>
            <div className="parts-actions">
              <button type="submit" className="parts-btn parts-btn-primary" disabled={savingEdit}>
                {savingEdit ? 'Saving…' : 'Save changes'}
              </button>
              <button type="button" className="parts-btn" onClick={closeEdit}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  )
}

export default PartsManagement
