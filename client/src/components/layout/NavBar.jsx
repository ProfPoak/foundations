import { NavLink, useNavigate } from 'react-router'
import { useAuth } from '../../context/AuthContext'

function NavBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav>
      <NavLink to="/">Home</NavLink>
      {user?.is_admin && <NavLink to="/admin">Admin Portal</NavLink>}
      { user ? (
        <>
          <span>Logged in as {user.username}</span>
          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <>
          <NavLink to="/login">Login</NavLink>
          <NavLink to="/signup">Signup</NavLink>
        </>
      )}
    </nav>
  )
}

export default NavBar
