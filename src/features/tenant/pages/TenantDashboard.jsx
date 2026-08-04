import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, AlertTriangle, ArrowUpRight, ArrowDownLeft, Bell, Users } from 'lucide-react'
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
import Sidebar from '../../../components/SideBar' // Đường dẫn tới file Sidebar dùng chung của bạn
import logoDaidien from '../../../assets/logoDaidien.png'

// ==================== MOCK DATA & COLUMNS ====================
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

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileOpen(!isMobileOpen)
    } else {
      setIsSidebarExpanded(!isSidebarExpanded)
    }
  }

  const stats = [
    { title: 'Total Inventory', value: '12,450', icon: Package, trend: 'up', trendValue: 12 },
    { title: 'Active Staff', value: '18', icon: Users, trend: 'up', trendValue: 2 },
    { title: 'Inbound Today', value: '450', icon: ArrowDownLeft, trend: 'up', trendValue: 5 },
    { title: 'Low Stock Items', value: '8', icon: AlertTriangle, trend: 'down', trendValue: 2 },
  ]

  const recentActivity = [
    {
      id: 'ACT-001',
      type: 'INBOUND',
      item: 'Electric Motors',
      qty: 50,
      time: '2h ago',
      status: 'COMPLETED',
    },
    {
      id: 'ACT-002',
      type: 'OUTBOUND',
      item: 'Steel Plates',
      qty: 20,
      time: '3h ago',
      status: 'PENDING',
    },
    {
      id: 'ACT-003',
      type: 'INBOUND',
      item: 'Bearings',
      qty: 100,
      time: '5h ago',
      status: 'COMPLETED',
    },
    {
      id: 'ACT-004',
      type: 'OUTBOUND',
      item: 'Copper Wire',
      qty: 15,
      time: '6h ago',
      status: 'COMPLETED',
    },
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
    { header: 'Item', accessor: 'item' },
    { header: 'Qty', accessor: 'qty' },
    { header: 'Time', accessor: 'time' },
    {
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'COMPLETED' ? 'success' : 'warning'}>{row.status}</Badge>
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
              <img src={logoDaidien} alt="Logo" className="h-10 w-17" />
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
        {/* 2. SIDEBAR (Sử dụng component của bạn) */}
        <Sidebar
          isSidebarExpanded={isSidebarExpanded}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
          currentRole="TENANT" // Truyền đúng role để hiển thị menu Tenant
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
                <Button variant="outline" size="sm">
                  Download PDF
                </Button>
                <Button size="sm">Create Shipment</Button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, idx) => (
                <StatCard key={idx} {...stat} />
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Inventory Movement</h3>
                  <select className="rounded-lg border-none bg-slate-50 px-2 py-1 text-xs font-bold text-slate-500 focus:ring-0">
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                  </select>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#2563eb"
                        fillOpacity={1}
                        fill="url(#colorRev)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
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

            {/* Table & Operations Row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Recent Activity</h3>
                  <Button variant="ghost" size="sm">
                    Export CSV
                  </Button>
                </div>
                <DataTable columns={columns} data={recentActivity} />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-6 font-bold text-slate-900">Weekly Operations</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                      />
                      <Tooltip cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="inbound" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="outbound" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default TenantDashboard
