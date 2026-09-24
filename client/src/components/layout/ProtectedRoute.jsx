import { Outlet } from 'react-router'

function ProtectedRoute() {
  //TODO: redirect to /login when there is no user
  return <Outlet />
}

export default ProtectedRoute
