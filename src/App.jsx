import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import RoleGuard from './components/guards/RoleGuard'
import PublicGuard from './components/guards/PublicGuard'
import { fetchCurrentUserThunk, logout } from './store/authSlice'

// Lazy load components
// const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))
import LandingpageKhamkhao from './features/landing/pages/Landingpage_khamkhao'
import WarehouseListingPage from './features/warehouse/pages/WarehouseListingPage'
import WarehouseDetailPage from './features/warehouse/pages/WarehouseDetailPage'
import LoginPage from './features/auth/pages/LoginPage'
import RegisterPage from './features/auth/pages/RegisterPage'
import UnauthorizedPage from './features/auth/pages/UnauthorizedPage'
import ForgotPasswordPage from './features/auth/pages/ForgotPasswordPage'
import ResetPasswordPage from './features/auth/pages/ResetPasswordPage'
import Profile from './features/auth/pages/Profile'

// Admin Pages
import AdminDashboard from './features/admin/pages/AdminDashboard'
import WarehouseApprovalPage from './features/admin/pages/WarehouseApprovalPage'
import TransactionsPage from './features/admin/pages/TransactionsPage'
import DepositApprovalPage from './features/admin/pages/DepositApprovalPage'
import PaymentsPage from './features/admin/pages/PaymentsPage'
import AnalyticsPage from './features/admin/pages/AnalyticsPage'
import PlatformSettingsPage from './features/admin/pages/PlatformSettingsPage'
import UserManagementPage from './features/admin/pages/UserManagementPage'
import DisputeManagementPage from './features/admin/pages/DisputeManagementPage'
import AdminWithdrawalsPage from './features/admin/pages/AdminWithdrawalsPage'
import PermissionManagementPage from './features/admin/pages/PermissionManagementPage'
import InspectionsManagementPage from './features/admin/pages/InspectionsManagementPage'

// Tenant Pages
import TenantDashboard from './features/tenant/pages/TenantDashboard'
import InventoryPage from './features/inventory/pages/InventoryPage'
import InboundPage from './features/inbound/pages/InboundPage'
import OutboundPage from './features/outbound/pages/OutboundPage'
import MyBookingsPage from './features/tenant/pages/MyBookingsPage'
import BillingPage from './features/tenant/pages/BillingPage'
import LayoutWarehouse from './features/tenant/pages/LayoutWarehouse'

// Owner Pages
import OwnerDashboard from './features/owner/pages/OwnerDashboard'
import OwnerProfile from './features/owner/pages/OwnerProfile'
// import MyWarehousesPage from './features/owner/pages/MyWarehousesPage'
// import RentalRequestsPage from './features/owner/pages/RentalRequestsPage'
// import RevenuePage from './features/owner/pages/RevenuePage'
// Staff Pages
import StaffDashboard from './features/staff/pages/StaffDashboard'
import StaffTasksPage from './features/staff/pages/StaffTasksPage'
import StaffInventoryPage from './features/staff/pages/StaffInventoryPage'

const App = () => {
  const dispatch = useDispatch()
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          await dispatch(fetchCurrentUserThunk()).unwrap()
          const response = await authApi.getMe()
          if (response.success && response.data) {
            const { accessToken, role, fullName } = response.data
            // The getMe endpoint might not return accessToken, so we use token from localStorage
            // Let's verify what it returns. If it doesn't return accessToken, we use the stored one.
            dispatch(
              login({
                user: {
                  name: fullName || response.data.fullName,
                  role: role || response.data.role,
                },
                token,
              })
            )
          } else {
            dispatch(logout())
            localStorage.removeItem('token')
          }
        } catch (error) {
          // Token hết hạn hoặc không hợp lệ → fetchCurrentUserThunk đã clear state
          console.warn('Auth init failed:', error)
        }
      }
      setIsInitializing(false)
    }

    initializeAuth()
  }, [dispatch])

  if (isInitializing) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicGuard />}>
          <Route path="/" element={<LandingpageKhamkhao />} />
          <Route path="/warehouses" element={<WarehouseListingPage />} />
          <Route path="/warehouse/:id" element={<WarehouseDetailPage />} />
        </Route>
        {/* <Route path="/login" element={<LoginPage />} /> */}
        {/* <Route path="/register" element={<RegisterPage />} /> */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/profile" element={<Profile />} />

        {/* Protected Routes Layout */}
        {/* Admin Routes */}
        <Route element={<RoleGuard allowedRoles={['ROLE_ADMIN']} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/listings" element={<WarehouseApprovalPage />} />
          <Route path="/admin/transactions" element={<TransactionsPage />} />
          <Route path="/admin/deposits" element={<DepositApprovalPage />} />
          <Route path="/admin/payments" element={<PaymentsPage />} />
          <Route path="/admin/analytics" element={<AnalyticsPage />} />
          <Route path="/admin/settings" element={<PlatformSettingsPage />} />
          <Route path="/admin/users" element={<UserManagementPage />} />
          <Route path="/admin/disputes" element={<DisputeManagementPage />} />
          <Route path="/admin/withdrawals" element={<AdminWithdrawalsPage />} />
          <Route path="/admin/permissions" element={<PermissionManagementPage />} />
          <Route path='admin/inspections' element={<InspectionsManagementPage />} />
        </Route>

        {/* Tenant Routes */}
        <Route element={<RoleGuard allowedRoles={['ROLE_TENANT']} />}>
          <Route path="/tenant/dashboard" element={<TenantDashboard />} />
          <Route path="/tenant/inventory" element={<InventoryPage />} />
          <Route path="/tenant/inbound" element={<InboundPage />} />
          <Route path="/tenant/outbound" element={<OutboundPage />} />
          <Route path="/tenant/warehouses" element={<MyBookingsPage />} />
          <Route path="/tenant/payments" element={<BillingPage />} />
          <Route path="/tenant/layoutwarehouses" element={<LayoutWarehouse />} />
        </Route>

        {/* Owner Routes */}
        {/* <Route element={<RoleGuard allowedRoles={['ROLE_OWNER']} />}> */}
        <Route path="/owner/dashboard" element={<OwnerDashboard />} />

        {/* <Route path="/owner/warehouses" element={<MyWarehousesPage />} /> */}
        {/* <Route path="/owner/requests" element={<RentalRequestsPage />} /> */}
        {/* <Route path="/owner/revenue" element={<RevenuePage />} /> */}

        <Route path="/owner/profile" element={<OwnerProfile />} />

        {/* </Route> */}

        {/* Staff Routes */}
        <Route element={<RoleGuard allowedRoles={['ROLE_STAFF']} />}>
          <Route path="/staff/dashboard" element={<StaffDashboard />} />
          <Route path="/staff/tasks" element={<StaffTasksPage />} />
          <Route path="/staff/inventory" element={<StaffInventoryPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
  //check config mail
}

export default App
