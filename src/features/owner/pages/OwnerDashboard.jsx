import React, { useState, useEffect } from 'react'
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

// Import Sidebar và Header
import Sidebar from '../../../components/SideBar'
import Header from '../../../components/HeaderDashboard'

// Import API config của bạn
import walletApi from '../../../services/wallet/walletApi'
import warehouseApi from '../../../services/warehouse/warehouseApi'

// Mock Data giữ nguyên
const revenueData = [
  { name: 'Jan', value: 4500 },
  { name: 'Feb', value: 5200 },
  { name: 'Mar', value: 4800 },
  { name: 'Apr', value: 6100 },
  { name: 'May', value: 5900 },
]

const occupancyData = [
  { name: 'Occupied', value: 75, color: '#2563eb' },
  { name: 'Vacant', value: 25, color: '#e2e8f0' },
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

  // State điều khiển Modal nhập tiền
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [inputAmount, setInputAmount] = useState('')

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
      console.error('Lỗi lấy dữ liệu ví:', error)
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
      console.error('Lỗi lấy danh sách yêu cầu thuê:', error)
    } finally {
      setLoadingRequests(false)
    }
  }

  useEffect(() => {
    fetchWallet()
    fetchRequests()
  }, [])

  // --- XỬ LÝ GỬI YÊU CẦU NẠP TIỀN LÊN BE ---
  const handleDepositSubmit = async (e) => {
    e.preventDefault()

    const amountNumber = Number(inputAmount)
    if (isNaN(amountNumber) || amountNumber <= 0) {
      alert('Vui lòng nhập số tiền nạp hợp lệ và lớn hơn 0')
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
        alert(res?.data?.message || 'Không tìm thấy link thanh toán VNPay từ hệ thống!')
      }
    } catch (error) {
      console.error('Lỗi nạp tiền:', error)
      alert('Yêu cầu nạp tiền thất bại, vui lòng thử lại!')
    } finally {
      setDepositLoading(false)
    }
  }

  // Hàm định dạng tiền VND
  const formatVND = (value) => {
    if (value === undefined || value === null) return '0 ₫'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
  }

  // Khối Thẻ Thống kê hiển thị số dư thực tế
  const stats = [
    { title: 'My Warehouses', value: '12', icon: Warehouse, trend: 'stable', trendValue: 0 },
    {
      title: 'Wallet Balance',
      value: loadingWallet ? 'Đang tải...' : formatVND(wallet?.balance),
      icon: Wallet,
      trend: 'stable',
      trendValue: 0,
    },
    { title: 'Avg. Occupancy', value: '82%', icon: PieChart, trend: 'up', trendValue: 3 },
    { title: 'Pending Requests', value: '5', icon: FileCheck, trend: 'down', trendValue: 2 },
  ]

  const handleApprove = async (id) => {
    try {
      await warehouseApi.approveBooking(id)
      alert('Đã chấp nhận yêu cầu thuê kho thành công!')
      fetchRequests() // Refresh data
    } catch (error) {
      alert(error.response?.data?.message || 'Chấp nhận yêu cầu thất bại')
    }
  }

  const handleReject = async (id) => {
    const reason = prompt('Nhập lý do từ chối:')
    if (!reason) return
    
    try {
      await warehouseApi.rejectBooking(id, { reason })
      alert('Đã từ chối yêu cầu thuê kho!')
      fetchRequests() // Refresh data
    } catch (error) {
      alert(error.response?.data?.message || 'Từ chối yêu cầu thất bại')
    }
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
      render: (row) => <span className="font-semibold text-primary">{formatVND(row.depositAmount)}</span> 
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'APPROVED' ? 'success' : row.status === 'REJECTED' ? 'danger' : 'warning'}>{row.status}</Badge>
      ),
    },
    { 
      header: 'Date', 
      render: (row) => <span>{new Date(row.createdAt).toLocaleDateString('vi-VN')}</span>
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.status === 'PENDING' ? (
            <>
              <button 
                onClick={() => handleApprove(row.id)}
                className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 transition-colors hover:bg-emerald-100"
                title="Approve"
              >
                <Check className="h-4 w-4" />
              </button>
              <button 
                onClick={() => handleReject(row.id)}
                className="rounded-lg bg-rose-50 p-1.5 text-rose-600 transition-colors hover:bg-rose-100"
                title="Reject"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button className="rounded-lg bg-slate-100 p-1.5 text-slate-500 transition-colors hover:bg-slate-200">
              <Eye className="h-4 w-4" />
            </button>
          )}
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
                  <PlusCircle className="mr-2 h-4 w-4" /> Nạp tiền vào ví
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
                    <p className="text-2xl font-bold text-slate-900">75%</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Occupied</p>
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
                  {[
                    { warehouse: 'Saigon Hub A', date: 'May 15, 2026', type: 'Safety' },
                    { warehouse: 'Tan Binh Cold', date: 'May 18, 2026', type: 'Sanitary' },
                  ].map((insp, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-blue-600">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{insp.warehouse}</p>
                        <p className="text-xs text-slate-500">
                          {insp.type} Inspection • {insp.date}
                        </p>
                      </div>
                    </div>
                  ))}
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
                <Wallet className="h-5 w-5 text-blue-600" /> Nạp tiền qua VNPay
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
                  Nhập số tiền cần nạp (VND)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    autoFocus
                    required
                    value={inputAmount}
                    onChange={(e) => setInputAmount(e.target.value)}
                    placeholder="Ví dụ: 2000000"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  />
                  <span className="absolute top-1/2 right-4 -translate-y-1/2 text-xs font-bold text-slate-400">
                    ₫
                  </span>
                </div>
                {inputAmount && !isNaN(Number(inputAmount)) && (
                  <p className="mt-2 text-xs font-medium text-emerald-600">
                    Xem trước: {formatVND(Number(inputAmount))}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={depositLoading || !inputAmount}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-blue-700 disabled:bg-slate-300"
                >
                  {depositLoading ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Đang kết nối...
                    </>
                  ) : (
                    <>Thanh toán ngay</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default OwnerDashboard
