import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
} from 'lucide-react'
import Button from '@/components/atoms/Button'

// Import Sidebar và Logo từ hệ thống của bạn
import Sidebar from '../../../components/SideBar'
import logoDaidien from '../../../assets/logoDaidien.png'
import warehouseApi from '../../../services/warehouse/warehouseApi'

const WarehouseManagement = () => {
  const navigate = useNavigate()

  // 1. Quản lý trạng thái đóng/mở Sidebar đồng bộ hệ thống
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // 2. State quản lý dữ liệu kho hàng & bộ lọc tìm kiếm nhanh tại Client
  const [warehouses, setWarehouses] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // 3. State quản lý phân trang đồng bộ từ API thực tế
  const [currentPage, setCurrentPage] = useState(0) // API trả về "page": 0 ở trang đầu tiên
  const [pageSize, setPageSize] = useState(5) // API trả về "size": 5
  const [totalPages, setTotalPages] = useState(0) // API trả về "totalPages": 1
  const [totalElements, setTotalElements] = useState(0) // API trả về "totalElements": 2

  // Gọi API lấy dữ liệu mỗi khi số trang (currentPage) hoặc kích thước trang (pageSize) thay đổi
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const response = await warehouseApi.getOwnerWarehouses({
          page: currentPage,
          size: pageSize,
          sortBy: 'createdAt',
          sortDir: 'desc',
        })

        // IN RA ĐỂ KIỂM TRA TRỰC TIẾP TẦNG DỮ LIỆU
        console.log('1. Toàn bộ Response nhận được từ hàm API:', response)

        // Thử kiểm tra cả 2 trường hợp: có bóc tách data.data hoặc chỉ data
        let apiResult = null
        if (response?.success && response?.data) {
          apiResult = response.data
        } else if (response?.data?.success && response?.data?.data) {
          apiResult = response.data.data
        }

        console.log('2. Dữ liệu sau khi bóc tách tầng vỏ:', apiResult)

        if (apiResult) {
          const contentList = apiResult.content || []
          console.log('3. Mảng danh sách kho (content) tìm thấy:', contentList)

          setWarehouses(Array.isArray(contentList) ? contentList : [])
          setTotalPages(apiResult.totalPages || 0)
          setTotalElements(apiResult.totalElements || 0)
        } else {
          console.error('Không tìm thấy cấu trúc .data hợp lệ từ API')
          setWarehouses([])
        }
      } catch (error) {
        console.error('Lỗi khi xử lý useEffect:', error)
        setWarehouses([])
      }
    }
    fetchWarehouses()
  }, [currentPage, pageSize])

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileOpen(!isMobileOpen)
    } else {
      setIsSidebarExpanded(!isSidebarExpanded)
    }
  }

  // Hàm xử lý cập nhật trạng thái kho trực tiếp tại bảng
  const handleStatusChange = (id, newStatus) => {
    if (!Array.isArray(warehouses)) return
    setWarehouses((prevList) =>
      prevList.map((wh) => (wh.id === id ? { ...wh, status: newStatus } : wh))
    )
    alert(`Đã chuyển trạng thái kho sang: ${newStatus}`)
  }

  // CẬP NHẬT: Thêm định dạng Badge hiển thị cho PENDING_APPROVAL
  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'PENDING_APPROVAL':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: <Clock className="mr-1 h-3.5 w-3.5 animate-pulse" />,
          text: 'Chờ duyệt',
        }
      case 'AVAILABLE':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <CheckCircle2 className="mr-1 h-3.5 w-3.5" />,
          text: 'Còn trống',
        }
      case 'MAINTENANCE':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <AlertTriangle className="mr-1 h-3.5 w-3.5" />,
          text: 'Bảo trì',
        }
      case 'FULL':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: <XCircle className="mr-1 h-3.5 w-3.5" />,
          text: 'Đã đầy',
        }
      default:
        return {
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          icon: null,
          text: status || 'Không rõ',
        }
    }
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
            onClick={toggleSidebar}
            className="rounded-full p-2 text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex cursor-pointer items-center gap-2">
            <div className="shrink-0 rounded-lg bg-white p-1.5">
              <img src={logoDaidien} alt="Logo" className="h-10 w-16 object-contain" />
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
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </div>

      <div className="flex pt-14">
        {/* TÍCH HỢP APP SIDEBAR */}
        <Sidebar
          isSidebarExpanded={isSidebarExpanded}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
          currentRole="OWNER"
        />

        {/* MAIN CONTAINER */}
        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-[72px]'}`}
        >
          <main className="mx-auto w-full max-w-[1250px] space-y-6 p-6 md:p-8">
            {/* TIÊU ĐỀ TRANG */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Quản lý kho hàng</h1>
                <p className="text-sm text-slate-500">
                  Xem toàn bộ danh sách, kiểm tra hiệu suất diện tích và cập nhật nhanh trạng thái
                  kho vận.
                </p>
              </div>
              <Button
                onClick={() => navigate('/owner/postwarehouse')}
                className="flex items-center gap-2 self-start rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-md hover:bg-blue-700 sm:self-auto"
              >
                <Plus className="h-4 w-4" /> Đăng tin kho mới
              </Button>
            </div>

            {/* THANH BỘ LỌC VÀ TÌM KIẾM */}
            <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
              {/* Ô Tìm kiếm */}
              <div className="relative max-w-md flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm tên kho, địa chỉ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2 pr-4 pl-10 text-sm font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Lọc Trạng thái */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 shrink-0 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="PENDING_APPROVAL">Chờ duyệt (Pending)</option>
                  <option value="AVAILABLE">Còn trống (Available)</option>
                  <option value="FULL">Đã đầy (Full)</option>
                  <option value="MAINTENANCE">Đang bảo trì (Maintenance)</option>
                </select>
              </div>
            </div>

            {/* BẢNG HIỂN THỊ DANH SÁCH KHO */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold tracking-wider text-slate-400 uppercase">
                    <tr>
                      <th className="px-6 py-4">Hình ảnh & Tên kho</th>
                      <th className="px-6 py-4">Loại kho</th>
                      <th className="px-6 py-4">Sức chứa</th>
                      <th className="px-6 py-4">Giá thuê / Tháng</th>
                      <th className="px-6 py-4 text-center">Trạng thái</th>
                      <th className="px-6 py-4 text-right">Cập nhật nhanh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredWarehouses.length > 0 ? (
                      filteredWarehouses.map((wh) => {
                        const badge = getStatusBadge(wh.status)
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
                                  <p className="flex max-w-[200px] items-center gap-0.5 truncate text-xs text-slate-400">
                                    <MapPin className="h-3 w-3 shrink-0" /> {wh.address}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Cột 2: Loại hình */}
                            <td className="px-6 py-4">
                              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                {wh.typeName || 'Chưa rõ loại'}
                              </span>
                            </td>

                            {/* Cột 3: Sức chứa */}
                            <td className="px-6 py-4 font-mono font-semibold text-slate-900">
                              <div className="flex items-center gap-1">
                                <Layers className="h-3.5 w-3.5 text-slate-400" />
                                {wh.capacity ? wh.capacity.toLocaleString() : 0} m²
                              </div>
                            </td>

                            {/* Cột 4: Giá thuê */}
                            <td className="px-6 py-4 font-bold text-slate-900">
                              <span className="text-emerald-600">
                                {wh.pricePerMonth ? wh.pricePerMonth.toLocaleString() : 0}
                              </span>{' '}
                              <span className="text-xs font-normal text-slate-400">đ</span>
                            </td>

                            {/* Cột 5: Trạng thái hiện tại */}
                            <td className="px-6 py-4 text-center">
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.bg}`}
                              >
                                {badge.icon}
                                {badge.text}
                              </span>
                            </td>

                            {/* Cột 6: NÚT CẬP NHẬT TRẠNG THÁI NHANH TẠI CHỖ */}
                            <td className="px-6 py-4 text-right">
                              <select
                                value={wh.status}
                                onChange={(e) => handleStatusChange(wh.id, e.target.value)}
                                className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:border-slate-300 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                              >
                                <option value="AVAILABLE">🟢 Trống (Available)</option>
                                <option value="FULL">🔴 Đầy (Full)</option>
                                <option value="MAINTENANCE">🟡 Bảo trì (Maintenance)</option>
                              </select>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                          <Warehouse className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                          Không tìm thấy nhà kho nào phù hợp với dữ liệu hiện tại.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* BỘ ĐIỀU HƯỚNG PHÂN TRANG (PAGINATION BAR UI) */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
                  <div className="text-xs text-slate-500">
                    Hiển thị trang{' '}
                    <span className="font-semibold text-slate-700">{currentPage + 1}</span> trên
                    tổng số <span className="font-semibold text-slate-700">{totalPages}</span> trang
                    ({totalElements} nhà kho)
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Nút lùi về trang trước */}
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                      disabled={currentPage === 0}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    {/* Vòng lặp hiển thị danh sách số trang */}
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

                    {/* Nút tiến tới trang sau */}
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
    </div>
  )
}

export default WarehouseManagement
