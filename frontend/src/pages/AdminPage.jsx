import { Link } from 'react-router-dom'

function AdminPage() {
  return (
    <section>
      <h1>Admin Dashboard</h1>
      <p>Manage users, parts catalog, and full inventory insights.</p>
      <p>
        <Link to="/admin/vendors">Manage vendors</Link>
      </p>
    </section>
  )
}

export default AdminPage
