import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import moment from 'moment'

// Icons
import {
  Layers,
  Warehouse,
  Boxes,
  Users,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardCheck,
  Truck,
  FileText,
  CreditCard,
  Bell,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Barcode,
  Package,
  LayoutGrid,
  ExternalLink,
} from 'lucide-react'

// Recharts
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  LabelList,
} from 'recharts'

// Components
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'

// APIs
import tenantApi from '@/services/tenant/tenantApi'
import warehouseApi from '@/services/warehouse/warehouseApi'
import receiptApi from '@/services/wms/receiptApi'
import notificationApi from '@/services/notificationApi'

const RECEIPT_STATUS_META = {
  APPROVED: {
    label: 'Đã duyệt',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  COMPLETED: {
    label: 'Hoàn tất',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  PENDING: {
    label: 'Chờ xử lý',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  SUBMITTED: {
    label: 'Chờ duyệt',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  IN_PROGRESS: {
    label: 'Đang xử lý',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  IN_TRANSIT: {
    label: 'Đang vận chuyển',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  DRAFT: {
    label: 'Bản nháp',
    className: 'border-slate-200 bg-slate-100 text-slate-700',
  },
  REJECTED: {
    label: 'Từ chối',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
  },
  CANCELLED: {
    label: 'Đã hủy',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
  },
}

const getReceiptStatusMeta = (status) =>
  RECEIPT_STATUS_META[status] || {
    label: status || 'Chưa xác định',
    className: 'border-slate-200 bg-slate-100 text-slate-700',
  }

const viRelativeTime = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' })
const relativeTimeIntervals = [
  { limit: 60, divisor: 1, unit: 'second' },
  { limit: 3600, divisor: 60, unit: 'minute' },
  { limit: 86400, divisor: 3600, unit: 'hour' },
  { limit: 2592000, divisor: 86400, unit: 'day' },
  { limit: 31536000, divisor: 2592000, unit: 'month' },
  { limit: Number.POSITIVE_INFINITY, divisor: 31536000, unit: 'year' },
]

const formatRelativeTime = (value) => {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return ''

  const deltaSeconds = (timestamp - Date.now()) / 1000
  const interval = relativeTimeIntervals.find(({ limit }) => Math.abs(deltaSeconds) < limit)
  return viRelativeTime.format(Math.round(deltaSeconds / interval.divisor), interval.unit)
}

const TenantDashboard = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  const { user } = useSelector((state) => state.auth)

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [dashboardError, setDashboardError] = useState(false)
  const [activityError, setActivityError] = useState(false)
  const [notificationError, setNotificationError] = useState(false)

  // Primary Metrics from GET /api/tenant/dashboard
  const [metrics, setMetrics] = useState({
    activeWarehouseCount: 0,
    activeContractCount: 0,
    pendingContractCount: 0,
    productCount: 0,
    stockBatchCount: 0,
    totalStockQuantity: 0,
    pendingInboundReceiptCount: 0,
    pendingOutboundReceiptCount: 0,
    pendingAuditCount: 0,
    pendingTransferCount: 0,
    activeStaffCount: 0,
    unreadNotificationCount: 0,
    activeSubscription: null,
  })

  // Live Operations Feed
  const [recentActivity, setRecentActivity] = useState([])
  const [notifications, setNotifications] = useState([])

  const fetchDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    setDashboardError(false)
    setActivityError(false)
    setNotificationError(false)

    try {
      // 1. Dedicated Tenant Dashboard API
      const dashboardRes = await tenantApi.getDashboard()
      const payload = dashboardRes?.data?.data || dashboardRes?.data

      if (payload) {
        setMetrics({
          activeWarehouseCount: Number(payload.activeWarehouseCount) || 0,
          activeContractCount: Number(payload.activeContractCount) || 0,
          pendingContractCount: Number(payload.pendingContractCount) || 0,
          productCount: Number(payload.productCount) || 0,
          stockBatchCount: Number(payload.stockBatchCount) || 0,
          totalStockQuantity: Number(payload.totalStockQuantity) || 0,
          pendingInboundReceiptCount: Number(payload.pendingInboundReceiptCount) || 0,
          pendingOutboundReceiptCount: Number(payload.pendingOutboundReceiptCount) || 0,
          pendingAuditCount: Number(payload.pendingAuditCount) || 0,
          pendingTransferCount: Number(payload.pendingTransferCount) || 0,
          activeStaffCount: Number(payload.activeStaffCount) || 0,
          unreadNotificationCount: Number(payload.unreadNotificationCount) || 0,
          activeSubscription: payload.activeSubscription || null,
        })
        setLastUpdated(new Date())
      } else {
        setDashboardError(true)
      }

      // 2. Recent Receipts (Inbound/Outbound) across all tenant warehouses, sorted strictly newest first
      try {
        const whRes = await warehouseApi.getMyWarehouses()
        const warehouses = whRes.data?.data?.content || whRes.data?.data || []
        if (warehouses.length > 0) {
          const receiptPromises = warehouses.map((wh) => {
            const whId = wh.id || wh.warehouseId
            return receiptApi
              .getReceipts(whId, { page: 0, size: 100 })
              .then((res) => res.data?.data?.content || res.data?.content || [])
              .catch((err) => {
                console.warn(`Could not load receipts for warehouse ${whId}:`, err)
                setActivityError(true)
                return []
              })
          })

          const results = await Promise.all(receiptPromises)
          const allReceipts = results.flat()

          // Strict Sort DESCENDING by createdAt so that the newest operations appear first
          allReceipts.sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
            return timeB - timeA
          })

          setRecentActivity(
            allReceipts.slice(0, 6).map((r) => ({
              id: r.id,
              receiptNumber:
                r.receiptNumber ||
                `REC-${String(r.id || 'UNKNOWN')
                  .slice(0, 8)
                  .toUpperCase()}`,
              warehouseName: r.warehouseName || '',
              type: r.type,
              item: r.items?.[0]?.skuCode
                ? r.items.length > 1
                  ? `${r.items[0].skuCode} (+${r.items.length - 1})`
                  : r.items[0].skuCode
                : r.items?.length > 1
                  ? `${r.items.length} SKUs`
                  : '—',
              qty: r.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
              time: r.createdAt ? moment(r.createdAt).format('DD/MM/YYYY HH:mm') : '—',
              fromNow: r.createdAt ? formatRelativeTime(r.createdAt) : '',
              status: r.status,
            }))
          )
        } else {
          setRecentActivity([])
        }
      } catch (err) {
        console.warn('Could not load recent warehouse receipts:', err)
        setActivityError(true)
      }

      // 3. System Notifications
      try {
        const notifRes = await notificationApi.getMyNotifications({ page: 0, size: 5 })
        const notifs = notifRes.data?.content || notifRes.data || []
        setNotifications(notifs)
      } catch (err) {
        console.warn('Could not load notifications:', err)
        setNotificationError(true)
      }
    } catch (error) {
      console.error('Failed to load tenant dashboard data:', error)
      setDashboardError(true)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboardData()
  }, [fetchDashboardData])

  // Subscription Details Formatter
  const sub = metrics.activeSubscription
  const hasSub = Boolean(sub)
  const subStatus = sub?.status || 'INACTIVE'
  const subDaysRemaining =
    hasSub && sub.endDate ? Math.max(0, moment(sub.endDate).diff(moment(), 'days')) : 0
  const subDateRange =
    hasSub && sub.startDate && sub.endDate
      ? `${moment(sub.startDate).format('DD/MM/YYYY')} — ${moment(sub.endDate).format('DD/MM/YYYY')}`
      : 'Chưa kích hoạt'
  const subscriptionStatusMeta = {
    ACTIVE: {
      label: 'Đang hoạt động',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      dotClassName: 'bg-emerald-500',
    },
    EXPIRED: {
      label: 'Đã hết hạn',
      className: 'border-rose-200 bg-rose-50 text-rose-700',
      dotClassName: 'bg-rose-500',
    },
    CANCELLED: {
      label: 'Đã hủy',
      className: 'border-slate-200 bg-slate-100 text-slate-700',
      dotClassName: 'bg-slate-400',
    },
    INACTIVE: {
      label: 'Chưa kích hoạt',
      className: 'border-slate-200 bg-slate-100 text-slate-700',
      dotClassName: 'bg-slate-400',
    },
  }[subStatus] || {
    label: subStatus,
    className: 'border-slate-200 bg-slate-100 text-slate-700',
    dotClassName: 'bg-slate-400',
  }

  // Operational workload data
  const workloadData = [
    {
      name: 'Nhập kho',
      count: metrics.pendingInboundReceiptCount,
      color: '#2563eb',
      path: '/tenant/inbound',
    },
    {
      name: 'Xuất kho',
      count: metrics.pendingOutboundReceiptCount,
      color: '#3b82f6',
      path: '/tenant/outbound',
    },
    {
      name: 'Kiểm kê',
      count: metrics.pendingAuditCount,
      color: '#64748b',
      path: '/tenant/inventory-audits',
    },
    {
      name: 'Điều chuyển',
      count: metrics.pendingTransferCount,
      color: '#0f766e',
      path: '/tenant/transfers',
    },
  ]

  const totalPendingWorkload =
    metrics.pendingInboundReceiptCount +
    metrics.pendingOutboundReceiptCount +
    metrics.pendingAuditCount +
    metrics.pendingTransferCount

  const initialDashboardUnavailable = dashboardError && !lastUpdated

  const summaryMetrics = [
    {
      label: 'Tổng lượng hàng tồn',
      value: metrics.totalStockQuantity.toLocaleString('vi-VN'),
      unit: 'đơn vị',
      detail: `${metrics.stockBatchCount.toLocaleString('vi-VN')} lô hàng trong hệ thống`,
      icon: Layers,
      path: '/tenant/inventory',
      featured: true,
      dividerClass: 'border-r border-b border-slate-200 xl:border-b-0',
    },
    {
      label: 'Kho đang thuê',
      value: metrics.activeWarehouseCount.toLocaleString('vi-VN'),
      unit: 'cơ sở',
      detail: `${metrics.activeContractCount.toLocaleString('vi-VN')} hợp đồng đang hiệu lực`,
      icon: Warehouse,
      path: '/tenant/contracts',
      dividerClass: 'border-b border-slate-200 xl:border-r xl:border-b-0',
    },
    {
      label: 'Danh mục SKU',
      value: metrics.productCount.toLocaleString('vi-VN'),
      unit: 'mã hàng',
      detail: 'Danh mục sản phẩm đang quản lý',
      icon: Boxes,
      path: '/tenant/skus',
      dividerClass: 'border-r border-slate-200 xl:border-r',
    },
    {
      label: 'Nhân lực vận hành',
      value: metrics.activeStaffCount.toLocaleString('vi-VN'),
      unit: 'nhân sự',
      detail: 'Nhân sự đang hoạt động trên hệ thống',
      icon: Users,
      path: '/tenant/staff',
      dividerClass: '',
    },
  ]

  const queueItems = [
    {
      label: 'Phiếu nhập kho',
      description: 'Yêu cầu tiếp nhận hàng đang mở',
      count: metrics.pendingInboundReceiptCount,
      icon: ArrowDownToLine,
      path: '/tenant/inbound',
    },
    {
      label: 'Phiếu xuất kho',
      description: 'Yêu cầu soạn và xuất hàng đang mở',
      count: metrics.pendingOutboundReceiptCount,
      icon: ArrowUpFromLine,
      path: '/tenant/outbound',
    },
    {
      label: 'Đợt kiểm kê',
      description: 'Tác vụ kiểm kê chưa kết thúc',
      count: metrics.pendingAuditCount,
      icon: ClipboardCheck,
      path: '/tenant/inventory-audits',
    },
    {
      label: 'Điều chuyển kho',
      description: 'Lệnh điều chuyển chưa kết thúc',
      count: metrics.pendingTransferCount,
      icon: Truck,
      path: '/tenant/transfers',
    },
  ]

  const quickActions = [
    {
      label: 'Nhập kho',
      description: 'Tiếp nhận lô hàng',
      icon: ArrowDownToLine,
      path: '/tenant/inbound',
      primary: true,
    },
    {
      label: 'Xuất kho',
      description: 'Soạn và xuất hàng',
      icon: ArrowUpFromLine,
      path: '/tenant/outbound',
    },
    {
      label: 'Kiểm kê',
      description: 'Đối soát tồn thực tế',
      icon: ClipboardCheck,
      path: '/tenant/inventory-audits',
    },
    {
      label: 'Điều chuyển',
      description: 'Luân chuyển giữa kho',
      icon: Truck,
      path: '/tenant/transfers',
    },
    {
      label: 'Mặt bằng kho',
      description: 'Sơ đồ ô kệ 2D/3D',
      icon: LayoutGrid,
      path: '/tenant/layoutwarehouses',
    },
    {
      label: 'Danh mục SKU',
      description: 'Mã hàng và thông tin',
      icon: Barcode,
      path: '/tenant/skus',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      {/* 1. APP HEADER */}
      <Header />

      {/* MOBILE BACKDROP */}
      <div className="md:hidden">
        {isMobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/50 transition-opacity"
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
            <span className="sr-only" role="status" aria-live="polite">
              {isRefreshing
                ? 'Đang đồng bộ dữ liệu bảng điều khiển'
                : lastUpdated
                  ? `Đã cập nhật số liệu lúc ${moment(lastUpdated).format('HH:mm:ss')}`
                  : ''}
            </span>

            {/* PAGE TITLE & TOP COMMAND BAR */}
            <header className="flex flex-col justify-between gap-5 border-b border-slate-300 pb-5 xl:flex-row xl:items-end">
              <div className="max-w-3xl">
                <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
                  <span className="inline-flex items-center gap-1.5 tracking-[0.12em] uppercase">
                    <Warehouse className="h-3.5 w-3.5" aria-hidden="true" />
                    Phạm vi vận hành
                  </span>
                  <span className="h-3 w-px bg-slate-300" aria-hidden="true" />
                  <span className="font-medium text-slate-700">Toàn bộ kho đang thuê</span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isLoading
                          ? 'bg-slate-400'
                          : dashboardError
                            ? lastUpdated
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                            : metrics.activeWarehouseCount > 0
                              ? 'bg-emerald-500'
                              : 'bg-slate-400'
                      }`}
                      aria-hidden="true"
                    />
                    {isLoading
                      ? 'Đang tải phạm vi dữ liệu'
                      : dashboardError
                        ? lastUpdated
                          ? `${metrics.activeWarehouseCount.toLocaleString('vi-VN')} kho · dữ liệu chưa mới`
                          : 'Chưa thể đồng bộ'
                        : `${metrics.activeWarehouseCount.toLocaleString('vi-VN')} kho hoạt động`}
                  </span>
                </div>
                <h1
                  id="dashboard-title"
                  className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl"
                >
                  Tổng quan vận hành
                </h1>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">
                  {user?.name ? `${user.name} · ` : ''}Theo dõi tồn kho, chứng từ và công việc cần
                  xử lý trên toàn bộ cơ sở thuê.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {lastUpdated && (
                  <span className="mr-1 hidden items-center gap-1.5 text-xs text-slate-500 sm:inline-flex">
                    <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    Số liệu lúc {moment(lastUpdated).format('HH:mm:ss')}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => fetchDashboardData(true)}
                  disabled={isRefreshing || isLoading}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 text-slate-500 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`}
                    aria-hidden="true"
                  />
                  <span>{isRefreshing ? 'Đang làm mới' : 'Làm mới'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/tenant/inbound')}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md bg-blue-700 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />
                  <span>Nhập kho</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/tenant/outbound')}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <ArrowUpFromLine className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  <span>Xuất kho</span>
                </button>
              </div>
            </header>

            {dashboardError && (
              <div
                role="alert"
                className="flex flex-col gap-3 border-l-4 border-rose-500 bg-rose-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-rose-700"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-semibold text-rose-900">
                      Không thể đồng bộ số liệu tổng quan
                    </p>
                    <p className="mt-0.5 text-sm text-rose-700">
                      {lastUpdated
                        ? 'Dữ liệu đang hiển thị có thể chưa phải phiên bản mới nhất.'
                        : 'Vui lòng thử tải lại trước khi đưa ra quyết định vận hành.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fetchDashboardData(true)}
                  className="min-h-9 self-start rounded-md border border-rose-300 bg-white px-3 text-sm font-semibold text-rose-800 transition-colors hover:bg-rose-100 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:outline-none sm:self-center"
                >
                  Thử lại
                </button>
              </div>
            )}

            {/* ACTION REQUIRED: PENDING CONTRACTS ALERT */}
            {metrics.pendingContractCount > 0 && (
              <div
                role="alert"
                className="flex flex-col gap-3 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-amber-800"
                    aria-hidden="true"
                  />
                  <div>
                    <h2 className="text-sm font-semibold text-amber-950">
                      Cần xác nhận hợp đồng thuê kho
                    </h2>
                    <p className="mt-0.5 text-sm text-amber-800">
                      Có{' '}
                      <strong className="font-semibold text-amber-950">
                        {metrics.pendingContractCount} hợp đồng
                      </strong>{' '}
                      đang chờ bên thuê ký duyệt. Hoàn tất xác nhận để tiếp tục vận hành kho.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/tenant/contracts')}
                  className="inline-flex min-h-9 shrink-0 items-center gap-1 self-start rounded-md bg-amber-700 px-3 text-sm font-semibold text-white transition-colors hover:bg-amber-800 focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:outline-none sm:self-center"
                >
                  <span>Xem hợp đồng</span>
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}

            {/* PRIMARY OPERATIONAL SUMMARY */}
            <section
              aria-labelledby="summary-heading"
              aria-busy={isLoading || isRefreshing}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:px-5">
                <div>
                  <h2 id="summary-heading" className="text-sm font-semibold text-slate-950">
                    Nguồn lực đang quản lý
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Số liệu tổng hợp trên toàn bộ phạm vi thuê kho
                  </p>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  Nhấn vào chỉ số để xem chi tiết
                </span>
              </div>

              <div className="grid grid-cols-2 xl:grid-cols-4">
                {summaryMetrics.map((metric) => {
                  const Icon = metric.icon
                  return (
                    <button
                      key={metric.label}
                      type="button"
                      onClick={() => navigate(metric.path)}
                      className={`group relative min-h-32 p-4 text-left transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none focus-visible:ring-inset sm:min-h-36 sm:p-5 ${
                        metric.dividerClass
                      } ${metric.featured ? 'bg-slate-900 hover:bg-slate-800' : 'bg-white hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={`text-xs font-semibold tracking-[0.1em] uppercase ${
                            metric.featured ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          {metric.label}
                        </span>
                        <Icon
                          className={`h-4 w-4 ${metric.featured ? 'text-blue-300' : 'text-slate-400'}`}
                          aria-hidden="true"
                        />
                      </div>

                      <div className="mt-4 flex items-baseline gap-2">
                        {isLoading ? (
                          <span
                            className={`h-8 w-24 animate-pulse rounded ${
                              metric.featured ? 'bg-slate-700' : 'bg-slate-200'
                            }`}
                          />
                        ) : (
                          <span
                            className={`text-2xl font-bold tracking-tight tabular-nums sm:text-3xl ${
                              metric.featured ? 'text-white' : 'text-slate-950'
                            }`}
                          >
                            {initialDashboardUnavailable ? '—' : metric.value}
                          </span>
                        )}
                        <span
                          className={`text-xs font-medium ${metric.featured ? 'text-slate-400' : 'text-slate-500'}`}
                        >
                          {metric.unit}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span
                          className={`line-clamp-2 text-xs sm:text-sm ${metric.featured ? 'text-slate-300' : 'text-slate-600'}`}
                        >
                          {isLoading
                            ? 'Đang đồng bộ số liệu'
                            : initialDashboardUnavailable
                              ? 'Chưa có dữ liệu'
                              : metric.detail}
                        </span>
                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            {/* INTEGRATED OPERATIONAL WORK QUEUE */}
            <section
              aria-labelledby="workload-heading"
              aria-busy={isLoading || isRefreshing}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs"
            >
              <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <h2 id="workload-heading" className="text-base font-semibold text-slate-950">
                    Công việc cần xử lý
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Khối lượng tác vụ đang mở theo từng luồng nghiệp vụ WMS
                  </p>
                </div>
                <span
                  className={`inline-flex min-h-7 items-center self-start rounded px-2.5 text-xs font-semibold sm:self-center ${
                    !isLoading && !initialDashboardUnavailable && totalPendingWorkload > 0
                      ? 'border border-amber-200 bg-amber-50 text-amber-800'
                      : 'border border-slate-200 bg-slate-100 text-slate-700'
                  }`}
                >
                  {isLoading
                    ? 'Đang tải hàng đợi'
                    : initialDashboardUnavailable
                      ? 'Chưa có dữ liệu'
                      : `${totalPendingWorkload.toLocaleString('vi-VN')} tác vụ đang mở`}
                </span>
              </div>

              <div className="grid xl:grid-cols-[minmax(0,1fr)_390px]">
                <div className="min-w-0 p-4 sm:p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">
                        Phân bổ theo nghiệp vụ
                      </h3>
                      <p className="text-xs text-slate-500">So sánh số tác vụ chưa hoàn tất</p>
                    </div>
                    <span className="text-xs font-medium text-slate-500">Đơn vị: tác vụ</span>
                  </div>

                  <div className="h-64 w-full">
                    {isLoading ? (
                      <div
                        className="flex h-full animate-pulse flex-col justify-center gap-5 px-4"
                        aria-hidden="true"
                      >
                        {[72, 55, 40, 62].map((width, index) => (
                          <div key={index} className="grid grid-cols-[88px_1fr] items-center gap-3">
                            <span className="h-3 rounded bg-slate-200" />
                            <span
                              className="h-6 rounded-sm bg-slate-200"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                        ))}
                      </div>
                    ) : initialDashboardUnavailable ? (
                      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                        <AlertCircle className="h-6 w-6 text-slate-400" aria-hidden="true" />
                        <p className="mt-2 text-sm font-semibold text-slate-800">
                          Chưa thể hiển thị tải trọng nghiệp vụ
                        </p>
                        <p className="mt-1 text-xs text-slate-500">Làm mới dữ liệu để thử lại.</p>
                      </div>
                    ) : totalPendingWorkload === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                        <CheckCircle2 className="h-7 w-7 text-emerald-600" aria-hidden="true" />
                        <p className="mt-2 text-sm font-semibold text-slate-800">
                          Không có tác vụ đang chờ
                        </p>
                        <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
                          Hiện chưa ghi nhận phiếu nhập, xuất, kiểm kê hoặc điều chuyển cần xử lý.
                        </p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={workloadData}
                          layout="vertical"
                          margin={{ top: 4, right: 34, left: 4, bottom: 4 }}
                        >
                          <CartesianGrid
                            horizontal={false}
                            stroke="#e2e8f0"
                            strokeDasharray="3 3"
                          />
                          <XAxis
                            type="number"
                            allowDecimals={false}
                            axisLine={{ stroke: '#cbd5e1' }}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={84}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }}
                          />
                          <Tooltip
                            cursor={{ fill: '#f8fafc' }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const dataPoint = payload[0].payload
                                return (
                                  <div className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-md">
                                    <div className="text-xs font-medium text-slate-600">
                                      {dataPoint.name}
                                    </div>
                                    <div className="mt-0.5 text-sm font-bold text-slate-950 tabular-nums">
                                      {dataPoint.count.toLocaleString('vi-VN')} tác vụ đang mở
                                    </div>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Bar
                            dataKey="count"
                            radius={[0, 3, 3, 0]}
                            maxBarSize={24}
                            onClick={(entry) => entry?.path && navigate(entry.path)}
                            className="cursor-pointer"
                          >
                            <LabelList
                              dataKey="count"
                              position="right"
                              fill="#334155"
                              fontSize={12}
                              fontWeight={600}
                            />
                            {workloadData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-200 xl:border-t-0 xl:border-l">
                  <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-2.5">
                    <span className="text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase">
                      Hàng đợi chi tiết
                    </span>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {queueItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => navigate(item.path)}
                          className="group grid min-h-[71px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none focus-visible:ring-inset"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 transition-colors group-hover:bg-blue-50 group-hover:text-blue-700">
                              <Icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-slate-900">
                                {item.label}
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-slate-500">
                                {item.description}
                              </span>
                            </span>
                          </span>
                          <span className="text-right">
                            <span className="block text-xl font-bold text-slate-950 tabular-nums">
                              {isLoading || initialDashboardUnavailable
                                ? '—'
                                : item.count.toLocaleString('vi-VN')}
                            </span>
                            <span
                              className={`mt-0.5 block text-xs font-medium ${
                                !isLoading && !initialDashboardUnavailable && item.count > 0
                                  ? 'text-amber-700'
                                  : 'text-slate-500'
                              }`}
                            >
                              {isLoading
                                ? 'Đang tải'
                                : initialDashboardUnavailable
                                  ? 'Chưa có dữ liệu'
                                  : item.count > 0
                                    ? 'Cần xử lý'
                                    : 'Không có tác vụ chờ'}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* COMPACT OPERATIONAL TOOLS */}
            <section
              aria-labelledby="quick-actions-heading"
              className="overflow-hidden rounded-lg border border-slate-200 bg-slate-200 shadow-xs"
            >
              <div className="flex flex-col gap-3 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <h2 id="quick-actions-heading" className="text-sm font-semibold text-slate-950">
                    Công cụ vận hành
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">Mở nhanh nghiệp vụ thường dùng</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/tenant/inventory')}
                  className="inline-flex min-h-9 items-center gap-1.5 self-start rounded-md px-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none sm:self-center"
                >
                  Báo cáo tồn kho
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <nav
                aria-label="Công cụ vận hành nhanh"
                className="grid gap-px sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
              >
                {quickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => navigate(action.path)}
                      className="group flex min-h-20 items-center gap-3 bg-white px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none focus-visible:ring-inset"
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${action.primary ? 'text-blue-700' : 'text-slate-500'}`}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-900">
                          {action.label}
                        </span>
                        <span className="mt-0.5 block text-xs leading-4 text-slate-500">
                          {action.description}
                        </span>
                      </span>
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500"
                        aria-hidden="true"
                      />
                    </button>
                  )
                })}
              </nav>
            </section>

            {/* RECENT OPERATIONS LOG & NOTIFICATIONS FEED */}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              {/* Left 2/3: Tabular Operations Log */}
              <section
                aria-labelledby="recent-operations-heading"
                aria-busy={isLoading || isRefreshing}
                className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs xl:col-span-2"
              >
                <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div>
                    <h2
                      id="recent-operations-heading"
                      className="text-base font-semibold text-slate-950"
                    >
                      Chứng từ gần đây
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Nhật ký phiếu nhập và xuất mới nhất trên các kho đang thuê
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {activityError && (
                      <span
                        title="Không thể tải chứng từ từ một hoặc nhiều kho"
                        className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800"
                      >
                        Dữ liệu một phần
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate('/tenant/inbound')}
                      className="inline-flex min-h-9 items-center gap-1 rounded-md px-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                    >
                      Mở phiếu nhập
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {isLoading || recentActivity.length > 0 ? (
                    <table
                      className="w-full min-w-[780px] text-left text-sm"
                      aria-label="Chứng từ nhập và xuất gần đây"
                    >
                      <caption className="sr-only">
                        Danh sách chứng từ nhập và xuất kho gần nhất
                      </caption>
                      <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold tracking-[0.08em] text-slate-600 uppercase">
                        <tr>
                          <th scope="col" className="px-4 py-3 sm:px-5">
                            Chứng từ
                          </th>
                          <th scope="col" className="px-4 py-3">
                            Nghiệp vụ
                          </th>
                          <th scope="col" className="px-4 py-3">
                            Mặt hàng
                          </th>
                          <th scope="col" className="px-4 py-3 text-right">
                            Số lượng
                          </th>
                          <th scope="col" className="px-4 py-3">
                            Thời điểm
                          </th>
                          <th scope="col" className="px-4 py-3 text-center">
                            Trạng thái
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {isLoading
                          ? Array.from({ length: 5 }).map((_, index) => (
                              <tr key={index} aria-hidden="true">
                                <td colSpan={6} className="px-4 py-4 sm:px-5">
                                  <div
                                    className="h-4 animate-pulse rounded bg-slate-200"
                                    style={{ width: `${88 - index * 6}%` }}
                                  />
                                </td>
                              </tr>
                            ))
                          : recentActivity.map((row) => {
                              const isInbound = row.type === 'INBOUND'
                              const isOutbound = row.type === 'OUTBOUND'
                              const typeLabel = isInbound
                                ? 'Nhập kho'
                                : isOutbound
                                  ? 'Xuất kho'
                                  : row.type || 'Khác'
                              const statusMeta = getReceiptStatusMeta(row.status)

                              return (
                                <tr key={row.id} className="transition-colors hover:bg-slate-50">
                                  <td className="px-4 py-3.5 sm:px-5">
                                    <div className="font-mono text-xs font-semibold text-slate-950">
                                      {row.receiptNumber}
                                    </div>
                                    {row.warehouseName && (
                                      <div className="mt-1 max-w-52 truncate text-xs text-slate-500">
                                        {row.warehouseName}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <span
                                      className={`inline-flex items-center gap-1.5 font-semibold ${isInbound ? 'text-blue-700' : 'text-slate-700'}`}
                                    >
                                      {isInbound ? (
                                        <ArrowDownLeft className="h-4 w-4" aria-hidden="true" />
                                      ) : isOutbound ? (
                                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                                      ) : (
                                        <FileText className="h-4 w-4" aria-hidden="true" />
                                      )}
                                      {typeLabel}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 font-mono text-xs font-medium text-slate-700">
                                    {row.item}
                                  </td>
                                  <td className="px-4 py-3.5 text-right font-semibold text-slate-950 tabular-nums">
                                    {row.qty.toLocaleString('vi-VN')}
                                  </td>
                                  <td className="px-4 py-3.5 text-xs whitespace-nowrap text-slate-600">
                                    <div className="tabular-nums">{row.time}</div>
                                    {row.fromNow && (
                                      <div className="mt-1 text-slate-500">{row.fromNow}</div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3.5 text-center">
                                    <span
                                      title={row.status || undefined}
                                      className={`inline-flex items-center rounded border px-2 py-1 text-[11px] font-semibold ${statusMeta.className}`}
                                    >
                                      {statusMeta.label}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                      </tbody>
                    </table>
                  ) : activityError || initialDashboardUnavailable ? (
                    <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
                      <AlertCircle className="h-7 w-7 text-slate-400" aria-hidden="true" />
                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        Chưa thể tải nhật ký chứng từ
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Kiểm tra kết nối và thử đồng bộ lại dữ liệu.
                      </p>
                      <button
                        type="button"
                        onClick={() => fetchDashboardData(true)}
                        className="mt-3 min-h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                      >
                        Thử lại
                      </button>
                    </div>
                  ) : (
                    <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
                      <Package className="h-7 w-7 text-slate-400" aria-hidden="true" />
                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        Chưa ghi nhận chứng từ
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Bắt đầu một nghiệp vụ nhập kho để tạo chứng từ đầu tiên.
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate('/tenant/inbound')}
                        className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                      >
                        <ArrowDownToLine className="h-4 w-4 text-blue-700" aria-hidden="true" />
                        <span>Mở nhập kho</span>
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* Right 1/3: System Notifications */}
              <section
                aria-labelledby="notifications-heading"
                aria-busy={isLoading || isRefreshing}
                className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs"
              >
                <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
                  <div>
                    <h2
                      id="notifications-heading"
                      className="text-base font-semibold text-slate-950"
                    >
                      Thông báo vận hành
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-500">Cập nhật hệ thống và phê duyệt</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {notificationError && (
                      <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                        Chưa đầy đủ
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <Bell className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      {isLoading || initialDashboardUnavailable
                        ? '—'
                        : `${metrics.unreadNotificationCount.toLocaleString('vi-VN')} chưa đọc`}
                    </span>
                  </div>
                </div>

                <div className="flex-1">
                  {isLoading ? (
                    <ol className="divide-y divide-slate-200" aria-hidden="true">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <li key={index} className="flex animate-pulse gap-3 px-4 py-4 sm:px-5">
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-200" />
                          <span className="flex-1">
                            <span
                              className="block h-3.5 rounded bg-slate-200"
                              style={{ width: `${78 - index * 7}%` }}
                            />
                            <span className="mt-2 block h-3 w-32 rounded bg-slate-100" />
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : notifications.length > 0 ? (
                    <ol className="divide-y divide-slate-200">
                      {notifications.slice(0, 5).map((notification, index) => {
                        const isUnread = notification.isRead === false
                        return (
                          <li
                            key={notification.id || index}
                            className={`flex gap-3 px-4 py-3.5 sm:px-5 ${isUnread ? 'bg-blue-50/30' : 'bg-white'}`}
                          >
                            <span
                              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${isUnread ? 'bg-blue-600' : 'bg-slate-300'}`}
                              aria-hidden="true"
                            />
                            <div className="min-w-0 flex-1">
                              <span className="sr-only">
                                {isUnread ? 'Chưa đọc. ' : 'Đã đọc. '}
                              </span>
                              <p
                                className={`text-sm text-slate-900 ${isUnread ? 'font-semibold' : 'font-medium'}`}
                              >
                                {notification.title || notification.message}
                              </p>
                              {notification.title &&
                                notification.message &&
                                notification.message !== notification.title && (
                                  <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">
                                    {notification.message}
                                  </p>
                                )}
                              <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
                                {notification.createdAt
                                  ? `${moment(notification.createdAt).format('DD/MM · HH:mm')} · ${formatRelativeTime(notification.createdAt)}`
                                  : 'Không có thông tin thời gian'}
                              </p>
                            </div>
                          </li>
                        )
                      })}
                    </ol>
                  ) : notificationError || initialDashboardUnavailable ? (
                    <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
                      <AlertCircle className="h-7 w-7 text-slate-400" aria-hidden="true" />
                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        Chưa thể tải thông báo
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Thử đồng bộ lại để xem cập nhật mới nhất.
                      </p>
                    </div>
                  ) : (
                    <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
                      <CheckCircle2 className="h-7 w-7 text-slate-400" aria-hidden="true" />
                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        Không có thông báo mới
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Các cập nhật gần đây đã được theo dõi.
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 px-4 py-3 sm:px-5">
                  <button
                    type="button"
                    onClick={() => navigate('/profile')}
                    className="inline-flex min-h-9 w-full items-center justify-center gap-1 rounded-md text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                  >
                    Mở hồ sơ tài khoản
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </section>
            </div>

            {/* SECONDARY ACCOUNT & SERVICE CONTEXT */}
            <section
              aria-labelledby="service-context-heading"
              aria-busy={isLoading || isRefreshing}
              className="rounded-lg border border-slate-200 bg-white"
            >
              <div className="flex flex-col gap-4 px-4 py-3.5 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <CreditCard
                    className="mt-0.5 h-4 w-4 shrink-0 text-slate-500"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2
                        id="service-context-heading"
                        className="text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase"
                      >
                        Dịch vụ tài khoản
                      </h2>
                      {!isLoading && !initialDashboardUnavailable && (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-semibold ${subscriptionStatusMeta.className}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${subscriptionStatusMeta.dotClassName}`}
                            aria-hidden="true"
                          />
                          {subscriptionStatusMeta.label}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {isLoading
                        ? 'Đang tải thông tin gói dịch vụ'
                        : initialDashboardUnavailable
                          ? 'Chưa thể tải thông tin dịch vụ'
                          : hasSub
                            ? sub.packageName || 'Gói dịch vụ đang hoạt động'
                            : 'Chưa đăng ký gói dịch vụ'}
                    </p>
                    {!isLoading && !initialDashboardUnavailable && (
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                          Thời hạn: {subDateRange}
                        </span>
                        {hasSub && subStatus === 'ACTIVE' && (
                          <span
                            className={`inline-flex items-center gap-1.5 font-medium ${subDaysRemaining <= 30 ? 'text-amber-700' : 'text-slate-700'}`}
                          >
                            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                            Còn {subDaysRemaining.toLocaleString('vi-VN')} ngày
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={() => navigate('/tenant/subscription')}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                  >
                    Quản lý gói dịch vụ
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/tenant/contracts')}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                  >
                    <FileText className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    Hợp đồng kho
                  </button>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}

export default TenantDashboard
