import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../../context/AuthContext'

function ProtectedRoute() {
  const { user, checkingSession } = useAuth()

  if (checkingSession) {
    return <p>Loading...</p>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
