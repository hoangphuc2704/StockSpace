import { Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'

const RoleGuard = ({ allowedRoles }) => {
  const { user, isAuthenticated } = useSelector((state) => state.auth)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}

export default RoleGuard
