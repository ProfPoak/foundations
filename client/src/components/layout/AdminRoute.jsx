import { Outlet } from 'react-router'

function AdminRoute() {
  //TODO: redirect to / when the user is not an admin
  return <Outlet />
}

export default AdminRoute
