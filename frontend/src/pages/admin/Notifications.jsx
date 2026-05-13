import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import './Notifications.css'

function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data?.title && data?.detail) return `${data.title}: ${data.detail}`
  return fallback
}

function formatDateTime(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return String(value)
  }
}

function typeBadgeClass(type) {
  const t = (type || '').toLowerCase()
  if (t === 'lowstock') return 'low-stock'
  if (t === 'creditreminder') return 'credit-reminder'
  return 'other'
}

function typeLabel(type) {
  if (!type) return 'Notice'
  if (type === 'LowStock') return 'Low stock'
  if (type === 'CreditReminder') return 'Credit reminder'
  return type
}

/**
 * Admin notifications: list, mark read, and manual low-stock / credit-reminder sweeps.
 */
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

  return (
    <section className="admin-notifications">
      <div className="admin-notifications-header">
        <div>
          <Link to="/admin" className="admin-notifications-back">
            ← Admin dashboard
          </Link>
          <h1>Notifications</h1>
          <p className="admin-notifications-lead">System alerts for inventory and customer credit follow-ups.</p>
        </div>
      </div>

      {error ? <div className="admin-notifications-banner admin-notifications-banner-error">{error}</div> : null}
      {success ? <div className="admin-notifications-banner admin-notifications-banner-success">{success}</div> : null}

      <div className="admin-notifications-actions">
        <button type="button" className="primary" disabled={runningLowStock} onClick={() => void handleLowStockCheck()}>
          {runningLowStock ? 'Checking…' : 'Run low stock check'}
        </button>
        <button type="button" className="primary" disabled={runningCredit} onClick={() => void handleCreditReminders()}>
          {runningCredit ? 'Sending…' : 'Send credit reminders'}
        </button>
        <button type="button" disabled={loading} onClick={() => void load()}>
          Refresh list
        </button>
      </div>

      {loading ? (
        <p className="admin-notifications-lead">Loading…</p>
      ) : items.length === 0 ? (
        <div className="admin-notifications-empty">No notifications yet. Run a low stock check to generate alerts.</div>
      ) : (
        <ul className="admin-notifications-list">
          {items.map((n) => (
            <li key={n.id} className={`admin-notifications-item${n.isRead ? '' : ' unread'}`}>
              <div className="admin-notifications-item-header">
                <h2 className="admin-notifications-item-title">{n.title}</h2>
                <span className={`admin-notifications-badge ${typeBadgeClass(n.type)}`}>{typeLabel(n.type)}</span>
              </div>
              <p className="admin-notifications-meta">{formatDateTime(n.createdAt)}</p>
              <p className="admin-notifications-message">{n.message}</p>
              {!n.isRead ? (
                <button
                  type="button"
                  className="admin-notifications-mark-read"
                  disabled={markingId === n.id}
                  onClick={() => void handleMarkRead(n.id)}
                >
                  {markingId === n.id ? 'Saving…' : 'Mark as read'}
                </button>
              ) : (
                <span className="admin-notifications-meta">Read</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default Notifications
