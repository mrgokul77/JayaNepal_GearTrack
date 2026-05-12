import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import './RegisterStaff.css'

/** Extract a readable error string from Axios errors (API may return plain text or problem details). */
function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data?.title && data?.detail) return `${data.title}: ${data.detail}`
  return fallback
}

const initialForm = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  role: 'Staff',
}

/**
 * Admin-only staff registration. Sends Bearer token from localStorage via api.js interceptor.
 */
function RegisterStaff() {
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    try {
      await api.post('/auth/register-staff', {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role: form.role,
      })
      setSuccess(
        `Account created for ${form.fullName.trim()}. They can sign in with the email and password you set.`,
      )
      setForm({ ...initialForm, role: form.role })
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Registration failed. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="register-staff-page">
      <div className="register-staff-header">
        <div>
          <Link className="register-staff-back" to="/admin">
            ← Admin dashboard
          </Link>
          <h1>Register staff</h1>
          <p className="register-staff-lead">
            Create a Staff or Admin user. Staff accounts also receive a linked staff profile for sales and
            customer tasks.
          </p>
        </div>
      </div>

      {error ? <div className="register-staff-banner register-staff-banner-error">{error}</div> : null}
      {success ? <div className="register-staff-banner register-staff-banner-success">{success}</div> : null}

      <section className="register-staff-panel">
        <form className="register-staff-form" onSubmit={handleSubmit}>
          <label>
            Full name
            <input
              name="fullName"
              type="text"
              autoComplete="name"
              value={form.fullName}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Phone
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </label>
          <label>
            Role
            <select name="role" value={form.role} onChange={handleChange}>
              <option value="Staff">Staff</option>
              <option value="Admin">Admin</option>
            </select>
          </label>
          <button type="submit" className="register-staff-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create account'}
          </button>
        </form>
      </section>
    </div>
  )
}

export default RegisterStaff
