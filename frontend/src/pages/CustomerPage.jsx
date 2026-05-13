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
      <p>
        <Link to="/customer/history">My History</Link>
        {' — view your purchase and service appointment history.'}
      </p>
      <p>
        <Link to="/customer/loyalty">My Loyalty</Link>
        {' — see how the 10% big-order discount works and track your savings.'}
      </p>
      <p>
        <Link to="/customer/appointments">Appointments</Link>
        {' — book service visits and cancel pending bookings.'}
      </p>
      <p>
        <Link to="/customer/part-requests">Part requests</Link>
        {' — ask for parts that are unavailable or not in stock.'}
      </p>
      <p>
        <Link to="/customer/reviews">Service reviews</Link>
        {' — rate your experience and leave feedback.'}
      </p>
    </section>
  )
}

export default CustomerPage
