import { useCallback, useEffect, useMemo, useState } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import api from '../../services/api'

function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.error) return String(data.error)
  if (data?.detail) return data.detail
  if (data?.title && data?.detail) return `${data.title}: ${data.detail}`
  return fallback
}

const money = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

function formatMoney(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '\u2014'
  return money.format(Number(n))
}

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

function formatDateForDisplay(dateString) {
  try {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return dateString
  }
}

function generateFinancialReportPDF(reportType, reportData, selectedDate) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  let yPosition = margin

  // Colors
  const darkBlue = [41, 128, 185]
  const lightGray = [240, 240, 240]
  const textDark = [33, 33, 33]
  const textMuted = [120, 120, 120]

  // Title and Branding
  doc.setTextColor(...darkBlue)
  doc.setFontSize(24)
  doc.setFont(undefined, 'bold')
  doc.text('GearTrack', margin, yPosition)
  yPosition += 8

  doc.setTextColor(...textDark)
  doc.setFontSize(18)
  doc.text('Financial Report', margin, yPosition)
  yPosition += 12

  // Subtitle with Report Type and Date
  doc.setTextColor(...textMuted)
  doc.setFontSize(11)
  doc.setFont(undefined, 'normal')
  const reportTypeLabel = reportType === 'daily' ? 'Daily' : reportType === 'monthly' ? 'Monthly' : 'Yearly'
  doc.text(`Report Type: ${reportTypeLabel}`, margin, yPosition)
  yPosition += 6

  let dateLabel = ''
  if (reportType === 'daily') {
    dateLabel = formatDateForDisplay(selectedDate.date)
  } else if (reportType === 'monthly') {
    dateLabel = `${monthName(selectedDate.month)} ${selectedDate.year}`
  } else {
    dateLabel = String(selectedDate.year)
  }
  doc.text(`Period: ${dateLabel}`, margin, yPosition)
  yPosition += 6

  // Generated date and time
  const now = new Date()
  const generatedDateTime = now.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  doc.text(`Generated: ${generatedDateTime}`, margin, yPosition)
  yPosition += 12

  // Prepare table data
  let tableData = []
  let totalRevenue = 0

  if (reportType === 'daily' && reportData) {
    tableData = [
      [
        formatDateForDisplay(selectedDate.date),
        reportData.numberOfSales || 0,
        formatMoney(reportData.totalSales),
      ],
    ]
    totalRevenue = reportData.totalSales || 0
  } else if (reportType === 'monthly' && reportData) {
    tableData = [
      [
        dateLabel,
        reportData.numberOfSales || 0,
        formatMoney(reportData.totalSales),
      ],
    ]
    totalRevenue = reportData.totalSales || 0
  } else if (reportType === 'yearly' && reportData?.monthlyBreakdown) {
    tableData = reportData.monthlyBreakdown.map((month) => [
      monthName(month.month),
      month.numberOfSales || 0,
      formatMoney(month.totalSales),
    ])
    totalRevenue = reportData.monthlyBreakdown.reduce((sum, month) => sum + (month.totalSales || 0), 0)
  }

  // Add Total row
  if (tableData.length > 0) {
    tableData.push(['TOTAL', '', formatMoney(totalRevenue)])
  }

  // Generate table using autoTable
  autoTable(doc, {
    startY: yPosition,
    head: [['Date', 'Invoice Count', 'Total Revenue']],
    body: tableData,
    headStyles: {
      fillColor: darkBlue,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
      valign: 'middle',
      lineColor: darkBlue,
    },
    bodyStyles: {
      textColor: textDark,
      lineColor: [200, 200, 200],
    },
    alternateRowStyles: {
      fillColor: lightGray,
    },
    footStyles: {
      fillColor: darkBlue,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      lineColor: darkBlue,
    },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' },
    },
    margin: { top: yPosition, left: margin, right: margin },
    didDrawPage: (data) => {
      // Footer
      const pageCount = doc.getNumberOfPages()
      doc.setFontSize(10)
      doc.setTextColor(...textMuted)
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )
    },
  })

  // Generate filename
  const timestamp = now.toISOString().split('T')[0]
  const filename = `GearTrack-Financial-Report-${reportTypeLabel}-${timestamp}.pdf`

  // Save PDF
  doc.save(filename)
}

const TABS = [
  { id: 'daily', label: 'Daily' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
]

/**
 * Admin financial reports with KPI cards and tabular detail.
 * Sales/purchases/profit/discount cards use distinct colored icons.
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

  const yearOptions = useMemo(() => {
    const y = now.getFullYear()
    return Array.from({ length: 11 }, (_, i) => y - 5 + i)
  }, [now])

  const exportDailyPDF = useCallback(() => {
    if (!dailyReport) {
      setError('No report data to export. Please load a report first.')
      return
    }
    generateFinancialReportPDF('daily', dailyReport, { date: dailyDate })
  }, [dailyReport, dailyDate])

  const exportMonthlyPDF = useCallback(() => {
    if (!monthlyReport) {
      setError('No report data to export. Please load a report first.')
      return
    }
    generateFinancialReportPDF('monthly', monthlyReport, { month: monthValue, year: monthYear })
  }, [monthlyReport, monthValue, monthYear])

  const exportYearlyPDF = useCallback(() => {
    if (!yearlyReport) {
      setError('No report data to export. Please load a report first.')
      return
    }
    generateFinancialReportPDF('yearly', yearlyReport, { year: yearValue })
  }, [yearlyReport, yearValue])

  const renderKpiCards = (r) => {
    if (!r) return null
    return (
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-primary" aria-hidden="true">{'\u{1F4B5}'}</div>
          <div className="stat-body">
            <div className="stat-label">Total sales</div>
            <div className="stat-value">{formatMoney(r.totalSales)}</div>
            <div className="stat-trend">{r.numberOfSales ?? 0} invoice(s)</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-danger" aria-hidden="true">{'\u{1F4E6}'}</div>
          <div className="stat-body">
            <div className="stat-label">Total purchases</div>
            <div className="stat-value">{formatMoney(r.totalPurchases)}</div>
            <div className="stat-trend">{r.numberOfPurchases ?? 0} invoice(s)</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-success" aria-hidden="true">{'\u{1F4C8}'}</div>
          <div className="stat-body">
            <div className="stat-label">Profit</div>
            <div className="stat-value">{formatMoney(r.profit)}</div>
            <div className="stat-trend">{'Sales \u2212 purchases'}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-warning" aria-hidden="true">{'\u{1F3F7}'}</div>
          <div className="stat-body">
            <div className="stat-label">Total discounts</div>
            <div className="stat-value">{formatMoney(r.totalDiscounts)}</div>
            <div className="stat-trend">Applied to sales</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">Financial reports</h1>
          <p className="page-subtitle">
            Compare sales and purchase totals across a day, month, or year. Profit equals sales minus purchases.
          </p>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Report period">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Filters</div>
            <div className="card-subtitle">Choose a period and reload the report.</div>
          </div>
        </div>

        {tab === 'daily' ? (
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="fr-daily-date">Report date</label>
              <input
                id="fr-daily-date"
                type="date"
                className="form-input"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">&nbsp;</label>
              <div className="button-group" style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-primary" onClick={() => void loadDaily()}>
                  Refresh
                </button>
                <button type="button" className="btn btn-secondary" onClick={exportDailyPDF}>
                  Export PDF
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {tab === 'monthly' ? (
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="fr-month">Month</label>
              <select
                id="fr-month"
                className="form-select"
                value={monthValue}
                onChange={(e) => setMonthValue(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {monthName(m)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="fr-month-year">Year</label>
              <select
                id="fr-month-year"
                className="form-select"
                value={monthYear}
                onChange={(e) => setMonthYear(Number(e.target.value))}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">&nbsp;</label>
              <div className="button-group" style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-primary" onClick={() => void loadMonthly()}>
                  Refresh
                </button>
                <button type="button" className="btn btn-secondary" onClick={exportMonthlyPDF}>
                  Export PDF
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {tab === 'yearly' ? (
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="fr-year">Year</label>
              <select
                id="fr-year"
                className="form-select"
                value={yearValue}
                onChange={(e) => setYearValue(Number(e.target.value))}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">&nbsp;</label>
              <div className="button-group" style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-primary" onClick={() => void loadYearly()}>
                  Refresh
                </button>
                <button type="button" className="btn btn-secondary" onClick={exportYearlyPDF}>
                  Export PDF
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      {loading ? (
        <div className="loading-state">
          <span className="spinner" aria-hidden="true" /> Loading report&hellip;
        </div>
      ) : null}

      {!loading && tab === 'daily' && dailyReport ? (
        <>
          {renderKpiCards(dailyReport)}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Top selling parts</div>
            </div>
            {!dailyReport.topParts?.length ? (
              <div className="empty-state">
                <div className="empty-state-icon" aria-hidden="true">{'\u{1F4E5}'}</div>
                <div className="empty-state-title">No line items in this period</div>
                <div className="empty-state-desc">Try a different date.</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Part</th>
                      <th className="num">Qty sold</th>
                      <th className="num">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyReport.topParts.map((row, idx) => (
                      <tr key={`${row.partName}-${idx}`}>
                        <td>{row.partName || '\u2014'}</td>
                        <td className="num">{row.quantitySold}</td>
                        <td className="num">{formatMoney(row.totalRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}

      {!loading && tab === 'monthly' && monthlyReport ? (
        <>
          {renderKpiCards(monthlyReport)}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Top selling parts</div>
            </div>
            {!monthlyReport.topParts?.length ? (
              <div className="empty-state">
                <div className="empty-state-icon" aria-hidden="true">{'\u{1F4E5}'}</div>
                <div className="empty-state-title">No line items in this period</div>
                <div className="empty-state-desc">Try a different month or year.</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Part</th>
                      <th className="num">Qty sold</th>
                      <th className="num">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyReport.topParts.map((row, idx) => (
                      <tr key={`${row.partName}-${idx}`}>
                        <td>{row.partName || '\u2014'}</td>
                        <td className="num">{row.quantitySold}</td>
                        <td className="num">{formatMoney(row.totalRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}

      {!loading && tab === 'yearly' && yearlyReport ? (
        <>
          {renderKpiCards(yearlyReport)}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Monthly breakdown</div>
            </div>
            <div className="table-wrap">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th className="num">Total sales</th>
                    <th className="num">Total purchases</th>
                    <th className="num">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {(yearlyReport.monthlyBreakdown ?? []).map((row) => (
                    <tr key={row.month}>
                      <td>{monthName(row.month)}</td>
                      <td className="num">{formatMoney(row.totalSales)}</td>
                      <td className="num">{formatMoney(row.totalPurchases)}</td>
                      <td className={`num ${Number(row.profit) >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatMoney(row.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {!loading && !error && tab === 'daily' && !dailyReport ? <p className="muted">No data.</p> : null}
      {!loading && !error && tab === 'monthly' && !monthlyReport ? <p className="muted">No data.</p> : null}
      {!loading && !error && tab === 'yearly' && !yearlyReport ? <p className="muted">No data.</p> : null}
    </section>
  )
}

export default FinancialReports
