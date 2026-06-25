import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchTransactions } from '../../../store/adminTransactionSlice'
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
import { HiBars3 } from 'react-icons/hi2'
import DataTable from '../../../components/organisms/DataTable'
import Badge from '../../../components/atoms/Badge'
import Button from '../../../components/atoms/Button'
import Sidebar from '../../../components/SideBar'
import logoDaidien from '../../../assets/logoDaidien.png'

const TransactionsPage = () => {
  const dispatch = useDispatch()
  const { data: transactions, loading } = useSelector((state) => state.adminTransaction)

  useEffect(() => {
    dispatch(fetchTransactions())
  }, [dispatch])
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Xử lý đóng/mở sidebar linh hoạt theo breakpoint thiết bị
  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileOpen(!isMobileOpen)
    } else {
      setIsSidebarExpanded(!isSidebarExpanded)
    }
  }

  const columns = [
    {
      header: 'Transaction ID',
      // BE: transaction.id (UUID)
      render: (row) => <span className="font-mono text-xs font-bold text-slate-500">{row.id}</span>,
    },
    {
      header: 'Type',
      render: (row) => {
        // BE: transactionType (enum string) — dương là nhận vào, âm là trả ra
        const isCredit = row.transactionType === 'DEPOSIT' || row.transactionType === 'REFUND' || row.amount > 0
        return (
          <div className="flex items-center gap-2">
            {isCredit ? (
              <div className="bg-success/10 text-success flex h-7 w-7 items-center justify-center rounded-full">
                <ArrowDownRight size={14} />
              </div>
            ) : (
              <div className="bg-danger/10 text-danger flex h-7 w-7 items-center justify-center rounded-full">
                <ArrowUpRight size={14} />
              </div>
            )}
            <span className="text-sm font-medium text-slate-700">
              {/* BE: transactionType hoặc type */}
              {row.transactionType || row.type || '—'}
            </span>
          </div>
        )
      },
    },
    {
      header: 'Amount',
      render: (row) => {
        // BE: amount là số (Long/BigDecimal), không có dấu + / -
        const amt = row.amount ?? 0
        const isCredit = amt >= 0
        return (
          <span className={`font-bold ${isCredit ? 'text-success' : 'text-slate-900'}`}>
            {isCredit ? '+' : ''}{amt.toLocaleString('vi-VN')} đ
          </span>
        )
      },
    },
    {
      header: 'Status',
      render: (row) => {
        const variants = {
          COMPLETED: 'success',
          SUCCESS: 'success',
          PENDING: 'warning',
          FAILED: 'danger',
        }
        const statusKey = row.status || row.transactionStatus
        return (
          <Badge variant={variants[statusKey] || 'slate'} size="sm" className="rounded-full">
            {statusKey || '—'}
          </Badge>
        )
      },
    },
    {
      header: 'Method',
      // BE: paymentMethod hoặc method
      render: (row) => <span>{row.paymentMethod || row.method || '—'}</span>,
    },
    {
      header: 'Date & Time',
      render: (row) =>
        // BE: createdAt (LocalDateTime ISO string)
        row.createdAt ? new Date(row.createdAt).toLocaleString('vi-VN') : (row.date || '—'),
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
        {/* 2. SIDEBAR COMPONENT */}
        <Sidebar
          isSidebarExpanded={isSidebarExpanded}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
          currentRole="ADMIN"
        />

        {/* 3. MAIN CONTENT CONTAINER */}
        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
            }`}
        >
          <main className="mx-auto w-full max-w-400 space-y-6 p-6 md:p-8">
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

            {/* Table wrapper */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {loading ? (
                  <div className="p-4 text-center">Loading...</div>
                ) : (
                  <DataTable columns={columns} data={transactions} />
                )}
              </motion.div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default TransactionsPage
