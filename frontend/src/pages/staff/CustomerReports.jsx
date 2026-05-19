import { useCallback, useEffect, useState } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
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

function generateCustomerReportPDF(reportType, data) {
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
  doc.setFontSize(18)
  doc.setFont(undefined, 'bold')
  
  if (reportType === 'regular') {
    doc.text('GearTrack - Regular Customers Report', margin, yPosition)
  } else if (reportType === 'high') {
    doc.text('GearTrack - High Spenders Report', margin, yPosition)
  } else if (reportType === 'pending') {
    doc.text('GearTrack - Pending Credits Report', margin, yPosition)
  }
  yPosition += 10

  // Generated date
  doc.setTextColor(...textMuted)
  doc.setFontSize(10)
  doc.setFont(undefined, 'normal')
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
  yPosition += 8

  // Prepare table data
  let tableData = []
  let totalCount = 0

  if (reportType === 'regular' && Array.isArray(data)) {
    tableData = data.map((row) => [
      row.fullName || '\u2014',
      row.email || '\u2014',
      row.phone || '\u2014',
      formatMoney(row.totalSpent),
    ])
    totalCount = data.length
  } else if (reportType === 'high' && Array.isArray(data)) {
    tableData = data.map((row, idx) => [
      String(idx + 1),
      row.fullName || '\u2014',
      row.email || '\u2014',
      row.phone || '\u2014',
      formatMoney(row.totalSpent),
    ])
    totalCount = data.length
  } else if (reportType === 'pending' && Array.isArray(data)) {
    tableData = data.map((row) => [
      row.fullName || '\u2014',
      row.email || '\u2014',
      row.phone || '\u2014',
      formatMoney(row.totalUnpaid),
    ])
    totalCount = data.length
  }

  // Add total row
  if (tableData.length > 0) {
    if (reportType === 'regular') {
      tableData.push(['TOTAL', '', '', `${totalCount} customers`])
    } else if (reportType === 'high') {
      tableData.push(['', 'TOTAL', '', '', `${totalCount} spenders`])
    } else if (reportType === 'pending') {
      tableData.push(['TOTAL', '', '', `${totalCount} customers`])
    }
  }

  // Generate table using autoTable
  let headColumns = []
  if (reportType === 'regular') {
    headColumns = ['Name', 'Email', 'Phone', 'Total Purchases']
  } else if (reportType === 'high') {
    headColumns = ['Rank', 'Name', 'Email', 'Phone', 'Total Spent']
  } else if (reportType === 'pending') {
    headColumns = ['Name', 'Email', 'Phone', 'Total Unpaid']
  }

  autoTable(doc, {
    startY: yPosition,
    head: [headColumns],
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
      1: { halign: reportType === 'regular' ? 'left' : 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    margin: { top: yPosition, left: margin, right: margin },
    didDrawPage: (pageData) => {
      // Footer with page numbers
      const pageCount = doc.getNumberOfPages()
      doc.setFontSize(10)
      doc.setTextColor(...textMuted)
      doc.text(
        `Page ${pageData.pageNumber} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )
    },
  })

  // Generate filename
  const timestamp = now.toISOString().split('T')[0]
  let filename = 'GearTrack-Customer-Report'
  if (reportType === 'regular') {
    filename = `${filename}-Regular-Customers-${timestamp}.pdf`
  } else if (reportType === 'high') {
    filename = `${filename}-High-Spenders-${timestamp}.pdf`
  } else if (reportType === 'pending') {
    filename = `${filename}-Pending-Credits-${timestamp}.pdf`
  }

  // Save PDF
  doc.save(filename)
}


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

  const handleExportPDF = () => {
    if (activeTab === 'regular') {
      if (!regularRows || regularRows.length === 0) {
        alert('No data to export for Regular Customers. Please load the report first.')
        return
      }
      generateCustomerReportPDF('regular', regularRows)
    } else if (activeTab === 'high') {
      if (!highRows || highRows.length === 0) {
        alert('No data to export for High Spenders. Please load the report first.')
        return
      }
      generateCustomerReportPDF('high', highRows)
    } else if (activeTab === 'pending') {
      if (!pendingRows || pendingRows.length === 0) {
        alert('No data to export for Pending Credits. Please load the report first.')
        return
      }
      generateCustomerReportPDF('pending', pendingRows)
    }
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
          <button type="button" className="btn btn-primary" onClick={handleExportPDF}>
            <span aria-hidden="true">{'\u{1F5A8}'}</span> Export PDF
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
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th className="num">Total unpaid</th>
                  </tr>
                </thead>
                <tbody>
                  {(pendingRows ?? []).map((row) => (
                    <tr key={row.customerId}>
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
