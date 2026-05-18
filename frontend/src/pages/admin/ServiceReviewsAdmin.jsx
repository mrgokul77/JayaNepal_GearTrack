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

function ServiceReviewsAdmin() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await api.get('/service-reviews/all')
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      setItems([])
      setError(getErrorMessage(e, 'Could not load service reviews.'))
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
          <h1 className="page-title">All service reviews</h1>
          <p className="page-subtitle">Customer feedback and ratings across all services.</p>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card">
        <div className="card-header">
          <div className="card-title">Reviews</div>
          <span className="muted">{items.length} total</span>
        </div>
        {loading ? (
          <div className="loading-state">
            <span className="spinner" aria-hidden="true" /> Loading&hellip;
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">{'\u2B50'}</div>
            <div className="empty-state-title">No reviews found</div>
          </div>
        ) : (
          <ul className="notification-list">
            {items.map((row) => {
              const rating = Math.min(5, Math.max(0, Number(row.rating) || 0))
              return (
                <li key={row.id} className="notification-item">
                  <div className="notification-header">
                    <span>{row.customerName || `Customer #${row.customerId}`}</span>
                    <span className="notification-meta">{formatDateTime(row.createdAt)}</span>
                  </div>
                  <div className="notification-header" style={{ marginTop: 4 }}>
                    <span className="star-display" aria-label={`${rating} of 5 stars`}>
                      {'\u2605'.repeat(rating)}
                      <span style={{ color: '#d1d5db' }}>{'\u2605'.repeat(5 - rating)}</span>
                    </span>
                  </div>
                  {row.comment ? <p className="notification-message">{row.comment}</p> : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

export default ServiceReviewsAdmin
