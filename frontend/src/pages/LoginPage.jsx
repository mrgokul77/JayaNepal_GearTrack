import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../services/api'

function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  return fallback
}

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (location.state?.registered) {
      setSuccessMessage('Account created successfully. You can sign in now.')
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.pathname, location.state, navigate])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((previous) => ({ ...previous, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')
    setIsLoading(true)

    try {
      const response = await api.post('/auth/login', formData)
      const body = response.data ?? {}
      const token = body.token ?? body.Token
      const role = body.role ?? body.Role
      const userId = body.userId ?? body.UserId
      const fullName = body.fullName ?? body.FullName

      if (!token || !role) {
        setError('Invalid response from server. Please try again.')
        return
      }

      localStorage.setItem('token', token)
      localStorage.setItem('role', role)
      localStorage.setItem('userId', String(userId ?? ''))
      localStorage.setItem('fullName', fullName ?? '')
      localStorage.setItem('email', formData.email.trim().toLowerCase())

      if (role === 'Admin') {
        navigate('/admin', { replace: true })
      } else if (role === 'Staff') {
        navigate('/staff', { replace: true })
      } else {
        navigate('/customer', { replace: true })
      }
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('role')
        localStorage.removeItem('userId')
        localStorage.removeItem('fullName')
        localStorage.removeItem('email')
      }
      setError(getErrorMessage(requestError, 'Login failed. Check your credentials.'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>GearTrack</h1>
        <p className="login-card-lead">Sign in with your email and password.</p>

        {successMessage ? <p className="success-message">{successMessage}</p> : null}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={formData.password}
          onChange={handleChange}
          required
        />

        {error && <p className="error-message">{error}</p>}

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="login-card-footer">
          <Link to="/register">Register as Customer</Link>
        </p>
      </form>
    </div>
  )
}

export default LoginPage
