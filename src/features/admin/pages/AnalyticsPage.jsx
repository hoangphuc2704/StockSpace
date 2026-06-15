import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart3,
  TrendingUp,
  Users,
  Warehouse,
  DollarSign,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Download,
} from 'lucide-react'
import {
  HiBars3,
  HiOutlineRectangleGroup,
  HiOutlineHomeModern,
  HiOutlineCog6Tooth,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiOutlineArrowRightOnRectangle,
} from 'react-icons/hi2'
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
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import Button from '@/components/atoms/Button'
import logoDaidien from '../../../assets/logoDaidien.png'

const REVENUE_DATA = [
  { name: 'Jan', revenue: 4500, growth: 2400 },
  { name: 'Feb', revenue: 5200, growth: 1398 },
  { name: 'Mar', revenue: 4800, growth: 9800 },
  { name: 'Apr', revenue: 6100, growth: 3908 },
  { name: 'May', revenue: 5900, growth: 4800 },
  { name: 'Jun', revenue: 7200, growth: 3800 },
]

const USER_DISTRIBUTION = [
  { name: 'Tenants', value: 400 },
  { name: 'Owners', value: 300 },
  { name: 'Staff', value: 300 },
]

const COLORS = ['#3b82f6', '#8b5cf6', '#64748b']

const AnalyticsPage = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const location = useLocation()
  const navigate = useNavigate()

  const toggleSidebar = () => {
    setIsSidebarExpanded(!isSidebarExpanded)
  }

  // Danh mục Menu đồng bộ chính xác với AdminDashboard
  const menuItems = [
    { text: 'Overview', icon: HiOutlineRectangleGroup, path: '/admin/dashboard' },
    { text: 'Warehouses Approval', icon: HiOutlineHomeModern, path: '/admin/listings' },
    { text: 'Analytics', icon: HiOutlineChartBar, path: '/admin/analytics' },
    { text: 'Deposits', icon: HiOutlineCheckCircle, path: '/admin/deposits' },
    { text: 'Transactions', icon: HiOutlineExclamationCircle, path: '/admin/transactions' },
    { text: 'Payments', icon: HiOutlineCurrencyDollar, path: '/admin/payments' },
    { text: 'Platform Settings', icon: HiOutlineDocumentText, path: '/admin/settings' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* 1. TOP HEADER (Đồng bộ chuẩn YouTube) */}
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
              StockSpace Admin
            </span>
          </div>
        </div>
      </header>

      {/* MOBILE TRIGGER */}
      <div className="md:hidden">
        {isMobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/30"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </div>

      <div className="flex pt-14">
        {/* 2. SIDEBAR (Giữ nguyên trạng thái khi chuyển trang) */}
        <aside
          className={`fixed top-14 bottom-0 left-0 z-40 flex flex-col overflow-x-hidden overflow-y-auto bg-white transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'w-60 px-3' : 'w-18 px-1'} ${isMobileOpen ? 'w-60 translate-x-0 border-r px-3' : '-translate-x-full md:translate-x-0'} `}
        >
          <nav className="flex-1 space-y-1 py-3">
            {menuItems.map((item, idx) => {
              const isActive = location.pathname === item.path

              return (
                <button
                  key={idx}
                  onClick={() => navigate(item.path)}
                  className={`group flex w-full items-center rounded-xl transition-all ${
                    isSidebarExpanded
                      ? 'flex-row justify-start gap-5 px-4 py-3 text-sm font-medium'
                      : 'flex-col justify-center gap-1 py-3 font-sans text-[10px] font-normal'
                  } ${
                    isActive
                      ? 'bg-slate-100 font-semibold text-slate-950'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                  } `}
                >
                  <item.icon
                    className={`shrink-0 transition-transform group-hover:scale-105 ${isSidebarExpanded ? 'h-5 w-5' : 'h-6 w-6'} ${isActive ? 'text-slate-950' : 'text-slate-600'} `}
                  />
                  <span
                    className={`overflow-hidden text-ellipsis whitespace-nowrap ${!isSidebarExpanded && 'tracking-tight'}`}
                  >
                    {item.text}
                  </span>
                </button>
              )
            })}
          </nav>

          <div className="border-t border-slate-100 py-3">
            <button
              className={`flex w-full items-center rounded-xl text-red-600 transition-all hover:bg-red-50/60 ${
                isSidebarExpanded
                  ? 'flex-row justify-start gap-5 px-4 py-3 text-sm font-medium'
                  : 'flex-col justify-center gap-1 py-3 text-[10px]'
              } `}
            >
              <HiOutlineArrowRightOnRectangle
                className={`shrink-0 ${isSidebarExpanded ? 'h-5 w-5' : 'h-6 w-6'}`}
              />
              <span className="whitespace-nowrap">Logout</span>
            </button>
          </div>
        </aside>

        {/* 3. MAIN CONTENT CONTAINER (Nội dung phân tích dữ liệu của bạn) */}
        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'} `}
        >
          <main className="mx-auto w-full max-w-400 space-y-6 p-6 md:p-8">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Platform Analytics</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Real-time overview of platform growth, revenue and usage metrics.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline">
                  <Calendar size={16} className="mr-2" /> Last 30 Days
                </Button>
                <Button>
                  <Download size={16} className="mr-2" /> Export Report
                </Button>
              </div>
            </div>

            {/* High-level Stats */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: 'Annual Revenue',
                  value: '$128.5k',
                  trend: '+12.5%',
                  icon: DollarSign,
                  color: 'text-success',
                },
                {
                  label: 'Active Users',
                  value: '14,280',
                  trend: '+8.2%',
                  icon: Users,
                  color: 'text-primary',
                },
                {
                  label: 'Warehouse Listings',
                  value: '2,450',
                  trend: '+15.1%',
                  icon: Warehouse,
                  color: 'text-indigo',
                },
                {
                  label: 'Average Growth',
                  value: '24.2%',
                  trend: '-2.4%',
                  icon: TrendingUp,
                  color: 'text-danger',
                },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                      <stat.icon size={20} />
                    </div>
                    <div
                      className={`flex items-center text-xs font-bold ${stat.trend.startsWith('+') ? 'text-success' : 'text-danger'}`}
                    >
                      {stat.trend.startsWith('+') ? (
                        <ArrowUpRight size={14} className="mr-1" />
                      ) : (
                        <ArrowDownRight size={14} className="mr-1" />
                      )}
                      {stat.trend}
                    </div>
                  </div>
                  <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">{stat.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Revenue Area Chart */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Revenue Performance</h3>
                  <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="bg-primary h-2 w-2 rounded-full" /> Current Month
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-slate-200" /> Projected
                    </span>
                  </div>
                </div>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={REVENUE_DATA}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* User Distribution Pie Chart */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-8 font-bold text-slate-900">User Demographics</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={USER_DISTRIBUTION}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={8}
                        dataKey="value"
                      >
                        {USER_DISTRIBUTION.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-6 space-y-3">
                  {USER_DISTRIBUTION.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: COLORS[i] }}
                        />
                        <span className="text-slate-600">{item.name}</span>
                      </div>
                      <span className="font-bold text-slate-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Growth Bar Chart */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3">
                <h3 className="mb-8 font-bold text-slate-900">Platform Activity Trends</h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={REVENUE_DATA}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                      />
                      <Tooltip cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
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

export default AnalyticsPage
