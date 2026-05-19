import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

const RoleGuard = ({ allowedRoles }) => {
  const { user, isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}

export default RoleGuard
