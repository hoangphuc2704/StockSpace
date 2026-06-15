import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CreditCard,
  DollarSign,
  Download,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Calendar,
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
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import logoDaidien from '../../../assets/logoDaidien.png'

const MOCK_TRANSACTIONS = [
  {
    id: 'TX-8921',
    type: 'Deposit',
    amount: '+$5,000.00',
    status: 'COMPLETED',
    method: 'Bank Transfer',
    date: '2024-05-12 14:30',
  },
  {
    id: 'TX-8922',
    type: 'Rental Payment',
    amount: '-$2,400.00',
    status: 'COMPLETED',
    method: 'Wallet',
    date: '2024-05-12 11:15',
  },
  {
    id: 'TX-8923',
    type: 'Service Fee',
    amount: '+$120.00',
    status: 'PENDING',
    method: 'Stripe',
    date: '2024-05-11 16:45',
  },
  {
    id: 'TX-8924',
    type: 'Refund',
    amount: '+$450.00',
    status: 'COMPLETED',
    method: 'Wallet',
    date: '2024-05-10 09:20',
  },
  {
    id: 'TX-8925',
    type: 'Deposit',
    amount: '+$1,200.00',
    status: 'FAILED',
    method: 'PayPal',
    date: '2024-05-10 08:00',
  },
  {
    id: 'TX-8926',
    type: 'Payout',
    amount: '-$3,500.00',
    status: 'COMPLETED',
    method: 'Bank Transfer',
    date: '2024-05-09 15:30',
  },
]

const TransactionsPage = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const location = useLocation()
  const navigate = useNavigate()

  const toggleSidebar = () => {
    setIsSidebarExpanded(!isSidebarExpanded)
  }

  // Danh mục Menu đồng bộ chính xác tuyệt đối với các trang trước
  const menuItems = [
    { text: 'Overview', icon: HiOutlineRectangleGroup, path: '/admin/dashboard' },
    { text: 'Warehouses Approval', icon: HiOutlineHomeModern, path: '/admin/listings' },
    { text: 'Analytics', icon: HiOutlineChartBar, path: '/admin/analytics' },
    { text: 'Deposits', icon: HiOutlineCheckCircle, path: '/admin/deposits' },
    { text: 'Transactions', icon: HiOutlineExclamationCircle, path: '/admin/transactions' },
    { text: 'Payments', icon: HiOutlineCurrencyDollar, path: '/admin/payments' },
    { text: 'Platform Settings', icon: HiOutlineDocumentText, path: '/admin/settings' },
  ]

  const columns = [
    {
      header: 'Transaction ID',
      render: (row) => <span className="font-mono text-xs font-bold text-slate-500">{row.id}</span>,
    },
    {
      header: 'Type',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.amount.startsWith('+') ? (
            <div className="bg-success/10 text-success flex h-7 w-7 items-center justify-center rounded-full">
              <ArrowDownRight size={14} />
            </div>
          ) : (
            <div className="bg-danger/10 text-danger flex h-7 w-7 items-center justify-center rounded-full">
              <ArrowUpRight size={14} />
            </div>
          )}
          <span className="text-sm font-medium text-slate-700">{row.type}</span>
        </div>
      ),
    },
    {
      header: 'Amount',
      render: (row) => (
        <span
          className={`font-bold ${row.amount.startsWith('+') ? 'text-success' : 'text-slate-900'}`}
        >
          {row.amount}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (row) => {
        const variants = {
          COMPLETED: 'success',
          PENDING: 'warning',
          FAILED: 'danger',
        }
        return (
          <Badge variant={variants[row.status]} size="sm" className="rounded-full">
            {row.status}
          </Badge>
        )
      },
    },
    {
      header: 'Method',
      accessor: 'method',
    },
    {
      header: 'Date & Time',
      accessor: 'date',
    },
    {
      header: 'Actions',
      render: () => (
        <button className="p-1.5 text-slate-400 transition-colors hover:text-slate-600">
          <MoreVertical size={18} />
        </button>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* 1. TOP HEADER (Đồng bộ chuẩn hệ thống) */}
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
        {/* 2. SIDEBAR (Giữ nguyên trạng thái co giãn khi đổi trang) */}
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

        {/* 3. MAIN CONTENT CONTAINER (Nội dung dữ liệu biến động số dư) */}
        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'} `}
        >
          <main className="mx-auto w-full max-w-[1600px] space-y-6 p-6 md:p-8">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Full history of platform transactions and financial activities.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline">
                  <Calendar size={16} className="mr-2" /> This Week
                </Button>
                <Button>
                  <Download size={16} className="mr-2" /> Export CSV
                </Button>
              </div>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {[
                {
                  label: 'Total Volume',
                  value: '$45,280.00',
                  icon: CreditCard,
                  color: 'text-primary',
                },
                {
                  label: 'Net Revenue',
                  value: '$8,120.45',
                  icon: DollarSign,
                  color: 'text-success',
                },
                {
                  label: 'Pending Payouts',
                  value: '$12,400.00',
                  icon: Calendar,
                  color: 'text-warning',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 ${item.color}`}
                  >
                    <item.icon size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-2xl font-bold text-slate-900">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters Section */}
            <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 md:flex-row">
              <div className="relative w-full md:w-96">
                <Search
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search by Transaction ID or Type..."
                  className="focus:ring-primary/20 w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-4 pl-10 text-sm transition-all focus:ring-2 focus:outline-none"
                />
              </div>
              <div className="flex w-full items-center gap-2 md:w-auto">
                <Button variant="outline" size="sm" className="h-10">
                  <Filter size={16} className="mr-2" /> Type: All
                </Button>
                <Button variant="outline" size="sm" className="h-10">
                  Status: All
                </Button>
              </div>
            </div>

            {/* Table wrapper đồng bộ bo góc mềm */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <DataTable columns={columns} data={MOCK_TRANSACTIONS} />
              </motion.div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default TransactionsPage
