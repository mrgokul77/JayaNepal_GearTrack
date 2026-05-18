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
  if (s === 'ordered') return 'badge badge-info'
  if (s === 'available') return 'badge badge-success'
  if (s === 'fulfilled' || s === 'completed') return 'badge badge-success'
  if (s === 'rejected') return 'badge badge-danger'
  return 'badge badge-neutral'
}

function PartRequestsAdmin() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(null)

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await api.get('/part-requests/all')
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      setItems([])
      setError(getErrorMessage(e, 'Could not load part requests.'))
    } finally {
      setLoading(false)
    }
  }, [])

  const handleStatusChange = async (requestId, newStatus) => {
    setUpdating(requestId)
    console.log(`[PartRequests] Changing status for request ${requestId} to "${newStatus}"`)
    try {
      console.log(`[PartRequests] Sending PATCH to /part-requests/${requestId}/status`)
      console.log(`[PartRequests] Body:`, JSON.stringify({ status: newStatus }))
      
      const { data } = await api.patch(`/part-requests/${requestId}/status`, {
        status: newStatus,
      })
      
      console.log(`[PartRequests] Response received:`, data)
      
      // Update the item in the list
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === requestId ? { ...item, status: data.status } : item
        )
      )
    } catch (e) {
      console.error(`[PartRequests] Error updating status:`, e)
      console.error(`[PartRequests] Response status:`, e.response?.status)
      console.error(`[PartRequests] Response data:`, e.response?.data)
      setError(getErrorMessage(e, 'Failed to update part request status.'))
    } finally {
      setUpdating(null)
    }
  }

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">All part requests</h1>
          <p className="page-subtitle">Requested unavailable or special-order parts from all customers.</p>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card">
        <div className="card-header">
          <div className="card-title">Part requests</div>
          <span className="muted">{items.length} total</span>
        </div>
        {loading ? (
          <div className="loading-state">
            <span className="spinner" aria-hidden="true" /> Loading&hellip;
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">{'\u2709'}</div>
            <div className="empty-state-title">No part requests found</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Part</th>
                  <th>Customer</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td><strong>{row.partName}</strong></td>
                    <td>{row.customerName || `Customer #${row.customerId}`}</td>
                    <td className="muted">{row.description || '\u2014'}</td>
                    <td>
                      <select
                        className="form-select"
                        value={row.status || 'Pending'}
                        onChange={(e) => handleStatusChange(row.id, e.target.value)}
                        disabled={updating === row.id}
                        style={{ minWidth: '120px' }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Ordered">Ordered</option>
                        <option value="Available">Available</option>
                      </select>
                      <span
                        className={statusBadgeClass(row.status)}
                        style={{ marginLeft: '8px', display: 'inline-block' }}
                      >
                        {row.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="muted">{formatDateTime(row.createdAt)}</td>
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

export default PartRequestsAdmin
