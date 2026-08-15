import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import adminApi from '../../../services/admin/adminApi'
// Import các action từ uiSlice (Điều chỉnh lại đường dẫn cho đúng với dự án của bạn nếu cần)
import { toggleSidebar, closeMobileSidebar } from '../../../store/uiSlide'
import {
  HiOutlineUsers,
  HiOutlineHomeModern,
  HiOutlineCurrencyDollar,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineClock,
  HiBars3,
} from 'react-icons/hi2'

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'
import DataTable from '../../../components/organisms/DataTable'
import StatCard from '../../../components/molecules/StatCard'
import TableActionMenu from '@/components/TableActionMenu'
import Sidebar from '../../../components/SideBar'
import logoDaidien from '../../../assets/logoDaidien.png'

// Mock pending approvals

const AdminDashboard = () => {
  const dispatch = useDispatch()

  // ✅ Đã đồng bộ trạng thái Sidebar từ Redux Store chung giống y hệt Owner
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)

  const [summary, setSummary] = useState({
    totalUsers: 0,
    totalWarehouses: 0,
    totalBookings: 0,
    totalContracts: 0,
  })

  const [revenueData, setRevenueData] = useState([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        // Fetch summary
        const summaryRes = await adminApi.getSummaryStats()
        if (summaryRes?.data) {
          setSummary(summaryRes.data)
        }

        // Fetch revenue for current year
        const revenueRes = await adminApi.getRevenueStats(currentYear)
        if (revenueRes?.data) {
          setTotalRevenue(revenueRes.data.totalRevenue || 0)

          // Map to chart format
          const formattedRevenue = (revenueRes.data.monthlyRevenue || []).map((item) => ({
            name: `T${item.month}`,
            revenue: item.revenue,
          }))
          setRevenueData(formattedRevenue)
        }
      } catch (error) {
        console.error('Failed to fetch admin dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [currentYear])

  const stats = [
    {
      title: 'Total Revenue',
      value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
        totalRevenue
      ),
      icon: HiOutlineCurrencyDollar,
      trend: 'stable',
      trendValue: 0,
    },
    {
      title: 'Platform Users',
      value: summary.totalUsers.toLocaleString(),
      icon: HiOutlineUsers,
      trend: 'stable',
      trendValue: 0,
    },
    {
      title: 'Warehouses',
      value: summary.totalWarehouses.toLocaleString(),
      icon: HiOutlineHomeModern,
      trend: 'stable',
      trendValue: 0,
    },
    {
      title: 'Contracts',
      value: summary.totalContracts.toLocaleString(),
      icon: HiOutlineChartBar,
      trend: 'stable',
      trendValue: 0,
    },
  ]

  const pendingApprovals = [
    {
      id: 'WH-8821',
      owner: 'Nguyen Van A',
      type: 'Industrial',
      location: 'HCM City',
      date: '2h ago',
    },
    {
      id: 'WH-8822',
      owner: 'Tran Thi B',
      type: 'Cold Storage',
      location: 'Ha Noi',
      date: '5h ago',
    },
    {
      id: 'WH-8823',
      owner: 'Le Van C',
      type: 'Fulfillment',
      location: 'Binh Duong',
      date: '1d ago',
    },
  ]

  const columns = [
    {
      header: 'Listing ID',
      render: (row) => <span className="text-primary font-bold">{row.id}</span>,
    },
    { header: 'Owner', accessor: 'owner' },
    { header: 'Type', accessor: 'type' },
    { header: 'Location', accessor: 'location' },
    { header: 'Submitted', accessor: 'date' },
    {
      header: 'Actions',
      render: () => (
        <TableActionMenu items={[{ label: 'Approve' }, { label: 'Reject', danger: true }]} />
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* 1. TOP HEADER */}
      <header className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-4">
          <button
            // ✅ Đổi sang kích hoạt action từ Redux thay vì hàm handle local
            onClick={() => dispatch(toggleSidebar())}
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
              StockSpace Admin
            </span>
          </div>
        </div>
      </header>

      {/* MOBILE OVERLAY */}
      <div className="md:hidden">
        {isMobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/30"
            // ✅ Đồng bộ hành vi đóng bằng Redux action
            onClick={() => dispatch(closeMobileSidebar())}
          />
        )}
      </div>

      <div className="flex pt-14">
        {/* 2. SIDEBAR */}
        <Sidebar currentRole="ADMIN" />

        {/* 3. MAIN CONTENT CONTAINER - Tự động co giãn đồng nhất */}
        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-18' // Thống nhất khoảng cách pl-[72px] giống owner
          }`}
        >
          <main className="mx-auto w-full max-w-400 space-y-6 p-6 md:p-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Overview</h1>
              <p className="text-sm text-slate-500">
                Platform administrator dashboard and analytics.
              </p>
            </div>

            {/* Thẻ Thống Kê */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, idx) => (
                <StatCard key={idx} {...stat} />
              ))}
            </div>

            {/* Biểu Đồ & Logs */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Revenue Overview</h3>
                  <select
                    className="rounded-md border-slate-200 text-sm"
                    value={currentYear}
                    onChange={(e) => setCurrentYear(Number(e.target.value))}
                  >
                    <option value={new Date().getFullYear()}>This Year</option>
                    <option value={new Date().getFullYear() - 1}>Last Year</option>
                  </select>
                </div>
                <div className="h-80">
                  {loading ? (
                    <div className="flex h-full items-center justify-center">
                      Loading chart data...
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueData}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
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
                          tickFormatter={(value) =>
                            new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value)
                          }
                        />
                        <Tooltip
                          formatter={(value) =>
                            new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND',
                            }).format(value)
                          }
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#10b981"
                          fillOpacity={1}
                          fill="url(#colorRevenue)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-6 font-bold text-slate-900">Recent Platform Logs</h3>
                <div className="space-y-6">
                  {[
                    {
                      event: 'New Registration',
                      user: 'LogiFlow Inc.',
                      time: '2 mins ago',
                      icon: HiOutlineCheckCircle,
                      color: 'text-success',
                    },
                    {
                      event: 'Transaction Failed',
                      user: 'John Smith',
                      time: '15 mins ago',
                      icon: HiOutlineExclamationCircle,
                      color: 'text-danger',
                    },
                    {
                      event: 'Listing Updated',
                      user: 'Saigon Hub',
                      time: '45 mins ago',
                      icon: HiOutlineClock,
                      color: 'text-primary',
                    },
                    {
                      event: 'System Backup',
                      user: 'Automated',
                      time: '1h ago',
                      icon: HiOutlineCheckCircle,
                      color: 'text-slate-400',
                    },
                  ].map((log, i) => {
                    const LogIcon = log.icon
                    return (
                      <div key={i} className="flex gap-4">
                        <div className={`mt-1 ${log.color}`}>
                          <LogIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{log.event}</p>
                          <p className="text-xs text-slate-500">
                            {log.user} • {log.time}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-8 w-full border-t border-slate-50 pt-4"
                >
                  View Audit Logs
                </Button>
              </div> */}
            </div>

            {/* DataTable */}
            {/* <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Pending Warehouse Approvals</h3>
                <Button variant="ghost" size="sm">
                  View All Queue
                </Button>
              </div>
              <DataTable columns={columns} data={pendingApprovals} />
            </div> */}
          </main>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
