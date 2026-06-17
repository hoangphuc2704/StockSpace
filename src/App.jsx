import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import RoleGuard from './components/guards/RoleGuard'

// Lazy load components
// const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))
import LandingpageKhamkhao from './features/landing/pages/Landingpage_khamkhao'
import WarehouseListingPage from './features/warehouse/pages/WarehouseListingPage'
import WarehouseDetailPage from './features/warehouse/pages/WarehouseDetailPage'
import LoginPage from './features/auth/pages/LoginPage'
import RegisterPage from './features/auth/pages/RegisterPage'
import UnauthorizedPage from './features/auth/pages/UnauthorizedPage'

// Admin Pages
import AdminDashboard from './features/admin/pages/AdminDashboard'
import WarehouseApprovalPage from './features/admin/pages/WarehouseApprovalPage'
import TransactionsPage from './features/admin/pages/TransactionsPage'
import DepositApprovalPage from './features/admin/pages/DepositApprovalPage'
import PaymentsPage from './features/admin/pages/PaymentsPage'
import AnalyticsPage from './features/admin/pages/AnalyticsPage'
import PlatformSettingsPage from './features/admin/pages/PlatformSettingsPage'

// Tenant Pages
import TenantDashboard from './features/dashboard/pages/TenantDashboard'
import InventoryPage from './features/inventory/pages/InventoryPage'
import InboundPage from './features/inbound/pages/InboundPage'
import OutboundPage from './features/outbound/pages/OutboundPage'
import MyBookingsPage from './features/tenant/pages/MyBookingsPage'
import BillingPage from './features/tenant/pages/BillingPage'

// Owner Pages
import OwnerDashboard from './features/owner/pages/OwnerDashboard'
import MyWarehousesPage from './features/owner/pages/MyWarehousesPage'
import RentalRequestsPage from './features/owner/pages/RentalRequestsPage'
import RevenuePage from './features/owner/pages/RevenuePage'

// Staff Pages
import StaffDashboard from './features/staff/pages/StaffDashboard'
import StaffTasksPage from './features/staff/pages/StaffTasksPage'
import StaffInventoryPage from './features/staff/pages/StaffInventoryPage'

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        {/* <Route path="/" element={<LandingPage />} /> */}
        <Route path="/" element={<LandingpageKhamkhao />} />
        <Route path="/warehouses" element={<WarehouseListingPage />} />
        <Route path="/warehouse/:id" element={<WarehouseDetailPage />} />
        {/* <Route path="/login" element={<LoginPage />} /> */}
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Protected Routes Layout */}
        {/* Admin Routes */}
        {/* <Route element={<RoleGuard allowedRoles={['ADMIN']} />}> */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/listings" element={<WarehouseApprovalPage />} />
        <Route path="/admin/transactions" element={<TransactionsPage />} />
        <Route path="/admin/deposits" element={<DepositApprovalPage />} />
        <Route path="/admin/payments" element={<PaymentsPage />} />
        <Route path="/admin/analytics" element={<AnalyticsPage />} />
        <Route path="/admin/settings" element={<PlatformSettingsPage />} />
        {/* </Route> */}

        {/* Tenant Routes */}
        {/* <Route element={<RoleGuard allowedRoles={['TENANT']} />}> */}
        <Route path="/tenant/dashboard" element={<TenantDashboard />} />
        <Route path="/tenant/inventory" element={<InventoryPage />} />
        <Route path="/tenant/inbound" element={<InboundPage />} />
        <Route path="/tenant/outbound" element={<OutboundPage />} />
        <Route path="/tenant/warehouses" element={<MyBookingsPage />} />
        <Route path="/tenant/payments" element={<BillingPage />} />
        {/* </Route> */}

        {/* Owner Routes */}
        {/* <Route element={<RoleGuard allowedRoles={['OWNER']} />}> */}
        <Route path="/owner/dashboard" element={<OwnerDashboard />} />
        <Route path="/owner/warehouses" element={<MyWarehousesPage />} />
        <Route path="/owner/requests" element={<RentalRequestsPage />} />
        <Route path="/owner/revenue" element={<RevenuePage />} />
        {/* </Route> */}

        {/* Staff Routes */}
        <Route element={<RoleGuard allowedRoles={['STAFF']} />}>
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
