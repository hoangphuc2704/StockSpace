import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Bell,
  Users,
  Loader2,
} from 'lucide-react'
import { HiBars3 } from 'react-icons/hi2'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'

import StatCard from '@/components/molecules/StatCard'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import Sidebar from '../../../components/SideBar'
import logoDaidien from '../../../assets/logoDaidien.png'

import productApi from '@/services/wms/productApi'
import staffApi from '@/services/staff/staffApi'
import warehouseApi from '@/services/warehouse/warehouseApi'
import receiptApi from '@/services/wms/receiptApi'
import moment from 'moment'

// ==================== MOCK DATA FOR CHARTS ====================
const revenueData = [
  { month: 'Jan', revenue: 4000, expense: 2400 },
  { month: 'Feb', revenue: 3000, expense: 1398 },
  { month: 'Mar', revenue: 2000, expense: 9800 },
  { month: 'Apr', revenue: 2780, expense: 3908 },
  { month: 'May', revenue: 1890, expense: 4800 },
  { month: 'Jun', revenue: 2390, expense: 3800 },
]

const activityData = [
  { name: 'Mon', inbound: 40, outbound: 24 },
  { name: 'Tue', inbound: 30, outbound: 13 },
  { name: 'Wed', inbound: 20, outbound: 98 },
  { name: 'Thu', inbound: 27, outbound: 39 },
  { name: 'Fri', inbound: 18, outbound: 48 },
]

const TenantDashboard = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(true)
  const [statsData, setStatsData] = useState({
    totalInventory: 0,
    activeStaff: 0,
    inboundToday: 0,
    lowStock: 0, // Mocked for now due to API missing aggregated low stock endpoint
  })
  const [recentActivity, setRecentActivity] = useState([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)

      // 1. Fetch SKUs for Total Inventory
      const skusRes = await productApi.getSKUs({ page: 0, size: 1 })
      const totalInventory = skusRes.data?.data?.totalElements || 0

      // 2. Fetch Staff for Active Staff count
      let activeStaff = 0
      try {
        const staffRes = await staffApi.listStaffs({ page: 0, size: 1 })
        activeStaff = staffRes.data?.data?.totalElements || 0
      } catch (err) {
        console.error('Error fetching staff', err)
      }

      // 3. Fetch first Warehouse to get recent receipts for Inbound Today & Activity Table
      let inboundTodayCount = 0
      let activityList = []
      try {
        const whRes = await warehouseApi.getMyWarehouses()
        const warehouses = whRes.data?.data?.content || whRes.data?.data || []

        if (warehouses.length > 0) {
          const firstWhId = warehouses[0].id || warehouses[0].warehouseId
          const receiptRes = await receiptApi.getReceipts(firstWhId, { page: 0, size: 50 })
          const receipts = receiptRes.data?.data?.content || []

          const today = moment().startOf('day')

          inboundTodayCount = receipts.filter((r) => {
            return r.type === 'INBOUND' && moment(r.createdAt).isSameOrAfter(today)
          }).length

          activityList = receipts.slice(0, 5).map((r) => ({
            id: r.id,
            type: r.type,
            item: r.items?.[0]?.skuCode || 'Multiple items',
            qty: r.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
            time: moment(r.createdAt).fromNow(),
            status: r.status,
          }))
        }
      } catch (err) {
        console.error('Error fetching receipts/warehouses', err)
      }

      setStatsData({
        totalInventory,
        activeStaff,
        inboundToday: inboundTodayCount,
        lowStock: 0, // Cannot compute efficiently without specific BE endpoint
      })
      setRecentActivity(activityList)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileOpen(!isMobileOpen)
    } else {
      setIsSidebarExpanded(!isSidebarExpanded)
    }
  }

  const stats = [
    { title: 'Total SKUs', value: statsData.totalInventory.toLocaleString(), icon: Package },
    {
      title: 'Active Staff',
      value: statsData.activeStaff.toString(),
      icon: Users,
    },
    {
      title: 'Inbound Today',
      value: statsData.inboundToday.toString(),
      icon: ArrowDownLeft,
    },
    { title: 'Low Stock Items', value: '-', icon: AlertTriangle },
  ]

  const columns = [
    {
      header: 'Type',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.type === 'INBOUND' ? (
            <ArrowDownLeft className="text-success h-4 w-4" />
          ) : (
            <ArrowUpRight className="text-primary h-4 w-4" />
          )}
          <span className="font-medium">{row.type}</span>
        </div>
      ),
    },
    { header: 'Item (SKU)', accessor: 'item' },
    { header: 'Qty', accessor: 'qty' },
    { header: 'Time', accessor: 'time' },
    {
      header: 'Status',
      render: (row) => (
        <Badge
          variant={
            row.status === 'APPROVED' ? 'success' : row.status === 'PENDING' ? 'warning' : 'primary'
          }
        >
          {row.status}
        </Badge>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* 1. TOP HEADER */}
      <header className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="rounded-full p-2 text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200"
          >
            <HiBars3 className="h-6 w-6" />
          </button>

          <div className="flex cursor-pointer items-center gap-2">
            <div className="shrink-0 rounded-lg bg-white p-1.5 text-white">
              <a href="/" aria-label="Back to landing page">
                <img src={logoDaidien} alt="Logo" className="h-10 w-17" />
              </a>
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-slate-950">
              StockSpace Tenant
            </span>
          </div>
        </div>
      </header>

      {/* MOBILE OVERLAY */}
      <div className="md:hidden">
        {isMobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/30"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </div>

      <div className="flex pt-14">
        {/* 2. SIDEBAR */}
        <Sidebar
          isSidebarExpanded={isSidebarExpanded}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
          currentRole="TENANT"
        />

        {/* 3. MAIN CONTENT CONTAINER */}
        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
          }`}
        >
          <main className="mx-auto w-full max-w-[1600px] space-y-6 p-6 md:p-8">
            {/* Header Area */}
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Tenant Dashboard
                </h1>
                <p className="text-sm text-slate-500">
                  Welcome back, here's what's happening today.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/')}>
                  Back to Website
                </Button>
                <Button size="sm" onClick={() => navigate('/tenant/inbound')}>
                  Create Shipment
                </Button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, idx) => (
                <StatCard key={idx} {...stat} />
              ))}
            </div>

            {/* Main Content Grid: Recent Activity (2/3) + Notifications (1/3) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Table: Recent Activity */}
              <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Recent Activity</h3>
                </div>
                <div className="flex-1">
                  {isLoading ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="animate-spin text-slate-400" />
                    </div>
                  ) : recentActivity.length > 0 ? (
                    <DataTable columns={columns} data={recentActivity} />
                  ) : (
                    <div className="py-8 text-center text-slate-500">No recent activity found.</div>
                  )}
                </div>
              </div>

              {/* Notifications Panel */}
              <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Notifications</h3>
                  <Bell className="h-5 w-5 text-slate-400" />
                </div>
                <div className="flex-1 space-y-4">
                  {[
                    {
                      title: 'Low Stock Alert',
                      msg: 'Solar Panels below 50 units',
                      time: '10m ago',
                      type: 'danger',
                    },
                    {
                      title: 'New Inbound',
                      msg: 'Shipment #1290 arrived',
                      time: '1h ago',
                      type: 'success',
                    },
                    {
                      title: 'Staff Update',
                      msg: 'John Doe checked in',
                      time: '2h ago',
                      type: 'info',
                    },
                  ].map((n, i) => (
                    <div
                      key={i}
                      className="flex cursor-pointer gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-slate-100 hover:bg-slate-50"
                    >
                      <div
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          n.type === 'danger'
                            ? 'bg-danger'
                            : n.type === 'success'
                              ? 'bg-success'
                              : 'bg-primary'
                        }`}
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-900">{n.title}</p>
                        <p className="text-xs text-slate-500">{n.msg}</p>
                        <p className="mt-1 text-[10px] font-medium text-slate-400">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="mt-4 w-full">
                  View All Activity
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default TenantDashboard
