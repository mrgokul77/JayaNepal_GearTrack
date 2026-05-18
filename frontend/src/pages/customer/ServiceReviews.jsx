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

const STAR_VALUES = [1, 2, 3, 4, 5]

function ServiceReviews() {
  const [items, setItems] = useState([])
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

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

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (rating < 1 || rating > 5) {
      setError('Please choose a rating from 1 to 5.')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/service-reviews', {
        rating,
        comment: comment.trim() || null,
      })
      setSuccess('Thank you \u2014 your review was submitted.')
      setComment('')
      setRating(5)
      await load()
    } catch (e) {
      setError(getErrorMessage(e, 'Could not submit review.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">Service reviews</h1>
          <p className="page-subtitle">Rate your experience and leave feedback for our team.</p>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}

      <div className="card">
        <div className="card-header">
          <div className="card-title">Submit a review</div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Rating</label>
            <div className="star-row" role="group" aria-label="Rating 1 to 5 stars">
              {STAR_VALUES.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`star-btn${rating >= n ? ' active' : ''}`}
                  aria-pressed={rating === n}
                  aria-label={`${n} star${n === 1 ? '' : 's'}`}
                  onClick={() => setRating(n)}
                >
                  {'\u2605'}
                </button>
              ))}
              <span className="muted" style={{ marginLeft: 8 }}>{rating} / 5</span>
            </div>
          </div>

          <div className="form-group mt-4">
            <label className="form-label" htmlFor="comment">Comment (optional)</label>
            <textarea
              id="comment"
              className="form-textarea"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="What went well or what we could improve"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Submitting&hellip;
                </>
              ) : (
                'Submit review'
              )}
            </button>
          </div>
        </form>
      </div>

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
            <div className="empty-state-title">No reviews yet</div>
            <div className="empty-state-desc">Submit your first review above.</div>
          </div>
        ) : (
          <ul className="notification-list">
            {items.map((row) => {
              const r = Math.min(5, Math.max(0, Number(row.rating) || 0))
              return (
                <li key={row.id} className="notification-item">
                  <div className="notification-header">
                    <span className="star-display" aria-label={`${r} of 5 stars`}>
                      {'\u2605'.repeat(r)}
                      <span style={{ color: '#d1d5db' }}>{'\u2605'.repeat(5 - r)}</span>
                    </span>
                    <span className="notification-meta">{formatDateTime(row.createdAt)}</span>
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

export default ServiceReviews
