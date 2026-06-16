import React, { useState } from 'react'
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
import DataTable from '@/components/organisms/DataTable'
import Button from '@/components/atoms/Button'
import StatCard from '@/components/molecules/StatCard'
import Sidebar from '../../../components/SideBar' // <-- Import Sidebar dùng chung tại đây (Đổi lại đường dẫn cho đúng dự án của bạn)
import logoDaidien from '../../../assets/logoDaidien.png'

const growthData = [
  { name: 'Mon', users: 400, listings: 240 },
  { name: 'Tue', users: 300, listings: 139 },
  { name: 'Wed', users: 200, listings: 980 },
  { name: 'Thu', text: 'Thu', users: 278, listings: 390 },
  { name: 'Fri', users: 189, listings: 480 },
  { name: 'Sat', users: 239, listings: 380 },
  { name: 'Sun', users: 349, listings: 430 },
]

const AdminDashboard = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const toggleSidebar = () => {
    // Trên màn hình lớn: Đóng/Mở thu gọn sidebar. Trên mobile: Bật menu bay vào
    if (window.innerWidth < 768) {
      setIsMobileOpen(!isMobileOpen)
    } else {
      setIsSidebarExpanded(!isSidebarExpanded)
    }
  }

  const stats = [
    {
      title: 'Total Revenue',
      value: '$128.5k',
      icon: HiOutlineCurrencyDollar,
      trend: 'up',
      trendValue: 12,
    },
    { title: 'Platform Users', value: '14,280', icon: HiOutlineUsers, trend: 'up', trendValue: 5 },
    {
      title: 'Active Listings',
      value: '2,450',
      icon: HiOutlineHomeModern,
      trend: 'up',
      trendValue: 8,
    },
    { title: 'System Load', value: '24%', icon: HiOutlineChartBar, trend: 'stable', trendValue: 0 },
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
        <div className="flex gap-2">
          <Button size="sm" className="h-8 px-3">
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-danger border-danger hover:bg-danger/5 h-8 px-3"
          >
            Reject
          </Button>
        </div>
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
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </div>

      <div className="flex pt-14">
        {/* 2. SIDEBAR (Đã áp dụng component dùng chung) */}
        <Sidebar
          isSidebarExpanded={isSidebarExpanded}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
          currentRole="ADMIN" // Chỉ định quyền để hiển thị đúng menu mong muốn
        />

        {/* 3. MAIN CONTENT CONTAINER */}
        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
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
                <h3 className="mb-8 font-bold text-slate-900">User & Listing Growth</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={growthData}>
                      <defs>
                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
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
                      />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="users"
                        stroke="#2563eb"
                        fillOpacity={1}
                        fill="url(#colorUsers)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="listings"
                        stroke="#10b981"
                        fillOpacity={0}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
              </div>
            </div>

            {/* DataTable */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Pending Warehouse Approvals</h3>
                <Button variant="ghost" size="sm">
                  View All Queue
                </Button>
              </div>
              <DataTable columns={columns} data={pendingApprovals} />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
