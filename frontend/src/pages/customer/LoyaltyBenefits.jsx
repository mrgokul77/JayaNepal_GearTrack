import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import './CustomerProfile.css'
import './LoyaltyBenefits.css'

function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data?.title && data?.detail) return `${data.title}: ${data.detail}`
  return fallback
}

const money = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

function formatMoney(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—'
  return money.format(Number(n))
}

/**
 * Customer loyalty: spending progress vs $5,000 single-purchase tier and lifetime discount savings.
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

  // Progress toward the single-purchase tier using your most recent order subtotal (pre-discount).
  const progressPct =
    threshold > 0 ? Math.min(100, Math.round((lastGross / threshold) * 1000) / 10) : 0

  return (
    <section className="customer-profile-page loyalty-benefits-page">
      <Link to="/customer" className="customer-profile-back loyalty-benefits-back">
        ← Customer portal
      </Link>
      <h1>My loyalty</h1>
      <p className="customer-profile-lead loyalty-benefits-lead">
        GearTrack <strong>Loyalty</strong>: spend <strong>more than {formatMoney(threshold)}</strong> on parts in a{' '}
        <strong>single purchase</strong> (before the 10% discount is applied) and we take <strong>10% off</strong> that
        order. Discounts are automatic at checkout when staff completes your sale.
      </p>

      {error ? <div className="loyalty-benefits-banner loyalty-benefits-banner-error">{error}</div> : null}

      {loading ? (
        <p className="loyalty-benefits-muted">Loading…</p>
      ) : data ? (
        <>
          {qualifies ? (
            <div className="loyalty-benefits-banner loyalty-benefits-banner-success">
              Your most recent purchase subtotal was over {formatMoney(threshold)}, so that order qualified for the{' '}
              <strong>10% loyalty discount</strong>. Each new purchase must exceed {formatMoney(threshold)} on its own
              to earn the discount again.
            </div>
          ) : (
            <div className="loyalty-benefits-banner loyalty-benefits-banner-info">
              {data.totalPurchases === 0
                ? `When your first single purchase subtotal goes above ${formatMoney(threshold)}, that order will receive 10% off the pre-discount total.`
                : `Based on your last order subtotal (${formatMoney(lastGross)}), add about ${formatMoney(amountNeeded)} more in one checkout (pre-discount) to cross the loyalty line.`}
            </div>
          )}

          <div className="customer-profile-card loyalty-benefits-card">
            <h2>{`Progress (last purchase vs ${formatMoney(threshold)} tier)`}</h2>
            <div className="loyalty-benefits-progress-label">
              <span>Last order subtotal (pre-discount)</span>
              <span>{formatMoney(lastGross)}</span>
            </div>
            <div
              className="loyalty-benefits-progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPct}
            >
              <div className="loyalty-benefits-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="loyalty-benefits-progress-foot">
              Bar compares your <strong>most recent invoice</strong> subtotal to the {formatMoney(threshold)} loyalty
              threshold (you must be <strong>strictly above</strong> {formatMoney(threshold)} to qualify).
            </p>
          </div>

          <div className="customer-profile-card loyalty-benefits-card">
            <h2>Lifetime summary</h2>
            <div className="loyalty-benefits-metrics">
              <div>
                <p className="loyalty-benefits-metric-label">Purchases</p>
                <p className="loyalty-benefits-metric-value">{data.totalPurchases ?? 0}</p>
              </div>
              <div>
                <p className="loyalty-benefits-metric-label">Total spent (pre-discount subtotals)</p>
                <p className="loyalty-benefits-metric-value">{formatMoney(data.totalSpent)}</p>
              </div>
              <div>
                <p className="loyalty-benefits-metric-label">Total loyalty savings</p>
                <p className="loyalty-benefits-metric-value">{formatMoney(data.totalDiscountReceived)}</p>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  )
}

export default LoyaltyBenefits
