import { useState, useEffect, useMemo } from 'react'
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
  ChevronLeft,
  ChevronRight,
  Eye,
  UserRound,
} from 'lucide-react'
import { HiBars3 } from 'react-icons/hi2'
import DataTable from '../../../components/organisms/DataTable'
import Badge from '../../../components/atoms/Badge'
import Sidebar from '../../../components/SideBar'
import logoDaidien from '../../../assets/logoDaidien.png'
import NotificationDropdown from '@/components/NotificationDropdown'
import Modal from '../../../components/organisms/Modal'

// ─── Enum maps từ BE ─────────────────────────────────────────────────────────
const TRANSACTION_TYPE_LABELS = {
  TOP_UP: 'Top up',
  WITHDRAWAL: 'Withdraw money',
  DEPOSIT_PAYMENT: 'Deposit payment',
  DEPOSIT_RECEIVED: 'Receive deposit',
  DEPOSIT_REFUND: 'Refund deposit',
  PACKAGE_PAYMENT: 'Buy a service package',
  COMMISSION: 'Commission fee',
  LISTING_FEE: 'Listing fee',
  LISTING_REFUND: 'Refund listing fee',
}

const DEBIT_TYPES = new Set(['WITHDRAW', 'WITHDRAWAL'])

const STATUS_VARIANT = {
  SUCCESS: 'success',
  PENDING: 'warning',
  FAILED: 'danger',
  EXPIRED: 'secondary',
}

const PAYMENT_METHOD_LABELS = {
  BANK_TRANSFER: 'Transfer',
  VNPAY: 'VNPay',
  PAYOS: 'PayOS',
  MOMO: 'Momo',
  WALLET: 'Internal wallet',
}

const ALL_TYPES = [
  '',
  'TOP_UP',
  'WITHDRAWAL',
  'DEPOSIT_PAYMENT',
  'DEPOSIT_RECEIVED',
  'DEPOSIT_REFUND',
  'PACKAGE_PAYMENT',
  'COMMISSION',
  'LISTING_FEE',
  'LISTING_REFUND',
]
const ALL_STATUSES = ['', 'SUCCESS', 'PENDING', 'FAILED', 'EXPIRED']

// ─── Helpers ───────────────────────────────────────────────────────────────────
const formatVND = (amount) =>
  typeof amount === 'number'
    ? amount.toLocaleString('vi-VN') + ' ₫'
    : (amount ?? 0).toString() + ' ₫'

const formatDate = (dt) => (dt ? new Date(dt).toLocaleString('en-US', { hour12: false }) : '—')

const shortId = (id) => (id ? `#${String(id).slice(0, 8).toUpperCase()}` : '—')

const getTransactionDirection = (row) => {
  // Admin view: every system fee/revenue is money in. Only withdrawals are
  // money out from the admin wallet.
  return DEBIT_TYPES.has(row.transactionType) ? 'debit' : 'credit'
}

const getTransactionActor = (row) => {
  const name =
    row.performedByFullName ||
    row.performedByName ||
    row.actorName ||
    row.userFullName ||
    row.userName ||
    row.createdByFullName ||
    row.user?.fullName ||
    row.actor?.fullName ||
    row.createdBy?.fullName

  const email =
    row.performedByEmail ||
    row.actorEmail ||
    row.userEmail ||
    row.email ||
    row.user?.email ||
    row.actor?.email ||
    row.createdBy?.email

  const reference =
    row.referenceId || row.bookingId || row.subscriptionId || row.listingOrderId || row.paymentCode

  if (name || email) {
    return {
      name: name || 'Unnamed user',
      detail: [email || 'User account', reference && `Ref: ${shortId(reference)}`]
        .filter(Boolean)
        .join(' · '),
      provided: true,
    }
  }

  return {
    name: reference?.toUpperCase().startsWith('SYS-REFUND-') ? 'System revenue' : 'Wallet owner',
    detail: reference ? `Ref: ${shortId(reference)}` : 'Actor not included in API response',
    provided: false,
  }
}

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
  const [selectedTransaction, setSelectedTransaction] = useState(null)

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
        (t.paymentCode && t.paymentCode.toLowerCase().includes(q)) ||
        JSON.stringify(getTransactionActor(t)).toLowerCase().includes(q)
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
      header: 'Transaction type',
      render: (row) => {
        const isCredit = getTransactionDirection(row) === 'credit'
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
      header: 'Amount',
      render: (row) => {
        const amt = Number(row.amount ?? 0)
        const isCredit = getTransactionDirection(row) === 'credit'
        return (
          <span
            className={`inline-flex items-center gap-1.5 whitespace-nowrap font-bold tabular-nums ${
              isCredit ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-sm leading-none ${
                isCredit ? 'bg-emerald-100' : 'bg-rose-100'
              }`}
            >
              {isCredit ? '+' : '−'}
            </span>
            {formatVND(amt)}
          </span>
        )
      },
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge variant={STATUS_VARIANT[row.status] || 'slate'} size="sm" className="rounded-full">
          {row.status || '—'}
        </Badge>
      ),
    },
    {
      header: 'Method',
      render: (row) => (
        <span className="text-sm text-slate-600">
          {PAYMENT_METHOD_LABELS[row.paymentMethod] || row.paymentMethod || '—'}
        </span>
      ),
    },
    {
      header: 'Payment code',
      render: (row) => (
        <span className="font-mono text-xs text-slate-400">{row.paymentCode || '—'}</span>
      ),
    },
    {
      header: 'Creation date',
      render: (row) => (
        <span className="text-sm whitespace-nowrap text-slate-500">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedTransaction(row)}
          title="View sender details"
          aria-label={`View sender details for ${shortId(row.id)}`}
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
        >
          <Eye size={17} />
        </button>
      ),
    },
  ]

  const selectedActor = selectedTransaction ? getTransactionActor(selectedTransaction) : null
  const selectedIsCredit = selectedTransaction
    ? getTransactionDirection(selectedTransaction) === 'credit'
    : false

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
              <a href="/" aria-label="Back to landing page">
                <img src={logoDaidien} alt="Logo" className="h-10 w-17" />
              </a>
            </div>
            <span className="font-display hidden text-xl font-bold tracking-tight text-slate-950 sm:inline">
              StockSpace Admin
            </span>
          </div>
        </div>
        <div className="mr-20 ml-auto flex items-center sm:mr-28">
          <NotificationDropdown />
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
          <main className="mx-auto w-full max-w-400 space-y-6 p-4 sm:p-6 md:p-8">
            {/* Page header */}
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Complete history of financial transactions on the system.
                  {totalElements > 0 && (
                    <span className="ml-1 font-semibold text-slate-700">
                      ({totalElements.toLocaleString()} transaction)
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
                  label: 'Total',
                  value: formatVND(summary.total),
                  icon: CreditCard,
                  color: 'text-blue-600',
                  bg: 'bg-blue-50',
                },
                {
                  label: 'Success',
                  value: formatVND(summary.success),
                  icon: DollarSign,
                  color: 'text-emerald-600',
                  bg: 'bg-emerald-50',
                },
                {
                  label: 'Waiting',
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
                  placeholder="Search by ID, type, payment code..."
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
                        {t ? TRANSACTION_TYPE_LABELS[t] || t : 'All types'}
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
                        {s || 'All status'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="font-semibold text-slate-600">Amount direction:</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-600">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 font-bold">
                    +
                  </span>
                  Money in
                </span>
                <span className="inline-flex items-center gap-1.5 text-rose-600">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 font-bold">
                    −
                  </span>
                  Money out
                </span>
              </div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {loading ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" />
                    <span className="text-sm">Loading data...</span>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-16 text-center text-sm text-slate-400">
                    There are no suitable transactions.
                  </div>
                ) : (
                  <DataTable columns={columns} data={filtered} />
                )}
              </motion.div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-sm text-slate-500">
                    Page {page + 1} / {totalPages} · {totalElements.toLocaleString()} transactions
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

      <Modal
        isOpen={Boolean(selectedTransaction)}
        onClose={() => setSelectedTransaction(null)}
        title="Sender details"
        className="max-w-xl"
      >
        {selectedTransaction && selectedActor && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <UserRound size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold text-slate-900">{selectedActor.name}</p>
                <p className="truncate text-sm text-slate-500">{selectedActor.detail}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  Transaction ID
                </p>
                <p className="mt-1 font-mono text-slate-700">{selectedTransaction.id || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  Transaction type
                </p>
                <p className="mt-1 text-slate-700">
                  {TRANSACTION_TYPE_LABELS[selectedTransaction.transactionType] ||
                    selectedTransaction.transactionType ||
                    '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  Amount
                </p>
                <p
                  className={`mt-1 font-bold ${selectedIsCredit ? 'text-emerald-600' : 'text-rose-600'}`}
                >
                  {selectedIsCredit ? '+' : '−'} {formatVND(Number(selectedTransaction.amount ?? 0))}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Status</p>
                <div className="mt-1">
                  <Badge
                    variant={STATUS_VARIANT[selectedTransaction.status] || 'slate'}
                    size="sm"
                    className="rounded-full"
                  >
                    {selectedTransaction.status || '—'}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Method</p>
                <p className="mt-1 text-slate-700">
                  {PAYMENT_METHOD_LABELS[selectedTransaction.paymentMethod] ||
                    selectedTransaction.paymentMethod ||
                    '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  Created at
                </p>
                <p className="mt-1 text-slate-700">{formatDate(selectedTransaction.createdAt)}</p>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 p-4 text-sm">
              <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                Related references
              </p>
              {[
                ['Payment code', selectedTransaction.paymentCode],
                ['Reference ID', selectedTransaction.referenceId],
                ['Booking ID', selectedTransaction.bookingId],
                ['Subscription ID', selectedTransaction.subscriptionId],
                ['Listing order ID', selectedTransaction.listingOrderId],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col gap-1 border-b border-slate-100 pb-2 last:border-0 last:pb-0 sm:flex-row sm:justify-between sm:gap-4">
                  <span className="text-slate-500">{label}</span>
                  <span className="break-all font-mono text-xs text-slate-700">{value || '—'}</span>
                </div>
              ))}
            </div>

            {!selectedActor.provided && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">
                Sender name and contact are not included in the current transaction response. The
                available wallet/reference information is shown above.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default TransactionsPage
