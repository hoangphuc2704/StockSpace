import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  Warehouse,
  MapPin,
  Layers,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Menu,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Eye,
} from 'lucide-react'
import Button from '@/components/atoms/Button'
import Modal from '@/components/organisms/Modal'
import TableActionMenu from '@/components/TableActionMenu'

// Import Sidebar và Logo từ hệ thống của bạn
import Sidebar from '../../../components/SideBar'
import logoDaidien from '../../../assets/logoDaidien.png'
import warehouseApi from '../../../services/warehouse/warehouseApi'
import { toggleSidebar, closeMobileSidebar } from '../../../store/uiSlide'
import { toast } from 'react-hot-toast'
import { showApiErrorToast } from '@/config/apiError'

const WarehouseManagement = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)

  // State quản lý dữ liệu kho hàng & bộ lọc tìm kiếm nhanh tại Client
  const [warehouses, setWarehouses] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // State quản lý phân trang đồng bộ từ API thực tế
  const [currentPage, setCurrentPage] = useState(0) // API trả về "page": 0 ở trang đầu tiên
  const pageSize = 5 // API trả về "size": 5
  const [totalPages, setTotalPages] = useState(0) // API trả về "totalPages": 1
  const [totalElements, setTotalElements] = useState(0) // API trả về "totalElements": 2

  // Các trạng thái phục vụ tính năng yêu cầu kiểm duyệt & tải lại dữ liệu
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [requestingIds, setRequestingIds] = useState([])
  const [inspectionsByWarehouse, setInspectionsByWarehouse] = useState({})
  const [inspectionConfirm, setInspectionConfirm] = useState(null)

  // State quản lý xem chi tiết kho bằng Modal
  const [selectedWarehouse, setSelectedWarehouse] = useState(null)

  // Xử lý gửi yêu cầu kiểm định kho qua API
  const handleRequestInspection = async (warehouseId) => {
    try {
      setRequestingIds((prev) => [...prev, warehouseId])

      // TRUYỀN THẲNG BIẾN: Không viết { warehouseId }, chỉ viết warehouseId thôi
      const res = await warehouseApi.requestInspection(warehouseId)

      if (res?.data?.success || res?.success || res?.status === 200 || res?.status === 201) {
        toast.success('Inspection requested.')
        const inspection = res?.data?.data ?? res?.data
        if (inspection?.warehouseId) {
          setInspectionsByWarehouse((current) => ({
            ...current,
            [String(inspection.warehouseId)]: inspection,
          }))
        }
        setInspectionConfirm(null)
        setRefreshTrigger((prev) => prev + 1)
      } else {
        showApiErrorToast(
          { response: { data: res?.data || res } },
          'Inspection request failed.'
        )
      }
    } catch (error) {
      console.error('Error when sending inspection request:', error)
      showApiErrorToast(error, 'Could not request inspection.')
    } finally {
      setRequestingIds((prev) => prev.filter((id) => id !== warehouseId))
    }
  }

  // Gọi API lấy dữ liệu mỗi khi số trang, kích thước trang hoặc refreshTrigger thay đổi
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const [response, inspectionResponse] = await Promise.all([
          warehouseApi.getOwnerWarehouses({
            page: currentPage,
            size: pageSize,
            sortBy: 'createdAt',
            sortDir: 'desc',
          }),
          warehouseApi.getOwnerInspections({ page: 0, size: 200 }),
        ])

        let apiResult = null
        if (response?.success && response?.data) {
          apiResult = response.data
        } else if (response?.data?.success && response?.data?.data) {
          apiResult = response.data.data
        }

        if (apiResult) {
          const contentList = apiResult.content || []
          setWarehouses(Array.isArray(contentList) ? contentList : [])
          setTotalPages(apiResult.totalPages || 0)
          setTotalElements(apiResult.totalElements || 0)
        } else {
          setWarehouses([])
        }

        const inspectionPage = inspectionResponse?.data?.data ?? inspectionResponse?.data
        const inspectionList = Array.isArray(inspectionPage?.content) ? inspectionPage.content : []
        const latestByWarehouse = {}
        inspectionList.forEach((inspection) => {
          const key = String(inspection.warehouseId)
          const current = latestByWarehouse[key]
          const timestamp = new Date(inspection.updatedAt || inspection.createdAt || 0).getTime()
          const currentTimestamp = new Date(current?.updatedAt || current?.createdAt || 0).getTime()
          if (!current || timestamp > currentTimestamp) latestByWarehouse[key] = inspection
        })
        setInspectionsByWarehouse(latestByWarehouse)
      } catch (error) {
        console.error('Error getting inventory list:', error)
        setWarehouses([])
      }
    }
    fetchWarehouses()
  }, [currentPage, pageSize, refreshTrigger]) // Đã thêm chính xác refreshTrigger vào đây!

  // Contract expiry can change a warehouse back to AVAILABLE on the BE.
  // Reload the owner list when that change is pushed through WebSocket.
  useEffect(() => {
    const handleRentalNotification = (event) => {
      if (String(event.detail?.type || '').toUpperCase() === 'RENTAL') {
        setRefreshTrigger((current) => current + 1)
      }
    }

    window.addEventListener('new_notification', handleRentalNotification)
    return () => window.removeEventListener('new_notification', handleRentalNotification)
  }, [])

  // Hàm xử lý cập nhật trạng thái kho trực tiếp tại bảng
  const handleStatusChange = (id, newStatus) => {
    if (!Array.isArray(warehouses)) return
    setWarehouses((prevList) =>
      prevList.map((wh) => (wh.id === id ? { ...wh, status: newStatus } : wh))
    )
    toast.success(`Warehouse set to ${newStatus}.`)
  }

  // Định dạng Badge hiển thị cho Trạng thái kho
  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'PENDING_APPROVAL':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: <Clock className="mr-1 h-3.5 w-3.5 animate-pulse" />,
          text: 'Waiting for approval',
        }
      case 'AVAILABLE':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <CheckCircle2 className="mr-1 h-3.5 w-3.5" />,
          text: 'Still empty',
        }
      case 'MAINTENANCE':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <AlertTriangle className="mr-1 h-3.5 w-3.5" />,
          text: 'Maintenance',
        }
      case 'FULL':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: <XCircle className="mr-1 h-3.5 w-3.5" />,
          text: "It's full",
        }
      case 'INACTIVE':
      case 'REJECTED':
        return {
          bg: 'bg-red-50 text-red-700 border-red-200',
          icon: <XCircle className="mr-1 h-3.5 w-3.5" />,
          text: 'Rejected / Inactive',
        }
      default:
        return {
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          icon: null,
          text: status || 'Unknown',
        }
    }
  }

  const getInspectionBadge = (warehouse, inspection) => {
    const status = warehouse.verified ? 'PASSED' : inspection?.status
    const configs = {
      PENDING: ['bg-amber-50 text-amber-700 border-amber-200', 'Waiting for assignment'],
      IN_PROGRESS: ['bg-blue-50 text-blue-700 border-blue-200', 'Inspection in progress'],
      PASSED: ['bg-emerald-50 text-emerald-700 border-emerald-200', 'Inspection passed'],
      FAILED: ['bg-red-50 text-red-700 border-red-200', 'Inspection failed'],
    }
    const [className, text] = configs[status] || [
      'bg-slate-100 text-slate-600 border-slate-200',
      'Not requested',
    ]
    return { status, className, text }
  }

  // Bộ lọc kết hợp Client-side hỗ trợ tìm kiếm nhanh theo dữ liệu hiển thị hiện tại
  const filteredWarehouses = Array.isArray(warehouses)
    ? warehouses.filter((wh) => {
        const name = wh?.name ? wh.name.toLowerCase() : ''
        const address = wh?.address ? wh.address.toLowerCase() : ''

        const matchesSearch =
          name.includes(searchTerm.toLowerCase()) || address.includes(searchTerm.toLowerCase())
        const matchesStatus = statusFilter === 'ALL' || wh.status === statusFilter
        return matchesSearch && matchesStatus
      })
    : []

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* GLOBAL HEADER */}
      <header className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="rounded-full p-2 text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex cursor-pointer items-center gap-2">
            <div className="shrink-0 rounded-lg bg-white p-1.5">
              <a href="/" aria-label="Back to landing page">
                <img src={logoDaidien} alt="Logo" className="h-10 w-16 object-contain" />
              </a>
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-slate-950">
              StockSpace Owner
            </span>
          </div>
        </div>
      </header>

      {/* MOBILE OVERLAY */}
      <div className="md:hidden">
        {isMobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/30"
            onClick={() => dispatch(closeMobileSidebar())}
          />
        )}
      </div>

      <div className="flex pt-14">
        {/* TÍCH HỢP APP SIDEBAR */}
        <Sidebar currentRole="OWNER" />

        {/* MAIN CONTAINER */}
        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'}`}
        >
          <main className="mx-auto w-full max-w-312.5 space-y-6 p-6 md:p-8">
            {/* TIÊU ĐỀ TRANG */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Warehouse management</h1>
                <p className="text-sm text-slate-500">
                  View entire listings, check area performance, and quickly update status logistics.
                </p>
              </div>
              <Button
                onClick={() => navigate('/owner/postwarehouse')}
                className="flex items-center gap-2 self-start rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-md hover:bg-blue-700 sm:self-auto"
              >
                <Plus className="h-4 w-4" />
                New warehouse
              </Button>
            </div>

            {/* THANH BỘ LỌC VÀ TÌM KIẾM */}
            <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
              <div className="relative max-w-md flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Find warehouse name, address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2 pr-4 pl-10 text-sm font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 shrink-0 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none"
                >
                  <option value="ALL">All status</option>
                  <option value="PENDING_APPROVAL">Pending</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="FULL">Full</option>
                  <option value="MAINTENANCE">Under maintenance (Maintenance)</option>
                </select>
              </div>
            </div>

            {/* BẢNG HIỂN THỊ DANH SÁCH KHO */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold tracking-wider text-slate-400 uppercase">
                    <tr>
                      <th className="px-6 py-4">Image &amp; Warehouse name</th>
                      <th className="px-6 py-4">Warehouse type</th>
                      <th className="px-6 py-4">Capacity</th>
                      <th className="px-6 py-4">Rental price / Month</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-center">Inspection</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredWarehouses.length > 0 ? (
                      filteredWarehouses.map((wh) => {
                        const badge = getStatusBadge(wh.status)
                        const isCurrentlyRequesting = requestingIds.includes(wh.id)
                        const inspection = inspectionsByWarehouse[String(wh.id)]
                        const inspectionBadge = getInspectionBadge(wh, inspection)
                        const requestPending = ['PENDING', 'IN_PROGRESS'].includes(
                          inspectionBadge.status
                        )

                        return (
                          <tr key={wh.id} className="transition-colors hover:bg-slate-50/60">
                            {/* Cột 1: Ảnh & Tên kho */}
                            <td className="max-w-xs px-6 py-4 md:max-w-sm">
                              <div className="flex items-center gap-3">
                                <img
                                  src={wh.coverImageUrl}
                                  alt={wh.name}
                                  className="h-12 w-16 shrink-0 rounded-lg border border-slate-200 object-cover"
                                  onError={(e) => {
                                    e.target.src = 'https://placehold.co/150x100?text=Warehouse'
                                  }}
                                />
                                <div className="space-y-0.5">
                                  <p className="group flex cursor-pointer items-center gap-1 font-bold text-slate-900 hover:text-blue-600">
                                    {wh.name}
                                    <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                                  </p>
                                  <p className="flex max-w-50 items-center gap-0.5 truncate text-xs text-slate-400">
                                    <MapPin className="h-3 w-3 shrink-0" /> {wh.address}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Cột 2: Loại hình */}
                            <td className="px-6 py-4">
                              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                {wh.typeName || 'Type unknown'}
                              </span>
                            </td>

                            {/* Cột 3: Sức chứa */}
                            <td className="px-6 py-4 font-mono font-semibold text-slate-900">
                              <div className="flex items-center gap-1">
                                {wh.capacity ? wh.capacity.toLocaleString() : 0} m²
                              </div>
                            </td>

                            {/* Cột 4: Giá thuê */}
                            <td className="px-6 py-4 font-bold text-slate-900">
                              <span className="">
                                {wh.pricePerMonth ? wh.pricePerMonth.toLocaleString() : 0}
                              </span>{' '}
                              <span className="text-xs font-normal text-slate-400">d</span>
                            </td>

                            {/* Cột 5: Trạng thái */}
                            <td className="px-6 py-4 text-center">
                              <div className="flex flex-col items-center gap-1.5">
                                <span
                                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.bg}`}
                                >
                                  {badge.icon}
                                  {badge.text}
                                </span>
                                {(wh.status === 'INACTIVE' || wh.status === 'REJECTED') &&
                                  (wh.reason || wh.rejectionReason || wh.rejectReason) && (
                                    <div
                                      className="max-w-[120px] cursor-help truncate text-center text-[11px] font-medium text-red-600"
                                      title={wh.reason || wh.rejectionReason || wh.rejectReason}
                                    >
                                      Lý do: {wh.reason || wh.rejectionReason || wh.rejectReason}
                                    </div>
                                  )}
                              </div>
                            </td>

                            {/* Cột 6: Kiểm định */}
                            <td className="px-6 py-4 text-center">
                              <div className="flex flex-col items-center justify-center gap-1.5">
                                <span
                                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${inspectionBadge.className}`}
                                >
                                  {inspectionBadge.status === 'PASSED' ? (
                                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                  ) : inspectionBadge.status === 'IN_PROGRESS' ? (
                                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                                  )}
                                  {inspectionBadge.text}
                                </span>
                                {!wh.verified && (
                                  <div className="flex flex-col items-center gap-1">
                                    <button
                                      onClick={() => setInspectionConfirm(wh)}
                                      disabled={isCurrentlyRequesting || requestPending}
                                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
                                    >
                                      {isCurrentlyRequesting ? (
                                        <>
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                          Sending...
                                        </>
                                      ) : requestPending ? (
                                        inspectionBadge.status === 'PENDING' ? (
                                          'Request submitted'
                                        ) : (
                                          'Being inspected'
                                        )
                                      ) : inspectionBadge.status === 'FAILED' ? (
                                        'Request re-inspection'
                                      ) : (
                                        'Request inspection'
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Cột 7: Nút Action xem chi tiết */}
                            <td className="px-6 py-4 text-center">
                              <TableActionMenu
                                items={[
                                  {
                                    label: 'View details',
                                    icon: Eye,
                                    onClick: () => setSelectedWarehouse(wh),
                                  },
                                ]}
                              />
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                          <Warehouse className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                          No warehouses found matching the current data.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* BỘ ĐIỀU HƯỚNG PHÂN TRANG */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
                  <div className="text-xs text-slate-500">
                    Show page{' '}
                    <span className="font-semibold text-slate-700">{currentPage + 1}</span> above
                    total <span className="font-semibold text-slate-700">{totalPages}</span> pages (
                    {totalElements} warehouse)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                      disabled={currentPage === 0}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    {[...Array(totalPages)].map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentPage(index)}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                          currentPage === index
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {index + 1}
                      </button>
                    ))}

                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
                      disabled={currentPage === totalPages - 1}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {inspectionConfirm && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-900">Confirm inspection request</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Submit <strong>{inspectionConfirm.name}</strong> for inspection? An inspection fee may
              be charged according to the current system policy. The request button will be disabled
              while this request is pending or in progress.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setInspectionConfirm(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={requestingIds.includes(inspectionConfirm.id)}
                onClick={() => handleRequestInspection(inspectionConfirm.id)}
                className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {requestingIds.includes(inspectionConfirm.id) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirm request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM CHI TIẾT KHO */}
      <Modal
        isOpen={!!selectedWarehouse}
        onClose={() => setSelectedWarehouse(null)}
        title="Warehouse Details"
        className="max-w-3xl"
      >
        {selectedWarehouse && (
          <div className="space-y-6">
            <div className="flex gap-4">
              <img
                src={selectedWarehouse.coverImageUrl}
                alt={selectedWarehouse.name}
                className="h-32 w-48 rounded-lg border border-slate-200 object-cover"
                onError={(e) => {
                  e.target.src = 'https://placehold.co/300x200?text=Warehouse'
                }}
              />
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedWarehouse.name}</h3>
                <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                  <MapPin className="h-4 w-4" /> {selectedWarehouse.address}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    {selectedWarehouse.typeName || 'Type unknown'}
                  </span>
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    {selectedWarehouse.capacity ? selectedWarehouse.capacity.toLocaleString() : 0}{' '}
                    m²
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Rental price / month</p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {selectedWarehouse.pricePerMonth
                    ? Number(selectedWarehouse.pricePerMonth).toLocaleString('vi-VN')
                    : 0}{' '}
                  ₫
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Status</p>
                <p className="mt-1 font-bold text-slate-900">{selectedWarehouse.status}</p>
              </div>
            </div>

            {selectedWarehouse.description && (
              <div>
                <p className="mb-2 text-xs font-bold text-slate-500 uppercase">Description</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
                  {selectedWarehouse.description}
                </p>
              </div>
            )}

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <Button onClick={() => setSelectedWarehouse(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default WarehouseManagement
