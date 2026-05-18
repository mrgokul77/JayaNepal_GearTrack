import { useCallback, useEffect, useState } from 'react'
import api from '../../services/api'

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

function initials(name) {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?'
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
      if (data.email) localStorage.setItem('email', data.email)
    } catch (e) {
      setProfile(null)
      if (e.response?.status === 404) {
        setProfileNotFound(true)
        setError('Customer profile not found.')
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
      setProfile(data)
      if (data.fullName) localStorage.setItem('fullName', data.fullName)
      if (data.email) localStorage.setItem('email', data.email)
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
      <section>
        <div className="loading-state">
          <span className="spinner" aria-hidden="true" /> Loading your profile&hellip;
        </div>
      </section>
    )
  }

  if (profileNotFound) {
    return (
      <section>
        <div className="page-header">
          <div>
            <h1 className="page-title">My profile</h1>
          </div>
        </div>
        <div className="alert alert-error">Customer profile not found</div>
        <div className="card">
          <p className="muted">
            No customer record is linked to your login. If you registered as a customer, contact support.
          </p>
        </div>
      </section>
    )
  }

  if (!profile && error) {
    return (
      <section>
        <div className="page-header">
          <div>
            <h1 className="page-title">My profile</h1>
          </div>
        </div>
        <div className="alert alert-error">{error}</div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">My profile</h1>
          <p className="page-subtitle">Update your contact details and manage the vehicles on your account.</p>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}

      <div className="card">
        <div className="flex gap-3" style={{ alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <div className="avatar avatar-lg" aria-hidden="true">{initials(profile?.fullName)}</div>
          <div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{profile?.fullName || 'Customer'}</div>
            <div className="muted">{displayEmail || '\u2014'}</div>
            <div className="muted" style={{ fontSize: '0.8125rem' }}>
              Customer #{profile?.id ?? '\u2014'}
              {' \u00B7 '}
              Member since{' '}
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '\u2014'}
            </div>
          </div>
        </div>
        <hr className="divider" />

        <div className="card-header">
          <div className="card-title">Edit details</div>
        </div>
        <form onSubmit={handleSaveProfile}>
          <div className="form-grid">
            <div className="form-group form-grid-full">
              <label className="form-label" htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                name="fullName"
                className="form-input"
                value={profileForm.fullName}
                onChange={handleProfileChange}
                autoComplete="name"
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
                value={profileForm.phone}
                onChange={handleProfileChange}
                autoComplete="tel"
              />
            </div>
            <div className="form-group form-grid-full">
              <label className="form-label" htmlFor="address">Address</label>
              <textarea
                id="address"
                name="address"
                className="form-textarea"
                rows={3}
                value={profileForm.address}
                onChange={handleProfileChange}
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={savingProfile}>
              {savingProfile ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Saving&hellip;
                </>
              ) : (
                'Save profile'
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Your vehicles</div>
        </div>
        {profile?.vehicles?.length ? (
          <div className="item-card-grid">
            {profile.vehicles.map((v) =>
              editingId === v.id ? (
                <form key={v.id} className="item-card" onSubmit={handleSaveVehicle} style={{ borderColor: 'var(--color-primary-100)' }}>
                  <div className="form-group">
                    <label className="form-label">Number</label>
                    <input
                      name="vehicleNumber"
                      className="form-input"
                      value={editVehicle.vehicleNumber}
                      onChange={handleEditVehicleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Brand</label>
                    <input
                      name="brand"
                      className="form-input"
                      value={editVehicle.brand}
                      onChange={handleEditVehicleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Model</label>
                    <input
                      name="model"
                      className="form-input"
                      value={editVehicle.model}
                      onChange={handleEditVehicleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Year</label>
                    <input
                      name="year"
                      type="number"
                      min={1900}
                      max={2100}
                      className="form-input"
                      value={editVehicle.year}
                      onChange={handleEditVehicleChange}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="btn btn-primary btn-sm" disabled={savingVehicle}>
                      {savingVehicle ? 'Saving\u2026' : 'Save'}
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={cancelEditVehicle}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="item-card" key={v.id}>
                  <div className="flex-between">
                    <div className="item-card-title">{v.vehicleNumber}</div>
                    <span className="badge badge-info">{v.year}</span>
                  </div>
                  <div className="item-card-meta">
                    {v.brand} {v.model}
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => startEditVehicle(v)}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    Edit
                  </button>
                </div>
              ),
            )}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">{'\u{1F697}'}</div>
            <div className="empty-state-title">No vehicles yet</div>
            <div className="empty-state-desc">Add one below to keep track of service and parts.</div>
          </div>
        )}

        <hr className="divider" />

        <div className="card-header">
          <div className="card-title">Add a vehicle</div>
        </div>
        <form onSubmit={handleAddVehicle}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="new-vehicleNumber">Vehicle number</label>
              <input
                id="new-vehicleNumber"
                name="vehicleNumber"
                className="form-input"
                value={newVehicle.vehicleNumber}
                onChange={handleNewVehicleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="new-year">Year</label>
              <input
                id="new-year"
                name="year"
                type="number"
                min={1900}
                max={2100}
                className="form-input"
                value={newVehicle.year}
                onChange={handleNewVehicleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="new-brand">Brand</label>
              <input
                id="new-brand"
                name="brand"
                className="form-input"
                value={newVehicle.brand}
                onChange={handleNewVehicleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="new-model">Model</label>
              <input
                id="new-model"
                name="model"
                className="form-input"
                value={newVehicle.model}
                onChange={handleNewVehicleChange}
                required
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={savingVehicle}>
              {savingVehicle ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Adding&hellip;
                </>
              ) : (
                'Add vehicle'
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

export default ProfilePage
