import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CreditCard, CheckCircle, XCircle, Clock, AlertCircle, FileText } from 'lucide-react'
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
import Button from '@/components/atoms/Button'
import Avatar from '@/components/atoms/Avatar'
import logoDaidien from '../../../assets/logoDaidien.png'

const MOCK_DEPOSITS = [
  {
    id: 'DEP-101',
    user: 'Alex Rivera',
    amount: '$5,000.00',
    method: 'Bank Transfer',
    proof: 'receipt_01.jpg',
    status: 'PENDING',
    date: '2024-05-12 10:20',
  },
  {
    id: 'DEP-102',
    user: 'Sarah Chen',
    amount: '$2,500.00',
    method: 'Bank Transfer',
    proof: 'receipt_02.jpg',
    status: 'PENDING',
    date: '2024-05-12 09:15',
  },
  {
    id: 'DEP-103',
    user: 'Emily Blunt',
    amount: '$1,000.00',
    method: 'Manual Deposit',
    proof: 'manual_01.jpg',
    status: 'PENDING',
    date: '2024-05-11 16:40',
  },
]

const DepositApprovalPage = () => {
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
      header: 'Request Info',
      render: (row) => (
        <div className="flex items-center gap-3 py-2">
          <Avatar alt={row.user} size="sm" />
          <div className="flex flex-col">
            <span className="font-bold text-slate-900">{row.user}</span>
            <span className="text-xs text-slate-500">{row.id}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Amount',
      render: (row) => <span className="font-bold text-slate-900">{row.amount}</span>,
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
      header: 'Proof',
      render: (row) => (
        <button className="text-primary flex items-center gap-1 text-xs font-bold hover:underline">
          <FileText size={14} /> View Receipt
        </button>
      ),
    },
    {
      header: 'Submitted',
      render: (row) => (
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Clock size={12} /> {row.date}
        </div>
      ),
    },
    {
      header: 'Actions',
      render: () => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-success/5 border-success/20 text-success hover:bg-success h-8 text-xs transition-all hover:text-white"
          >
            <CheckCircle size={14} className="mr-1" /> Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-danger/5 border-danger/20 text-danger hover:bg-danger h-8 text-xs transition-all hover:text-white"
          >
            <XCircle size={14} className="mr-1" /> Reject
          </Button>
        </div>
      ),
    },
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

        {/* 3. MAIN CONTENT CONTAINER (Nội dung duyệt nạp tiền) */}
        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'} `}
        >
          <main className="mx-auto w-full max-w-400 space-y-6 p-6 md:p-8">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Deposit Approvals</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Verify bank transfer receipts and approve wallet top-ups.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-success h-2 w-2 animate-pulse rounded-full" />
                <span className="text-xs font-medium text-slate-500">Real-time update active</span>
              </div>
            </div>

            {/* Warning Alert */}
            <div className="bg-warning/5 border-warning/20 flex items-center gap-3 rounded-xl border p-4">
              <AlertCircle className="text-warning shrink-0" size={20} />
              <p className="text-sm text-slate-700">
                <span className="font-bold">Security Check:</span> Always verify the transaction ID
                on your bank statement before approving a deposit.
              </p>
            </div>

            {/* High-level Stats */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {[
                { label: 'Pending Deposits', value: '3', color: 'text-warning' },
                { label: 'Total Pending Volume', value: '$8,500.00', color: 'text-slate-900' },
                { label: 'Avg. Response Time', value: '14 mins', color: 'text-primary' },
              ].map((stat, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="mb-1 text-xs font-bold tracking-widest text-slate-400 uppercase">
                    {stat.label}
                  </p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Table Section */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <DataTable columns={columns} data={MOCK_DEPOSITS} />
              </motion.div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default DepositApprovalPage
