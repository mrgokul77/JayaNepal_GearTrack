import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data?.title && data?.detail) return `${data.title}: ${data.detail}`
  return fallback
}

function formatVehiclesSummary(vehicles) {
  if (!vehicles?.length) return '\u2014'
  return vehicles.map((v) => `${v.vehicleNumber} (${v.brand} ${v.model})`).join(', ')
}

function formatDateTime(value) {
  if (!value) return '\u2014'
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return String(value)
  }
}

function SearchCustomer() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)

  const runSearch = useCallback(async () => {
    const trimmed = query.trim()
    setError('')
    setHasSearched(true)

    if (!trimmed) {
      setError('Enter a name, phone, email, customer ID, or vehicle number to search.')
      setResults([])
      return
    }

    setLoading(true)
    try {
      const { data } = await api.get('/customers/search', { params: { query: trimmed } })
      setResults(Array.isArray(data) ? data : [])
    } catch (requestError) {
      setResults([])
      setError(getErrorMessage(requestError, 'Search failed. Please try again.'))
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    if (!selected) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selected])

  const handleSubmit = (event) => {
    event.preventDefault()
    void runSearch()
  }

  const showEmptyState = hasSearched && !loading && !error && results.length === 0

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">Search customers</h1>
          <p className="page-subtitle">
            Find a customer by full name, phone, email, customer ID, or vehicle registration number.
          </p>
        </div>
      </div>

      <form className="search-toolbar" onSubmit={handleSubmit} noValidate>
        <span style={{ paddingLeft: 8, color: 'var(--color-text-soft)' }} aria-hidden="true">{'\u{1F50D}'}</span>
        <input
          type="search"
          name="query"
          autoComplete="off"
          className="form-input"
          placeholder={'e.g. 9841\u2026, BA 2 PA 2034, or customer name'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search customers"
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner" aria-hidden="true" /> Searching&hellip;
            </>
          ) : (
            'Search'
          )}
        </button>
      </form>

      {error ? <div className="alert alert-error">{error}</div> : null}

      {showEmptyState ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">{'\u{1F50D}'}</div>
            <div className="empty-state-title">No results found</div>
            <div className="empty-state-desc">Try a different name, phone, or vehicle number.</div>
          </div>
        </div>
      ) : null}

      {!showEmptyState && results.length > 0 ? (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap" style={{ border: 'none' }}>
            <table className="table table-striped table-hover">
              <thead>
                <tr>
                  <th>Customer ID</th>
                  <th>Full name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelected(row)}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setSelected(row)}
                  >
                    <td><strong>#{row.id}</strong></td>
                    <td><strong>{row.fullName}</strong></td>
                    <td>{row.phone}</td>
                    <td>{row.email}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/staff/customer-history/${row.id}`)
                        }}
                      >
                        View History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {selected ? (
        <div className="modal-overlay" role="presentation" onClick={() => setSelected(null)}>
          <div
            className="modal modal-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="customer-detail-title" className="modal-title">Customer details</h2>
              <button type="button" className="modal-close" onClick={() => setSelected(null)} aria-label="Close">
                {'\u00D7'}
              </button>
            </div>
            <div className="modal-body">
              <dl className="dl-grid">
                <dt>ID</dt>
                <dd>#{selected.id}</dd>
                <dt>Full name</dt>
                <dd><strong>{selected.fullName}</strong></dd>
                <dt>Phone</dt>
                <dd>{selected.phone}</dd>
                <dt>Email</dt>
                <dd>{selected.email}</dd>
                <dt>Address</dt>
                <dd>{selected.address || '\u2014'}</dd>
                <dt>Created</dt>
                <dd className="muted">{formatDateTime(selected.createdAt)}</dd>
              </dl>

              <h3 style={{ fontSize: '0.95rem', margin: 'var(--space-4) 0 var(--space-2)' }}>Vehicles</h3>
              {selected.vehicles?.length ? (
                <div className="table-wrap">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Number</th>
                        <th>Brand</th>
                        <th>Model</th>
                        <th>Year</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.vehicles.map((v) => (
                        <tr key={v.id}>
                          <td><strong>{v.vehicleNumber}</strong></td>
                          <td>{v.brand}</td>
                          <td>{v.model}</td>
                          <td>{v.year}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted">No vehicles on file.</p>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default SearchCustomer
