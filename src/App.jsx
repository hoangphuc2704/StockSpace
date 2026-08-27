import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import RoleGuard from './components/guards/RoleGuard'
import PublicGuard from './components/guards/PublicGuard'
import PublicPageLayout from './components/PublicPageLayout'
import { fetchCurrentUserThunk, logout } from './store/authSlice'

// Lazy load components
// const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))
import LandingpageKhamkhao from './features/landing/pages/Landingpage_khamkhao'
import WarehouseListingPage from './features/warehouse/pages/WarehouseListingPage'
import WarehouseDetailPage from './features/warehouse/pages/WarehouseDetailPage'
import UnauthorizedPage from './features/auth/pages/UnauthorizedPage'
import ForgotPasswordPage from './features/auth/pages/ForgotPasswordPage'
import ResetPasswordPage from './features/auth/pages/ResetPasswordPage'
import Profile from './features/auth/pages/Profile'
import PackageList from './features/package/pages/PackageList'
import PackageDetail from './features/package/pages/PackageDetail'

// Admin Pages
import AdminDashboard from './features/admin/pages/AdminDashboard'
import WarehouseApprovalPage from './features/admin/pages/WarehouseApprovalPage'
import TransactionsPage from './features/admin/pages/TransactionsPage'
import DepositApprovalPage from './features/admin/pages/DepositApprovalPage'
import PaymentsPage from './features/admin/pages/PaymentsPage'
import AnalyticsPage from './features/admin/pages/AnalyticsPage'
// import PlatformSettingsPage from './features/admin/pages/PlatformSettingsPage'
import SystemPolicyPage from './features/admin/pages/SystemPolicyPage'
import UserManagementPage from './features/admin/pages/UserManagementPage'
import AdminWithdrawalsPage from './features/admin/pages/AdminWithdrawalsPage'
import PermissionManagementPage from './features/admin/pages/PermissionManagementPage'
import InspectionsManagementPage from './features/admin/pages/InspectionsManagementPage'
import WareHouseManagementPage from './features/admin/pages/WareHouseManagementPage'
import WarehousesTypePage from './features/admin/pages/WarehousesTypePage'
import SystemConfigueManagementPage from './features/admin/pages/SystemConfigueManagementPage'
import AdminAuditsPage from './features/admin/pages/AdminAuditsPage'
import AdminInventoryPage from './features/admin/pages/AdminInventoryPage'
import WalletAdmin from './features/admin/pages/WalletAdmin'
// Tenant Pages
import TenantDashboard from './features/tenant/pages/TenantDashboard'
import InventoryPage from './features/inventory/pages/InventoryPage'
import SkuPage from './features/inventory/pages/SkuPage'
import CategoryPage from './features/inventory/pages/CategoryPage'
import InboundPage from './features/inbound/pages/InboundPage'
import OutboundPage from './features/outbound/pages/OutboundPage'
import InventoryAuditPage from './features/inventory/pages/InventoryAuditPage'
import InventoryAuditDetailPage from './features/inventory/pages/InventoryAuditDetailPage'
import SubscriptionPage from './features/tenant/pages/SubscriptionPage'
import LayoutWarehouse from './features/tenant/pages/LayoutWarehouse'
import WalletTenant from './features/tenant/pages/WalletTenant'
import WalletCallback from './features/tenant/pages/WalletCallback'
import TenantContractsPage from './features/tenant/pages/TenantContractsPage'
import TenantStaffManagementPage from './features/tenant/pages/TenantStaffManagementPage'
import ProductManagementPage from './features/tenant/pages/ProductManagementPage'
import StaffAcceptInvitationPage from './features/auth/pages/StaffAcceptInvitationPage'

// Owner Pages
import OwnerDashboard from './features/owner/pages/OwnerDashboard'
import OwnerProfile from './features/owner/pages/OwnerProfile'
import PostWarehouse from './features/owner/pages/PostWarehouse'
import ListWarehouse from './features/owner/pages/ListWarehouse'
import OwnerContractsPage from './features/owner/pages/OwnerContractsPage'

// Staff Pages
import StaffDashboard from './features/staff/pages/StaffDashboard'
import StaffTasksPage from './features/staff/pages/StaffTasksPage'
import StaffCareerHistoryPage from './features/staff/pages/StaffCareerHistoryPage'
import Packages_SubcriptionsManagementPage from './features/admin/pages/Packages_SubcriptionsManagementPage'

// Inspector Pages
import InspectorInspectionsPage from './features/inspector/pages/InspectorInspectionsPage'
import WithdrawsHistory from './features/owner/pages/WithdrawsHistory'
import AIChatWidget from './features/chat/components/AIChatWidget'

// Dev Sandbox
// import DevApiSandbox from './features/dev/DevApiSandbox'

const PENDING_OWNER_LAYOUT_KEY = 'stockspace:pending-owner-layout'

const getPendingOwnerLayout = () => {
  try {
    const raw = sessionStorage.getItem(PENDING_OWNER_LAYOUT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const OwnerLayoutSetupGuard = () => {
  const location = useLocation()
  const user = useSelector((state) => state.auth.user)
  const pendingLayout = getPendingOwnerLayout()
  const belongsToCurrentOwner =
    pendingLayout &&
    (!pendingLayout.ownerId || String(pendingLayout.ownerId) === String(user?.userId))

  if (belongsToCurrentOwner && location.pathname !== '/owner/layoutwarehouses') {
    const params = new URLSearchParams({
      warehouseId: String(pendingLayout.warehouseId || ''),
      width: String(pendingLayout.width || ''),
      length: String(pendingLayout.length || ''),
      height: String(pendingLayout.height || ''),
      setupRequired: 'true',
    })
    return <Navigate to={`/owner/layoutwarehouses?${params.toString()}`} replace />
  }

  return <Outlet />
}

const App = () => {
  const dispatch = useDispatch()
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          await dispatch(fetchCurrentUserThunk()).unwrap()
        } catch (error) {
          dispatch(logout())
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
          <Route path="/packages" element={<PackageList />} />
          <Route path="/packages/:id" element={<PackageDetail />} />
          <Route element={<PublicPageLayout />}>
            <Route path="/warehouse/:id" element={<WarehouseDetailPage />} />
          </Route>
        </Route>
        {/* <Route path="/login" element={<LoginPage />} /> */}
        {/* <Route path="/register" element={<RegisterPage />} /> */}
        <Route element={<PublicPageLayout />}>
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/staff/accept" element={<StaffAcceptInvitationPage />} />
        </Route>
        <Route path="/wallet/callback" element={<WalletCallback />} />

        {/* Protected Routes Layout */}
        {/* Admin Routes */}
        {/* <Route element={<RoleGuard allowedRoles={['ROLE_ADMIN']} />}> */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/listings" element={<WarehouseApprovalPage />} />
        <Route path="/admin/transactions" element={<TransactionsPage />} />
        <Route path="/admin/deposits" element={<DepositApprovalPage />} />
        <Route path="/admin/payments" element={<PaymentsPage />} />
        <Route path="/admin/analytics" element={<AnalyticsPage />} />
        <Route path="/admin/system-policies" element={<SystemPolicyPage />} />
        <Route path="/admin/users" element={<UserManagementPage />} />
        <Route path="/admin/withdrawals" element={<AdminWithdrawalsPage />} />
        <Route path="/admin/permissions" element={<PermissionManagementPage />} />
        <Route path="admin/inspections" element={<InspectionsManagementPage />} />
        <Route path="admin/warehouses-management" element={<WareHouseManagementPage />} />
        <Route path="admin/warehouse-types" element={<WarehousesTypePage />} />
        <Route path="admin/system-config" element={<SystemConfigueManagementPage />} />
        <Route path="admin/package-subcription" element={<Packages_SubcriptionsManagementPage />} />
        <Route path="/admin/wms-audits" element={<AdminAuditsPage />} />
        <Route path="/admin/wms-inventory" element={<AdminInventoryPage />} />
        <Route path="/admin/wallet" element={<WalletAdmin />} />
        {/* </Route> */}

        {/* Tenant Routes */}
        <Route element={<RoleGuard allowedRoles={['ROLE_TENANT']} />}>
          <Route path="/tenant/dashboard" element={<TenantDashboard />} />
          <Route path="/tenant/inventory" element={<InventoryPage />} />
          <Route path="/tenant/categories" element={<CategoryPage />} />
          <Route path="/tenant/skus" element={<SkuPage />} />
          <Route
            path="/tenant/inventory-audits"
            element={<InventoryAuditPage currentRole="TENANT" />}
          />
          <Route
            path="/tenant/inventory-audits/:id"
            element={<InventoryAuditDetailPage currentRole="TENANT" />}
          />
          <Route path="/tenant/inbound" element={<InboundPage />} />
          <Route path="/tenant/outbound" element={<OutboundPage />} />

          <Route path="/tenant/subscription" element={<SubscriptionPage />} />
          <Route
            path="/tenant/layoutwarehouses"
            element={<LayoutWarehouse currentRole="TENANT" />}
          />

          {/* <Route path="/tenant/payments" element={<BillingPage />} /> */}
          {/* <Route
            path="/tenant/layoutwarehouses"
            element={<LayoutWarehouse currentRole="TENANT" />}
          /> */}

          <Route
            path="/tenant/bin-stock"
            element={
              <LayoutWarehouse
                key="tenant-bin-stock"
                currentRole="TENANT"
                initialView="stock"
                stockOnly
              />
            }
          />
          <Route path="/tenant/wallet" element={<WalletTenant />} />
          <Route path="/tenant/contracts" element={<TenantContractsPage />} />
          <Route path="/tenant/staff" element={<TenantStaffManagementPage />} />
          <Route path="/tenant/products" element={<ProductManagementPage />} />
        </Route>

        {/* Owner Routes */}
        <Route element={<RoleGuard allowedRoles={['ROLE_OWNER']} />}>
          <Route element={<OwnerLayoutSetupGuard />}>
            <Route path="/owner/dashboard" element={<OwnerDashboard />} />
            <Route path="/owner/postwarehouse" element={<PostWarehouse />} />
            <Route path="/owner/listwarehouse" element={<ListWarehouse />} />
            <Route
              path="/owner/layoutwarehouses"
              element={<LayoutWarehouse currentRole="OWNER" />}
            />
            <Route path="/owner/wallet/withdraws" element={<WithdrawsHistory />} />
            <Route path="/owner/profile" element={<OwnerProfile />} />
            <Route path="/owner/contracts" element={<OwnerContractsPage />} />
          </Route>
        </Route>

        {/* Staff Routes */}
        <Route element={<RoleGuard allowedRoles={['ROLE_STAFF']} />}>
          <Route path="/staff/dashboard" element={<StaffDashboard />} />
          <Route path="/staff/tasks" element={<StaffTasksPage />} />
          <Route path="/staff/inventory" element={<InventoryPage />} />
          <Route
            path="/staff/inventory-audits"
            element={<InventoryAuditPage currentRole="STAFF" />}
          />
          <Route
            path="/staff/inventory-audits/:id"
            element={<InventoryAuditDetailPage currentRole="STAFF" />}
          />
          <Route path="/staff/inbound" element={<InboundPage />} />
          <Route path="/staff/outbound" element={<OutboundPage />} />
          <Route path="/staff/layoutwarehouses" element={<LayoutWarehouse currentRole="STAFF" />} />
          <Route path="/staff/career-history" element={<StaffCareerHistoryPage />} />
        </Route>

        {/* Inspector Routes */}
        <Route element={<RoleGuard allowedRoles={['ROLE_INSPECTOR']} />}>
          <Route path="/inspector/inspections" element={<InspectorInspectionsPage />} />
        </Route>

        {/* TRANG TEST API CHO DEV (ẨN) */}
        {/* <Route path="/dev-sandbox" element={<DevApiSandbox />} />   */}

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AIChatWidget />
    </BrowserRouter>
  )
  //check config mail
}

export default App
