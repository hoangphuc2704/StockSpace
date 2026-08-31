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
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'

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

const StaffDashboard = () => {
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  const navigate = useNavigate()

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
      <Header />

      {/* MOBILE OVERLAY */}
      <div className="md:hidden">
        {isMobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/30"
            onClick={() => dispatch(closeMobileSidebar())}
          />
        )}
      </div>

      <div className="flex pt-14">
        {/* 2. SIDEBAR */}
        <Sidebar currentRole="STAFF" />

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
                  Staff Dashboard
                </h1>
                <p className="text-sm text-slate-500">Welcome to the Staff Portal.</p>
              </div>
            </div>

            {/* Table & Operations Row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Recent Activity</h3>
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

export default StaffDashboard
