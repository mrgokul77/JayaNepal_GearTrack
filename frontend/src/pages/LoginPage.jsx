import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'

function LoginPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((previous) => ({ ...previous, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!formData.email.trim() || !formData.password) {
      setError('Email and password are required.')
      return
    }

    setIsLoading(true)

    try {
      const response = await api.post('/auth/login', formData)
      const { token, role, userId, fullName } = response.data

      localStorage.setItem('token', token)
      localStorage.setItem('role', role)
      localStorage.setItem('userId', String(userId))
      localStorage.setItem('fullName', fullName ?? '')

      if (role === 'Admin') {
        navigate('/admin', { replace: true })
      } else if (role === 'Staff') {
        navigate('/staff', { replace: true })
      } else {
        navigate('/customer', { replace: true })
      }
    } catch (requestError) {
      const apiMessage = requestError.response?.data
      setError(typeof apiMessage === 'string' ? apiMessage : 'Login failed. Check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-brand">
          <div className="auth-logo">GT</div>
          <h1>GearTrack</h1>
          <p>Sign in to your workspace</p>
        </div>

        <label className="auth-label" htmlFor="email">
          Email
        </label>
        <div className="input-shell">
          <span className="input-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M3 6.75A2.75 2.75 0 0 1 5.75 4h12.5A2.75 2.75 0 0 1 21 6.75v10.5A2.75 2.75 0 0 1 18.25 20H5.75A2.75 2.75 0 0 1 3 17.25V6.75Zm2 .18V17.1c0 .5.4.9.9.9h12.2c.5 0 .9-.4.9-.9V6.93l-6.3 4.6a1.2 1.2 0 0 1-1.4 0L5 6.93Zm13.35-.93H5.65L12 10.64 18.35 6Z" />
            </svg>
          </span>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="name@company.com"
            required
          />
        </div>

        <label className="auth-label" htmlFor="password">
          Password
        </label>
        <div className="input-shell">
          <span className="input-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V7Zm2 9.75a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5Z" />
            </svg>
          </span>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            required
          />
        </div>

        {error && <p className="error-message">{error}</p>}

        <button className="auth-button" type="submit" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Login'}
        </button>

        <p className="auth-switch-text">
          Don&apos;t have an account? <Link to="/register">Register here</Link>
        </p>
      </form>
    </div>
  )
}

export default LoginPage
