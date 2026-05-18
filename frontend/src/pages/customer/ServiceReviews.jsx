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

function formatDate(value) {
  if (!value) return '\u2014'
  try {
    return new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' })
  } catch {
    return String(value)
  }
}

function ServiceReviews() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await api.get('/service-reviews')
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      setItems([])
      setError(getErrorMessage(e, 'Could not load reviews.'))
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
          <h1 className="page-title">Service reviews</h1>
          <p className="page-subtitle">Your submitted service reviews from completed appointments.</p>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card">
        <div className="card-header">
          <div className="card-title">Your reviews</div>
          <span className="muted">{items.length} total</span>
        </div>
        {loading ? (
          <div className="loading-state">
            <span className="spinner" aria-hidden="true" /> Loading&hellip;
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">{'\u2B50'}</div>
            <div className="empty-state-title">No reviews submitted yet</div>
            <div className="empty-state-desc">
              You have not submitted any reviews yet. Reviews can be submitted from your completed appointments.
            </div>
          </div>
        ) : (
          <div className="reviews-list">
            {items.map((row) => {
              const r = Math.min(5, Math.max(0, Number(row.rating) || 0))
              const appointmentDate = row.appointmentDate ? formatDate(row.appointmentDate) : '\u2014'
              const serviceType = row.serviceType || '\u2014'
              return (
                <div key={row.id} className="review-card" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{serviceType}</div>
                      <div className="muted" style={{ fontSize: '0.9rem' }}>
                        Appointment: {appointmentDate}
                      </div>
                    </div>
                    <div className="muted" style={{ fontSize: '0.85rem' }}>
                      {formatDateTime(row.createdAt)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span className="star-display" aria-label={`${r} of 5 stars`}>
                      {'\u2605'.repeat(r)}
                      <span style={{ color: '#d1d5db' }}>{'\u2605'.repeat(5 - r)}</span>
                    </span>
                    <span className="muted" style={{ fontSize: '0.9rem' }}>({r}/5)</span>
                  </div>
                  {row.comment ? <p className="muted" style={{ marginTop: '0.5rem', marginBottom: 0 }}>{row.comment}</p> : null}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

export default ServiceReviews
