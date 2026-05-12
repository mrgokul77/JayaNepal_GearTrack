import { useNavigate } from 'react-router-dom'
import './LogoutButton.css'

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
      Log out
    </button>
  )
}

export default LogoutButton
