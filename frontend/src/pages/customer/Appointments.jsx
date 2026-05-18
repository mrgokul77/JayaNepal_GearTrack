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
  return { appointmentLocal: '', serviceType: '', notes: '' }
}

function statusBadgeClass(status) {
  const s = (status || '').toLowerCase()
  if (s === 'pending') return 'badge badge-warning'
  if (s === 'confirmed' || s === 'completed') return 'badge badge-success'
  if (s === 'cancelled' || s === 'canceled') return 'badge badge-danger'
  return 'badge badge-neutral'
}

function Appointments() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cancellingId, setCancellingId] = useState(null)

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await api.get('/appointments')
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      setItems([])
      setError(getErrorMessage(e, 'Could not load appointments.'))
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
    if (!form.appointmentLocal?.trim()) {
      setError('Please choose an appointment date and time.')
      return
    }
    if (!form.serviceType?.trim()) {
      setError('Service type is required.')
      return
    }
    setSubmitting(true)
    try {
      const appointmentDate = new Date(form.appointmentLocal).toISOString()
      await api.post('/appointments', {
        appointmentDate,
        serviceType: form.serviceType.trim(),
        notes: form.notes?.trim() || null,
      })
      setSuccess('Appointment booked.')
      setForm(emptyForm())
      await load()
    } catch (e) {
      setError(getErrorMessage(e, 'Could not book appointment.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async (id) => {
    setError('')
    setSuccess('')
    setCancellingId(id)
    try {
      await api.delete(`/appointments/${id}`)
      setSuccess('Appointment cancelled.')
      await load()
    } catch (e) {
      setError(getErrorMessage(e, 'Could not cancel appointment.'))
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">Appointments</h1>
          <p className="page-subtitle">Book a workshop visit and manage your scheduled services.</p>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}

      <div className="card">
        <div className="card-header">
          <div className="card-title">Book an appointment</div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="appointmentLocal">Date &amp; time</label>
              <input
                id="appointmentLocal"
                type="datetime-local"
                name="appointmentLocal"
                className="form-input"
                value={form.appointmentLocal}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="serviceType">Service type</label>
              <input
                id="serviceType"
                type="text"
                name="serviceType"
                className="form-input"
                value={form.serviceType}
                onChange={handleChange}
                placeholder="e.g. Oil change, brake inspection"
                required
              />
            </div>
            <div className="form-group form-grid-full">
              <label className="form-label" htmlFor="notes">Notes (optional)</label>
              <textarea
                id="notes"
                name="notes"
                className="form-textarea"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Vehicle details or special requests"
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Booking&hellip;
                </>
              ) : (
                'Book appointment'
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Your appointments</div>
          <span className="muted">{items.length} total</span>
        </div>
        {loading ? (
          <div className="loading-state">
            <span className="spinner" aria-hidden="true" /> Loading&hellip;
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">{'\u{1F4C5}'}</div>
            <div className="empty-state-title">No appointments yet</div>
            <div className="empty-state-desc">Book one above to schedule a workshop visit.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Service type</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th className="num">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td><strong>{formatDateTime(row.appointmentDate)}</strong></td>
                    <td>{row.serviceType || '\u2014'}</td>
                    <td>
                      <span className={statusBadgeClass(row.status)}>{row.status || 'Unknown'}</span>
                    </td>
                    <td className="muted">{row.notes?.trim() ? row.notes : '\u2014'}</td>
                    <td>
                      <div className="actions">
                        {String(row.status).toLowerCase() === 'pending' ? (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            disabled={cancellingId === row.id}
                            onClick={() => void handleCancel(row.id)}
                          >
                            {cancellingId === row.id ? 'Cancelling\u2026' : 'Cancel'}
                          </button>
                        ) : null}
                      </div>
                    </td>
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

export default Appointments
