import { useNavigate } from 'react-router-dom'

/**
 * Clears the local session and redirects to the login page.
 * Used inside the sidebar footer on every dashboard.
 */
function LogoutButton() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('userId')
    localStorage.removeItem('fullName')
    localStorage.removeItem('email')
    navigate('/login', { replace: true })
  }

  return (
    <button type="button" className="logout-button" onClick={handleLogout}>
      <span aria-hidden="true">{'\u23FB'}</span>
      <span>Log out</span>
    </button>
  )
}

export default LogoutButton
