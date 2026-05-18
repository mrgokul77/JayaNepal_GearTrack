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

function formatMoney(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '\u2014'
  return money.format(Number(n))
}

/**
 * Customer-facing loyalty card: shows discount status, progress to threshold,
 * and lifetime savings summary.
 */
function LoyaltyBenefits() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data: body } = await api.get('/loyalty/my-benefits')
      setData(body && typeof body === 'object' ? body : null)
    } catch (e) {
      setData(null)
      setError(getErrorMessage(e, 'Could not load loyalty benefits.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const threshold = Number(data?.nextDiscountThreshold ?? 5000)
  const lastGross = Number(data?.lastOrderGrossBeforeDiscount ?? 0)
  const qualifies = Boolean(data?.qualifiesForNextDiscount)
  const amountNeeded = Number(data?.amountNeededForDiscount ?? 0)

  const progressPct = threshold > 0 ? Math.min(100, Math.round((lastGross / threshold) * 1000) / 10) : 0

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">My loyalty</h1>
          <p className="page-subtitle">
            Spend over <strong>{formatMoney(threshold)}</strong> on parts in a single purchase and get{' '}
            <strong>10% off</strong> that order automatically.
          </p>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      {loading ? (
        <div className="loading-state">
          <span className="spinner" aria-hidden="true" /> Loading loyalty&hellip;
        </div>
      ) : data ? (
        <>
          <div className="loyalty-card">
            <div className="loyalty-card-label">GearTrack Loyalty</div>
            <div className="loyalty-card-value">{formatMoney(data.totalDiscountReceived)}</div>
            <div className="loyalty-card-subtitle">
              Lifetime savings from the 10% loyalty discount on qualifying orders.
            </div>
          </div>

          {qualifies ? (
            <div className="alert alert-success">
              Your most recent purchase qualified for the <strong>10% loyalty discount</strong>. Each new purchase must
              exceed {formatMoney(threshold)} to earn the discount again.
            </div>
          ) : (
            <div className="alert alert-info">
              {data.totalPurchases === 0
                ? `When your first single purchase subtotal goes above ${formatMoney(threshold)}, that order will receive 10% off the pre-discount total.`
                : `Based on your last order subtotal (${formatMoney(lastGross)}), add about ${formatMoney(amountNeeded)} more in one checkout (pre-discount) to cross the loyalty line.`}
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <div className="card-title">Progress to next discount</div>
              <span className="muted">{progressPct}% of {formatMoney(threshold)}</span>
            </div>
            <div className="flex-between mb-4">
              <span className="muted">Last order subtotal</span>
              <span><strong>{formatMoney(lastGross)}</strong></span>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPct}
            >
              <div
                className={qualifies ? 'progress-fill progress-fill-success' : 'progress-fill'}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="muted mt-3" style={{ fontSize: '0.8125rem' }}>
              Bar compares your most recent invoice subtotal to the {formatMoney(threshold)} loyalty threshold. You must
              be strictly above the threshold to qualify.
            </p>
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-icon stat-icon-primary" aria-hidden="true">{'\u{1F6CD}'}</div>
              <div className="stat-body">
                <div className="stat-label">Purchases</div>
                <div className="stat-value">{data.totalPurchases ?? 0}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-success" aria-hidden="true">{'\u{1F4B0}'}</div>
              <div className="stat-body">
                <div className="stat-label">Total spent (pre-discount)</div>
                <div className="stat-value">{formatMoney(data.totalSpent)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-warning" aria-hidden="true">{'\u{1F3C5}'}</div>
              <div className="stat-body">
                <div className="stat-label">Loyalty savings</div>
                <div className="stat-value">{formatMoney(data.totalDiscountReceived)}</div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="muted">No data.</p>
      )}
    </section>
  )
}

export default LoyaltyBenefits
