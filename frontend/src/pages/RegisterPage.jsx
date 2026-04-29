import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'

const initialFormData = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  role: 'Customer',
}

function RegisterPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState(initialFormData)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((previous) => ({ ...previous, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.password) {
      setError('Full name, email, phone, and password are required.')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setIsLoading(true)

    try {
      const payload = {
        ...formData,
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: 'Customer',
      }
      console.log('Register request payload:', payload)

      await api.post('/auth/register', payload)

      navigate('/login', { replace: true })
    } catch (requestError) {
      console.log('Register API error:', requestError)
      console.log('Register API error response:', requestError.response?.data)
      const apiMessage = requestError.response?.data
      setError(typeof apiMessage === 'string' ? apiMessage : 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-brand">
          <div className="auth-logo">GT</div>
          <h1>Create your account</h1>
          <p>Get started with GearTrack today</p>
        </div>

        <label className="auth-label" htmlFor="fullName">
          Full Name
        </label>
        <div className="input-shell">
          <span className="input-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M12 12.5a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm0 2.25c-4.21 0-7.5 2.27-7.5 5.17 0 .6.49 1.08 1.08 1.08h12.84c.6 0 1.08-.49 1.08-1.08 0-2.9-3.29-5.17-7.5-5.17Z" />
            </svg>
          </span>
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Enter your full name"
            required
          />
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

        <label className="auth-label" htmlFor="phone">
          Phone
        </label>
        <div className="input-shell">
          <span className="input-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M6.62 10.79a15.42 15.42 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.31.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.3 21 3 13.7 3 4a1 1 0 0 1 1-1h3.49a1 1 0 0 1 1 1c0 1.26.2 2.45.57 3.57a1 1 0 0 1-.24 1.02l-2.2 2.2Z" />
            </svg>
          </span>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+977 98XXXXXXXX"
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
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            placeholder="Create a secure password"
            required
          />
          <button
            className="password-toggle"
            type="button"
            onClick={() => setShowPassword((previous) => !previous)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}

        <button className="auth-button" type="submit" disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Register'}
        </button>

        <p className="auth-switch-text">
          Already have account? <Link to="/login">Login here</Link>
        </p>
      </form>
    </div>
  )
}

export default RegisterPage
