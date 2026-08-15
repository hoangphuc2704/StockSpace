import React, { useState, useEffect } from 'react'
import useEscapeKey from '@/hooks/useEscapeKey'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '../../../store/uiSlide'
import {
  Wallet,
  PlusCircle,
  RefreshCw,
  CreditCard,
  X,
  Loader2,
  CircleDollarSign,
  MinusCircle,
  TrendingUp,
} from 'lucide-react'
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
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import WithdrawModal from '../../../components/organisms/WithdrawModal'

// Import Layout chung
import Sidebar from '../../../components/SideBar'
import Header from '../../../components/HeaderDashboard'

// Import API config
import walletApi from '../../../services/wallet/walletApi'
import adminApi from '../../../services/admin/adminApi'
import { toast } from 'react-hot-toast'

const WalletAdmin = () => {
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)

  // --- STATE QUáº¢N LÃ Dá»® LIá»†U ---
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
  })

  const [withdrawals, setWithdrawals] = useState([])
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true)
  const [withdrawPagination, setWithdrawPagination] = useState({
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 1,
  })

  // State Ä‘iá»u khiá»ƒn Modal
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false)
  const [inputAmount, setInputAmount] = useState('')
  const [depositLoading, setDepositLoading] = useState(false)

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)

  useEscapeKey(isDepositModalOpen, () => setIsDepositModalOpen(false))

  // --- REVENUE STATE ---
  const [revenueData, setRevenueData] = useState([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [loadingRevenue, setLoadingRevenue] = useState(false)

  // --- HÃ€M Láº¤Y Dá»® LIá»†U ---
  const fetchWallet = async () => {
    try {
      setLoadingWallet(true)
      const res = await walletApi.getWallet()
      if (res?.data?.success) {
        setWallet(res.data.data)
      } else {
        setWallet(res?.data || res)
      }
    } catch (error) {
      console.error('Failed to load wallet data:', error)
    } finally {
      setLoadingWallet(false)
    }
  }

  const fetchTransactions = async (page = 0) => {
    try {
      setLoadingTransactions(true)
      const res = await walletApi.getWalletTransactions({ page, size: 10 })

      if (res?.data?.success) {
        setTransactions(res.data.data.content || [])
        setPagination({
          page: res.data.data.page,
          size: res.data.data.size,
          totalElements: res.data.data.totalElements,
          totalPages: res.data.data.totalPages,
        })
      }
    } catch (error) {
      console.error('Failed to load transaction history:', error)
    } finally {
      setLoadingTransactions(false)
    }
  }

  const fetchWithdrawals = async (page = 0) => {
    try {
      setLoadingWithdrawals(true)
      const res = await walletApi.getWithdrawHistory({ page, size: 10 })

      if (res?.data?.success) {
        setWithdrawals(res.data.data.content || [])
        setWithdrawPagination({
          page: res.data.data.page,
          size: res.data.data.size,
          totalElements: res.data.data.totalElements,
          totalPages: res.data.data.totalPages,
        })
      }
    } catch (error) {
      console.error('Failed to load withdrawal history:', error)
    } finally {
      setLoadingWithdrawals(false)
    }
  }

  const fetchRevenue = async () => {
    try {
      setLoadingRevenue(true)
      const res = await adminApi.getRevenueStats(currentYear)
      if (res?.data) {
        setTotalRevenue(res.data.totalRevenue || 0)
        const formattedRevenue = (res.data.monthlyRevenue || []).map((item) => ({
          name: `T${item.month}`,
          revenue: item.revenue,
        }))
        setRevenueData(formattedRevenue)
      }
    } catch (error) {
      console.error('Failed to load revenue data:', error)
    } finally {
      setLoadingRevenue(false)
    }
  }

  const handleRefresh = () => {
    fetchWallet()
    if (activeTab === 'transactions') {
      fetchTransactions(0)
    } else {
      fetchWithdrawals(0)
    }
    fetchRevenue()
  }

  useEffect(() => {
    fetchWallet()
    fetchTransactions(0)
    fetchWithdrawals(0)
  }, [])

  useEffect(() => {
    fetchRevenue()
  }, [currentYear])

  // --- Xá»¬ LÃ Náº P TIá»€N ---
  const handleDepositSubmit = async (e) => {
    e.preventDefault()

    const amountNumber = Number(inputAmount)
    if (isNaN(amountNumber) || amountNumber <= 0) {
      toast.error('Please enter a valid deposit amount greater than 0.')
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
        toast.error(res?.data?.message || 'The VNPay payment link was not returned.')
      }
    } catch (error) {
      console.error('Failed to create deposit request:', error)
      toast.error('The deposit request failed. Please try again.')
    } finally {
      setDepositLoading(false)
    }
  }

  // --- HELPER Äá»ŠNH Dáº NG ---
  const formatVND = (value) => {
    if (value === undefined || value === null) return '₫0'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
  }

  const getTransactionTypeBadge = (type) => {
    switch (type) {
      case 'TOP_UP':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset">
            Top up
          </span>
        )
      case 'DEPOSIT_PAYMENT':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset">
            Deposit payment
          </span>
        )
      case 'PACKAGE_PAYMENT':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-purple-700/10 ring-inset">
            Service package payment
          </span>
        )
      case 'DEPOSIT_REFUND':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-700/10 ring-inset">
            Deposit refund
          </span>
        )
      case 'WITHDRAW':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-700/10 ring-inset">
            Withdrawal
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-700/10 ring-inset">
            {type}
          </span>
        )
    }
  }

  const getStatusBadge = (status) => {
    if (status === 'SUCCESS' || status === 'APPROVED')
      return <Badge variant="success">Successful</Badge>
    if (status === 'PENDING') return <Badge variant="warning">Processing</Badge>
    return <Badge variant="danger">Failed</Badge>
  }

  // --- Cá»˜T Báº¢NG GIAO Dá»ŠCH ---
  const transactionColumns = [
    {
      header: 'Transaction code',
      render: (row) => (
        <div>
          <p className="text-xs font-semibold text-slate-400">
            ID: <span className="font-sans text-slate-600">{row.id.substring(0, 8)}...</span>
          </p>
          {row.paymentCode && (
            <p className="mt-0.5 inline-block rounded bg-blue-50 px-1.5 py-0.5 text-xs font-bold text-blue-600">
              Code: {row.paymentCode}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Type & Method',
      render: (row) => (
        <div className="space-y-1">
          <div>{getTransactionTypeBadge(row.transactionType)}</div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <CreditCard className="h-3 w-3" /> {row.paymentMethod}
          </div>
        </div>
      ),
    },
    {
      header: 'Amount',
      render: (row) => {
        const isPlus = row.transactionType === 'TOP_UP' || row.transactionType === 'DEPOSIT_REFUND'
        const isFailed =
          row.status !== 'SUCCESS' && row.status !== 'APPROVED' && row.status !== 'PENDING'
        return (
          <span
            className={`font-bold ${isFailed ? 'text-rose-600' : isPlus ? 'text-emerald-600' : 'text-rose-600'}`}
          >
            {isPlus ? '+' : '-'} {formatVND(row.amount)}
          </span>
        )
      },
    },
    {
      header: 'Status',
      render: (row) => getStatusBadge(row.status),
    },
    {
      header: 'Time',
      render: (row) => (
        <div className="space-y-0.5 text-xs text-slate-600">
          <p className="font-medium">{new Date(row.createdAt).toLocaleDateString('en-US')}</p>
          <p className="text-[11px] text-slate-400">
            {new Date(row.createdAt).toLocaleTimeString('en-US')}
          </p>
        </div>
      ),
    },
  ]

  // --- Cá»˜T Báº¢NG YÃŠU Cáº¦U RÃšT TIá»€N ---
  const withdrawalColumns = [
    {
      header: 'Request ID',
      render: (row) => (
        <p className="text-xs font-semibold text-slate-400">
          <span className="font-sans text-slate-600">{row.id.substring(0, 8)}...</span>
        </p>
      ),
    },
    {
      header: 'Receiving Bank',
      render: (row) => (
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-slate-700">{row.bankName}</p>
          <p className="text-xs text-slate-500">{row.bankAccountNumber}</p>
          <p className="text-[11px] text-slate-400 uppercase">{row.bankAccountHolder}</p>
        </div>
      ),
    },
    {
      header: 'Withdrawal Amount',
      render: (row) => <span className="font-bold text-rose-600">- {formatVND(row.amount)}</span>,
    },
    {
      header: 'Status',
      render: (row) => (
        <div className="space-y-1">
          {getStatusBadge(row.status)}
          {row.adminNotes && (
            <p
              className="max-w-[150px] truncate text-[11px] text-slate-500 italic"
              title={row.adminNotes}
            >
              Note: {row.adminNotes}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'What a time',
      render: (row) => (
        <div className="space-y-0.5 text-xs text-slate-600">
          <p className="font-medium">{new Date(row.createdAt).toLocaleDateString('en-US')}</p>
          <p className="text-[11px] text-slate-400">
            {new Date(row.createdAt).toLocaleTimeString('en-US')}
          </p>
        </div>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header />

      {/* MOBILE OVERLAY */}
      <div className="md:hidden">
        {isMobileOpen && (
          <button
            className="fixed inset-0 z-40 bg-slate-900/30"
            onClick={() => dispatch(closeMobileSidebar())}
          />
        )}
      </div>

      <div className="flex pt-14">
        <Sidebar currentRole="ADMIN" />

        {/* CONTAINER CHÃNH */}
        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
          }`}
        >
          <main className="mx-auto w-full max-w-4000 space-y-6 p-6 md:p-8">
            {/* Header Title */}
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                  <Wallet className="h-7 w-7 text-blue-600" /> System Wallet
                </h1>
                <p className="text-sm text-slate-500">
                  Manage the system balance, deposits, withdrawals, and payment history.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsWithdrawModalOpen(true)}
                  className="bg-rose-600 text-white hover:bg-rose-700"
                >
                  <MinusCircle className="mr-2 h-4 w-4" /> Withdraw
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setInputAmount('')
                    setIsDepositModalOpen(true)
                  }}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Top Up
                </Button>
              </div>
            </div>

            {/* Wallet Info Card */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <CircleDollarSign className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">System wallet balance</p>
                    <h2 className="text-3xl font-bold text-slate-900">
                      {loadingWallet ? 'Loading...' : formatVND(wallet?.balance)}
                    </h2>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">
                        Total annual revenue {currentYear}
                      </p>
                      <select
                        className="rounded-md border-slate-200 py-1 pr-6 pl-2 text-xs text-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        value={currentYear}
                        onChange={(e) => setCurrentYear(Number(e.target.value))}
                      >
                        <option value={new Date().getFullYear()}>This year</option>
                        <option value={new Date().getFullYear() - 1}>Last year</option>
                      </select>
                    </div>
                    <h2 className="mt-1 text-3xl font-bold text-slate-900">
                      {loadingRevenue ? 'Loading...' : formatVND(totalRevenue)}
                    </h2>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Actual Revenue chart</h3>
                <Badge variant="success">By month</Badge>
              </div>
              <div className="h-80">
                {loadingRevenue ? (
                  <div className="flex h-full items-center justify-center text-slate-500">
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading chart...
                  </div>
                ) : revenueData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
                        tickFormatter={(value) =>
                          new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value)
                        }
                      />
                      <Tooltip formatter={(value) => formatVND(value)} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#10b981"
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-500">
                    No annual revenue data is available {currentYear}.
                  </div>
                )}
              </div>
            </div>

            {/* TABS & BẢNG */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex border-b border-slate-200">
                <button
                  className={`flex-1 px-6 py-4 text-sm font-bold transition-colors ${
                    activeTab === 'transactions'
                      ? 'border-b-2 border-blue-600 bg-blue-50/50 text-blue-600'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                  onClick={() => setActiveTab('transactions')}
                >
                  Transaction History
                </button>
                <button
                  className={`flex-1 px-6 py-4 text-sm font-bold transition-colors ${
                    activeTab === 'withdrawals'
                      ? 'border-b-2 border-blue-600 bg-blue-50/50 text-blue-600'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                  onClick={() => setActiveTab('withdrawals')}
                >
                  Withdrawal Requests
                </button>
              </div>

              <div className="p-6">
                {activeTab === 'transactions' ? (
                  <>
                    <DataTable
                      columns={transactionColumns}
                      data={transactions}
                      isLoading={loadingTransactions}
                    />

                    {/* PhÃ¢n trang giao dá»‹ch */}
                    {pagination.totalPages > 1 && (
                      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                        <p className="text-xs text-slate-500">
                          Showing{' '}
                          <span className="font-semibold text-slate-700">
                            {transactions.length}
                          </span>{' '}
                          of{' '}
                          <span className="font-semibold text-slate-700">
                            {pagination.totalElements}
                          </span>
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            disabled={pagination.page === 0}
                            onClick={() => fetchTransactions(pagination.page - 1)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                          >
                            Previous
                          </button>
                          {[...Array(pagination.totalPages).keys()].map((p) => (
                            <button
                              key={p}
                              onClick={() => fetchTransactions(p)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                                pagination.page === p
                                  ? 'bg-blue-600 text-white shadow-sm'
                                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {p + 1}
                            </button>
                          ))}
                          <button
                            disabled={pagination.page === pagination.totalPages - 1}
                            onClick={() => fetchTransactions(pagination.page + 1)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <DataTable
                      columns={withdrawalColumns}
                      data={withdrawals}
                      isLoading={loadingWithdrawals}
                    />

                    {/* PhÃ¢n trang rÃºt tiá»n */}
                    {withdrawPagination.totalPages > 1 && (
                      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                        <p className="text-xs text-slate-500">
                          Showing{' '}
                          <span className="font-semibold text-slate-700">{withdrawals.length}</span>{' '}
                          of{' '}
                          <span className="font-semibold text-slate-700">
                            {withdrawPagination.totalElements}
                          </span>
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            disabled={withdrawPagination.page === 0}
                            onClick={() => fetchWithdrawals(withdrawPagination.page - 1)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                          >
                            Previous
                          </button>
                          {[...Array(withdrawPagination.totalPages).keys()].map((p) => (
                            <button
                              key={p}
                              onClick={() => fetchWithdrawals(p)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                                withdrawPagination.page === p
                                  ? 'bg-blue-600 text-white shadow-sm'
                                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {p + 1}
                            </button>
                          ))}
                          <button
                            disabled={withdrawPagination.page === withdrawPagination.totalPages - 1}
                            onClick={() => fetchWithdrawals(withdrawPagination.page + 1)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Modal náº¡p tiá»n */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="animate-in fade-in zoom-in-95 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl duration-150">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Wallet className="h-5 w-5 text-blue-600" /> Deposit via VNPay
              </h3>
              <button
                onClick={() => setIsDepositModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-500 uppercase">
                  Deposit amount (VND)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    autoFocus
                    required
                    value={inputAmount}
                    onChange={(e) => setInputAmount(e.target.value)}
                    placeholder="Example: 2000000"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  />
                  <span className="absolute top-1/2 right-4 -translate-y-1/2 text-xs font-bold text-slate-400">
                    VND
                  </span>
                </div>
                {inputAmount && !isNaN(Number(inputAmount)) && (
                  <p className="mt-2 text-xs font-medium text-emerald-600">
                    Preview: {formatVND(Number(inputAmount))}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={depositLoading || !inputAmount}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-blue-700 disabled:bg-slate-300"
                >
                  {depositLoading ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>Pay now</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal rÃºt tiá»n */}
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

export default WalletAdmin
