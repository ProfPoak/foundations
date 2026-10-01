import { NavLink, useNavigate } from 'react-router'
import { useAuth } from '../../context/AuthContext'
import styles from '../../styles/layout/NavBar.module.css'

//NavLink passes isActive, so the current page's link also gets styles.active
function linkClass({ isActive }) {
  return isActive ? `${styles.link} ${styles.active}` : styles.link
}

function NavBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.links}>
        <NavLink to="/" className={linkClass}>Home</NavLink>
        {user?.is_admin && <NavLink to="/admin" className={linkClass}>Admin Portal</NavLink>}
      </div>
      <div className={styles.account}>
        { user ? (
          <>
            <span className={styles.user}>Logged in as {user.username}</span>
            <button className={styles.logout} onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <NavLink to="/login" className={linkClass}>Login</NavLink>
            <NavLink to="/signup" className={linkClass}>Signup</NavLink>
          </>
        )}
      </div>
    </nav>
  )
}

export default NavBar
