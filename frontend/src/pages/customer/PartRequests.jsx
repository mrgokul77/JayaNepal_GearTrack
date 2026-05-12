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

function emptyForm() {
  return { partName: '', description: '' }
}

/**
 * Customer part requests: ask for unavailable or hard-to-find parts.
 */
function PartRequests() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await api.get('/part-requests')
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      setItems([])
      setError(getErrorMessage(e, 'Could not load part requests.'))
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
    if (!form.partName?.trim()) {
      setError('Part name is required.')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/part-requests', {
        partName: form.partName.trim(),
        description: form.description?.trim() || null,
      })
      setSuccess('Part request submitted.')
      setForm(emptyForm())
      await load()
    } catch (e) {
      setError(getErrorMessage(e, 'Could not submit part request.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="customer-profile-page">
      <Link to="/customer" className="customer-profile-back">
        ← Customer portal
      </Link>
      <h1>Part requests</h1>
      <p className="customer-profile-lead">Request parts that are out of stock or not listed in the catalog.</p>

      {error ? <div className="customer-profile-error">{error}</div> : null}
      {success ? <div className="customer-profile-success">{success}</div> : null}

      <div className="customer-profile-card">
        <h2>Request a part</h2>
        <form className="customer-profile-form" onSubmit={handleSubmit}>
          <label>
            Part name
            <input type="text" name="partName" value={form.partName} onChange={handleChange} required placeholder="e.g. Front brake pads (OEM)" />
          </label>
          <label>
            Description (optional)
            <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Vehicle, year, VIN fragment, or other details" />
          </label>
          <button type="submit" className="customer-profile-primary" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit request'}
          </button>
        </form>
      </div>

      <div className="customer-profile-card">
        <h2>Your requests</h2>
        {loading ? (
          <p className="customer-profile-muted">Loading…</p>
        ) : items.length === 0 ? (
          <p className="customer-profile-muted">No part requests yet.</p>
        ) : (
          <ul className="customer-feature-list">
            {items.map((row) => (
              <li key={row.id} className="customer-feature-list-item">
                <div>
                  <strong>{row.partName}</strong>
                  <div className="customer-feature-status">
                    Status: <em>{row.status}</em>
                    <span className="customer-feature-meta"> · {formatDateTime(row.createdAt)}</span>
                  </div>
                  {row.description ? <p className="customer-profile-muted">{row.description}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default PartRequests
