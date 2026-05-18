import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import api from '../services/api'

function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  return fallback
}

const svgIconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

function IconEye() {
  return (
    <svg {...svgIconProps}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconEyeSlash() {
  return (
    <svg {...svgIconProps}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M1 1l22 22" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </svg>
  )
}

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)

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
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div
          className="auth-brand"
          style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
        >
          <img
            src={logo}
            alt="GearTrack"
            style={{ width: '52px', height: '52px', objectFit: 'contain', flexShrink: 0 }}
          />
          <div style={{ textAlign: 'left' }}>
            <div className="auth-brand-name">GearTrack</div>
            <div className="auth-brand-tagline">Vehicle Parts System</div>
          </div>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in with your email and password to continue.</p>

        {successMessage ? <div className="alert alert-success">{successMessage}</div> : null}
        {error ? <div className="alert alert-error">{error}</div> : null}

        <div className="auth-form login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email address
            </label>
            <div className="form-input-icon">
              <span className="form-input-icon-glyph" aria-hidden="true">{'\u2709'}</span>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="you@geartrack.com"
                className="form-input"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <div className="form-input-icon form-input-icon--toggle">
              <span className="form-input-icon-glyph" aria-hidden="true">{'\u{1F512}'}</span>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                className="form-input"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="form-input-icon-toggle"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <IconEye /> : <IconEyeSlash />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="spinner" aria-hidden="true" /> Signing in&hellip;
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </div>

        <p className="auth-footer">
          New customer? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </div>
  )
}

export default LoginPage
