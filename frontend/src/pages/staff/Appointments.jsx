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

function statusBadgeClass(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'pending') return 'badge badge-warning'
  if (s === 'confirmed' || s === 'completed') return 'badge badge-success'
  if (s === 'cancelled' || s === 'canceled') return 'badge badge-danger'
  return 'badge badge-neutral'
}

const STATUS_OPTIONS = ['Pending', 'Confirmed', 'Completed', 'Cancelled']

function StaffAppointments() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [updatingId, setUpdatingId] = useState(null)

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await api.get('/appointments/all')
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

  const handleStatusChange = async (appointmentId, newStatus) => {
    setError('')
    setSuccess('')
    setUpdatingId(appointmentId)

    try {
      await api.patch(`/appointments/${appointmentId}/status`, {
        status: newStatus,
      })
      setSuccess('Appointment status updated.')
      await load()
    } catch (e) {
      setError(getErrorMessage(e, 'Could not update appointment status.'))
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">Appointments</h1>
          <p className="page-subtitle">Manage customer service appointments and update their status.</p>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}

      <div className="card">
        <div className="card-header">
          <div className="card-title">Service appointments</div>
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
            <div className="empty-state-desc">Appointments will appear here as customers book services.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Customer</th>
                  <th>Service type</th>
                  <th>Vehicle details</th>
                  <th>Status</th>
                  <th className="num">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td><strong>{formatDateTime(row.appointmentDate)}</strong></td>
                    <td>{row.customerName || `Customer #${row.customerId}`}</td>
                    <td>{row.serviceType || '\u2014'}</td>
                    <td className="muted" style={{ fontSize: '0.875rem' }}>
                      {row.notes?.trim() ? row.notes : '\u2014'}
                    </td>
                    <td>
                      <span className={statusBadgeClass(row.status)}>{row.status || 'Unknown'}</span>
                    </td>
                    <td>
                      <select
                        className="form-select"
                        value={row.status || ''}
                        onChange={(e) => handleStatusChange(row.id, e.target.value)}
                        disabled={updatingId === row.id}
                        style={{ fontSize: '0.875rem' }}
                      >
                        <option value="">Change status…</option>
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
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

export default StaffAppointments
