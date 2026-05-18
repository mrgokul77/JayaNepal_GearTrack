import { useCallback, useEffect, useState } from 'react'
import api from '../../services/api'

function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data?.title && data?.detail) return `${data.title}: ${data.detail}`
  return fallback
}

function formatDateTime(value) {
  if (!value) return '\u2014'
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return String(value)
  }
}

function typeBadgeClass(type) {
  const t = (type || '').toLowerCase()
  if (t === 'lowstock') return 'badge badge-lowstock'
  if (t === 'creditreminder') return 'badge badge-info'
  return 'badge badge-neutral'
}

function isLowStock(type) {
  return (type || '').toLowerCase() === 'lowstock'
}

function typeLabel(type) {
  if (!type) return 'Notice'
  if (type === 'LowStock') return 'LOW STOCK'
  if (type === 'CreditReminder') return 'Credit reminder'
  return type
}

function Notifications() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [runningLowStock, setRunningLowStock] = useState(false)
  const [runningCredit, setRunningCredit] = useState(false)
  const [markingId, setMarkingId] = useState(null)

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await api.get('/notifications')
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      setItems([])
      setError(getErrorMessage(e, 'Could not load notifications.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleMarkRead = async (id) => {
    setError('')
    setSuccess('')
    setMarkingId(id)
    try {
      await api.put(`/notifications/${id}/read`)
      setSuccess('Marked as read.')
      await load()
    } catch (e) {
      setError(getErrorMessage(e, 'Could not update notification.'))
    } finally {
      setMarkingId(null)
    }
  }

  const handleLowStockCheck = async () => {
    setError('')
    setSuccess('')
    setRunningLowStock(true)
    try {
      const { data } = await api.post('/notifications/check-low-stock')
      const n = data?.notificationsCreated ?? 0
      setSuccess(`Low stock check finished. ${n} new notification(s) created.`)
      await load()
    } catch (e) {
      setError(getErrorMessage(e, 'Low stock check failed.'))
    } finally {
      setRunningLowStock(false)
    }
  }

  const handleCreditReminders = async () => {
    setError('')
    setSuccess('')
    setRunningCredit(true)
    try {
      const { data } = await api.post('/notifications/send-credit-reminders')
      const sent = data?.emailsSent ?? 0
      const skip = data?.skippedOrFailed ?? 0
      setSuccess(`Credit reminders sent: ${sent}. Skipped or failed: ${skip}.`)
    } catch (e) {
      setError(getErrorMessage(e, 'Could not send credit reminders.'))
    } finally {
      setRunningCredit(false)
    }
  }

  const unreadCount = items.filter((n) => !n.isRead).length

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            System alerts for inventory and customer credit follow-ups.
            {unreadCount > 0 ? (
              <>
                {' '}<span className="badge badge-info">{unreadCount} unread</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={loading}
            onClick={() => void load()}
          >
            Refresh
          </button>
          <button
            type="button"
            className="btn btn-success"
            disabled={runningLowStock}
            onClick={() => void handleLowStockCheck()}
          >
            {runningLowStock ? (
              <>
                <span className="spinner" aria-hidden="true" /> Checking&hellip;
              </>
            ) : (
              <>{'\u{1F4E6}'} Run low-stock check</>
            )}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={runningCredit}
            onClick={() => void handleCreditReminders()}
          >
            {runningCredit ? (
              <>
                <span className="spinner" aria-hidden="true" /> Sending&hellip;
              </>
            ) : (
              <>{'\u{1F4E7}'} Send credit reminders</>
            )}
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}

      {loading ? (
        <div className="loading-state">
          <span className="spinner" aria-hidden="true" /> Loading notifications&hellip;
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">{'\u{1F514}'}</div>
            <div className="empty-state-title">No notifications yet</div>
            <div className="empty-state-desc">Run a low-stock check or credit reminders to generate alerts.</div>
          </div>
        </div>
      ) : (
        <ul className="notification-list">
          {items.map((n) => (
            <li
              key={n.id}
              className={`notification-item${n.isRead ? '' : ' unread'}`}
            >
              <div className="notification-header">
                <div className="notification-title-row">
                  <span className={typeBadgeClass(n.type)}>{typeLabel(n.type)}</span>
                  <h2 className="notification-title">{n.title}</h2>
                </div>
                <span className="notification-meta">{formatDateTime(n.createdAt)}</span>
              </div>
              <p className="notification-message">{n.message}</p>
              <div className="notification-footer">
                {!n.isRead ? (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm notification-action-btn"
                    disabled={markingId === n.id}
                    onClick={() => void handleMarkRead(n.id)}
                  >
                    {markingId === n.id ? 'Saving\u2026' : 'Mark as read'}
                  </button>
                ) : (
                  <span className="badge badge-neutral">Read</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default Notifications
