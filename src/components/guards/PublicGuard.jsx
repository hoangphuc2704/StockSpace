import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'

const PublicGuard = () => {
  const { user, isAuthenticated } = useSelector((state) => state.auth)
  const location = useLocation()

  // Landing page is available to most roles, but OWNER is redirected to dashboard
  if (location.pathname === '/') {
    if (isAuthenticated && user?.role === 'ROLE_OWNER') {
      return <Navigate to="/owner/dashboard" replace />
    }
    return <Outlet />
  }

  // Other public pages keep the existing role-based redirect behavior.
  if (isAuthenticated && user?.role && user.role !== 'ROLE_TENANT') {
    const role = user.role
    if (role === 'ROLE_ADMIN') return <Navigate to="/admin/dashboard" replace />
    if (role === 'ROLE_OWNER') return <Navigate to="/owner/dashboard" replace />
    if (role === 'ROLE_STAFF') return <Navigate to="/staff/dashboard" replace />
    if (role === 'ROLE_INSPECTOR') return <Navigate to="/inspector/inspections" replace />

    // Fallback if role doesn't match predefined back-office roles
    return <Navigate to="/unauthorized" replace />
  }

  // Guests and Tenants can access public routes
  return <Outlet />
}

export default PublicGuard
