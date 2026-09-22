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
import { useLanguage } from '@/i18n/LanguageContext'

// Relative time formatting helper
const relativeTimeIntervals = [
  { limit: 60, divisor: 1, unit: 'second' },
  { limit: 3600, divisor: 60, unit: 'minute' },
  { limit: 86400, divisor: 3600, unit: 'hour' },
  { limit: 604800, divisor: 86400, unit: 'day' },
  { limit: 2629800, divisor: 604800, unit: 'week' },
  { limit: 31557600, divisor: 2629800, unit: 'month' },
  { limit: Infinity, divisor: 31557600, unit: 'year' },
]

const formatRelativeTime = (value, language = 'en') => {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return ''

  const deltaSeconds = (timestamp - Date.now()) / 1000
  const interval = relativeTimeIntervals.find(({ limit }) => Math.abs(deltaSeconds) < limit)
  const rtf = new Intl.RelativeTimeFormat(language === 'vi' ? 'vi' : 'en', { numeric: 'auto' })
  return rtf.format(Math.round(deltaSeconds / interval.divisor), interval.unit)
}

// Metadata Mappings for WMS Financial Operations
const TRANSACTION_TYPE_MAP = {
  TOP_UP: {
    label: 'Top-up',
    direction: 'in',
    icon: ArrowDownLeft,
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  DEPOSIT_REFUND: {
    label: 'Deposit refund',
    direction: 'in',
    icon: RotateCcw,
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  DEPOSIT_PAYMENT: {
    label: 'Deposit payment',
    direction: 'out',
    icon: ArrowUpRight,
    badgeClass: 'border-purple-200 bg-purple-50 text-purple-700',
  },
  PACKAGE_PAYMENT: {
    label: 'Service package payment',
    direction: 'out',
    icon: CreditCard,
    badgeClass: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  WITHDRAWAL: {
    label: 'Withdrawal to bank',
    direction: 'out',
    icon: ArrowUpRight,
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  WITHDRAW: {
    label: 'Withdrawal to bank',
    direction: 'out',
    icon: ArrowUpRight,
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
  },
}

const PAYMENT_METHOD_MAP = {
  BANK_TRANSFER: 'Bank transfer',
  WALLET: 'Wallet balance',
  VNPAY: 'VNPay gateway',
  PAYOS: 'PayOS gateway',
}

const STATUS_MAP = {
  SUCCESS: { label: 'Successful', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  APPROVED: { label: 'Successful', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  PENDING: { label: 'Processing', className: 'border-amber-200 bg-amber-50 text-amber-800' },
  FAILED: { label: 'Failed', className: 'border-rose-200 bg-rose-50 text-rose-700' },
  EXPIRED: { label: 'Expired', className: 'border-slate-200 bg-slate-100 text-slate-600' },
  REJECTED: { label: 'Rejected', className: 'border-rose-200 bg-rose-50 text-rose-700' },
  CANCELLED: { label: 'Canceled', className: 'border-slate-200 bg-slate-100 text-slate-600' },
}

const PRESET_AMOUNTS = [1000000, 2000000, 5000000, 10000000, 20000000]

const formatVND = (value) => {
  if (value === undefined || value === null) return '0 ₫'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
}

const WalletTenant = () => {
  const dispatch = useDispatch()
  const { language, t } = useLanguage()
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
    toast.success(t('Wallet data refreshed.'))
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
    const amountError = positiveNumber(amountNumber, t('Enter a valid deposit amount.'))
    if (amountError) {
      toast.error(amountError)
      return
    }

    if (amountNumber < 1000) {
      toast.error(t('The minimum deposit amount is VND 1,000.'))
      return
    }

    try {
      setDepositLoading(true)

      const payload = {
        amount: amountNumber,
        paymentMethod: 'PAYOS',
      }

      const res = await walletApi.requestDeposit(payload)

      if (res?.data?.success && res?.data?.data?.paymentUrl) {
        window.location.href = res.data.data.paymentUrl
      } else {
        showApiErrorToast({ response: { data: res?.data } }, t('Could not create the payment link.'))
      }
    } catch (error) {
      showApiErrorToast(error, t('Deposit failed. Please try again later.'))
    } finally {
      setDepositLoading(false)
    }
  }

  const handleCopy = (text) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedCode(text)
    toast.success(t('Transaction code copied.'))
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
                    {t('My Wallet')}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 shadow-2xs">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    {t('WMS Secure')}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {user?.name ? `${user.name} — ` : ''}{t('Manage available balance, process deposits/withdrawals and monitor real-time cash flow.')}
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
                  <span>{t('Refresh')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:border-slate-400 hover:bg-slate-50 transition-colors"
                >
                  <MinusCircle className="h-3.5 w-3.5 text-rose-600" />
                  <span>{t('Withdraw')}</span>
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
                  <span>{t('Deposit')}</span>
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
                        {t('Available Balance')}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.2 text-[10px] font-semibold text-emerald-700">
                        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {t('Active')}
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
                      {t('Used to pay warehouse rent, deposits and service package extensions.')}
                    </p>
                  </div>
                </div>

                {/* 2. Total Recorded Transactions */}
                <div className="md:pl-5 flex flex-col justify-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {t('Transaction History')}
                  </span>
                  <div className="mt-1 text-xl font-bold text-slate-900 font-mono">
                    {loadingTransactions ? '—' : pagination.totalElements}
                    <span className="ml-1 text-xs font-normal text-slate-500">
                      {pagination.totalElements === 1 ? t('transaction') : t('transactions')}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {t('Includes deposits, escrow and payments')}
                  </p>
                </div>

                {/* 3. Withdrawal Requests Info */}
                <div className="md:pl-5 flex flex-col justify-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {t('Withdrawal Requests')}
                  </span>
                  <div className="mt-1 text-xl font-bold text-slate-900 font-mono">
                    {loadingWithdrawals ? '—' : withdrawPagination.totalElements}
                    <span className="ml-1 text-xs font-normal text-slate-500">
                      {withdrawPagination.totalElements === 1 ? t('request') : t('requests')}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {t('Direct transfer to your beneficiary bank account')}
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
                    <span>{t('Transaction history')}</span>
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
                    <span>{t('Withdrawal requests')}</span>
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
                  {activeTab === 'transactions' ? t('Wallet transaction ledger') : t('Withdrawal request log')}
                </div>
              </div>

              {/* TAB CONTENT: 1. TRANSACTIONS LEDGER */}
              {activeTab === 'transactions' && (
                <div>
                  <div className="overflow-x-auto">
                    {loadingTransactions ? (
                      <div className="p-8 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                        <p className="mt-2 text-xs font-medium text-slate-500">{t('Loading transaction history...')}</p>
                      </div>
                    ) : transactions.length > 0 ? (
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="px-4 py-2.5">{t('TRANSACTION CODE')}</th>
                            <th className="px-4 py-2.5">{t('TRANSACTION TYPE')}</th>
                            <th className="px-4 py-2.5">{t('PAYMENT METHOD')}</th>
                            <th className="px-4 py-2.5 text-right">{t('AMOUNT')}</th>
                            <th className="px-4 py-2.5 text-center">{t('STATUS')}</th>
                            <th className="px-4 py-2.5">{t('DATE / TIME')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {transactions.map((row) => {
                            const meta = TRANSACTION_TYPE_MAP[row.transactionType] || {
                              label: row.transactionType || 'Other',
                              direction: 'out',
                              icon: CreditCard,
                              badgeClass: 'border-slate-200 bg-slate-50 text-slate-700',
                            }
                            const isIncoming = meta.direction === 'in'
                            const isFailed =
                              row.status !== 'SUCCESS' && row.status !== 'APPROVED' && row.status !== 'PENDING'
                            const statusMeta = STATUS_MAP[row.status] || {
                              label: row.status || 'Unknown',
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
                                        title={t('Copy code')}
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
                                    <span className="font-semibold text-slate-800">{t(meta.label)}</span>
                                  </div>
                                </td>

                                {/* Phương thức */}
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1.5 text-slate-600">
                                    <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                                    <span>{t(PAYMENT_METHOD_MAP[row.paymentMethod] || row.paymentMethod || '—')}</span>
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
                                    {t(statusMeta.label)}
                                  </span>
                                </td>

                                {/* Thời gian */}
                                <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                                  <div className="font-medium text-slate-700">
                                    {moment(row.createdAt).format('DD/MM/YYYY · HH:mm')}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {formatRelativeTime(row.createdAt, language)}
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
                        <p className="text-xs font-bold text-slate-700">{t('No transactions yet')}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm">
                          {t('Top-ups, withdrawals, and escrow/package payments will be recorded here.')}
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
                          <span>{t('Deposit now')}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* PHÂN TRANG GIAO DỊCH */}
                  {pagination.totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/50 px-4 py-3">
                      <p className="text-xs text-slate-500">
                        {t('Showing')} <span className="font-semibold text-slate-700">{transactions.length}</span> /{' '}
                        <span className="font-semibold text-slate-700">{pagination.totalElements}</span> {t('transactions')}
                      </p>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={pagination.page === 0}
                          onClick={() => fetchTransactions(pagination.page - 1)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          <span>{t('Previous')}</span>
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
                          <span>{t('Next')}</span>
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
                        <p className="mt-2 text-xs font-medium text-slate-500">{t('Loading withdrawal history...')}</p>
                      </div>
                    ) : withdrawals.length > 0 ? (
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="px-4 py-2.5">{t('REQUEST CODE')}</th>
                            <th className="px-4 py-2.5">{t('BENEFICIARY BANK')}</th>
                            <th className="px-4 py-2.5 text-right">{t('WITHDRAWAL AMOUNT')}</th>
                            <th className="px-4 py-2.5 text-center">{t('STATUS')}</th>
                            <th className="px-4 py-2.5">{t('REQUEST TIME')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {withdrawals.map((row) => {
                            const statusMeta = STATUS_MAP[row.status] || {
                              label: row.status || 'Pending',
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
                                        {t('Account:')} {row.bankAccountNumber}
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
                                      {t(statusMeta.label)}
                                    </span>
                                    {row.adminNotes && (
                                      <p
                                        className="mt-1 max-w-xs truncate text-[10px] text-slate-500 italic"
                                        title={row.adminNotes}
                                      >
                                        {t('Note:')} {row.adminNotes}
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
                                    {formatRelativeTime(row.createdAt, language)}
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
                        <p className="text-xs font-bold text-slate-700">{t('No withdrawal requests yet')}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm">
                          {t('When you submit a withdrawal request to your bank account, processing status will be shown here.')}
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsWithdrawModalOpen(true)}
                          className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
                        >
                          <MinusCircle className="h-3.5 w-3.5 text-rose-600" />
                          <span>{t('Create withdrawal request')}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* PHÂN TRANG RÚT TIỀN */}
                  {withdrawPagination.totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/50 px-4 py-3">
                      <p className="text-xs text-slate-500">
                        {t('Showing')} <span className="font-semibold text-slate-700">{withdrawals.length}</span> /{' '}
                        <span className="font-semibold text-slate-700">{withdrawPagination.totalElements}</span> {t('requests')}
                      </p>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={withdrawPagination.page === 0}
                          onClick={() => fetchWithdrawals(withdrawPagination.page - 1)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          <span>{t('Previous')}</span>
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
                          <span>{t('Next')}</span>
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
                    {t('Deposit into StockSpace Wallet')}
                  </h3>
                  <p className="text-[11px] text-slate-500">{t('Secure PayOS payment gateway')}</p>
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
                  {t('Enter deposit amount (VND)')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    autoFocus
                    required
                    min={1000}
                    step={1000}
                    value={inputAmount}
                    onChange={(e) => setInputAmount(e.target.value)}
                    placeholder={t('e.g. 2000000')}
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
                    <span>{t('Actual deposit amount:')}</span>
                    <span className="font-mono font-bold text-emerald-900">
                      {formatVND(Number(inputAmount))}
                    </span>
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500 border border-slate-100 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                  <span>{t('Payment method:')}</span>
                </div>
                <p>{t('PayOS supports QR payments and Vietnamese banking methods. You will be redirected to the secure PayOS checkout page.')}</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={depositLoading || !inputAmount || Number(inputAmount) <= 0}
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 transition-colors disabled:bg-slate-300"
                >
                  {depositLoading ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      {t('Connecting to PayOS gateway...')}
                    </>
                  ) : (
                    <>{t('Proceed with PayOS payment')}</>
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
