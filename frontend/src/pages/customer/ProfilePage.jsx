import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import './CustomerProfile.css'

function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data?.title && data?.detail) return `${data.title}: ${data.detail}`
  return fallback
}

function emptyVehicleForm() {
  return { vehicleNumber: '', brand: '', model: '', year: new Date().getFullYear() }
}

function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '', address: '' })
  const [newVehicle, setNewVehicle] = useState(() => emptyVehicleForm())
  const [editingId, setEditingId] = useState(null)
  const [editVehicle, setEditVehicle] = useState(emptyVehicleForm())
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [profileNotFound, setProfileNotFound] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingVehicle, setSavingVehicle] = useState(false)

  const loadProfile = useCallback(async () => {
    setError('')
    setProfileNotFound(false)
    setLoading(true)
    try {
      const response = await api.get('/customer-profile')
      const data = response.data
      // Debug: confirm payload shape (camelCase) and status in browser console
      console.log('[customer-profile] GET /api/customer-profile', response.status, data)

      if (!data || typeof data !== 'object') {
        setProfile(null)
        setError('Invalid profile response from server.')
        return
      }

      setProfile(data)
      setProfileForm({
        fullName: data.fullName ?? '',
        phone: data.phone ?? '',
        address: data.address ?? '',
      })
      if (data.email) {
        localStorage.setItem('email', data.email)
      }
    } catch (e) {
      console.error('[customer-profile] GET failed', e.response?.status, e.response?.data ?? e.message)
      setProfile(null)
      if (e.response?.status === 404) {
        setProfileNotFound(true)
        setError('Customer profile not found')
      } else {
        setProfileNotFound(false)
        setError(getErrorMessage(e, 'Could not load your profile.'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const displayEmail = profile?.email?.trim() || localStorage.getItem('email')?.trim() || ''

  const handleProfileChange = (event) => {
    const { name, value } = event.target
    setProfileForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSaveProfile = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSavingProfile(true)
    try {
      const { data } = await api.put('/customer-profile', {
        fullName: profileForm.fullName,
        phone: profileForm.phone,
        address: profileForm.address,
      })
      console.log('[customer-profile] PUT /api/customer-profile', data)
      setProfile(data)
      if (data.fullName) {
        localStorage.setItem('fullName', data.fullName)
      }
      if (data.email) {
        localStorage.setItem('email', data.email)
      }
      setSuccess('Profile updated.')
    } catch (e) {
      setError(getErrorMessage(e, 'Could not update profile.'))
    } finally {
      setSavingProfile(false)
    }
  }

  const handleNewVehicleChange = (event) => {
    const { name, value } = event.target
    setNewVehicle((prev) => ({
      ...prev,
      [name]: name === 'year' ? (value === '' ? '' : Number(value)) : value,
    }))
  }

  const handleAddVehicle = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSavingVehicle(true)
    try {
      await api.post('/customer-profile/vehicles', {
        vehicleNumber: newVehicle.vehicleNumber,
        brand: newVehicle.brand,
        model: newVehicle.model,
        year: Number(newVehicle.year) || 0,
      })
      setNewVehicle(emptyVehicleForm())
      setSuccess('Vehicle added.')
      await loadProfile()
    } catch (e) {
      setError(getErrorMessage(e, 'Could not add vehicle.'))
    } finally {
      setSavingVehicle(false)
    }
  }

  const startEditVehicle = (v) => {
    setError('')
    setSuccess('')
    setEditingId(v.id)
    setEditVehicle({
      vehicleNumber: v.vehicleNumber ?? '',
      brand: v.brand ?? '',
      model: v.model ?? '',
      year: v.year ?? new Date().getFullYear(),
    })
  }

  const cancelEditVehicle = () => {
    setEditingId(null)
    setEditVehicle(emptyVehicleForm())
  }

  const handleEditVehicleChange = (event) => {
    const { name, value } = event.target
    setEditVehicle((prev) => ({
      ...prev,
      [name]: name === 'year' ? (value === '' ? '' : Number(value)) : value,
    }))
  }

  const handleSaveVehicle = async (event) => {
    event.preventDefault()
    if (editingId === null) return
    setError('')
    setSuccess('')
    setSavingVehicle(true)
    try {
      await api.put(`/customer-profile/vehicles/${editingId}`, {
        vehicleNumber: editVehicle.vehicleNumber,
        brand: editVehicle.brand,
        model: editVehicle.model,
        year: Number(editVehicle.year) || 0,
      })
      setEditingId(null)
      setEditVehicle(emptyVehicleForm())
      setSuccess('Vehicle updated.')
      await loadProfile()
    } catch (e) {
      setError(getErrorMessage(e, 'Could not update vehicle.'))
    } finally {
      setSavingVehicle(false)
    }
  }

  if (loading) {
    return (
      <section className="customer-profile-page">
        <p className="customer-profile-muted">Loading your profile…</p>
      </section>
    )
  }

  if (profileNotFound) {
    return (
      <section className="customer-profile-page">
        <Link to="/customer" className="customer-profile-back">
          ← Customer portal
        </Link>
        <h1>My profile</h1>
        <div className="customer-profile-error" role="alert">
          Customer profile not found
        </div>
        <p className="customer-profile-muted">
          No customer record is linked to your login. If you registered as a customer, contact support.
        </p>
      </section>
    )
  }

  if (!profile && error) {
    return (
      <section className="customer-profile-page">
        <Link to="/customer" className="customer-profile-back">
          ← Customer portal
        </Link>
        <div className="customer-profile-error">{error}</div>
      </section>
    )
  }

  return (
    <section className="customer-profile-page">
      <Link to="/customer" className="customer-profile-back">
        ← Customer portal
      </Link>
      <h1>My profile</h1>
      <p className="customer-profile-lead">Update your contact details and manage the vehicles on your account.</p>

      {error ? <div className="customer-profile-error">{error}</div> : null}
      {success ? <div className="customer-profile-success">{success}</div> : null}

      <article className="customer-profile-card">
        <h2>Account details</h2>
        <p className="customer-profile-muted">
          <strong>Email</strong> {displayEmail || '—'} (sign-in email; contact support to change)
        </p>
        <p className="customer-profile-muted">
          <strong>Customer ID</strong> {profile?.id ?? '—'} · <strong>Member since</strong>{' '}
          {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}
        </p>

        <form className="customer-profile-form" onSubmit={handleSaveProfile}>
          <label htmlFor="fullName">Full name</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            value={profileForm.fullName}
            onChange={handleProfileChange}
            required
          />

          <label htmlFor="phone">Phone</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" value={profileForm.phone} onChange={handleProfileChange} />

          <label htmlFor="address">Address</label>
          <textarea id="address" name="address" rows={3} value={profileForm.address} onChange={handleProfileChange} />

          <button type="submit" className="customer-profile-primary" disabled={savingProfile}>
            {savingProfile ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      </article>

      <article className="customer-profile-card">
        <h2>Your vehicles</h2>
        {profile?.vehicles?.length ? (
          <div className="customer-profile-table-wrap">
            <table className="customer-profile-table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Brand</th>
                  <th>Model</th>
                  <th>Year</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {profile.vehicles.map((v) =>
                  editingId === v.id ? (
                    <tr key={v.id}>
                      <td colSpan={5}>
                        <form className="customer-profile-inline-form" onSubmit={handleSaveVehicle}>
                          <div className="customer-profile-inline-grid">
                            <label>
                              Number
                              <input
                                name="vehicleNumber"
                                value={editVehicle.vehicleNumber}
                                onChange={handleEditVehicleChange}
                                required
                              />
                            </label>
                            <label>
                              Brand
                              <input name="brand" value={editVehicle.brand} onChange={handleEditVehicleChange} required />
                            </label>
                            <label>
                              Model
                              <input name="model" value={editVehicle.model} onChange={handleEditVehicleChange} required />
                            </label>
                            <label>
                              Year
                              <input
                                name="year"
                                type="number"
                                min={1900}
                                max={2100}
                                value={editVehicle.year}
                                onChange={handleEditVehicleChange}
                                required
                              />
                            </label>
                          </div>
                          <div className="customer-profile-inline-actions">
                            <button type="submit" className="customer-profile-primary" disabled={savingVehicle}>
                              {savingVehicle ? 'Saving…' : 'Save'}
                            </button>
                            <button type="button" className="customer-profile-secondary" onClick={cancelEditVehicle}>
                              Cancel
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  ) : (
                    <tr key={v.id}>
                      <td>{v.vehicleNumber}</td>
                      <td>{v.brand}</td>
                      <td>{v.model}</td>
                      <td>{v.year}</td>
                      <td className="customer-profile-actions-cell">
                        <button type="button" className="customer-profile-linkish" onClick={() => startEditVehicle(v)}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="customer-profile-muted">No vehicles yet. Add one below.</p>
        )}

        <h3 className="customer-profile-subheading">Add a vehicle</h3>
        <form className="customer-profile-form" onSubmit={handleAddVehicle}>
          <label htmlFor="new-vehicleNumber">Vehicle number</label>
          <input
            id="new-vehicleNumber"
            name="vehicleNumber"
            value={newVehicle.vehicleNumber}
            onChange={handleNewVehicleChange}
            required
          />

          <label htmlFor="new-brand">Brand</label>
          <input id="new-brand" name="brand" value={newVehicle.brand} onChange={handleNewVehicleChange} required />

          <label htmlFor="new-model">Model</label>
          <input id="new-model" name="model" value={newVehicle.model} onChange={handleNewVehicleChange} required />

          <label htmlFor="new-year">Year</label>
          <input
            id="new-year"
            name="year"
            type="number"
            min={1900}
            max={2100}
            value={newVehicle.year}
            onChange={handleNewVehicleChange}
            required
          />

          <button type="submit" className="customer-profile-primary" disabled={savingVehicle}>
            {savingVehicle ? 'Adding…' : 'Add vehicle'}
          </button>
        </form>
      </article>
    </section>
  )
}

export default ProfilePage
