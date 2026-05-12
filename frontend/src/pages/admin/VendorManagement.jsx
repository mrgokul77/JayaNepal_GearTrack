import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import './VendorManagement.css'

function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data?.title && data?.detail) return `${data.title}: ${data.detail}`
  return fallback
}

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
}

function VendorManagement() {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [createForm, setCreateForm] = useState(emptyForm)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const loadVendors = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await api.get('/vendors')
      setVendors(Array.isArray(data) ? data : [])
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not load vendors.'))
      setVendors([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadVendors()
  }, [loadVendors])

  const handleCreateChange = (event) => {
    const { name, value } = event.target
    setCreateForm((previous) => ({ ...previous, [name]: value }))
  }

  const handleCreateSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setCreating(true)
    try {
      await api.post('/vendors', {
        name: createForm.name.trim(),
        phone: createForm.phone.trim(),
        email: createForm.email.trim(),
        address: createForm.address.trim(),
      })
      setSuccess('Vendor created successfully.')
      setCreateForm(emptyForm)
      await loadVendors()
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not create vendor.'))
    } finally {
      setCreating(false)
    }
  }

  const openEdit = (vendor) => {
    setError('')
    setSuccess('')
    setEditingId(vendor.id)
    setEditForm({
      name: vendor.name ?? '',
      phone: vendor.phone ?? '',
      email: vendor.email ?? '',
      address: vendor.address ?? '',
    })
  }

  const closeEdit = () => {
    setEditingId(null)
    setEditForm(emptyForm)
  }

  const handleEditChange = (event) => {
    const { name, value } = event.target
    setEditForm((previous) => ({ ...previous, [name]: value }))
  }

  const handleEditSubmit = async (event) => {
    event.preventDefault()
    if (editingId == null) return
    setError('')
    setSuccess('')
    setSavingEdit(true)
    try {
      await api.put(`/vendors/${editingId}`, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim(),
        address: editForm.address.trim(),
      })
      setSuccess('Vendor updated successfully.')
      closeEdit()
      await loadVendors()
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not update vendor.'))
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = async (vendor) => {
    const confirmed = window.confirm(
      `Delete vendor "${vendor.name}"? This only works if no parts or purchase invoices reference them.`,
    )
    if (!confirmed) return

    setError('')
    setSuccess('')
    setDeletingId(vendor.id)
    try {
      await api.delete(`/vendors/${vendor.id}`)
      setSuccess('Vendor deleted.')
      await loadVendors()
    } catch (requestError) {
      const status = requestError.response?.status
      if (status === 409) {
        setError(
          getErrorMessage(
            requestError,
            'This vendor is still linked to inventory or invoices and cannot be deleted.',
          ),
        )
      } else {
        setError(getErrorMessage(requestError, 'Could not delete vendor.'))
      }
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (iso) => {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    } catch {
      return String(iso)
    }
  }

  return (
    <div className="vendor-management">
      <header className="vendor-management-header">
        <div>
          <h1>Vendors</h1>
          <p className="vendor-management-lead">Manage supplier contact details and records.</p>
        </div>
        <Link to="/admin" className="vendor-management-back">
          ← Admin dashboard
        </Link>
      </header>

      {error ? (
        <div className="vendor-banner vendor-banner-error" role="alert">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="vendor-banner vendor-banner-success" role="status">
          {success}
        </div>
      ) : null}

      <section className="vendor-card">
        <h2>Add vendor</h2>
        <form className="vendor-form" onSubmit={handleCreateSubmit}>
          <div className="vendor-form-grid">
            <label className="vendor-field">
              <span>Name</span>
              <input
                name="name"
                value={createForm.name}
                onChange={handleCreateChange}
                required
                maxLength={150}
                autoComplete="organization"
              />
            </label>
            <label className="vendor-field">
              <span>Phone</span>
              <input
                name="phone"
                value={createForm.phone}
                onChange={handleCreateChange}
                required
                maxLength={30}
                autoComplete="tel"
              />
            </label>
            <label className="vendor-field">
              <span>Email</span>
              <input
                name="email"
                type="email"
                value={createForm.email}
                onChange={handleCreateChange}
                required
                maxLength={150}
                autoComplete="email"
              />
            </label>
            <label className="vendor-field vendor-field-full">
              <span>Address</span>
              <input
                name="address"
                value={createForm.address}
                onChange={handleCreateChange}
                maxLength={300}
                autoComplete="street-address"
              />
            </label>
          </div>
          <div className="vendor-form-actions">
            <button type="submit" className="vendor-btn vendor-btn-primary" disabled={creating}>
              {creating ? 'Saving…' : 'Create vendor'}
            </button>
          </div>
        </form>
      </section>

      <section className="vendor-card">
        <h2>All vendors</h2>
        {loading ? (
          <p className="vendor-muted">Loading…</p>
        ) : vendors.length === 0 ? (
          <p className="vendor-muted">No vendors yet. Add one above.</p>
        ) : (
          <div className="vendor-table-wrap">
            <table className="vendor-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Address</th>
                  <th>Created</th>
                  <th className="vendor-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => (
                  <tr key={v.id}>
                    <td>{v.name}</td>
                    <td>{v.phone}</td>
                    <td>{v.email}</td>
                    <td className="vendor-td-address">{v.address || '—'}</td>
                    <td className="vendor-td-muted">{formatDate(v.createdAt)}</td>
                    <td className="vendor-td-actions">
                      <button type="button" className="vendor-btn vendor-btn-ghost" onClick={() => openEdit(v)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="vendor-btn vendor-btn-danger"
                        disabled={deletingId === v.id}
                        onClick={() => handleDelete(v)}
                      >
                        {deletingId === v.id ? '…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editingId != null ? (
        <div className="vendor-modal-overlay" role="presentation" onClick={closeEdit}>
          <div
            className="vendor-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="vendor-edit-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vendor-modal-header">
              <h2 id="vendor-edit-title">Edit vendor</h2>
              <button type="button" className="vendor-modal-close" onClick={closeEdit} aria-label="Close">
                ×
              </button>
            </div>
            <form className="vendor-form" onSubmit={handleEditSubmit}>
              <div className="vendor-form-grid">
                <label className="vendor-field">
                  <span>Name</span>
                  <input
                    name="name"
                    value={editForm.name}
                    onChange={handleEditChange}
                    required
                    maxLength={150}
                  />
                </label>
                <label className="vendor-field">
                  <span>Phone</span>
                  <input name="phone" value={editForm.phone} onChange={handleEditChange} required maxLength={30} />
                </label>
                <label className="vendor-field">
                  <span>Email</span>
                  <input
                    name="email"
                    type="email"
                    value={editForm.email}
                    onChange={handleEditChange}
                    required
                    maxLength={150}
                  />
                </label>
                <label className="vendor-field vendor-field-full">
                  <span>Address</span>
                  <input name="address" value={editForm.address} onChange={handleEditChange} maxLength={300} />
                </label>
              </div>
              <div className="vendor-form-actions">
                <button type="button" className="vendor-btn vendor-btn-ghost" onClick={closeEdit}>
                  Cancel
                </button>
                <button type="submit" className="vendor-btn vendor-btn-primary" disabled={savingEdit}>
                  {savingEdit ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default VendorManagement
