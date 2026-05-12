import { Link } from 'react-router-dom'

function AdminPage() {
  return (
    <section>
      <h1>Admin Dashboard</h1>
      <p>Manage users, parts catalog, and full inventory insights.</p>
      <p>
        <Link to="/admin/register-staff">Register staff</Link>
        {' · '}
        <Link to="/admin/vendors">Manage vendors</Link>
        {' · '}
        <Link to="/admin/purchase-invoices">Purchase invoices</Link>
      </p>
    </section>
  )
}

export default AdminPage
