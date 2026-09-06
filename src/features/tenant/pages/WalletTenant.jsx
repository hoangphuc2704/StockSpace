import { useState, useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import { FormShell } from '@/form/FormControls'
import useEscapeKey from '@/hooks/useEscapeKey'
import moment from 'moment'

// Icons
import {
  Wallet,
  PlusCircle,
  RefreshCw,
  CreditCard,
  X,
  Loader2,
  MinusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Building2,
  ShieldCheck
} from 'lucide-react'

// Layout & Modals
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'
import WithdrawModal from '@/components/organisms/WithdrawModal'

// APIs & Validation
import walletApi from '@/services/wallet/walletApi'
import { toast } from 'react-hot-toast'
import { positiveNumber } from '@/config/validation'
import { showApiErrorToast } from '@/config/apiError'

// Metadata Mappings for WMS Financial Operations
const TRANSACTION_TYPE_MAP = {
  TOP_UP: {
    label: 'Nạp tiền vào ví',
    direction: 'in',
    icon: ArrowDownLeft,
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  DEPOSIT_REFUND: {
    label: 'Hoàn trả cọc kho',
    direction: 'in',
    icon: RotateCcw,
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  DEPOSIT_PAYMENT: {
    label: 'Thanh toán cọc kho',
    direction: 'out',
    icon: ArrowUpRight,
    badgeClass: 'border-purple-200 bg-purple-50 text-purple-700',
  },
  PACKAGE_PAYMENT: {
    label: 'Thanh toán gói dịch vụ',
    direction: 'out',
    icon: CreditCard,
    badgeClass: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  WITHDRAW: {
    label: 'Rút tiền về ngân hàng',
    direction: 'out',
    icon: ArrowUpRight,
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
  },
}

const PAYMENT_METHOD_MAP = {
  BANK_TRANSFER: 'Chuyển khoản NH',
  WALLET: 'Số dư ví',
  VNPAY: 'Cổng VNPay',
}

const STATUS_MAP = {
  SUCCESS: { label: 'Thành công', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  APPROVED: { label: 'Thành công', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  PENDING: { label: 'Đang xử lý', className: 'border-amber-200 bg-amber-50 text-amber-800' },
  FAILED: { label: 'Thất bại', className: 'border-rose-200 bg-rose-50 text-rose-700' },
  REJECTED: { label: 'Từ chối', className: 'border-rose-200 bg-rose-50 text-rose-700' },
  CANCELLED: { label: 'Đã hủy', className: 'border-slate-200 bg-slate-100 text-slate-600' },
}

const PRESET_AMOUNTS = [1000000, 2000000, 5000000, 10000000, 20000000]

const formatVND = (value) => {
  if (value === undefined || value === null) return '0 ₫'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
}

const WalletTenant = () => {
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  const { user } = useSelector((state) => state.auth)

  // --- STATE QUẢN LÝ DỮ LIỆU ---
  const [activeTab, setActiveTab] = useState('transactions') // 'transactions' | 'withdrawals'

  const [wallet, setWallet] = useState(null)
  const [loadingWallet, setLoadingWallet] = useState(true)

  const [transactions, setTransactions] = useState([])
  const [loadingTransactions, setLoadingTransactions] = useState(true)
  const [pagination, setPagination] = useState({
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 1,
    last: false,
  })

  const [withdrawals, setWithdrawals] = useState([])
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true)
  const [withdrawPagination, setWithdrawPagination] = useState({
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 1,
    last: false,
  })

  // State điều khiển Modal
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false)
  const [inputAmount, setInputAmount] = useState('')
  const [depositLoading, setDepositLoading] = useState(false)

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)
  const [copiedCode, setCopiedCode] = useState(null)

  useEscapeKey(isDepositModalOpen, () => setIsDepositModalOpen(false))

  // --- HÀM LẤY DỮ LIỆU ---
  const fetchWallet = useCallback(async () => {
    try {
      setLoadingWallet(true)
      const res = await walletApi.getWallet()
      if (res?.data?.success) {
        setWallet(res.data.data)
      } else {
        setWallet(res?.data || res)
      }
    } catch (error) {
      console.error('Error retrieving wallet data:', error)
    } finally {
      setLoadingWallet(false)
    }
  }, [])

  const fetchTransactions = useCallback(async (page = 0) => {
    try {
      setLoadingTransactions(true)
      const res = await walletApi.getWalletTransactions({ page, size: 10 })

      if (res?.data?.success) {
        setTransactions(res.data.data.content || [])
        setPagination({
          page: res.data.data.page ?? 0,
          size: res.data.data.size ?? 10,
          totalElements: res.data.data.totalElements ?? 0,
          totalPages: res.data.data.totalPages ?? 1,
          last: res.data.data.last ?? false,
        })
      }
    } catch (error) {
      console.error('Error retrieving transaction history:', error)
    } finally {
      setLoadingTransactions(false)
    }
  }, [])

  const fetchWithdrawals = useCallback(async (page = 0) => {
    try {
      setLoadingWithdrawals(true)
      const res = await walletApi.getWithdrawHistory({ page, size: 10 })

      if (res?.data?.success) {
        setWithdrawals(res.data.data.content || [])
        setWithdrawPagination({
          page: res.data.data.page ?? 0,
          size: res.data.data.size ?? 10,
          totalElements: res.data.data.totalElements ?? 0,
          totalPages: res.data.data.totalPages ?? 1,
          last: res.data.data.last ?? false,
        })
      }
    } catch (error) {
      console.error('Error retrieving withdrawal history:', error)
    } finally {
      setLoadingWithdrawals(false)
    }
  }, [])

  const handleRefresh = () => {
    fetchWallet()
    if (activeTab === 'transactions') {
      fetchTransactions(pagination.page)
    } else {
      fetchWithdrawals(withdrawPagination.page)
    }
    toast.success('Đã làm mới dữ liệu ví')
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWallet()
    fetchTransactions(0)
    fetchWithdrawals(0)
  }, [fetchWallet, fetchTransactions, fetchWithdrawals])

  // --- XỬ LÝ NẠP TIỀN ---
  const handleDepositSubmit = async (e) => {
    e.preventDefault()

    const amountNumber = Number(inputAmount)
    const amountError = positiveNumber(amountNumber, 'Vui lòng nhập số tiền hợp lệ.')
    if (amountError) {
      toast.error(amountError)
      return
    }

    if (amountNumber < 10000) {
      toast.error('Số tiền nạp tối thiểu là 10.000 ₫')
      return
    }

    try {
      setDepositLoading(true)

      const payload = {
        amount: amountNumber,
        paymentMethod: 'BANK_TRANSFER',
      }

      const res = await walletApi.requestDeposit(payload)

      if (res?.data?.success && res?.data?.data?.paymentUrl) {
        window.location.href = res.data.data.paymentUrl
      } else {
        showApiErrorToast({ response: { data: res?.data } }, 'Không thể tạo liên kết thanh toán.')
      }
    } catch (error) {
      console.error('Deposit error:', error)
      showApiErrorToast(error, 'Nạp tiền thất bại. Vui lòng thử lại sau.')
    } finally {
      setDepositLoading(false)
    }
  }

  const handleCopy = (text) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedCode(text)
    toast.success('Đã sao chép mã giao dịch')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      {/* 1. TOP HEADER */}
      <Header />

      {/* MOBILE OVERLAY */}
      <div className="md:hidden">
        {isMobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => dispatch(closeMobileSidebar())}
          />
        )}
      </div>

      <div className="flex pt-14">
        {/* 2. SIDEBAR */}
        <Sidebar currentRole="TENANT" />

        {/* 3. MAIN WORKSPACE */}
        <div
          className={`flex min-w-0 flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
          }`}
        >
          <main className="mx-auto w-full max-w-[1600px] min-w-0 space-y-5 px-4 py-6 sm:px-6 md:py-8 lg:px-8">
            {/* PAGE HEADER: COMPACT & FUNCTIONAL */}
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
                    Ví Của Tôi
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 shadow-2xs">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Bảo mật WMS
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {user?.name ? `${user.name} — ` : ''}Quản lý số dư khả dụng, thực hiện nạp/rút tiền và kiểm soát dòng tiền luân chuyển theo thời gian thực.
                </p>
              </div>

              {/* ACTION BUTTONS GROUP */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={loadingWallet || loadingTransactions || loadingWithdrawals}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 text-slate-500 ${
                      loadingWallet || loadingTransactions ? 'animate-spin text-blue-600' : ''
                    }`}
                  />
                  <span>Làm mới</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:border-slate-400 hover:bg-slate-50 transition-colors"
                >
                  <MinusCircle className="h-3.5 w-3.5 text-rose-600" />
                  <span>Rút tiền</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInputAmount('')
                    setIsDepositModalOpen(true)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 transition-colors"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Nạp tiền</span>
                </button>
              </div>
            </div>

            {/* COMPACT ENTERPRISE FINANCIAL SUMMARY BAR */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3 lg:grid-cols-4 md:divide-x md:divide-slate-200">
                {/* 1. Available Balance (Core metric) */}
                <div className="md:col-span-2 lg:col-span-2 flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Số Dư Khả Dụng
                      </span>
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.2 text-[10px] font-semibold text-emerald-700">
                        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Sẵn sàng giao dịch
                      </span>
                    </div>
                    <div className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 font-mono">
                      {loadingWallet ? (
                        <span className="inline-block h-8 w-36 animate-pulse rounded bg-slate-200" />
                      ) : (
                        formatVND(wallet?.balance)
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Được sử dụng để thanh toán tiền thuê kho, đặt cọc và gia hạn các gói giải pháp dịch vụ.
                    </p>
                  </div>
                </div>

                {/* 2. Total Recorded Transactions */}
                <div className="md:pl-5 flex flex-col justify-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Lịch Sử Ghi Nhận
                  </span>
                  <div className="mt-1 text-xl font-bold text-slate-900 font-mono">
                    {loadingTransactions ? '—' : pagination.totalElements}
                    <span className="ml-1 text-xs font-normal text-slate-500">giao dịch</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Bao gồm các lệnh nạp tiền, đặt cọc và thanh toán
                  </p>
                </div>

                {/* 3. Withdrawal Requests Info */}
                <div className="md:pl-5 flex flex-col justify-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Yêu Cầu Rút Tiền
                  </span>
                  <div className="mt-1 text-xl font-bold text-slate-900 font-mono">
                    {loadingWithdrawals ? '—' : withdrawPagination.totalElements}
                    <span className="ml-1 text-xs font-normal text-slate-500">yêu cầu</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Chuyển khoản trực tiếp về số tài khoản ngân hàng thụ hưởng
                  </p>
                </div>
              </div>
            </div>

            {/* TABBED FINANCIAL LEDGER SECTION */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
              {/* TABS HEADER */}
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/60 px-4 sm:px-6">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('transactions')}
                    className={`inline-flex items-center gap-2 border-b-2 py-3.5 text-xs font-bold transition-colors ${
                      activeTab === 'transactions'
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>Lịch sử giao dịch</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        activeTab === 'transactions'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {pagination.totalElements}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('withdrawals')}
                    className={`inline-flex items-center gap-2 border-b-2 py-3.5 text-xs font-bold transition-colors ${
                      activeTab === 'withdrawals'
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>Yêu cầu rút tiền</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        activeTab === 'withdrawals'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {withdrawPagination.totalElements}
                    </span>
                  </button>
                </div>

                <div className="hidden sm:block text-[11px] text-slate-400 font-mono">
                  {activeTab === 'transactions' ? 'Sổ cái giao dịch ví' : 'Nhật ký lệnh rút tiền'}
                </div>
              </div>

              {/* TAB CONTENT: 1. TRANSACTIONS LEDGER */}
              {activeTab === 'transactions' && (
                <div>
                  <div className="overflow-x-auto">
                    {loadingTransactions ? (
                      <div className="p-8 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                        <p className="mt-2 text-xs font-medium text-slate-500">Đang tải lịch sử giao dịch...</p>
                      </div>
                    ) : transactions.length > 0 ? (
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="px-4 py-2.5">Mã Giao Dịch</th>
                            <th className="px-4 py-2.5">Loại Giao Dịch</th>
                            <th className="px-4 py-2.5">Phương Thức</th>
                            <th className="px-4 py-2.5 text-right">Số Tiền</th>
                            <th className="px-4 py-2.5 text-center">Trạng Thái</th>
                            <th className="px-4 py-2.5">Thời Gian</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {transactions.map((row) => {
                            const meta = TRANSACTION_TYPE_MAP[row.transactionType] || {
                              label: row.transactionType || 'Khác',
                              direction: 'out',
                              icon: CreditCard,
                              badgeClass: 'border-slate-200 bg-slate-50 text-slate-700',
                            }
                            const isIncoming = meta.direction === 'in'
                            const isFailed =
                              row.status !== 'SUCCESS' && row.status !== 'APPROVED' && row.status !== 'PENDING'
                            const statusMeta = STATUS_MAP[row.status] || {
                              label: row.status || 'Chưa xác định',
                              className: 'border-slate-200 bg-slate-100 text-slate-600',
                            }
                            const TypeIcon = meta.icon

                            return (
                              <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                                {/* Mã giao dịch */}
                                <td className="px-4 py-3">
                                  {row.paymentCode ? (
                                    <div className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                      <span>{row.paymentCode}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopy(row.paymentCode)}
                                        title="Sao chép mã"
                                        className="text-slate-400 hover:text-slate-700 transition-colors"
                                      >
                                        {copiedCode === row.paymentCode ? (
                                          <Check className="h-3 w-3 text-emerald-600" />
                                        ) : (
                                          <Copy className="h-3 w-3" />
                                        )}
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="font-mono text-slate-400">
                                      {row.id ? `TXN-${String(row.id).slice(0, 8).toUpperCase()}` : '—'}
                                    </span>
                                  )}
                                </td>

                                {/* Loại giao dịch */}
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                                        isIncoming
                                          ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                                          : 'border-slate-200 bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      <TypeIcon className="h-3.5 w-3.5" />
                                    </span>
                                    <span className="font-semibold text-slate-800">{meta.label}</span>
                                  </div>
                                </td>

                                {/* Phương thức */}
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1.5 text-slate-600">
                                    <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                                    <span>{PAYMENT_METHOD_MAP[row.paymentMethod] || row.paymentMethod || '—'}</span>
                                  </div>
                                </td>

                                {/* Số tiền */}
                                <td className="px-4 py-3 text-right font-mono font-bold">
                                  <span
                                    className={
                                      isFailed
                                        ? 'text-slate-400 line-through'
                                        : isIncoming
                                        ? 'text-emerald-700'
                                        : 'text-slate-900'
                                    }
                                  >
                                    {isIncoming ? '+' : '−'} {formatVND(row.amount)}
                                  </span>
                                </td>

                                {/* Trạng thái */}
                                <td className="px-4 py-3 text-center">
                                  <span
                                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border ${statusMeta.className}`}
                                  >
                                    {statusMeta.label}
                                  </span>
                                </td>

                                {/* Thời gian */}
                                <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                                  <div className="font-medium text-slate-700">
                                    {moment(row.createdAt).format('DD/MM/YYYY · HH:mm')}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {moment(row.createdAt).fromNow()}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-14 text-center">
                        <Wallet className="h-9 w-9 text-slate-300 mb-2" />
                        <p className="text-xs font-bold text-slate-700">Chưa có giao dịch nào</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm">
                          Các giao dịch nạp tiền, rút tiền và thanh toán cọc/gói dịch vụ sẽ được ghi nhận chi tiết tại đây.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setInputAmount('')
                            setIsDepositModalOpen(true)
                          }}
                          className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 transition-colors"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          <span>Nạp tiền ngay</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* PHÂN TRANG GIAO DỊCH */}
                  {pagination.totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/50 px-4 py-3">
                      <p className="text-xs text-slate-500">
                        Hiển thị <span className="font-semibold text-slate-700">{transactions.length}</span> /{' '}
                        <span className="font-semibold text-slate-700">{pagination.totalElements}</span> giao dịch
                      </p>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={pagination.page === 0}
                          onClick={() => fetchTransactions(pagination.page - 1)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          <span>Trước</span>
                        </button>

                        {[...Array(pagination.totalPages).keys()]
                          .filter((p) => p >= pagination.page - 2 && p <= pagination.page + 2)
                          .map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => fetchTransactions(p)}
                              className={`h-7 w-7 rounded-md text-xs font-bold transition-all ${
                                pagination.page === p
                                  ? 'bg-blue-600 text-white shadow-2xs'
                                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {p + 1}
                            </button>
                          ))}

                        <button
                          type="button"
                          disabled={pagination.last || pagination.page >= pagination.totalPages - 1}
                          onClick={() => fetchTransactions(pagination.page + 1)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                        >
                          <span>Sau</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT: 2. WITHDRAWAL REQUESTS */}
              {activeTab === 'withdrawals' && (
                <div>
                  <div className="overflow-x-auto">
                    {loadingWithdrawals ? (
                      <div className="p-8 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                        <p className="mt-2 text-xs font-medium text-slate-500">Đang tải lịch sử rút tiền...</p>
                      </div>
                    ) : withdrawals.length > 0 ? (
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="px-4 py-2.5">Mã Yêu Cầu</th>
                            <th className="px-4 py-2.5">Ngân Hàng Thụ Hưởng</th>
                            <th className="px-4 py-2.5 text-right">Số Tiền Rút</th>
                            <th className="px-4 py-2.5 text-center">Trạng Thái</th>
                            <th className="px-4 py-2.5">Thời Gian Yêu Cầu</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {withdrawals.map((row) => {
                            const statusMeta = STATUS_MAP[row.status] || {
                              label: row.status || 'Chờ duyệt',
                              className: 'border-slate-200 bg-slate-100 text-slate-600',
                            }

                            return (
                              <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                                {/* Mã yêu cầu */}
                                <td className="px-4 py-3 font-mono text-xs font-medium text-slate-900">
                                  WD-{String(row.id).slice(0, 8).toUpperCase()}
                                </td>

                                {/* Ngân hàng thụ hưởng */}
                                <td className="px-4 py-3">
                                  <div className="flex items-start gap-2">
                                    <Building2 className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                                    <div>
                                      <p className="font-bold text-slate-900">{row.bankName}</p>
                                      <p className="font-mono text-xs text-slate-600 mt-0.5">
                                        STK: {row.bankAccountNumber}
                                      </p>
                                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                        {row.bankAccountHolder}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                {/* Số tiền */}
                                <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                                  − {formatVND(row.amount)}
                                </td>

                                {/* Trạng thái */}
                                <td className="px-4 py-3 text-center">
                                  <div className="inline-flex flex-col items-center">
                                    <span
                                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border ${statusMeta.className}`}
                                    >
                                      {statusMeta.label}
                                    </span>
                                    {row.adminNotes && (
                                      <p
                                        className="mt-1 max-w-xs truncate text-[10px] text-slate-500 italic"
                                        title={row.adminNotes}
                                      >
                                        Ghi chú: {row.adminNotes}
                                      </p>
                                    )}
                                  </div>
                                </td>

                                {/* Thời gian */}
                                <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                                  <div className="font-medium text-slate-700">
                                    {moment(row.createdAt).format('DD/MM/YYYY · HH:mm')}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {moment(row.createdAt).fromNow()}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-14 text-center">
                        <CreditCard className="h-9 w-9 text-slate-300 mb-2" />
                        <p className="text-xs font-bold text-slate-700">Chưa có yêu cầu rút tiền</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm">
                          Khi bạn tạo lệnh rút số dư về tài khoản ngân hàng, thông tin xử lý sẽ được cập nhật tại đây.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsWithdrawModalOpen(true)}
                          className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
                        >
                          <MinusCircle className="h-3.5 w-3.5 text-rose-600" />
                          <span>Tạo yêu cầu rút tiền</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* PHÂN TRANG RÚT TIỀN */}
                  {withdrawPagination.totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/50 px-4 py-3">
                      <p className="text-xs text-slate-500">
                        Hiển thị <span className="font-semibold text-slate-700">{withdrawals.length}</span> /{' '}
                        <span className="font-semibold text-slate-700">{withdrawPagination.totalElements}</span> yêu cầu
                      </p>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={withdrawPagination.page === 0}
                          onClick={() => fetchWithdrawals(withdrawPagination.page - 1)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          <span>Trước</span>
                        </button>

                        {[...Array(withdrawPagination.totalPages).keys()]
                          .filter((p) => p >= withdrawPagination.page - 2 && p <= withdrawPagination.page + 2)
                          .map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => fetchWithdrawals(p)}
                              className={`h-7 w-7 rounded-md text-xs font-bold transition-all ${
                                withdrawPagination.page === p
                                  ? 'bg-blue-600 text-white shadow-2xs'
                                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {p + 1}
                            </button>
                          ))}

                        <button
                          type="button"
                          disabled={withdrawPagination.last || withdrawPagination.page >= withdrawPagination.totalPages - 1}
                          onClick={() => fetchWithdrawals(withdrawPagination.page + 1)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                        >
                          <span>Sau</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* MODAL NẠP TIỀN QUA VNPAY (REFINED ENTERPRISE FINANCIAL DIALOG) */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <Wallet className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Nạp Tiền Vào Ví StockSpace
                  </h3>
                  <p className="text-[11px] text-slate-500">Cổng thanh toán an toàn VNPay Gateway</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDepositModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <FormShell onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Nhập số tiền cần nạp (VND)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    autoFocus
                    required
                    min={10000}
                    step={10000}
                    value={inputAmount}
                    onChange={(e) => setInputAmount(e.target.value)}
                    placeholder="Ví dụ: 2000000"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  />
                  <span className="absolute top-1/2 right-3.5 -translate-y-1/2 text-xs font-bold text-slate-400">
                    ₫
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {PRESET_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setInputAmount(String(amt))}
                      className={`rounded border px-2 py-1 text-[11px] font-mono font-medium transition-colors ${
                        Number(inputAmount) === amt
                          ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {formatVND(amt)}
                    </button>
                  ))}
                </div>

                {inputAmount && !isNaN(Number(inputAmount)) && Number(inputAmount) > 0 && (
                  <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5 text-xs text-emerald-800">
                    <span>Số tiền thực nạp:</span>
                    <span className="font-mono font-bold text-emerald-900">
                      {formatVND(Number(inputAmount))}
                    </span>
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500 border border-slate-100 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                  <span>Hình thức thanh toán:</span>
                </div>
                <p>Hỗ trợ quét mã VNPAY-QR, Thẻ ATM nội địa, Internet Banking và Thẻ quốc tế Visa/Mastercard.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={depositLoading || !inputAmount || Number(inputAmount) <= 0}
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 transition-colors disabled:bg-slate-300"
                >
                  {depositLoading ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Đang kết nối cổng VNPay...
                    </>
                  ) : (
                    <>Tiến hành thanh toán VNPay</>
                  )}
                </button>
              </div>
            </FormShell>
          </div>
        </div>
      )}

      {/* MODAL RÚT TIỀN (REUSED & INTEGRATED) */}
      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        currentBalance={wallet?.balance || 0}
        onSuccess={() => {
          fetchWallet()
          fetchWithdrawals(0)
          setActiveTab('withdrawals')
        }}
      />
    </div>
  )
}

export default WalletTenant
