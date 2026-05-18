import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../../services/api'

function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data?.title && data?.detail) return `${data.title}: ${data.detail}`
  return fallback
}

const emptyForm = { name: '', phone: '', email: '', address: '' }

function formatDate(iso) {
  if (!iso) return '\u2014'
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
  } catch {
    return String(iso)
  }
}

function VendorManagement() {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')

  const [modal, setModal] = useState({ open: false, mode: 'create', id: null, form: emptyForm })
  const [saving, setSaving] = useState(false)
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
    void loadVendors()
  }, [loadVendors])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return vendors
    return vendors.filter(
      (v) =>
        (v.name && v.name.toLowerCase().includes(q)) ||
        (v.email && v.email.toLowerCase().includes(q)) ||
        (v.phone && String(v.phone).includes(q)) ||
        (v.address && v.address.toLowerCase().includes(q)),
    )
  }, [vendors, search])

  const openCreate = () => {
    setError('')
    setSuccess('')
    setModal({ open: true, mode: 'create', id: null, form: emptyForm })
  }

  const openEdit = (vendor) => {
    setError('')
    setSuccess('')
    setModal({
      open: true,
      mode: 'edit',
      id: vendor.id,
      form: {
        name: vendor.name ?? '',
        phone: vendor.phone ?? '',
        email: vendor.email ?? '',
        address: vendor.address ?? '',
      },
    })
  }

  const closeModal = () => {
    if (saving) return
    setModal({ open: false, mode: 'create', id: null, form: emptyForm })
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setModal((prev) => ({ ...prev, form: { ...prev.form, [name]: value } }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    const payload = {
      name: modal.form.name.trim(),
      phone: modal.form.phone.trim(),
      email: modal.form.email.trim(),
      address: modal.form.address.trim(),
    }
    try {
      if (modal.mode === 'edit' && modal.id != null) {
        await api.put(`/vendors/${modal.id}`, payload)
        setSuccess('Vendor updated successfully.')
      } else {
        await api.post('/vendors', payload)
        setSuccess('Vendor created successfully.')
      }
      setModal({ open: false, mode: 'create', id: null, form: emptyForm })
      await loadVendors()
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not save vendor.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (vendor) => {
    const ok = window.confirm(
      `Delete vendor "${vendor.name}"? This only works if no parts or invoices reference them.`,
    )
    if (!ok) return
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
        setError(getErrorMessage(requestError, 'Vendor is still linked to inventory or invoices.'))
      } else {
        setError(getErrorMessage(requestError, 'Could not delete vendor.'))
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">Vendors</h1>
          <p className="page-subtitle">Manage supplier records and contact details.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <span aria-hidden="true">{'\u2795'}</span> Add vendor
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}

      <div className="search-toolbar">
        <span style={{ paddingLeft: 8, color: 'var(--color-text-soft)' }} aria-hidden="true">{'\u{1F50D}'}</span>
        <input
          type="search"
          className="form-input"
          placeholder="Search vendors by name, phone, email, or address"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="loading-state">
            <span className="spinner" aria-hidden="true" /> Loading vendors&hellip;
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">{'\u{1F3E2}'}</div>
            <div className="empty-state-title">{vendors.length === 0 ? 'No vendors yet' : 'No matches'}</div>
            <div className="empty-state-desc">
              {vendors.length === 0
                ? 'Click \u201CAdd vendor\u201D to register your first supplier.'
                : 'Try a different search term.'}
            </div>
          </div>
        ) : (
          <div className="table-wrap" style={{ border: 'none' }}>
            <table className="table table-striped table-hover">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Address</th>
                  <th>Created</th>
                  <th className="num">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id}>
                    <td><strong>{v.name}</strong></td>
                    <td>{v.phone || '\u2014'}</td>
                    <td>{v.email || '\u2014'}</td>
                    <td className="muted">{v.address || '\u2014'}</td>
                    <td className="muted">{formatDate(v.createdAt)}</td>
                    <td>
                      <div className="actions">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(v)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          disabled={deletingId === v.id}
                          onClick={() => handleDelete(v)}
                        >
                          {deletingId === v.id ? '\u2026' : 'Delete'}
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
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="vendor-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title" id="vendor-modal-title">
                {modal.mode === 'edit' ? 'Edit vendor' : 'Add vendor'}
              </h2>
              <button type="button" className="modal-close" onClick={closeModal} aria-label="Close">
                {'\u00D7'}
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="vname">Name</label>
                    <input
                      id="vname"
                      name="name"
                      className="form-input"
                      value={modal.form.name}
                      onChange={handleChange}
                      required
                      maxLength={150}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="vphone">Phone</label>
                    <input
                      id="vphone"
                      name="phone"
                      className="form-input"
                      value={modal.form.phone}
                      onChange={handleChange}
                      required
                      maxLength={30}
                    />
                  </div>
                  <div className="form-group form-grid-full">
                    <label className="form-label" htmlFor="vemail">Email</label>
                    <input
                      id="vemail"
                      name="email"
                      type="email"
                      className="form-input"
                      value={modal.form.email}
                      onChange={handleChange}
                      required
                      maxLength={150}
                    />
                  </div>
                  <div className="form-group form-grid-full">
                    <label className="form-label" htmlFor="vaddress">Address</label>
                    <input
                      id="vaddress"
                      name="address"
                      className="form-input"
                      value={modal.form.address}
                      onChange={handleChange}
                      maxLength={300}
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
                  ) : modal.mode === 'edit' ? 'Save changes' : 'Create vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default VendorManagement
