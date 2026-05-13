import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import './FinancialReports.css'

/** Pull a human-readable message from Axios / ProblemDetails responses. */
function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.error) return String(data.error)
  if (data?.detail) return data.detail
  if (data?.title && data?.detail) return `${data.title}: ${data.detail}`
  return fallback
}

const money = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

function formatMoney(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—'
  return money.format(Number(n))
}

/** Local calendar date as YYYY-MM-DD for API query params. */
function todayIsoDate() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function monthName(month) {
  try {
    return new Date(2000, month - 1, 1).toLocaleString(undefined, { month: 'long' })
  } catch {
    return String(month)
  }
}

const TABS = [
  { id: 'daily', label: 'Daily' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
]

/**
 * Admin financial reports: sales vs purchases, profit, discounts, and top-selling parts
 * (daily/monthly) or monthly breakdown (yearly). Requires Admin JWT.
 */
function FinancialReports() {
  const now = useMemo(() => new Date(), [])
  const [tab, setTab] = useState('daily')

  const [dailyDate, setDailyDate] = useState(todayIsoDate)
  const [monthValue, setMonthValue] = useState(now.getMonth() + 1)
  const [monthYear, setMonthYear] = useState(now.getFullYear())
  const [yearValue, setYearValue] = useState(now.getFullYear())

  const [dailyReport, setDailyReport] = useState(null)
  const [monthlyReport, setMonthlyReport] = useState(null)
  const [yearlyReport, setYearlyReport] = useState(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadDaily = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await api.get('/financial-reports/daily', { params: { date: dailyDate } })
      setDailyReport(data && typeof data === 'object' ? data : null)
    } catch (e) {
      setDailyReport(null)
      setError(getErrorMessage(e, 'Could not load the daily financial report.'))
    } finally {
      setLoading(false)
    }
  }, [dailyDate])

  const loadMonthly = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await api.get('/financial-reports/monthly', {
        params: { month: monthValue, year: monthYear },
      })
      setMonthlyReport(data && typeof data === 'object' ? data : null)
    } catch (e) {
      setMonthlyReport(null)
      setError(getErrorMessage(e, 'Could not load the monthly financial report.'))
    } finally {
      setLoading(false)
    }
  }, [monthValue, monthYear])

  const loadYearly = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await api.get('/financial-reports/yearly', { params: { year: yearValue } })
      setYearlyReport(data && typeof data === 'object' ? data : null)
    } catch (e) {
      setYearlyReport(null)
      setError(getErrorMessage(e, 'Could not load the yearly financial report.'))
    } finally {
      setLoading(false)
    }
  }, [yearValue])

  useEffect(() => {
    if (tab === 'daily') void loadDaily()
    else if (tab === 'monthly') void loadMonthly()
    else void loadYearly()
  }, [tab, loadDaily, loadMonthly, loadYearly])

  const summaryCards = (r) => {
    if (!r) return null
    return (
      <div className="financial-reports-cards">
        <div className="financial-reports-card financial-reports-card-sales">
          <p className="financial-reports-card-label">Total sales</p>
          <p className="financial-reports-card-value">{formatMoney(r.totalSales)}</p>
        </div>
        <div className="financial-reports-card financial-reports-card-purchases">
          <p className="financial-reports-card-label">Total purchases</p>
          <p className="financial-reports-card-value">{formatMoney(r.totalPurchases)}</p>
        </div>
        <div className="financial-reports-card financial-reports-card-profit">
          <p className="financial-reports-card-label">Profit</p>
          <p className="financial-reports-card-value">{formatMoney(r.profit)}</p>
        </div>
        <div className="financial-reports-card financial-reports-card-discounts">
          <p className="financial-reports-card-label">Total discounts</p>
          <p className="financial-reports-card-value">{formatMoney(r.totalDiscounts)}</p>
        </div>
        <div className="financial-reports-card financial-reports-card-count">
          <p className="financial-reports-card-label">Sales invoices</p>
          <p className="financial-reports-card-value">{r.numberOfSales ?? 0}</p>
        </div>
        <div className="financial-reports-card financial-reports-card-count">
          <p className="financial-reports-card-label">Purchase invoices</p>
          <p className="financial-reports-card-value">{r.numberOfPurchases ?? 0}</p>
        </div>
      </div>
    )
  }

  const yearOptions = useMemo(() => {
    const y = now.getFullYear()
    return Array.from({ length: 11 }, (_, i) => y - 5 + i)
  }, [now])

  return (
    <section className="financial-reports-page">
      <Link to="/admin" className="financial-reports-back">
        ← Admin dashboard
      </Link>
      <h1>Financial reports</h1>
      <p className="financial-reports-lead">
        Compare sales and purchase totals for a day, month, or year. Profit is sales minus purchases; discounts sum
        loyalty and other reductions recorded on sales invoices. Top parts are ranked by units sold in the selected
        period.
      </p>

      <div className="financial-reports-tabs" role="tablist" aria-label="Report period">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`financial-reports-tab${tab === t.id ? ' financial-reports-tab-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'daily' ? (
        <div className="financial-reports-controls">
          <div className="financial-reports-field">
            <label htmlFor="fr-daily-date">Report date</label>
            <input
              id="fr-daily-date"
              type="date"
              value={dailyDate}
              onChange={(e) => setDailyDate(e.target.value)}
            />
          </div>
          <div className="financial-reports-actions">
            <button type="button" className="financial-reports-refresh" onClick={() => void loadDaily()}>
              Refresh
            </button>
          </div>
        </div>
      ) : null}

      {tab === 'monthly' ? (
        <div className="financial-reports-controls">
          <div className="financial-reports-field">
            <label htmlFor="fr-month">Month</label>
            <select id="fr-month" value={monthValue} onChange={(e) => setMonthValue(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {monthName(m)}
                </option>
              ))}
            </select>
          </div>
          <div className="financial-reports-field">
            <label htmlFor="fr-month-year">Year</label>
            <select id="fr-month-year" value={monthYear} onChange={(e) => setMonthYear(Number(e.target.value))}>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="financial-reports-actions">
            <button type="button" className="financial-reports-refresh" onClick={() => void loadMonthly()}>
              Refresh
            </button>
          </div>
        </div>
      ) : null}

      {tab === 'yearly' ? (
        <div className="financial-reports-controls">
          <div className="financial-reports-field">
            <label htmlFor="fr-year">Year</label>
            <select id="fr-year" value={yearValue} onChange={(e) => setYearValue(Number(e.target.value))}>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="financial-reports-actions">
            <button type="button" className="financial-reports-refresh" onClick={() => void loadYearly()}>
              Refresh
            </button>
          </div>
        </div>
      ) : null}

      {error ? <div className="financial-reports-banner financial-reports-banner-error">{error}</div> : null}

      {loading ? <p className="financial-reports-muted">Loading…</p> : null}

      {!loading && tab === 'daily' ? (
        <>
          {summaryCards(dailyReport)}
          <div className="financial-reports-panel">
            <h2>Top selling parts</h2>
            {!dailyReport?.topParts?.length ? (
              <p className="financial-reports-muted">No line items in this period.</p>
            ) : (
              <div className="financial-reports-table-wrap">
                <table className="financial-reports-table">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Part</th>
                      <th scope="col" className="financial-reports-num">
                        Qty sold
                      </th>
                      <th scope="col" className="financial-reports-num">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyReport.topParts.map((row, idx) => (
                      <tr key={`${row.partName}-${idx}`}>
                        <td>{idx + 1}</td>
                        <td>{row.partName || '—'}</td>
                        <td className="financial-reports-num">{row.quantitySold}</td>
                        <td className="financial-reports-num">{formatMoney(row.totalRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}

      {!loading && tab === 'monthly' ? (
        <>
          {summaryCards(monthlyReport)}
          <div className="financial-reports-panel">
            <h2>Top selling parts</h2>
            {!monthlyReport?.topParts?.length ? (
              <p className="financial-reports-muted">No line items in this period.</p>
            ) : (
              <div className="financial-reports-table-wrap">
                <table className="financial-reports-table">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Part</th>
                      <th scope="col" className="financial-reports-num">
                        Qty sold
                      </th>
                      <th scope="col" className="financial-reports-num">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyReport.topParts.map((row, idx) => (
                      <tr key={`${row.partName}-${idx}`}>
                        <td>{idx + 1}</td>
                        <td>{row.partName || '—'}</td>
                        <td className="financial-reports-num">{row.quantitySold}</td>
                        <td className="financial-reports-num">{formatMoney(row.totalRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}

      {!loading && tab === 'yearly' ? (
        <>
          {summaryCards(yearlyReport)}
          <div className="financial-reports-panel">
            <h2>Monthly breakdown</h2>
            {!yearlyReport?.monthlyBreakdown?.length ? (
              <p className="financial-reports-muted">No data for this year.</p>
            ) : (
              <div className="financial-reports-table-wrap">
                <table className="financial-reports-table">
                  <thead>
                    <tr>
                      <th scope="col">Month</th>
                      <th scope="col" className="financial-reports-num">
                        Total sales
                      </th>
                      <th scope="col" className="financial-reports-num">
                        Total purchases
                      </th>
                      <th scope="col" className="financial-reports-num">
                        Profit
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearlyReport.monthlyBreakdown.map((row) => (
                      <tr key={row.month}>
                        <td>{monthName(row.month)}</td>
                        <td className="financial-reports-num">{formatMoney(row.totalSales)}</td>
                        <td className="financial-reports-num">{formatMoney(row.totalPurchases)}</td>
                        <td className="financial-reports-num">{formatMoney(row.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}

      {!loading && !error && tab === 'daily' && !dailyReport ? (
        <p className="financial-reports-muted">No data.</p>
      ) : null}
      {!loading && !error && tab === 'monthly' && !monthlyReport ? (
        <p className="financial-reports-muted">No data.</p>
      ) : null}
      {!loading && !error && tab === 'yearly' && !yearlyReport ? (
        <p className="financial-reports-muted">No data.</p>
      ) : null}
    </section>
  )
}

export default FinancialReports
