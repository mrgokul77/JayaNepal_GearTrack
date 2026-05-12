import { Link } from 'react-router-dom'

function StaffPage() {
  return (
    <section>
      <h1>Staff Workspace</h1>
      <p>Track stock movement, process orders, and update availability.</p>
      <p>
        <Link to="/staff/register-customer">Register Customer</Link>
        {' — add a new customer with vehicle details.'}
      </p>
      <p>
        <Link to="/staff/sales-invoice">Create Sales Invoice</Link>
        {' — sell vehicle parts and apply loyalty discount when eligible.'}
      </p>
    </section>
  )
}

export default StaffPage
