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

const STAR_VALUES = [1, 2, 3, 4, 5]

function Appointments() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cancellingId, setCancellingId] = useState(null)

  // Review modal state
  const [reviewModal, setReviewModal] = useState({
    open: false,
    appointmentId: null,
    appointmentDetails: null,
    rating: 5,
    comment: '',
  })
  const [reviewSubmitting, setReviewSubmitting] = useState(false)

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

  const openReviewModal = (appointment) => {
    setReviewModal({
      open: true,
      appointmentId: appointment.id,
      appointmentDetails: appointment,
      rating: 5,
      comment: '',
    })
    setError('')
  }

  const closeReviewModal = () => {
    if (reviewSubmitting) return
    setReviewModal({
      open: false,
      appointmentId: null,
      appointmentDetails: null,
      rating: 5,
      comment: '',
    })
  }

  const handleReviewSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (reviewModal.rating < 1 || reviewModal.rating > 5) {
      setError('Please choose a rating from 1 to 5.')
      return
    }

    setReviewSubmitting(true)
    try {
      await api.post('/service-reviews', {
        rating: reviewModal.rating,
        comment: reviewModal.comment?.trim() || null,
        appointmentId: reviewModal.appointmentId,
      })
      setSuccess('Thank you — your review was submitted.')
      closeReviewModal()
      await load()
    } catch (e) {
      setError(getErrorMessage(e, 'Could not submit review.'))
    } finally {
      setReviewSubmitting(false)
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
                        ) : String(row.status).toLowerCase() === 'completed' ? (
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            onClick={() => openReviewModal(row)}
                          >
                            {'\u2B50'} Leave a Review
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

      {reviewModal.open && reviewModal.appointmentDetails ? (
        <div className="modal-overlay" role="presentation" onClick={closeReviewModal}>
          <div
            className="modal modal-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="review-title" className="modal-title">Leave a review for this appointment</h2>
              <button type="button" className="modal-close" onClick={closeReviewModal} aria-label="Close">
                {'\u00D7'}
              </button>
            </div>
            <div className="modal-body">
              <div className="card" style={{ marginBottom: 'var(--space-4)', border: '1px solid var(--color-border)' }}>
                <div style={{ padding: 'var(--space-3)' }}>
                  <strong>{reviewModal.appointmentDetails.serviceType}</strong>
                  <div className="muted" style={{ fontSize: '0.875rem', marginTop: 4 }}>
                    {formatDateTime(reviewModal.appointmentDetails.appointmentDate)}
                  </div>
                </div>
              </div>

              <form onSubmit={handleReviewSubmit}>
                <div className="form-group">
                  <label className="form-label">Rating</label>
                  <div className="star-row" role="group" aria-label="Rating 1 to 5 stars">
                    {STAR_VALUES.map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`star-btn${reviewModal.rating >= n ? ' active' : ''}`}
                        aria-pressed={reviewModal.rating === n}
                        aria-label={`${n} star${n === 1 ? '' : 's'}`}
                        onClick={() => setReviewModal((prev) => ({ ...prev, rating: n }))}
                      >
                        {'\u2605'}
                      </button>
                    ))}
                    <span className="muted" style={{ marginLeft: 8 }}>{reviewModal.rating} / 5</span>
                  </div>
                </div>

                <div className="form-group mt-4">
                  <label className="form-label" htmlFor="review-comment">Comment (optional)</label>
                  <textarea
                    id="review-comment"
                    className="form-textarea"
                    value={reviewModal.comment}
                    onChange={(e) => setReviewModal((prev) => ({ ...prev, comment: e.target.value }))}
                    rows={4}
                    placeholder="What went well or what we could improve"
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeReviewModal}
                    disabled={reviewSubmitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={reviewSubmitting}>
                    {reviewSubmitting ? (
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
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default Appointments
