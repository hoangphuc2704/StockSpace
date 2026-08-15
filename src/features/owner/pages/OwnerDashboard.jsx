import React, { useState, useEffect } from 'react'
import useEscapeKey from '@/hooks/useEscapeKey'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '../../../store/uiSlide'
import {
  Warehouse,
  FileCheck,
  PieChart,
  Check,
  X,
  Eye,
  ArrowUpRight,
  Clock,
  Wallet,
  PlusCircle,
  Loader2,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart as RePieChart,
  Pie,
} from 'recharts'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import StatCard from '@/components/molecules/StatCard'
import TableActionMenu from '@/components/TableActionMenu'
import Modal from '@/components/organisms/Modal'

// Import Sidebar và Header
import Sidebar from '../../../components/SideBar'
import Header from '../../../components/HeaderDashboard'

// Import API config của bạn
import walletApi from '../../../services/wallet/walletApi'
import warehouseApi from '../../../services/warehouse/warehouseApi'
import ownerStatsApi from '../../../services/owner/ownerStatsApi'
import { toast } from 'react-hot-toast'

// Mock Data giữ nguyên
const defaultRevenueData = [
  { name: 'Jan', value: 0 },
  { name: 'Feb', value: 0 },
  { name: 'Mar', value: 0 },
  { name: 'Apr', value: 0 },
  { name: 'May', value: 0 },
]

const defaultOccupancyData = [
  { name: 'Currently renting', value: 0, color: '#2563eb' },
  { name: 'Still empty', value: 0, color: '#e2e8f0' },
]

const OwnerDashboard = () => {
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)

  // --- STATE CHO VÍ & NẠP TIỀN ---
  const [wallet, setWallet] = useState(null)
  const [loadingWallet, setLoadingWallet] = useState(true)
  const [depositLoading, setDepositLoading] = useState(false)

  // --- STATE YÊU CẦU THUÊ KHO ---
  const [incomingRequests, setIncomingRequests] = useState([])
  const [loadingRequests, setLoadingRequests] = useState(true)

  // --- STATE KIỂM ĐỊNH KHO ---
  const [inspections, setInspections] = useState([])
  const [loadingInspections, setLoadingInspections] = useState(true)

  // --- STATE THỐNG KÊ ---
  const [revenueData, setRevenueData] = useState(defaultRevenueData)
  const [occupancyData, setOccupancyData] = useState(defaultOccupancyData)
  const [occupancyRate, setOccupancyRate] = useState(0)
  const [totalWarehouses, setTotalWarehouses] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)

  // State điều khiển Modal nhập tiền
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [inputAmount, setInputAmount] = useState('')

  // State điều khiển Modal từ chối yêu cầu thuê
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectTargetId, setRejectTargetId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectLoading, setRejectLoading] = useState(false)

  // State điều khiển Modal chi tiết yêu cầu thuê
  const [viewDetailModalOpen, setViewDetailModalOpen] = useState(false)
  const [selectedRequestForDetail, setSelectedRequestForDetail] = useState(null)

  useEscapeKey(isModalOpen, () => setIsModalOpen(false))
  useEscapeKey(rejectModalOpen, () => setRejectModalOpen(false))
  useEscapeKey(viewDetailModalOpen, () => setViewDetailModalOpen(false))

  // --- LẤY DỮ LIỆU VÍ TỪ API ---
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
      console.error('Error retrieving wallet data:', error)
    } finally {
      setLoadingWallet(false)
    }
  }

  const fetchRequests = async () => {
    try {
      setLoadingRequests(true)
      const res = await warehouseApi.getIncomingRequests({ page: 0, size: 10 })
      if (res?.data?.success) {
        setIncomingRequests(res.data.data.content || [])
      }
    } catch (error) {
      console.error('Error getting list of rental requests:', error)
    } finally {
      setLoadingRequests(false)
    }
  }

  const fetchInspections = async () => {
    try {
      setLoadingInspections(true)
      const res = await warehouseApi.getOwnerInspections({ page: 0, size: 5 })
      const data = res?.data?.data?.content || res?.data?.content || []
      setInspections(data)
    } catch (error) {
      console.error('Error getting list of inspections:', error)
    } finally {
      setLoadingInspections(false)
    }
  }

  const fetchStats = async () => {
    try {
      const [revenueRes, occupancyRes] = await Promise.all([
        ownerStatsApi.getRevenueSummary(),
        ownerStatsApi.getOccupancyRate(),
      ])

      // Map Revenue Data (xử lý tùy xem BE trả về bọc ApiResponse hay không)
      if (revenueRes?.data) {
        const revData = revenueRes.data.data || revenueRes.data
        if (revData) {
          setTotalRevenue(revData.totalRevenue || 0)
        }
        if (revData?.monthlyRevenue) {
          const formatted = revData.monthlyRevenue.map((item) => ({
            name: `T${item.month}`,
            value: item.revenue,
          }))
          setRevenueData(formatted)
        }
      }

      // Map Occupancy Data
      if (occupancyRes?.data) {
        const occData = occupancyRes.data.data || occupancyRes.data
        if (occData) {
          setOccupancyData([
            { name: 'Currently renting', value: occData.rentedWarehousesCount, color: '#2563eb' },
            { name: 'Still empty', value: occData.availableWarehousesCount, color: '#e2e8f0' },
          ])
          setOccupancyRate(occData.occupancyRatePercentage)
          setTotalWarehouses(occData.totalWarehouses)
        }
      }
    } catch (error) {
      console.error('Error retrieving Owner statistics data:', error)
    }
  }

  useEffect(() => {
    fetchWallet()
    fetchRequests()
    fetchInspections()
    fetchStats()
  }, [])

  // --- XỬ LÝ GỬI YÊU CẦU NẠP TIỀN LÊN BE ---
  const handleDepositSubmit = async (e) => {
    e.preventDefault()

    const amountNumber = Number(inputAmount)
    if (isNaN(amountNumber) || amountNumber <= 0) {
      toast.error('Please enter a valid deposit amount greater than 0')
      return
    }

    try {
      setDepositLoading(true)

      // Truyền payload đúng cấu trúc BE của bạn yêu cầu
      const payload = {
        amount: amountNumber,
        paymentMethod: 'BANK_TRANSFER',
      }

      const res = await walletApi.requestDeposit(payload)

      // Đọc chính xác res.data.data.paymentUrl từ BE response của bạn
      if (res?.data?.success && res?.data?.data?.paymentUrl) {
        window.location.href = res.data.data.paymentUrl // Chuyển hướng sang VNPay
      } else {
        toast.error(res?.data?.message || 'VNPay payment link not found in the system!')
      }
    } catch (error) {
      console.error('Deposit error:', error)
      toast.error('Deposit request failed, please try again!')
    } finally {
      setDepositLoading(false)
    }
  }

  // Hàm định dạng tiền VND
  const formatVND = (value) => {
    if (value === undefined || value === null) return '0 ₫'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
  }

  // Khối Thẻ Thống kê hiển thị số dư thực tế và dòng tiền tổng
  const stats = [
    {
      title: 'My Warehouses',
      value: totalWarehouses.toString(),
      icon: Warehouse,
      trend: 'stable',
      trendValue: 0,
    },
    {
      title: 'Total Revenue',
      value: formatVND(totalRevenue),
      icon: PieChart,
      trend: 'stable',
      trendValue: 0,
    },
    {
      title: 'Wallet Balance',
      value: loadingWallet ? 'Loading...' : formatVND(wallet?.balance),
      icon: Wallet,
      trend: 'stable',
      trendValue: 0,
    },
    {
      title: 'Pending Requests',
      value: incomingRequests.length.toString(),
      icon: FileCheck,
      trend: 'stable',
      trendValue: 0,
    },
  ]

  const handleApprove = async (id) => {
    try {
      await warehouseApi.approveBooking(id)
      toast.success('Warehouse rental request successfully accepted!')
      fetchRequests() // Refresh data
    } catch (error) {
      toast.error(error.response?.data?.message || 'Accept failed request')
    }
  }

  const handleReject = (id) => {
    setRejectTargetId(id)
    setRejectReason('')
    setRejectModalOpen(true)
  }

  const submitReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please enter a reason for rejection!')
      return
    }

    try {
      setRejectLoading(true)
      await warehouseApi.rejectBooking(rejectTargetId, { reason: rejectReason })
      toast.success('Rejected warehouse rental request!')
      fetchRequests() // Refresh data
      setRejectModalOpen(false)
      setRejectTargetId(null)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Reject failed request')
    } finally {
      setRejectLoading(false)
    }
  }

  const handleViewDetail = (row) => {
    setSelectedRequestForDetail(row)
    setViewDetailModalOpen(true)
  }

  const columns = [
    {
      header: 'Tenant',
      render: (row) => (
        <div>
          <p className="font-bold text-slate-900">{row.tenantName}</p>
          <p className="text-[10px] text-slate-400">{row.id.substring(0, 8)}...</p>
        </div>
      ),
    },
    { header: 'Warehouse', accessor: 'warehouseName' },
    {
      header: 'Deposit',
      render: (row) => (
        <span className="text-primary font-semibold">{formatVND(row.depositAmount)}</span>
      ),
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge
          variant={
            row.status === 'APPROVED' ? 'success' : row.status === 'REJECTED' ? 'danger' : 'warning'
          }
        >
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Date',
      render: (row) => <span>{new Date(row.createdAt).toLocaleDateString('en-US')}</span>,
    },
    {
      header: 'Actions',
      render: (row) => (
        <TableActionMenu
          items={
            row.status === 'PENDING'
              ? [
                  { label: 'Approve', icon: Check, onClick: () => handleApprove(row.id) },
                  { label: 'Reject', icon: X, onClick: () => handleReject(row.id), danger: true },
                ]
              : [{ label: 'View', icon: Eye, onClick: () => handleViewDetail(row) }]
          }
        />
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
        <Sidebar currentRole="OWNER" />

        {/* CONTAINER CHÍNH */}
        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
          }`}
        >
          <main className="mx-auto w-full max-w-4000 space-y-6 p-6 md:p-8">
            {/* Tiêu đề & Cụm nút bấm phía trên góc phải */}
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Owner Dashboard</h1>
                <p className="text-sm text-slate-500">
                  Overview of your warehouse portfolio and rental activities.
                </p>
              </div>

              {/* CỤM NÚT HÀNH ĐỘNG GÓC PHẢI */}
              <div className="flex items-center gap-3">
                {/* NÚT MỞ MODAL NẠP TIỀN */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setInputAmount('')
                    setIsModalOpen(true)
                  }}
                  className="hover:bg-blue-5 border-blue-200 text-blue-600 hover:text-blue-700"
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Top up your wallet
                </Button>

                <Button size="sm">
                  <Warehouse className="mr-2 h-4 w-4" /> List New Warehouse
                </Button>
              </div>
            </div>

            {/* Thẻ thống kê */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, idx) => (
                <StatCard key={idx} {...stat} />
              ))}
            </div>

            {/* Biểu đồ (Giữ nguyên) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Revenue Performance</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">This Year</span>
                    <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
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
                      />
                      <Tooltip cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-8 font-bold text-slate-900">Portfolio Occupancy</h3>
                <div className="relative h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={occupancyData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {occupancyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-2xl font-bold text-slate-900">{occupancyRate}%</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Fill rate</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {occupancyData.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs font-medium text-slate-600">{item.name}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-900">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bảng dữ liệu & Kiểm định (Giữ nguyên) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Recent Rental Requests</h3>
                  <Button variant="ghost" size="sm">
                    Manage All
                  </Button>
                </div>
                <DataTable columns={columns} data={incomingRequests} isLoading={loadingRequests} />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-6 font-bold text-slate-900">Pending Inspections</h3>
                <div className="space-y-4">
                  {loadingInspections ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                  ) : inspections.length === 0 ? (
                    <p className="text-sm text-slate-500">No pending inspections.</p>
                  ) : (
                    inspections.map((insp, i) => (
                      <div
                        key={insp.id || i}
                        className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-blue-600">
                          <Clock className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {insp.warehouseName || 'Unknown Warehouse'}
                          </p>
                          <p className="text-xs text-slate-500">
                            Status: <Badge variant="warning">{insp.status || 'PENDING'}</Badge> •{' '}
                            {insp.createdAt ? new Date(insp.createdAt).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <Button variant="outline" className="mt-4 w-full">
                    View All Schedule
                  </Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* --- POPUP MODAL NHẬP SỐ TIỀN NẠP --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="animate-in fade-in zoom-in-95 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl duration-150">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Wallet className="h-5 w-5 text-blue-600" /> Top Up via VNPay
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-500 uppercase">
                  Enter the amount to deposit (VND)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    autoFocus
                    required
                    value={inputAmount}
                    onChange={(e) => setInputAmount(e.target.value)}
                    placeholder="For example: 2000000"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  />
                  <span className="absolute top-1/2 right-4 -translate-y-1/2 text-xs font-bold text-slate-400">
                    ₫
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
                  onClick={() => setIsModalOpen(false)}
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

      {/* --- POPUP MODAL TỪ CHỐI THUÊ KHO --- */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Từ chối yêu cầu thuê kho"
      >
        <div className="p-4 sm:p-6">
          <p className="mb-4 text-sm text-slate-600">
            Bạn đang từ chối yêu cầu thuê kho này. Vui lòng cung cấp lý do để khách thuê có thể biết và khắc phục.
          </p>
          <textarea
            className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={4}
            placeholder="Nhập lý do từ chối (bắt buộc)..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setRejectModalOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={submitReject}
              disabled={!rejectReason.trim() || rejectLoading}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {rejectLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                'Xác nhận từ chối'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* --- POPUP MODAL CHI TIẾT YÊU CẦU THUÊ --- */}
      <Modal
        isOpen={viewDetailModalOpen}
        onClose={() => setViewDetailModalOpen(false)}
        title="Chi tiết yêu cầu thuê kho"
      >
        <div className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase mb-1">Khách thuê</p>
              <p className="text-sm font-semibold text-slate-900">{selectedRequestForDetail?.tenantName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase mb-1">Kho hàng</p>
              <p className="text-sm font-semibold text-slate-900">{selectedRequestForDetail?.warehouseName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase mb-1">Tiền cọc</p>
              <p className="text-sm font-semibold text-emerald-600">{formatVND(selectedRequestForDetail?.depositAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase mb-1">Trạng thái</p>
              <Badge
                variant={
                  selectedRequestForDetail?.status === 'APPROVED' ? 'success' : selectedRequestForDetail?.status === 'REJECTED' ? 'danger' : 'warning'
                }
              >
                {selectedRequestForDetail?.status}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase mb-1">Ngày tạo</p>
              <p className="text-sm font-semibold text-slate-900">{selectedRequestForDetail?.createdAt ? new Date(selectedRequestForDetail.createdAt).toLocaleDateString('vi-VN') : ''}</p>
            </div>
          </div>
          
          {selectedRequestForDetail?.status === 'REJECTED' && (selectedRequestForDetail.reason || selectedRequestForDetail.rejectionReason || selectedRequestForDetail.rejectReason) && (
            <div className="mt-4 p-4 rounded-xl border border-red-200 bg-red-50">
              <p className="text-xs text-red-600 font-bold uppercase mb-1 flex items-center gap-1">
                <X className="h-3.5 w-3.5" />
                Lý do từ chối
              </p>
              <p className="text-sm text-red-800 font-medium whitespace-pre-wrap">
                {selectedRequestForDetail.reason || selectedRequestForDetail.rejectionReason || selectedRequestForDetail.rejectReason}
              </p>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setViewDetailModalOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default OwnerDashboard
