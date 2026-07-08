import React, { useState, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchTransactions, setPage } from '../../../store/adminTransactionSlice'
// Import các actions điều khiển Sidebar toàn hệ thống từ uiSlice
import { toggleSidebar, closeMobileSidebar } from '../../../store/uiSlide'
import { motion } from 'framer-motion'
import {
  CreditCard,
  DollarSign,
  Clock,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { HiBars3 } from 'react-icons/hi2'
import DataTable from '../../../components/organisms/DataTable'
import Badge from '../../../components/atoms/Badge'
import Sidebar from '../../../components/SideBar'
import logoDaidien from '../../../assets/logoDaidien.png'

// ─── Enum maps từ BE ─────────────────────────────────────────────────────────
const TRANSACTION_TYPE_LABELS = {
  TOP_UP: 'Nạp tiền',
  WITHDRAWAL: 'Rút tiền',
  DEPOSIT_PAYMENT: 'Thanh toán cọc',
  DEPOSIT_REFUND: 'Hoàn tiền cọc',
  PACKAGE_PAYMENT: 'Mua gói dịch vụ',
  COMMISSION: 'Phí hoa hồng',
}

const CREDIT_TYPES = new Set(['TOP_UP', 'DEPOSIT_REFUND'])

const STATUS_VARIANT = {
  SUCCESS: 'success',
  PENDING: 'warning',
  FAILED: 'danger',
}

const PAYMENT_METHOD_LABELS = {
  BANK_TRANSFER: 'Chuyển khoản',
  VNPAY: 'VNPay',
  MOMO: 'Momo',
  WALLET: 'Ví nội bộ',
}

const ALL_TYPES = [
  '',
  'TOP_UP',
  'WITHDRAWAL',
  'DEPOSIT_PAYMENT',
  'DEPOSIT_REFUND',
  'PACKAGE_PAYMENT',
  'COMMISSION',
]
const ALL_STATUSES = ['', 'SUCCESS', 'PENDING', 'FAILED']

// ─── Helpers ───────────────────────────────────────────────────────────────────
const formatVND = (amount) =>
  typeof amount === 'number'
    ? amount.toLocaleString('vi-VN') + ' ₫'
    : (amount ?? 0).toString() + ' ₫'

const formatDate = (dt) => (dt ? new Date(dt).toLocaleString('vi-VN', { hour12: false }) : '—')

const shortId = (id) => (id ? `#${String(id).slice(0, 8).toUpperCase()}` : '—')

// ─── Component ────────────────────────────────────────────────────────────────
const TransactionsPage = () => {
  const dispatch = useDispatch()
  const {
    data: transactions,
    loading,
    error,
    page,
    totalPages,
    totalElements,
    size,
  } = useSelector((state) => state.adminTransaction)

  const [searchText, setSearchText] = useState('')
  const [localType, setLocalType] = useState('')
  const [localStatus, setLocalStatus] = useState('')

  // ✅ Trạng thái Sidebar đồng bộ qua Redux Store toàn hệ thống
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)

  // Fetch khi page hoặc size thay đổi
  useEffect(() => {
    dispatch(fetchTransactions({ page, size }))
  }, [dispatch, page, size])

  // ── Computed summary từ DATA THỰC trên trang hiện tại ──
  const summary = useMemo(() => {
    const total = transactions.reduce((s, t) => s + Number(t.amount ?? 0), 0)
    const success = transactions
      .filter((t) => t.status === 'SUCCESS')
      .reduce((s, t) => s + Number(t.amount ?? 0), 0)
    const pending = transactions
      .filter((t) => t.status === 'PENDING')
      .reduce((s, t) => s + Number(t.amount ?? 0), 0)
    return { total, success, pending }
  }, [transactions])

  // ── Filter phía client (search + type + status) ──
  const filtered = useMemo(() => {
    const q = searchText.toLowerCase()
    return transactions.filter((t) => {
      const matchSearch =
        !q ||
        (t.id && t.id.toLowerCase().includes(q)) ||
        (t.transactionType && t.transactionType.toLowerCase().includes(q)) ||
        (t.paymentCode && t.paymentCode.toLowerCase().includes(q))
      const matchType = !localType || t.transactionType === localType
      const matchStatus = !localStatus || t.status === localStatus
      return matchSearch && matchType && matchStatus
    })
  }, [transactions, searchText, localType, localStatus])

  // ── Columns ──
  const columns = [
    {
      header: 'Transaction ID',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-slate-500" title={row.id}>
          {shortId(row.id)}
        </span>
      ),
    },
    {
      header: 'Loại giao dịch',
      render: (row) => {
        const isCredit = CREDIT_TYPES.has(row.transactionType)
        return (
          <div className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full ${
                isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
              }`}
            >
              {isCredit ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
            </div>
            <span className="text-sm font-medium text-slate-700">
              {TRANSACTION_TYPE_LABELS[row.transactionType] || row.transactionType || '—'}
            </span>
          </div>
        )
      },
    },
    {
      header: 'Số tiền',
      render: (row) => {
        const amt = Number(row.amount ?? 0)
        const isCredit = CREDIT_TYPES.has(row.transactionType)
        return (
          <span className={`font-bold ${isCredit ? 'text-emerald-600' : 'text-slate-800'}`}>
            {isCredit ? '+' : '-'}
            {formatVND(amt)}
          </span>
        )
      },
    },
    {
      header: 'Trạng thái',
      render: (row) => (
        <Badge variant={STATUS_VARIANT[row.status] || 'slate'} size="sm" className="rounded-full">
          {row.status || '—'}
        </Badge>
      ),
    },
    {
      header: 'Phương thức',
      render: (row) => (
        <span className="text-sm text-slate-600">
          {PAYMENT_METHOD_LABELS[row.paymentMethod] || row.paymentMethod || '—'}
        </span>
      ),
    },
    {
      header: 'Mã thanh toán',
      render: (row) => (
        <span className="font-mono text-xs text-slate-400">{row.paymentCode || '—'}</span>
      ),
    },
    {
      header: 'Ngày tạo',
      render: (row) => (
        <span className="text-sm whitespace-nowrap text-slate-500">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      header: '',
      render: () => (
        <button className="p-1.5 text-slate-400 transition-colors hover:text-slate-600">
          <MoreVertical size={18} />
        </button>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* TOP HEADER */}
      <header className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-4">
          <button
            // ✅ Gọi action toggleSidebar từ UI Slice
            onClick={() => dispatch(toggleSidebar())}
            className="rounded-full p-2 text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200"
          >
            <HiBars3 className="h-6 w-6" />
          </button>
          <div className="flex cursor-pointer items-center gap-2">
            <div className="shrink-0 rounded-lg bg-white p-1.5">
              <img src={logoDaidien} alt="Logo" className="h-10 w-17" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-slate-950">
              StockSpace Admin
            </span>
          </div>
        </div>
      </header>

      {/* MOBILE TRIGGER OVERLAY */}
      {/* ✅ Lớp phủ mờ đóng menu khi click ra ngoài ở màn hình Mobile */}
      <div className="md:hidden">
        {isMobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/30"
            onClick={() => dispatch(closeMobileSidebar())}
          />
        )}
      </div>

      <div className="flex pt-14">
        {/* SIDEBAR */}
        {/* ✅ Lược bớt việc truyền các props local thủ công, giao quyền lấy state cho Sidebar */}
        <Sidebar currentRole="ADMIN" />

        {/* MAIN CONTENT */}
        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-[72px]' // ✅ Thay thế md:pl-18 bằng md:pl-[72px] để khớp UI layout
          }`}
        >
          <main className="mx-auto w-full max-w-400 space-y-6 p-6 md:p-8">
            {/* Page header */}
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Toàn bộ lịch sử giao dịch tài chính trên hệ thống.
                  {totalElements > 0 && (
                    <span className="ml-1 font-semibold text-slate-700">
                      ({totalElements.toLocaleString()} giao dịch)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                ⚠️ {error}
              </div>
            )}

            {/* Summary cards — tính từ data thực */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {[
                {
                  label: 'Tổng',
                  value: formatVND(summary.total),
                  icon: CreditCard,
                  color: 'text-blue-600',
                  bg: 'bg-blue-50',
                },
                {
                  label: 'Thành công',
                  value: formatVND(summary.success),
                  icon: DollarSign,
                  color: 'text-emerald-600',
                  bg: 'bg-emerald-50',
                },
                {
                  label: 'Đang chờ',
                  value: formatVND(summary.pending),
                  icon: Clock,
                  color: 'text-amber-600',
                  bg: 'bg-amber-50',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.bg} ${item.color}`}
                  >
                    <item.icon size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-xl font-bold text-slate-900">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 md:flex-row">
              {/* Search */}
              <div className="relative w-full md:w-96">
                <Search
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Tìm theo ID, loại, mã thanh toán..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-4 pl-9 text-sm transition-all focus:ring-2 focus:ring-blue-200 focus:outline-none"
                />
              </div>

              <div className="flex w-full items-center gap-2 md:w-auto">
                {/* Type filter */}
                <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <Filter size={14} className="text-slate-400" />
                  <select
                    value={localType}
                    onChange={(e) => setLocalType(e.target.value)}
                    className="bg-transparent text-sm text-slate-700 focus:outline-none"
                  >
                    {ALL_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t ? TRANSACTION_TYPE_LABELS[t] || t : 'Tất cả loại'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status filter */}
                <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <select
                    value={localStatus}
                    onChange={(e) => setLocalStatus(e.target.value)}
                    className="bg-transparent text-sm text-slate-700 focus:outline-none"
                  >
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s || 'Tất cả trạng thái'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {loading ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" />
                    <span className="text-sm">Đang tải dữ liệu...</span>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-16 text-center text-sm text-slate-400">
                    Không có giao dịch nào phù hợp.
                  </div>
                ) : (
                  <DataTable columns={columns} data={filtered} />
                )}
              </motion.div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-sm text-slate-500">
                    Trang {page + 1} / {totalPages} · {totalElements.toLocaleString()} giao dịch
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => dispatch(setPage(page - 1))}
                      disabled={page === 0 || loading}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm font-semibold text-slate-700">{page + 1}</span>
                    <button
                      onClick={() => dispatch(setPage(page + 1))}
                      disabled={page >= totalPages - 1 || loading}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default TransactionsPage
