import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchWarehouses,
  verifyWarehouse,
  rejectWarehouse,
} from '../../../store/adminWarehouseSlice'
// Import các action từ uiSlice để đồng bộ trạng thái đóng/mở sidebar toàn hệ thống
import { toggleSidebar, closeMobileSidebar } from '../../../store/uiSlide'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import {
  Warehouse,
  ShieldCheck,
  MapPin,
  Maximize,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  Phone,
  CalendarDays,
  Boxes,
  Package2,
  ImageIcon,
} from 'lucide-react'
import { HiBars3 } from 'react-icons/hi2'
import DataTable from '../../../components/organisms/DataTable'
import Badge from '../../../components/atoms/Badge'
import Button from '../../../components/atoms/Button'
import Avatar from '../../../components/atoms/Avatar'
import Sidebar from '../../../components/SideBar'
import Modal from '../../../components/organisms/Modal'
import WarehouseLayoutPreview3D from '../../../components/WarehouseLayoutPreview3D'
import warehouseApi from '../../../services/warehouse/warehouseApi'
import logoDaidien from '../../../assets/logoDaidien.png'

const apiData = (response) => response?.data?.data ?? response?.data ?? null
const numberOf = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
const formatCurrency = (value) =>
  value == null
    ? '—'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(Number(value))
const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : '—'

const normalizeLayout = (payload = {}) => ({
  id: payload.id ?? null,
  width: Math.max(numberOf(payload.width, 100), 20),
  length: Math.max(numberOf(payload.length, 100), 20),
  height: Math.max(numberOf(payload.height, 100), 20),
  footprintCells: Array.isArray(payload.footprintCells) ? payload.footprintCells.map(String) : null,
  positions: Array.isArray(payload.positions) ? payload.positions.map(String) : [],
  racks: Array.isArray(payload.racks)
    ? payload.racks.map((rack, rackIndex) => ({
        ...rack,
        clientKey: String(rack.id ?? `rack-${rackIndex}`),
        coordinateX: numberOf(rack.coordinateX),
        coordinateY: numberOf(rack.coordinateY),
        positionZ: numberOf(rack.positionZ),
        rotation: numberOf(rack.rotation),
        width: Math.max(numberOf(rack.width, 18), 4),
        length: Math.max(numberOf(rack.length, 18), 4),
        height: Math.max(numberOf(rack.height, 18), 4),
        bins: Array.isArray(rack.bins)
          ? rack.bins.map((bin, binIndex) => ({
              ...bin,
              clientKey: String(bin.id ?? `rack-${rackIndex}-bin-${binIndex}`),
              coordinateX: numberOf(bin.coordinateX),
              coordinateY: numberOf(bin.coordinateY),
              positionZ: numberOf(bin.positionZ),
              width: Math.max(numberOf(bin.width, 8), 4),
              length: Math.max(numberOf(bin.length, 8), 4),
              height: Math.max(numberOf(bin.height, 8), 4),
            }))
          : [],
      }))
    : [],
})

const DetailItem = ({ icon: Icon, label, children }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
      <Icon className="h-4 w-4 text-blue-600" />
      {label}
    </div>
    <div className="text-sm font-semibold text-slate-900">{children || '—'}</div>
  </div>
)

const WarehouseApprovalPage = () => {
  const dispatch = useDispatch()
  const { data: warehouses, loading } = useSelector((state) => state.adminWarehouse)

  // ✅ Lấy trạng thái Sidebar từ Redux thay vì sử dụng useState cục bộ
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  const [selectedWarehouse, setSelectedWarehouse] = useState(null)
  const [warehouseDetail, setWarehouseDetail] = useState(null)
  const [layout, setLayout] = useState(null)
  const [activeTab, setActiveTab] = useState('details')
  const [layoutLoading, setLayoutLoading] = useState(false)
  const [layoutError, setLayoutError] = useState('')
  const [pendingAction, setPendingAction] = useState({ id: null, type: null })

  useEffect(() => {
    dispatch(fetchWarehouses())
  }, [dispatch])

  const closeDetails = () => {
    setSelectedWarehouse(null)
    setWarehouseDetail(null)
    setLayout(null)
    setLayoutError('')
  }

  const openDetails = async (warehouse) => {
    setSelectedWarehouse(warehouse)
    setWarehouseDetail(warehouse)
    setLayout(null)
    setActiveTab('details')
    setLayoutLoading(true)
    setLayoutError('')

    try {
      const response = await warehouseApi.getPublicWarehouseLayout(warehouse.id)
      setLayout(normalizeLayout(apiData(response) || {}))
    } catch (requestError) {
      setLayoutError(
        requestError.response?.data?.message ||
          'This warehouse does not have a configured layout yet.'
      )
    } finally {
      setLayoutLoading(false)
    }
  }

  const binCount = layout?.racks.reduce((total, rack) => total + (rack.bins?.length || 0), 0) || 0

  const runApprovalAction = async (warehouse, type) => {
    setPendingAction({ id: warehouse.id, type })
    try {
      const action =
        type === 'approve' ? verifyWarehouse(warehouse.id) : rejectWarehouse(warehouse.id)
      const updatedWarehouse = await dispatch(action).unwrap()
      setWarehouseDetail((current) =>
        current?.id === updatedWarehouse?.id ? { ...current, ...updatedWarehouse } : current
      )
      toast.success(
        type === 'approve' ? 'Warehouse approved successfully.' : 'Warehouse rejected successfully.'
      )
    } catch (actionError) {
      toast.error(
        typeof actionError === 'string'
          ? actionError
          : actionError?.message ||
              `Unable to ${type === 'approve' ? 'approve' : 'reject'} this warehouse.`
      )
    } finally {
      setPendingAction({ id: null, type: null })
    }
  }

  const columns = [
    {
      header: 'Warehouse Details',
      render: (row) => (
        <div className="flex items-center gap-4 py-2">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <Warehouse size={24} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900">{row.name}</span>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <MapPin size={12} /> {row.address || row.location || '—'}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Owner',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar alt={row.ownerName || row.owner} size="sm" />
          <span className="text-sm font-medium text-slate-700">
            {row.ownerName || row.owner || '—'}
          </span>
        </div>
      ),
    },
    {
      header: 'Specs',
      render: (row) => (
        <div className="flex flex-col gap-1 text-xs">
          <span className="flex items-center gap-1 font-medium text-slate-700">
            <Maximize size={12} /> {row.area ? `${row.area} m²` : row.size || '—'}
          </span>
          <span className="text-slate-500">
            {row.warehouseType?.name || row.typeName || row.type || '—'}
          </span>
        </div>
      ),
    },
    {
      header: 'Price / Month',
      render: (row) => (
        <span className="text-primary font-bold">
          {formatCurrency(row.pricePerMonth ?? row.price)}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (row) => {
        const variantMap = {
          ACTIVE: 'success',
          INACTIVE: 'danger',
          PENDING: 'warning',
          UNDER_REVIEW: 'primary',
        }
        return (
          <Badge variant={variantMap[row.status] || 'slate'} size="sm">
            {row.isVerified ? '✓ Verified' : row.status || '—'}
          </Badge>
        )
      },
    },
    {
      header: 'Submitted',
      render: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-US') : '—'),
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 px-3"
            onClick={() => openDetails(row)}
          >
            <Eye size={16} className="mr-2" /> Details
          </Button>
          <button
            type="button"
            onClick={() => runApprovalAction(row, 'approve')}
            disabled={pendingAction.id === row.id}
            title="Approve warehouse"
            className="text-success hover:bg-success/10 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 transition-colors disabled:cursor-wait disabled:opacity-50"
          >
            {pendingAction.id === row.id && pendingAction.type === 'approve' ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <CheckCircle size={18} />
            )}
          </button>
          <button
            type="button"
            onClick={() => runApprovalAction(row, 'reject')}
            disabled={pendingAction.id === row.id}
            title="Refuse warehouse"
            className="text-danger hover:bg-danger/10 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 transition-colors disabled:cursor-wait disabled:opacity-50"
          >
            {pendingAction.id === row.id && pendingAction.type === 'reject' ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <XCircle size={18} />
            )}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* 1. TOP HEADER */}
      <header className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-4">
          <button
            // ✅ Kích hoạt action toggleSidebar từ Redux Store
            onClick={() => dispatch(toggleSidebar())}
            className="rounded-full p-2 text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200"
          >
            <HiBars3 className="h-6 w-6" />
          </button>

          <div className="flex cursor-pointer items-center gap-2">
            <div className="shrink-0 rounded-lg bg-white p-1.5 text-white">
              <a href="/" aria-label="Back to landing page">
                <img src={logoDaidien} alt="Logo" className="h-10 w-17" />
              </a>
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-slate-950">
              StockSpace Admin
            </span>
          </div>
        </div>
      </header>

      {/* MOBILE TRIGGER */}
      <div className="md:hidden">
        {isMobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/30"
            // ✅ Kích hoạt action closeMobileSidebar khi nhấn lớp nền mờ mobile
            onClick={() => dispatch(closeMobileSidebar())}
          />
        )}
      </div>

      <div className="flex pt-14">
        {/* 2. SIDEBAR COMPONENT */}
        {/* ✅ Lược bỏ việc truyền state cục bộ, để Sidebar tự động lấy dữ liệu từ Store */}
        <Sidebar currentRole="ADMIN" />

        {/* 3. MAIN CONTENT CONTAINER */}
        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-[72px]' // ✅ Đồng bộ pl-[72px] chuẩn xác của toàn bộ dự án
          }`}
        >
          <main className="mx-auto w-full max-w-400 space-y-6 p-6 md:p-8">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Warehouse Approvals</h1>
              </div>
            </div>

            {/* Filters Section */}
            {/* <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row">
              <div className="relative w-full md:w-80">
                <Search
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter by name, owner or city..."
                  className="focus:ring-primary/20 w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-4 pl-9 text-sm transition-all focus:ring-2 focus:outline-none"
                />
              </div>
              <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 md:w-auto md:pb-0">
                <Badge variant="primary" className="cursor-pointer whitespace-nowrap">
                  Pending (3)
                </Badge>
                <Badge variant="slate" className="cursor-pointer whitespace-nowrap">
                  Under Review (5)
                </Badge>
                <Badge variant="slate" className="cursor-pointer whitespace-nowrap">
                  Rejected (12)
                </Badge>
              </div>
            </div> */}

            {/* Table wrapper */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {loading ? (
                  <div className="p-4 text-center">Loading...</div>
                ) : (
                  <DataTable columns={columns} data={warehouses} />
                )}
              </motion.div>
            </div>
          </main>
        </div>
      </div>

      <Modal
        isOpen={Boolean(selectedWarehouse)}
        onClose={closeDetails}
        title="Warehouse approval details"
        className="max-w-6xl"
      >
        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto pr-1">
          <div className="mb-5 flex gap-2 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === 'details'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Warehouse details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('layout')}
              className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === 'layout'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              3D layout
            </button>
          </div>

          {activeTab === 'details' ? (
            <div className="space-y-6">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
                {warehouseDetail?.coverImageUrl || warehouseDetail?.imageUrls?.[0] ? (
                  <img
                    src={warehouseDetail.coverImageUrl || warehouseDetail.imageUrls[0]}
                    alt={warehouseDetail.name || 'Warehouse'}
                    className="h-64 w-full object-cover sm:h-80"
                  />
                ) : (
                  <div className="flex h-64 flex-col items-center justify-center text-slate-400 sm:h-80">
                    <ImageIcon className="mb-3 h-12 w-12" />
                    <span className="text-sm">No warehouse image provided</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <h2 className="text-2xl font-bold text-slate-950">
                    {warehouseDetail?.name || 'Warehouse'}
                  </h2>
                  <p className="mt-1 flex items-start gap-2 text-sm text-slate-600">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    {warehouseDetail?.address || warehouseDetail?.location || '—'}
                  </p>
                </div>
                <Badge variant={warehouseDetail?.isVerified ? 'success' : 'warning'} size="sm">
                  {warehouseDetail?.isVerified ? 'Verified' : warehouseDetail?.status || 'Pending'}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem icon={Warehouse} label="Warehouse type">
                  {warehouseDetail?.warehouseType?.name ||
                    warehouseDetail?.typeName ||
                    warehouseDetail?.type}
                </DetailItem>
                <DetailItem icon={Maximize} label="Storage capacity">
                  {warehouseDetail?.capacity != null
                    ? `${Number(warehouseDetail.capacity).toLocaleString('en-US')} m²`
                    : warehouseDetail?.area
                      ? `${warehouseDetail.area} m²`
                      : '—'}
                </DetailItem>
                <DetailItem icon={Package2} label="Monthly price">
                  {formatCurrency(warehouseDetail?.pricePerMonth ?? warehouseDetail?.price)}
                </DetailItem>
                <DetailItem icon={ShieldCheck} label="Owner">
                  {warehouseDetail?.ownerName || warehouseDetail?.owner}
                </DetailItem>
                <DetailItem icon={Phone} label="Owner phone">
                  {warehouseDetail?.ownerPhone}
                </DetailItem>
                <DetailItem icon={CalendarDays} label="Submitted">
                  {formatDate(warehouseDetail?.createdAt)}
                </DetailItem>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <h3 className="font-bold text-slate-900">Description</h3>
                <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-slate-600">
                  {warehouseDetail?.description || 'No description was provided.'}
                </p>
              </div>

              {warehouseDetail?.imageUrls?.length > 1 && (
                <div>
                  <h3 className="mb-3 font-bold text-slate-900">Warehouse images</h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {warehouseDetail.imageUrls.map((imageUrl, index) => (
                      <img
                        key={`${imageUrl}-${index}`}
                        src={imageUrl}
                        alt={`${warehouseDetail.name || 'Warehouse'} ${index + 1}`}
                        className="h-32 w-full rounded-xl border border-slate-200 object-cover"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : layoutLoading ? (
            <div className="flex h-120 flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="text-sm">Loading warehouse layout...</span>
            </div>
          ) : layoutError || !layout ? (
            <div className="flex h-96 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
              <Boxes className="mb-3 h-12 w-12 text-slate-400" />
              <h3 className="font-bold text-slate-800">Layout is not available</h3>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                {layoutError || 'The owner has not configured a layout for this warehouse.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">
                  {layout.width} × {layout.length} × {layout.height} m
                </span>
                <span className="rounded-lg bg-blue-50 px-3 py-2 text-blue-700">
                  {layout.racks.length} racks
                </span>
                <span className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
                  {binCount} bins
                </span>
              </div>
              <div className="h-[520px] overflow-hidden rounded-2xl border border-slate-200 bg-sky-50">
                <WarehouseLayoutPreview3D layout={layout} editable={false} />
              </div>
              <p className="text-xs text-slate-500">
                Drag to rotate the view and scroll to zoom in or out. This preview is read-only.
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

export default WarehouseApprovalPage
