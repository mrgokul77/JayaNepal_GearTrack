import { useState } from 'react'
import api from '../../services/api'

function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data?.title && data?.detail) return `${data.title}: ${data.detail}`
  return fallback
}

const initialCustomer = { fullName: '', email: '', phone: '', address: '' }
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
      if (requestError.response?.status === 400) {
        setError(getErrorMessage(requestError, 'A customer with this email already exists.'))
      } else {
        setError(getErrorMessage(requestError, 'Could not complete registration. Please check the form and try again.'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">Register customer</h1>
          <p className="page-subtitle">Create a customer account and attach their primary vehicle in one step.</p>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Customer details</div>
              <div className="card-subtitle">Contact info and login email.</div>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                name="fullName"
                className="form-input"
                value={customer.fullName}
                onChange={handleCustomerChange}
                autoComplete="name"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-input"
                value={customer.email}
                onChange={handleCustomerChange}
                autoComplete="email"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="phone">Phone</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="form-input"
                value={customer.phone}
                onChange={handleCustomerChange}
                autoComplete="tel"
                required
              />
            </div>
            <div className="form-group form-grid-full">
              <label className="form-label" htmlFor="address">Address</label>
              <input
                id="address"
                name="address"
                className="form-input"
                value={customer.address}
                onChange={handleCustomerChange}
                autoComplete="street-address"
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Vehicle details</div>
              <div className="card-subtitle">Primary vehicle for this customer.</div>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="vehicleNumber">Vehicle number</label>
              <input
                id="vehicleNumber"
                name="vehicleNumber"
                className="form-input"
                value={vehicle.vehicleNumber}
                onChange={handleVehicleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="year">Year</label>
              <input
                id="year"
                name="year"
                type="number"
                className="form-input"
                min={1900}
                max={new Date().getFullYear() + 1}
                value={vehicle.year}
                onChange={handleVehicleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="brand">Brand</label>
              <input
                id="brand"
                name="brand"
                className="form-input"
                value={vehicle.brand}
                onChange={handleVehicleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="model">Model</label>
              <input
                id="model"
                name="model"
                className="form-input"
                value={vehicle.model}
                onChange={handleVehicleChange}
                required
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Saving&hellip;
                </>
              ) : (
                'Save customer & vehicle'
              )}
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}

export default RegisterCustomer
