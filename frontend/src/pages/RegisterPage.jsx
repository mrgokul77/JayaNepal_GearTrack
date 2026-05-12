import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'

function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  return fallback
}

function RegisterPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((previous) => ({ ...previous, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await api.post('/auth/register', {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
      })
      navigate('/login', { replace: true })
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Registration failed. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Create account</h1>
        <p className="login-card-lead">Register as a customer to shop and track orders.</p>

        <label htmlFor="fullName">Full name</label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          value={formData.fullName}
          onChange={handleChange}
          required
        />

        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <label htmlFor="phone">Phone</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          value={formData.phone}
          onChange={handleChange}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={formData.password}
          onChange={handleChange}
          required
        />

        {error && <p className="error-message">{error}</p>}

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating account…' : 'Register'}
        </button>

        <p className="login-card-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  )
}

export default RegisterPage
