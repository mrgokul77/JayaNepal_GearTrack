import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../../services/api'

function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data?.title && data?.detail) return `${data.title}: ${data.detail}`
  return fallback
}

function formatDate(iso) {
  if (!iso) return '\u2014'
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
  } catch {
    return String(iso)
  }
}

const emptyCreate = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  role: 'Staff',
}

const emptyEdit = {
  fullName: '',
  phone: '',
  role: 'Staff',
}

function roleBadgeClass(role) {
  const r = (role || '').toLowerCase()
  if (r === 'admin') return 'badge badge-info'
  if (r === 'staff') return 'badge badge-success'
  return 'badge badge-neutral'
}

/**
 * Admin-only staff management. Mirrors the Vendors page layout: header with
 * action button, search bar, table, and modal-based add/edit forms.
 */
function RegisterStaff() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')

  const [modal, setModal] = useState({
    open: false,
    mode: 'create',
    id: null,
    createForm: emptyCreate,
    editForm: emptyEdit,
    originalEmail: '',
  })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const loadStaff = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await api.get('/admin/staff')
      setStaff(Array.isArray(data) ? data : [])
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not load staff.'))
      setStaff([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStaff()
  }, [loadStaff])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return staff
    return staff.filter(
      (s) =>
        (s.fullName && s.fullName.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.phone && String(s.phone).toLowerCase().includes(q)) ||
        (s.role && s.role.toLowerCase().includes(q)),
    )
  }, [staff, search])

  const openCreate = () => {
    setError('')
    setSuccess('')
    setModal({
      open: true,
      mode: 'create',
      id: null,
      createForm: emptyCreate,
      editForm: emptyEdit,
      originalEmail: '',
    })
  }

  const openEdit = (row) => {
    setError('')
    setSuccess('')
    setModal({
      open: true,
      mode: 'edit',
      id: row.id,
      createForm: emptyCreate,
      editForm: {
        fullName: row.fullName ?? '',
        phone: row.phone ?? '',
        role: row.role === 'Admin' ? 'Admin' : 'Staff',
      },
      originalEmail: row.email ?? '',
    })
  }

  const closeModal = () => {
    if (saving) return
    setModal((prev) => ({ ...prev, open: false }))
  }

  const handleCreateChange = (event) => {
    const { name, value } = event.target
    setModal((prev) => ({
      ...prev,
      createForm: { ...prev.createForm, [name]: value },
    }))
  }

  const handleEditChange = (event) => {
    const { name, value } = event.target
    setModal((prev) => ({
      ...prev,
      editForm: { ...prev.editForm, [name]: value },
    }))
  }

  const handleCreateSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    const payload = {
      fullName: modal.createForm.fullName.trim(),
      email: modal.createForm.email.trim(),
      phone: modal.createForm.phone.trim(),
      password: modal.createForm.password,
      role: modal.createForm.role,
    }
    if (!payload.fullName || !payload.email || !payload.phone || !payload.password) {
      setError('Full name, email, phone, and password are required.')
      return
    }
    if (payload.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setSaving(true)
    try {
      await api.post('/auth/register-staff', payload)
      setSuccess(`Account created for ${payload.fullName}.`)
      setModal((prev) => ({ ...prev, open: false }))
      await loadStaff()
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not create staff account.'))
    } finally {
      setSaving(false)
    }
  }

  const handleEditSubmit = async (event) => {
    event.preventDefault()
    if (modal.id == null) return
    setError('')
    setSuccess('')
    const payload = {
      fullName: modal.editForm.fullName.trim(),
      phone: modal.editForm.phone.trim(),
      role: modal.editForm.role,
    }
    if (!payload.fullName) {
      setError('Full name is required.')
      return
    }
    setSaving(true)
    try {
      await api.put(`/admin/staff/${modal.id}`, payload)
      setSuccess(`${payload.fullName} updated successfully.`)
      setModal((prev) => ({ ...prev, open: false }))
      await loadStaff()
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not update staff member.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row) => {
    const ok = window.confirm(
      `Delete the account for "${row.fullName}"? This cannot be undone. Accounts linked to sales invoices cannot be removed.`,
    )
    if (!ok) return
    setError('')
    setSuccess('')
    setDeletingId(row.id)
    try {
      await api.delete(`/admin/staff/${row.id}`)
      setSuccess(`${row.fullName} was deleted.`)
      await loadStaff()
    } catch (requestError) {
      const status = requestError.response?.status
      if (status === 409) {
        setError(getErrorMessage(requestError, 'This staff member is still linked to other records.'))
      } else {
        setError(getErrorMessage(requestError, 'Could not delete staff member.'))
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p className="page-subtitle">Manage staff accounts and roles.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <span aria-hidden="true">{'\u2795'}</span> Add Staff
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
          placeholder="Search staff by name, email, phone, or role"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="loading-state">
            <span className="spinner" aria-hidden="true" /> Loading staff&hellip;
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">{'\u{1F465}'}</div>
            <div className="empty-state-title">{staff.length === 0 ? 'No staff accounts yet' : 'No matches'}</div>
            <div className="empty-state-desc">
              {staff.length === 0
                ? 'Click "Add Staff" to create your first Admin or Staff account.'
                : 'Try a different search term.'}
            </div>
          </div>
        ) : (
          <div className="table-wrap" style={{ border: 'none' }}>
            <table className="table table-striped table-hover">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th className="num">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.fullName}</strong>
                    </td>
                    <td>{row.email || '\u2014'}</td>
                    <td>{row.phone || '\u2014'}</td>
                    <td>
                      <span className={roleBadgeClass(row.role)}>{row.role || 'Unknown'}</span>
                    </td>
                    <td className="muted">{formatDate(row.createdAt)}</td>
                    <td>
                      <div className="actions">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(row)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          disabled={deletingId === row.id}
                          onClick={() => void handleDelete(row)}
                        >
                          {deletingId === row.id ? (
                            <>
                              <span className="spinner" aria-hidden="true" /> &hellip;
                            </>
                          ) : (
                            'Delete'
                          )}
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
            className={modal.mode === 'create' ? 'modal modal-lg' : 'modal'}
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="staff-modal-title" className="modal-title">
                {modal.mode === 'edit' ? 'Edit staff member' : 'Add staff'}
              </h2>
              <button type="button" className="modal-close" onClick={closeModal} aria-label="Close">
                {'\u00D7'}
              </button>
            </div>

            {modal.mode === 'create' ? (
              <form onSubmit={handleCreateSubmit}>
                <div className="modal-body">
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label" htmlFor="newFullName">Full name</label>
                      <input
                        id="newFullName"
                        name="fullName"
                        className="form-input"
                        autoComplete="name"
                        value={modal.createForm.fullName}
                        onChange={handleCreateChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="newEmail">Email</label>
                      <input
                        id="newEmail"
                        name="email"
                        type="email"
                        className="form-input"
                        autoComplete="email"
                        value={modal.createForm.email}
                        onChange={handleCreateChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="newPhone">Phone</label>
                      <input
                        id="newPhone"
                        name="phone"
                        type="tel"
                        className="form-input"
                        autoComplete="tel"
                        value={modal.createForm.phone}
                        onChange={handleCreateChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="newRole">Role</label>
                      <select
                        id="newRole"
                        name="role"
                        className="form-select"
                        value={modal.createForm.role}
                        onChange={handleCreateChange}
                      >
                        <option value="Staff">Staff</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>
                    <div className="form-group form-grid-full">
                      <label className="form-label" htmlFor="newPassword">Temporary password</label>
                      <input
                        id="newPassword"
                        name="password"
                        type="password"
                        className="form-input"
                        autoComplete="new-password"
                        value={modal.createForm.password}
                        onChange={handleCreateChange}
                        required
                        minLength={6}
                      />
                      <span className="form-hint">At least 6 characters. Share securely with the new user.</span>
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
                    ) : (
                      'Save'
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleEditSubmit}>
                <div className="modal-body">
                  <div className="form-grid">
                    <div className="form-group form-grid-full">
                      <label className="form-label">Email</label>
                      <input className="form-input" value={modal.originalEmail} disabled />
                      <span className="form-hint">Email is the sign-in identifier and can't be changed here.</span>
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="editFullName">Full name</label>
                      <input
                        id="editFullName"
                        name="fullName"
                        className="form-input"
                        value={modal.editForm.fullName}
                        onChange={handleEditChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="editPhone">Phone</label>
                      <input
                        id="editPhone"
                        name="phone"
                        type="tel"
                        className="form-input"
                        value={modal.editForm.phone}
                        onChange={handleEditChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="editRole">Role</label>
                      <select
                        id="editRole"
                        name="role"
                        className="form-select"
                        value={modal.editForm.role}
                        onChange={handleEditChange}
                      >
                        <option value="Staff">Staff</option>
                        <option value="Admin">Admin</option>
                      </select>
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
                    ) : (
                      'Save changes'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default RegisterStaff
