import { Link } from 'react-router-dom'

function CustomerPage() {
  const fullName = localStorage.getItem('fullName')?.trim()

  return (
    <section>
      <h1>Customer Portal</h1>
      {fullName ? (
        <p>
          Welcome back, <strong>{fullName}</strong>.
        </p>
      ) : (
        <p>Welcome to your customer portal.</p>
      )}
      <p>Browse vehicle parts, check prices, and view order-ready stock.</p>
      <p>
        <Link to="/customer/profile">My Profile</Link>
        {' — update your details and manage your vehicles.'}
      </p>
    </section>
  )
}

export default CustomerPage
