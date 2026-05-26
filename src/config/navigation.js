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
  ShieldCheck,
  CreditCard,
  Bell,
  FileText,
} from 'lucide-react'

export const NAVIGATION_CONFIG = {
  ADMIN: [
    { id: 'dash', label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { id: 'warehouses', label: 'Warehouse Listings', icon: Warehouse, path: '/admin/listings' },
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
    { id: 'bookings', label: 'My Bookings', icon: Warehouse, path: '/tenant/warehouses' },
    { id: 'finance', label: 'Billing', icon: CreditCard, path: '/tenant/payments' },
  ],
  OWNER: [
    // { id: 'marketplace', label: 'Marketplace', icon: Warehouse, path: '/warehouses' },
    { id: 'dash', label: 'Dashboard', icon: LayoutDashboard, path: '/owner/dashboard' },
    { id: 'my-warehouses', label: 'My Warehouses', icon: Warehouse, path: '/owner/warehouses' },
    { id: 'requests', label: 'Rental Requests', icon: FileText, path: '/owner/requests' },
    { id: 'finance', label: 'Revenue', icon: DollarSign, path: '/owner/revenue' },
  ],
  STAFF: [
    { id: 'dash', label: 'Dashboard', icon: LayoutDashboard, path: '/staff/dashboard' },
    { id: 'tasks', label: 'Assigned Tasks', icon: Clock, path: '/staff/tasks' },
    { id: 'inventory', label: 'Inventory Check', icon: Package, path: '/staff/inventory' },
  ],
  COMMON: [
    { id: 'support', label: 'Help Center', icon: HelpCircle, path: '/support' },
    { id: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications' },
  ],
}
