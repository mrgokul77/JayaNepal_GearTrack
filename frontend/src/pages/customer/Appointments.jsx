import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import './CustomerProfile.css'

/** Maps Axios / ASP.NET error payloads to a single user-facing string. */
function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data?.title && data?.detail) return `${data.title}: ${data.detail}`
  return fallback
}

function formatDateTime(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return String(value)
  }
}

function emptyForm() {
  return { appointmentLocal: '', serviceType: '', notes: '' }
}

/**
 * Customer appointments: book a service slot, list bookings, cancel pending ones.
 */
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
    <section className="customer-profile-page">
      <Link to="/customer" className="customer-profile-back">
        ← Customer portal
      </Link>
      <h1>Appointments</h1>
      <p className="customer-profile-lead">Book a workshop visit and manage your scheduled services.</p>

      {error ? <div className="customer-profile-error">{error}</div> : null}
      {success ? <div className="customer-profile-success">{success}</div> : null}

      <div className="customer-profile-card">
        <h2>Book an appointment</h2>
        <form className="customer-profile-form" onSubmit={handleSubmit}>
          <label>
            Date &amp; time
            <input
              type="datetime-local"
              name="appointmentLocal"
              value={form.appointmentLocal}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Service type
            <input
              type="text"
              name="serviceType"
              value={form.serviceType}
              onChange={handleChange}
              placeholder="e.g. Oil change, brake inspection"
              required
            />
          </label>
          <label>
            Notes (optional)
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} placeholder="Vehicle details or special requests" />
          </label>
          <button type="submit" className="customer-profile-primary" disabled={submitting}>
            {submitting ? 'Booking…' : 'Book appointment'}
          </button>
        </form>
      </div>

      <div className="customer-profile-card">
        <h2>Your appointments</h2>
        {loading ? (
          <p className="customer-profile-muted">Loading…</p>
        ) : items.length === 0 ? (
          <p className="customer-profile-muted">No appointments yet.</p>
        ) : (
          <ul className="customer-feature-list">
            {items.map((row) => (
              <li key={row.id} className="customer-feature-list-item">
                <div>
                  <strong>{formatDateTime(row.appointmentDate)}</strong>
                  <span className="customer-feature-meta"> · {row.serviceType}</span>
                  <div className="customer-feature-status">
                    Status: <em>{row.status}</em>
                  </div>
                  {row.notes ? <p className="customer-profile-muted">{row.notes}</p> : null}
                </div>
                {String(row.status).toLowerCase() === 'pending' ? (
                  <button
                    type="button"
                    className="customer-profile-secondary"
                    disabled={cancellingId === row.id}
                    onClick={() => void handleCancel(row.id)}
                  >
                    {cancellingId === row.id ? 'Cancelling…' : 'Cancel'}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default Appointments
