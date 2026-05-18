import { useCallback, useEffect, useState } from 'react'
import api from '../../services/api'

function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data?.title && data?.detail) return `${data.title}: ${data.detail}`
  return fallback
}

const money = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

function formatMoney(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return money.format(0)
  return money.format(n)
}

function formatDate(value) {
  if (!value) return '\u2014'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '\u2014'
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

const TABS = [
  { id: 'regular', label: 'Regular customers' },
  { id: 'high', label: 'High spenders' },
  { id: 'pending', label: 'Pending credits' },
]

function CustomerReports() {
  const [activeTab, setActiveTab] = useState('regular')
  const [regularRows, setRegularRows] = useState(null)
  const [highRows, setHighRows] = useState(null)
  const [pendingRows, setPendingRows] = useState(null)
  const [errorByTab, setErrorByTab] = useState({})
  const [loadingByTab, setLoadingByTab] = useState({})

  const loadTab = useCallback(
    async (tabId, force = false) => {
      if (!force) {
        if (tabId === 'regular' && regularRows !== null) return
        if (tabId === 'high' && highRows !== null) return
        if (tabId === 'pending' && pendingRows !== null) return
      }

      setLoadingByTab((prev) => ({ ...prev, [tabId]: true }))
      setErrorByTab((prev) => ({ ...prev, [tabId]: '' }))

      const path =
        tabId === 'regular'
          ? '/customer-reports/regular-customers'
          : tabId === 'high'
            ? '/customer-reports/high-spenders'
            : '/customer-reports/pending-credits'

      try {
        const { data } = await api.get(path)
        if (tabId === 'regular') setRegularRows(Array.isArray(data) ? data : [])
        if (tabId === 'high') setHighRows(Array.isArray(data) ? data : [])
        if (tabId === 'pending') setPendingRows(Array.isArray(data) ? data : [])
      } catch (requestError) {
        const msg = getErrorMessage(requestError, 'Could not load this report.')
        setErrorByTab((prev) => ({ ...prev, [tabId]: msg }))
        if (tabId === 'regular') setRegularRows([])
        if (tabId === 'high') setHighRows([])
        if (tabId === 'pending') setPendingRows([])
      } finally {
        setLoadingByTab((prev) => ({ ...prev, [tabId]: false }))
      }
    },
    [regularRows, highRows, pendingRows],
  )

  useEffect(() => {
    void loadTab(activeTab)
  }, [activeTab, loadTab])

  const handlePrint = () => {
    window.print()
  }

  const err = errorByTab[activeTab]
  const loading = loadingByTab[activeTab]

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer reports</h1>
          <p className="page-subtitle">
            Regular buyers, top spenders, and pending credit follow-ups. Each tab loads on demand.
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void loadTab(activeTab, true)}
            disabled={!!loading}
          >
            {loading ? (
              <>
                <span className="spinner" aria-hidden="true" /> Refreshing&hellip;
              </>
            ) : (
              'Refresh'
            )}
          </button>
          <button type="button" className="btn btn-primary" onClick={handlePrint}>
            <span aria-hidden="true">{'\u{1F5A8}'}</span> Print / Export
          </button>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Report type">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {err ? <div className="alert alert-error">{err}</div> : null}

      {loading ? (
        <div className="loading-state">
          <span className="spinner" aria-hidden="true" /> Loading report&hellip;
        </div>
      ) : null}

      {!loading && activeTab === 'regular' ? (
        <div className="card" style={{ padding: 0 }}>
          {!regularRows?.length && !err ? (
            <div className="empty-state">
              <div className="empty-state-icon" aria-hidden="true">{'\u{1F465}'}</div>
              <div className="empty-state-title">No regular customers yet</div>
              <div className="empty-state-desc">Customers appear here after more than two purchases.</div>
            </div>
          ) : (
            <div className="table-wrap" style={{ border: 'none' }}>
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th className="num">Purchases</th>
                    <th className="num">Total spent</th>
                  </tr>
                </thead>
                <tbody>
                  {(regularRows ?? []).map((row, idx) => (
                    <tr key={row.customerId}>
                      <td>{idx + 1}</td>
                      <td className="muted">#{row.customerId}</td>
                      <td><strong>{row.fullName}</strong></td>
                      <td>{row.email}</td>
                      <td>{row.phone || '\u2014'}</td>
                      <td className="num">{row.totalPurchases}</td>
                      <td className="num"><strong>{formatMoney(row.totalSpent)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {!loading && activeTab === 'high' ? (
        <div className="card" style={{ padding: 0 }}>
          {!highRows?.length && !err ? (
            <div className="empty-state">
              <div className="empty-state-icon" aria-hidden="true">{'\u{1F4B5}'}</div>
              <div className="empty-state-title">No high spenders yet</div>
              <div className="empty-state-desc">Top customers by total purchases will be listed here.</div>
            </div>
          ) : (
            <div className="table-wrap" style={{ border: 'none' }}>
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th className="num">Total spent</th>
                    <th>Last purchase</th>
                  </tr>
                </thead>
                <tbody>
                  {(highRows ?? []).map((row, idx) => (
                    <tr key={row.customerId}>
                      <td>{idx + 1}</td>
                      <td className="muted">#{row.customerId}</td>
                      <td><strong>{row.fullName}</strong></td>
                      <td>{row.email}</td>
                      <td>{row.phone || '\u2014'}</td>
                      <td className="num"><strong>{formatMoney(row.totalSpent)}</strong></td>
                      <td className="muted">{formatDate(row.lastPurchaseDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {!loading && activeTab === 'pending' ? (
        <div className="card" style={{ padding: 0 }}>
          {!pendingRows?.length && !err ? (
            <div className="empty-state">
              <div className="empty-state-icon" aria-hidden="true">{'\u2705'}</div>
              <div className="empty-state-title">All credits are settled</div>
              <div className="empty-state-desc">Nothing to follow up on right now.</div>
            </div>
          ) : (
            <div className="table-wrap" style={{ border: 'none' }}>
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th className="num">Total unpaid</th>
                  </tr>
                </thead>
                <tbody>
                  {(pendingRows ?? []).map((row) => (
                    <tr key={row.customerId}>
                      <td className="muted">#{row.customerId}</td>
                      <td><strong>{row.fullName}</strong></td>
                      <td>{row.email}</td>
                      <td>{row.phone || '\u2014'}</td>
                      <td className="num text-danger"><strong>{formatMoney(row.totalUnpaid)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </section>
  )
}

export default CustomerReports
