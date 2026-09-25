import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../../context/AuthContext'

function AdminRoute() {
  const { user, checkingSession } = useAuth()

  if (checkingSession) {
    return <p>Loading...</p>
  }

  if (!user?.is_admin) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default AdminRoute
