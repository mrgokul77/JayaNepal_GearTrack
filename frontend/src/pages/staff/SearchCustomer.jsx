import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import './SearchCustomer.css'

/** Pulls a readable message from an Axios error response. */
function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data?.title && data?.detail) return `${data.title}: ${data.detail}`
  return fallback
}

/** Formats vehicle list for the results table (compact). */
function formatVehiclesSummary(vehicles) {
  if (!vehicles?.length) return '—'
  return vehicles
    .map((v) => `${v.vehicleNumber} (${v.brand} ${v.model})`)
    .join(', ')
}

function SearchCustomer() {
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
    <section className="search-customer-page">
      <Link to="/staff" className="search-customer-back">
        ← Staff workspace
      </Link>
      <h1>Search customers</h1>
      <p className="search-customer-lead">
        Find a customer by full name, phone, email, customer ID, or vehicle registration number.
      </p>

      <form className="search-customer-toolbar" onSubmit={handleSubmit} noValidate>
        <input
          type="search"
          name="query"
          autoComplete="off"
          placeholder="e.g. 9841…, BA 2 PA 2034, or customer name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search customers"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error ? <div className="search-customer-error">{error}</div> : null}

      {showEmptyState ? (
        <div className="search-customer-empty" role="status">
          No results found.
        </div>
      ) : null}

      {!showEmptyState && results.length > 0 ? (
        <div className="search-customer-table-wrap">
          <table className="search-customer-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Full name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Vehicles</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr key={row.id} onClick={() => setSelected(row)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSelected(row)}>
                  <td>{row.id}</td>
                  <td>{row.fullName}</td>
                  <td>{row.phone}</td>
                  <td>{row.email}</td>
                  <td>{formatVehiclesSummary(row.vehicles)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {selected ? (
        <div className="search-customer-modal-overlay" role="presentation" onClick={() => setSelected(null)}>
          <div className="search-customer-modal" role="dialog" aria-modal="true" aria-labelledby="customer-detail-title" onClick={(e) => e.stopPropagation()}>
            <header>
              <h2 id="customer-detail-title">Customer details</h2>
              <button type="button" className="search-customer-modal-close" onClick={() => setSelected(null)} aria-label="Close">
                ×
              </button>
            </header>
            <div className="search-customer-modal-body">
              <dl className="search-customer-detail-grid">
                <dt>ID</dt>
                <dd>{selected.id}</dd>
                <dt>Full name</dt>
                <dd>{selected.fullName}</dd>
                <dt>Phone</dt>
                <dd>{selected.phone}</dd>
                <dt>Email</dt>
                <dd>{selected.email}</dd>
                <dt>Address</dt>
                <dd>{selected.address || '—'}</dd>
                <dt>Created</dt>
                <dd>{selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—'}</dd>
              </dl>

              <div className="search-customer-modal-vehicles">
                <h3>Vehicles</h3>
                {selected.vehicles?.length ? (
                  <table>
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
                          <td>{v.vehicleNumber}</td>
                          <td>{v.brand}</td>
                          <td>{v.model}</td>
                          <td>{v.year}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="search-customer-empty" style={{ padding: 0 }}>
                    No vehicles on file.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default SearchCustomer
