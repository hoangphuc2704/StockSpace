import {
  LayoutDashboard,
  Users,
  Warehouse,
  Package,
  Truck,
  Clock,
  DollarSign,
  BarChart,
  Settings,
  HelpCircle,
  CreditCard,
  Bell,
  FileText,
} from 'lucide-react'

export const NAVIGATION_CONFIG = {
  ADMIN: [
    { id: 'dash', label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { id: 'warehouses', label: 'Warehouse Listings', icon: Warehouse, path: '/admin/listings' },
    { id: 'listing-packages', label: 'Listing Packages', icon: Package, path: '/admin/listing-packages' },
    {
      id: 'finance',
      label: 'Financials',
      icon: DollarSign,
      children: [
        { label: 'Transactions', path: '/admin/transactions' },
        { label: 'Deposits', path: '/admin/deposits' },
        { label: 'Payments', path: '/admin/payments' },
      ],
    },
    { id: 'analytics', label: 'Analytics', icon: BarChart, path: '/admin/analytics' },
    { id: 'settings', label: 'Platform Settings', icon: Settings, path: '/admin/settings' },
  ],
  TENANT: [
    { id: 'marketplace', label: 'Marketplace', icon: Warehouse, path: '/warehouses' },
    { id: 'dash', label: 'Dashboard', icon: LayoutDashboard, path: '/tenant/dashboard' },
    { id: 'inventory', label: 'Inventory', icon: Package, path: '/tenant/inventory' },
    {
      id: 'hr',
      label: 'Staff & HR',
      icon: Users,
      children: [
        { label: 'Employees', path: '/tenant/hr' },
        { label: 'Attendance', path: '/tenant/attendance' },
      ],
    },
    {
      id: 'ops',
      label: 'Warehouse Ops',
      icon: Truck,
      children: [
        { label: 'Inbound', path: '/tenant/inbound' },
        { label: 'Outbound', path: '/tenant/outbound' },
      ],
    },
    { id: 'contracts', label: 'My Contracts', icon: FileText, path: '/tenant/contracts' },
    { id: 'subscription', label: 'Subscription', icon: CreditCard, path: '/tenant/subscription' },
    { id: 'layout', label: 'Warehouse Layout', icon: Warehouse, path: '/tenant/layoutwarehouses' },
    { id: 'wallet', label: 'Wallet', icon: DollarSign, path: '/tenant/wallet' },
  ],
  OWNER: [
    { id: 'post-warehouse', label: 'Post Warehouse', icon: Warehouse, path: '/owner/postwarehouse' },
    { id: 'dash', label: 'Dashboard', icon: LayoutDashboard, path: '/owner/dashboard' },
    { id: 'my-warehouses', label: 'My Warehouses', icon: Warehouse, path: '/owner/listwarehouse' },
    { id: 'layout', label: 'Warehouse Layout', icon: Warehouse, path: '/owner/layoutwarehouses' },
    { id: 'contracts', label: 'Contracts', icon: FileText, path: '/owner/contracts' },
    { id: 'finance', label: 'Transaction history', icon: DollarSign, path: '/owner/wallet/withdraws' },
  ],
  STAFF: [
    { id: 'dash', label: 'Dashboard', icon: LayoutDashboard, path: '/staff/dashboard' },
    { id: 'tasks', label: 'Assigned Tasks', icon: Clock, path: '/staff/tasks' },
    { id: 'inventory', label: 'Inventory Check', icon: Package, path: '/staff/inventory' },
    { id: 'career', label: 'Career History', icon: FileText, path: '/staff/career-history' },
  ],
  COMMON: [
    { id: 'support', label: 'Help Center', icon: HelpCircle, path: '/support' },
    { id: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications' },
  ],
}
