import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, Clock, ArrowUpRight, ArrowDownRight, Download, Filter } from 'lucide-react'
import { HiBars3 } from 'react-icons/hi2'
import DataTable from '@/components/organisms/DataTable'
import Button from '@/components/atoms/Button'
import Avatar from '@/components/atoms/Avatar'
import Sidebar from '../../../components/SideBar' // <-- Import Sidebar dùng chung của hệ thống
// <-- Import Sidebar dùng chung hệ thống
import logoDaidien from '../../../assets/logoDaidien.png'

const MOCK_PAYMENTS = [
  {
    id: 'PAY-801',
    user: 'Robert Fox',
    type: 'Payout',
    amount: '-$1,200.00',
    method: 'PayPal',
    status: 'COMPLETED',
    date: '2026-06-15 14:30',
  },
  {
    id: 'PAY-802',
    user: 'Jane Cooper',
    type: 'Refund',
    amount: '-$350.00',
    method: 'Bank Wire',
    status: 'COMPLETED',
    date: '2026-06-14 09:15',
  },
  {
    id: 'PAY-803',
    user: 'Cody Fisher',
    type: 'Payout',
    amount: '-$4,800.00',
    method: 'Stripe',
    status: 'PENDING',
    date: '2026-06-14 11:00',
  },
]

const PaymentsPage = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Logic đóng mở thông minh xử lý riêng biệt cho Desktop và Mobile
  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileOpen(!isMobileOpen)
    } else {
      setIsSidebarExpanded(!isSidebarExpanded)
    }
  }

  const columns = [
    {
      header: 'Payment ID',
      render: (row) => <span className="text-primary font-bold">{row.id}</span>,
    },
    {
      header: 'Recipient',
      render: (row) => (
        <div className="flex items-center gap-3 py-1">
          <Avatar alt={row.user} size="sm" />
          <span className="font-semibold text-slate-900">{row.user}</span>
        </div>
      ),
    },
    {
      header: 'Type',
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
            row.type === 'Payout' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
          }`}
        >
          {row.type}
        </span>
      ),
    },
    {
      header: 'Amount',
      render: (row) => <span className="font-bold text-red-600">{row.amount}</span>,
    },
    {
      header: 'Method',
      render: (row) => (
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <CreditCard size={14} /> {row.method}
        </div>
      ),
    },
    {
      header: 'Status',
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            row.status === 'COMPLETED' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
          }`}
        >
          {row.status === 'COMPLETED' ? 'Completed' : 'Pending'}
        </span>
      ),
    },
    {
      header: 'Processed Date',
      render: (row) => (
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Clock size={12} /> {row.date}
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
        {/* 2. SIDEBAR - Đã dọn dẹp mảng menu cũ và thay thế bằng component chung */}
        <Sidebar
          isSidebarExpanded={isSidebarExpanded}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
          currentRole="ADMIN"
        />

        {/* 3. MAIN CONTENT CONTAINER */}
        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
          }`}
        >
          <main className="mx-auto w-full max-w-400 space-y-6 p-6 md:p-8">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Payments & Payouts</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Track and monitor outbound platform payments, refunds, and owner payouts.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline">
                  <Filter size={16} className="mr-2" /> Filter
                </Button>
                <Button>
                  <Download size={16} className="mr-2" /> Export
                </Button>
              </div>
            </div>

            {/* High-level Stats */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {[
                {
                  label: 'Total Payouts',
                  value: '$42,350.00',
                  trend: '+8.4%',
                  isUp: true,
                },
                {
                  label: 'Pending Approval',
                  value: '$4,800.00',
                  trend: '1 Request',
                  isUp: null,
                },
                {
                  label: 'Refund Volume',
                  value: '$2,150.00',
                  trend: '-12.3%',
                  isUp: false,
                },
              ].map((stat, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                      {stat.label}
                    </p>
                    {stat.isUp !== null && (
                      <span
                        className={`flex items-center text-xs font-bold ${
                          stat.isUp ? 'text-success' : 'text-danger'
                        }`}
                      >
                        {stat.isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {stat.trend}
                      </span>
                    )}
                    {stat.isUp === null && (
                      <span className="text-warning text-xs font-bold">{stat.trend}</span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Table Section */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <DataTable columns={columns} data={MOCK_PAYMENTS} />
              </motion.div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default PaymentsPage
