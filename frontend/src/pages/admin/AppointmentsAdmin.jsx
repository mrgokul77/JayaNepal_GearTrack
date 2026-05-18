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

function AppointmentsAdmin() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">All appointments</h1>
          <p className="page-subtitle">Customer service bookings across the workshop.</p>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card">
        <div className="card-header">
          <div className="card-title">Appointments</div>
          <span className="muted">{items.length} total</span>
        </div>
        {loading ? (
          <div className="loading-state">
            <span className="spinner" aria-hidden="true" /> Loading&hellip;
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">{'\u{1F4C5}'}</div>
            <div className="empty-state-title">No appointments found</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Customer</th>
                  <th>Service type</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td><strong>{formatDateTime(row.appointmentDate)}</strong></td>
                    <td>{row.customerName || `Customer #${row.customerId}`}</td>
                    <td>{row.serviceType || '\u2014'}</td>
                    <td>
                      <span className={statusBadgeClass(row.status)}>{row.status || 'Unknown'}</span>
                    </td>
                    <td className="muted">{row.notes?.trim() ? row.notes : '\u2014'}</td>
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

export default AppointmentsAdmin
