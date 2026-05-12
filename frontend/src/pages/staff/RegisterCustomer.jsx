import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import './RegisterCustomer.css'

function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data?.title && data?.detail) return `${data.title}: ${data.detail}`
  return fallback
}

const initialCustomer = {
  fullName: '',
  email: '',
  phone: '',
  address: '',
}

const initialVehicle = {
  vehicleNumber: '',
  brand: '',
  model: '',
  year: new Date().getFullYear(),
}

function RegisterCustomer() {
  const [customer, setCustomer] = useState(initialCustomer)
  const [vehicle, setVehicle] = useState(initialVehicle)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCustomerChange = (event) => {
    const { name, value } = event.target
    setCustomer((previous) => ({ ...previous, [name]: value }))
  }

  const handleVehicleChange = (event) => {
    const { name, value } = event.target
    setVehicle((previous) => ({
      ...previous,
      [name]: name === 'year' ? (value === '' ? '' : Number.parseInt(value, 10)) : value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    try {
      const customerResponse = await api.post('/customers', {
        fullName: customer.fullName.trim(),
        email: customer.email.trim(),
        phone: customer.phone.trim(),
        address: customer.address.trim(),
      })

      const customerId = customerResponse.data.id
      const initialPassword = customerResponse.data.initialPassword

      await api.post(`/customers/${customerId}/vehicles`, {
        vehicleNumber: vehicle.vehicleNumber.trim(),
        brand: vehicle.brand.trim(),
        model: vehicle.model.trim(),
        year: Number(vehicle.year),
      })

      let message =
        'Customer and vehicle were saved successfully. Share the login email and initial password with the customer.'
      if (initialPassword) {
        message += ` Initial password: ${initialPassword}`
      }
      setSuccess(message)
      setCustomer(initialCustomer)
      setVehicle({ ...initialVehicle, year: new Date().getFullYear() })
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not complete registration. Please check the form and try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="register-customer-page">
      <h1>Register customer</h1>
      <p className="register-customer-lead">
        Create a customer account and attach their primary vehicle. Both steps are submitted together.
      </p>

      <form className="register-customer-form" onSubmit={handleSubmit}>
        <section className="register-section" aria-labelledby="customer-section-title">
          <h2 id="customer-section-title">Customer details</h2>
          <div className="register-field-grid">
            <div>
              <label htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                name="fullName"
                value={customer.fullName}
                onChange={handleCustomerChange}
                autoComplete="name"
                required
              />
            </div>
            <div>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={customer.email}
                onChange={handleCustomerChange}
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={customer.phone}
                onChange={handleCustomerChange}
                autoComplete="tel"
                required
              />
            </div>
            <div className="full-width">
              <label htmlFor="address">Address</label>
              <input
                id="address"
                name="address"
                value={customer.address}
                onChange={handleCustomerChange}
                autoComplete="street-address"
              />
            </div>
          </div>
        </section>

        <section className="register-section" aria-labelledby="vehicle-section-title">
          <h2 id="vehicle-section-title">Vehicle details</h2>
          <div className="register-field-grid two-cols">
            <div>
              <label htmlFor="vehicleNumber">Vehicle number</label>
              <input
                id="vehicleNumber"
                name="vehicleNumber"
                value={vehicle.vehicleNumber}
                onChange={handleVehicleChange}
                required
              />
            </div>
            <div>
              <label htmlFor="year">Year</label>
              <input
                id="year"
                name="year"
                type="number"
                min={1900}
                max={new Date().getFullYear() + 1}
                value={vehicle.year}
                onChange={handleVehicleChange}
                required
              />
            </div>
            <div>
              <label htmlFor="brand">Brand</label>
              <input id="brand" name="brand" value={vehicle.brand} onChange={handleVehicleChange} required />
            </div>
            <div>
              <label htmlFor="model">Model</label>
              <input id="model" name="model" value={vehicle.model} onChange={handleVehicleChange} required />
            </div>
          </div>
        </section>

        {error && <p className="register-error">{error}</p>}
        {success && (
          <div className="register-success" role="status">
            <strong>Success</strong>
            {success}
          </div>
        )}

        <div className="register-actions">
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save customer & vehicle'}
          </button>
          <Link className="link-muted" to="/staff">
            Back to staff home
          </Link>
        </div>
      </form>
    </div>
  )
}

export default RegisterCustomer
