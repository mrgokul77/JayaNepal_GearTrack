import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import './CustomerProfile.css'

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

const STAR_VALUES = [1, 2, 3, 4, 5]

/**
 * Customer service reviews: star rating and optional comment.
 */
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
      setSuccess('Thank you — your review was submitted.')
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
    <section className="customer-profile-page">
      <Link to="/customer" className="customer-profile-back">
        ← Customer portal
      </Link>
      <h1>Service reviews</h1>
      <p className="customer-profile-lead">Rate your experience and leave feedback for our team.</p>

      {error ? <div className="customer-profile-error">{error}</div> : null}
      {success ? <div className="customer-profile-success">{success}</div> : null}

      <div className="customer-profile-card">
        <h2>Submit a review</h2>
        <form className="customer-profile-form" onSubmit={handleSubmit}>
          <div>
            <span className="customer-profile-muted" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, color: '#374151' }}>
              Rating (1–5)
            </span>
            <div className="customer-feature-stars" role="group" aria-label="Rating 1 to 5 stars">
              {STAR_VALUES.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`customer-feature-star${rating === n ? ' active' : ''}`}
                  aria-pressed={rating === n}
                  aria-label={`${n} star${n === 1 ? '' : 's'}`}
                  onClick={() => setRating(n)}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <label>
            Comment (optional)
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} placeholder="What went well or what we could improve" />
          </label>
          <button type="submit" className="customer-profile-primary" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit review'}
          </button>
        </form>
      </div>

      <div className="customer-profile-card">
        <h2>Your reviews</h2>
        {loading ? (
          <p className="customer-profile-muted">Loading…</p>
        ) : items.length === 0 ? (
          <p className="customer-profile-muted">You have not submitted any reviews yet.</p>
        ) : (
          <ul className="customer-feature-list">
            {items.map((row) => {
              const r = Math.min(5, Math.max(0, Number(row.rating) || 0))
              return (
              <li key={row.id} className="customer-feature-list-item">
                <div>
                  <strong>{'★'.repeat(r)}{'☆'.repeat(5 - r)}</strong>
                  <span className="customer-feature-meta"> ({r}/5)</span>
                  <div className="customer-feature-status">{formatDateTime(row.createdAt)}</div>
                  {row.comment ? <p className="customer-profile-muted">{row.comment}</p> : null}
                </div>
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
