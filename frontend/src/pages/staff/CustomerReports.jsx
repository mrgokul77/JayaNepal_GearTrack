import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import './CustomerReports.css'

/** Pull a readable message from an Axios/API error response. */
function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data?.title && data?.detail) return `${data.title}: ${data.detail}`
  return fallback
}

function formatMoney(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return '0.00'
  return n.toFixed(2)
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
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

  const loadTab = useCallback(async (tabId, force = false) => {
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
  }, [regularRows, highRows, pendingRows])

  useEffect(() => {
    void loadTab(activeTab)
  }, [activeTab, loadTab])

  const handlePrint = () => {
    window.print()
  }

  const err = errorByTab[activeTab]
  const loading = loadingByTab[activeTab]

  return (
    <section className="customer-reports-page">
      <Link to="/staff" className="customer-reports-back">
        ← Staff workspace
      </Link>
      <h1>Customer reports</h1>
      <p className="customer-reports-lead">
        View regular buyers, top spenders, and invoices flagged for credit follow-up. Data loads when you open each tab.
      </p>

      <div className="customer-reports-toolbar">
        <button type="button" className="primary" onClick={() => void loadTab(activeTab, true)}>
          Refresh current tab
        </button>
        <button type="button" onClick={handlePrint}>
          Print / save as PDF
        </button>
      </div>

      <div className="customer-reports-tabs" role="tablist" aria-label="Report type">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {err ? <div className="customer-reports-error">{err}</div> : null}
      {loading ? <div className="customer-reports-loading">Loading…</div> : null}

      {!loading && activeTab === 'regular' ? (
        <div className="customer-reports-table-wrap">
          {!regularRows?.length && !err ? (
            <p className="customer-reports-empty">No customers with more than two purchases yet.</p>
          ) : (
            <table className="customer-reports-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th className="customer-reports-num">Purchases</th>
                  <th className="customer-reports-num">Total spent</th>
                </tr>
              </thead>
              <tbody>
                {(regularRows ?? []).map((row) => (
                  <tr key={row.customerId}>
                    <td>{row.customerId}</td>
                    <td>{row.fullName}</td>
                    <td>{row.email}</td>
                    <td>{row.phone || '—'}</td>
                    <td className="customer-reports-num">{row.totalPurchases}</td>
                    <td className="customer-reports-num">{formatMoney(row.totalSpent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {!loading && activeTab === 'high' ? (
        <div className="customer-reports-table-wrap">
          {!highRows?.length && !err ? (
            <p className="customer-reports-empty">No sales data to rank high spenders yet.</p>
          ) : (
            <table className="customer-reports-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th className="customer-reports-num">Total spent</th>
                  <th>Last purchase</th>
                </tr>
              </thead>
              <tbody>
                {(highRows ?? []).map((row) => (
                  <tr key={row.customerId}>
                    <td>{row.customerId}</td>
                    <td>{row.fullName}</td>
                    <td>{row.email}</td>
                    <td>{row.phone || '—'}</td>
                    <td className="customer-reports-num">{formatMoney(row.totalSpent)}</td>
                    <td>{formatDate(row.lastPurchaseDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {!loading && activeTab === 'pending' ? (
        <div className="customer-reports-table-wrap">
          {!pendingRows?.length && !err ? (
            <p className="customer-reports-empty">No pending credit rows match the current rules.</p>
          ) : (
            <table className="customer-reports-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th className="customer-reports-num">Total unpaid (sum)</th>
                </tr>
              </thead>
              <tbody>
                {(pendingRows ?? []).map((row) => (
                  <tr key={row.customerId}>
                    <td>{row.customerId}</td>
                    <td>{row.fullName}</td>
                    <td>{row.email}</td>
                    <td>{row.phone || '—'}</td>
                    <td className="customer-reports-num">{formatMoney(row.totalUnpaid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </section>
  )
}

export default CustomerReports
