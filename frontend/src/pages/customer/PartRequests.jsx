import { useCallback, useEffect, useState } from 'react'
import api from '../../services/api'

function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data?.title && data?.detail) return `${data.title}: ${data.detail}`
  return fallback
}

function formatDateTime(value) {
  if (!value) return '\u2014'
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return String(value)
  }
}

function emptyForm() {
  return { partName: '', description: '' }
}

function statusBadgeClass(status) {
  const s = (status || '').toLowerCase()
  if (s === 'pending') return 'badge badge-warning'
  if (s === 'fulfilled' || s === 'completed') return 'badge badge-success'
  if (s === 'rejected') return 'badge badge-danger'
  return 'badge badge-neutral'
}

function PartRequests() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editModal, setEditModal] = useState({ open: false, id: null, partName: '', description: '' })
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await api.get('/part-requests')
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      setItems([])
      setError(getErrorMessage(e, 'Could not load part requests.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (!form.partName?.trim()) {
      setError('Part name is required.')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/part-requests', {
        partName: form.partName.trim(),
        description: form.description?.trim() || null,
      })
      setSuccess('Part request submitted.')
      setForm(emptyForm())
      await load()
    } catch (e) {
      setError(getErrorMessage(e, 'Could not submit part request.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenEdit = (item) => {
    setError('')
    setSuccess('')
    setEditModal({
      open: true,
      id: item.id,
      partName: item.partName,
      description: item.description || '',
    })
  }

  const handleEditChange = (e) => {
    const { name, value } = e.target
    setEditModal((prev) => ({ ...prev, [name]: value }))
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!editModal.partName?.trim()) {
      setError('Part name is required.')
      return
    }
    setEditSubmitting(true)
    try {
      await api.put(`/part-requests/${editModal.id}`, {
        partName: editModal.partName.trim(),
        description: editModal.description?.trim() || null,
      })
      setSuccess('Part request updated.')
      setEditModal({ open: false, id: null, partName: '', description: '' })
      await load()
    } catch (e) {
      setError(getErrorMessage(e, 'Could not update part request.'))
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleCloseEdit = () => {
    if (editSubmitting) return
    setEditModal({ open: false, id: null, partName: '', description: '' })
  }

  const handleDelete = async (item) => {
    const ok = window.confirm('Are you sure you want to delete this part request?')
    if (!ok) return
    setError('')
    setSuccess('')
    setDeletingId(item.id)
    try {
      await api.delete(`/part-requests/${item.id}`)
      setSuccess('Part request deleted.')
      await load()
    } catch (e) {
      setError(getErrorMessage(e, 'Could not delete part request.'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">Part requests</h1>
          <p className="page-subtitle">Request parts that are out of stock or not listed in the catalog.</p>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}

      <div className="card">
        <div className="card-header">
          <div className="card-title">Request a part</div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group form-grid-full">
              <label className="form-label" htmlFor="partName">Part name</label>
              <input
                id="partName"
                type="text"
                name="partName"
                className="form-input"
                value={form.partName}
                onChange={handleChange}
                required
                placeholder="e.g. Front brake pads (OEM)"
              />
            </div>
            <div className="form-group form-grid-full">
              <label className="form-label" htmlFor="description">Description (optional)</label>
              <textarea
                id="description"
                name="description"
                className="form-textarea"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="Vehicle, year, VIN fragment, or other details"
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Submitting&hellip;
                </>
              ) : (
                'Submit request'
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Your requests</div>
          <span className="muted">{items.length} total</span>
        </div>
        {loading ? (
          <div className="loading-state">
            <span className="spinner" aria-hidden="true" /> Loading&hellip;
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">{'\u2709'}</div>
            <div className="empty-state-title">No part requests yet</div>
            <div className="empty-state-desc">Use the form above to request anything you need.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Part</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="num">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td><strong>{row.partName}</strong></td>
                    <td className="muted">{row.description || '\u2014'}</td>
                    <td>
                      <span className={statusBadgeClass(row.status)}>{row.status || 'Unknown'}</span>
                    </td>
                    <td className="muted">{formatDateTime(row.createdAt)}</td>
                    <td>
                      {row.status === 'Pending' ? (
                        <div className="actions">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenEdit(row)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            disabled={deletingId === row.id}
                            onClick={() => handleDelete(row)}
                          >
                            {deletingId === row.id ? (
                              <>
                                <span className="spinner" aria-hidden="true" /> Delete
                              </>
                            ) : (
                              'Delete'
                            )}
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-soft)', fontSize: '0.85rem' }}>🔒</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editModal.open ? (
        <div className="modal-overlay" role="presentation" onClick={handleCloseEdit}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-part-request-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="edit-part-request-title" className="modal-title">Edit part request</h2>
              <button type="button" className="modal-close" onClick={handleCloseEdit} aria-label="Close">
                {'\u00D7'}
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group form-grid-full">
                    <label className="form-label" htmlFor="editPartName">Part name</label>
                    <input
                      id="editPartName"
                      type="text"
                      name="partName"
                      className="form-input"
                      value={editModal.partName}
                      onChange={handleEditChange}
                      required
                    />
                  </div>
                  <div className="form-group form-grid-full">
                    <label className="form-label" htmlFor="editDescription">Description (optional)</label>
                    <textarea
                      id="editDescription"
                      name="description"
                      className="form-textarea"
                      value={editModal.description}
                      onChange={handleEditChange}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={handleCloseEdit} disabled={editSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={editSubmitting}>
                  {editSubmitting ? (
                    <>
                      <span className="spinner" aria-hidden="true" /> Saving&hellip;
                    </>
                  ) : (
                    'Save changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default PartRequests
