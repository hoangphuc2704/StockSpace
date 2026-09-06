import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, ChevronLeft, ChevronRight, Eye, Plus } from 'lucide-react'
import { FormShell } from '@/form/FormControls'
import Button from '@/components/atoms/Button'
import Modal from '@/components/organisms/Modal'
import TableActionMenu from '@/components/TableActionMenu'
import Header from '@/components/HeaderDashboard'
import Sidebar from '@/components/SideBar'
import { useNavigate, useSearchParams } from 'react-router-dom'
import auditApi from '@/services/wms/auditApi'
import warehouseApi from '@/services/warehouse/warehouseApi'
import staffApi from '@/services/staff/staffApi'
import layoutApi from '@/services/layoutApi'
import { toast } from 'react-hot-toast'
import moment from 'moment'
import { useDispatch, useSelector } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import { showApiErrorToast } from '@/config/apiError'
import useActiveWarehouseContext from '@/hooks/useActiveWarehouseContext'

const STATUS_CONFIG = {
  PENDING: { label: 'Kế hoạch cũ', className: 'border-slate-200 bg-slate-100 text-slate-700' },
  DRAFT: { label: 'Bản nháp', className: 'border-slate-200 bg-slate-100 text-slate-700' },
  IN_PROGRESS: { label: 'Đang kiểm đếm', className: 'border-blue-200 bg-blue-50 text-blue-800' },
  SUBMITTED: { label: 'Chờ duyệt', className: 'border-amber-200 bg-amber-50 text-amber-800' },
  RECOUNT_REQUIRED: {
    label: 'Cần kiểm lại',
    className: 'border-orange-200 bg-orange-50 text-orange-800',
  },
  APPROVED: { label: 'Đã duyệt', className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  REJECTED: { label: 'Đã từ chối (cũ)', className: 'border-rose-200 bg-rose-50 text-rose-800' },
  CANCELLED: { label: 'Đã hủy', className: 'border-slate-200 bg-slate-100 text-slate-700' },
}

const SCOPE_LABELS = { WAREHOUSE: 'Toàn kho', RACK: 'Theo rack', BIN: 'Theo bin' }

const InventoryAuditPage = ({ currentRole }) => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)

  const [audits, setAudits] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [warehouses, setWarehouses] = useState([])
  const [staffOptions, setStaffOptions] = useState([])
  const [scopeLayout, setScopeLayout] = useState(null)
  const [scopeLoading, setScopeLoading] = useState(false)
  const [formWarehouseId, setFormWarehouseId] = useState('')
  const [formScopeType, setFormScopeType] = useState('WAREHOUSE')
  const [formRackId, setFormRackId] = useState('')
  const [formBinId, setFormBinId] = useState('')
  const [formAssignedToId, setFormAssignedToId] = useState('')
  const [formNote, setFormNote] = useState('')
  const [creating, setCreating] = useState(false)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')

  useActiveWarehouseContext(selectedWarehouseId)

  const fetchAudits = useCallback(async () => {
    try {
      setLoading(true)
      const res = await auditApi.getAudits(selectedWarehouseId || '', { page, size: pageSize })
      if (res.data?.success) {
        setAudits(res.data.data.content || [])
        setTotalPages(Math.max(res.data.data.totalPages || 1, 1))
      }
    } catch (error) {
      showApiErrorToast(error, 'Không thể tải danh sách kiểm kê.')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, selectedWarehouseId])

  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await warehouseApi.getMyWarehouses()
      const list = res.data?.data?.content || res.data?.data || []
      setWarehouses(list)
      setSelectedWarehouseId((current) => {
        const requestedWarehouseId = searchParams.get('warehouseId')
        if (list.some((warehouse) => String(warehouse.id) === String(requestedWarehouseId))) {
          return requestedWarehouseId
        }
        return list.some((warehouse) => String(warehouse.id) === String(current))
          ? current
          : list[0]?.id || ''
      })
      return list
    } catch (error) {
      showApiErrorToast(error, 'Không thể tải danh sách kho.')
      return []
    }
  }, [searchParams])

  useEffect(() => {
    // Preserve the existing initial warehouse synchronization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWarehouses()
  }, [fetchWarehouses])

  useEffect(() => {
    // Fetch the server page whenever its query inputs change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAudits()
  }, [fetchAudits])

  const loadCreateOptions = async (warehouseId) => {
    if (!warehouseId) {
      setScopeLayout(null)
      return
    }
    try {
      setScopeLoading(true)
      const response =
        currentRole === 'STAFF'
          ? await staffApi.getStaffLayout(warehouseId)
          : await layoutApi.getTenantWarehouseLayout(warehouseId)
      setScopeLayout(response.data?.data || null)
    } catch (error) {
      setScopeLayout(null)
      showApiErrorToast(error, 'Không thể tải layout kho để chọn phạm vi.')
    } finally {
      setScopeLoading(false)
    }
  }

  const handleOpenCreateModal = async () => {
    const availableWarehouses = await fetchWarehouses()
    const initialWarehouseId = selectedWarehouseId || availableWarehouses[0]?.id || ''
    setFormWarehouseId(initialWarehouseId)
    setFormScopeType('WAREHOUSE')
    setFormRackId('')
    setFormBinId('')
    setFormAssignedToId('')
    setFormNote('')
    setIsCreateModalOpen(true)
    if (initialWarehouseId) loadCreateOptions(initialWarehouseId)

    if (currentRole === 'TENANT') {
      try {
        const res = await staffApi.listStaffs({ page: 0, size: 100, keyword: '' })
        const staffList = res.data?.data?.content || []

        // The audit API expects User.id here, not TenantMember.id. Keeping only
        // active records with a userId prevents an invalid membership UUID from
        // being submitted as assignedToId.
        setStaffOptions(
          staffList.filter((staff) => {
            const isActive = staff.active ?? staff.isActive
            return isActive !== false && staff.userId
          })
        )
      } catch (error) {
        setStaffOptions([])
        showApiErrorToast(error, 'Không thể tải danh sách nhân viên.')
      }
    }
  }

  const racks = useMemo(
    () =>
      String(scopeLayout?.warehouseId) === String(formWarehouseId) &&
      Array.isArray(scopeLayout?.racks)
        ? scopeLayout.racks
        : [],
    [formWarehouseId, scopeLayout]
  )
  const selectedRack = racks.find((rack) => String(rack.id) === String(formRackId))
  const bins = Array.isArray(selectedRack?.bins) ? selectedRack.bins : []

  const handleWarehouseChange = (warehouseId) => {
    setFormWarehouseId(warehouseId)
    setFormRackId('')
    setFormBinId('')
    loadCreateOptions(warehouseId)
  }

  const handleScopeChange = (scopeType) => {
    setFormScopeType(scopeType)
    setFormRackId('')
    setFormBinId('')
  }

  const handleCreateAudit = async (event) => {
    event.preventDefault()
    if (!formWarehouseId) {
      toast.error('Vui lòng chọn kho.')
      return
    }
    if (formScopeType === 'RACK' && !formRackId) {
      toast.error('Vui lòng chọn rack cần kiểm kê.')
      return
    }
    if (formScopeType === 'BIN' && !formBinId) {
      toast.error('Vui lòng chọn bin cần kiểm kê.')
      return
    }
    if (
      formScopeType !== 'WAREHOUSE' &&
      !racks.some((rack) => String(rack.id) === String(formRackId))
    ) {
      toast.error('Rack đã chọn không thuộc layout hiện tại. Vui lòng chọn lại.')
      return
    }
    if (formScopeType === 'BIN' && !bins.some((bin) => String(bin.id) === String(formBinId))) {
      toast.error('Bin đã chọn không thuộc rack hiện tại. Vui lòng chọn lại.')
      return
    }
    if (
      currentRole === 'TENANT' &&
      formAssignedToId &&
      !staffOptions.some((staff) => String(staff.userId) === String(formAssignedToId))
    ) {
      toast.error('Nhân viên đã chọn không còn hoạt động. Vui lòng chọn lại.')
      return
    }

    try {
      setCreating(true)
      const payload = {
        warehouseId: formWarehouseId,
        scopeType: formScopeType,
        note: formNote,
        ...(formScopeType !== 'WAREHOUSE' && formRackId ? { rackId: formRackId } : {}),
        ...(formScopeType === 'BIN' && formBinId ? { binId: formBinId } : {}),
        ...(currentRole === 'TENANT' && formAssignedToId ? { assignedToId: formAssignedToId } : {}),
      }
      const res = await auditApi.createAudit(payload)
      if (res.data?.success) {
        toast.success('Đã tạo kế hoạch kiểm kê.')
        setIsCreateModalOpen(false)
        setPage(0)
        fetchAudits()
      }
    } catch (error) {
      showApiErrorToast(error, 'Không thể tạo kế hoạch kiểm kê.')
    } finally {
      setCreating(false)
    }
  }

  const handleViewDetail = (id) =>
    navigate(
      currentRole === 'STAFF' ? `/staff/inventory-audits/${id}` : `/tenant/inventory-audits/${id}`
    )

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header />
      <div className="md:hidden">
        {isMobileOpen && (
          <button
            type="button"
            aria-label="Đóng điều hướng"
            className="fixed inset-0 z-40 bg-slate-900/40"
            onClick={() => dispatch(closeMobileSidebar())}
          />
        )}
      </div>
      <div className="flex pt-14">
        <Sidebar currentRole={currentRole} />
        <div
          className={`flex min-w-0 flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'}`}
        >
          <main className="mx-auto w-full max-w-[1500px] space-y-5 px-4 py-6 sm:px-6 md:py-8 lg:px-8">
            <header className="flex flex-col gap-4 border-b border-slate-300 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase">
                  <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Kiểm soát tồn kho
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                  Kiểm kê kho
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Lập kế hoạch, kiểm đếm và đối soát chênh lệch tồn kho.
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex min-w-52 flex-col gap-1 text-xs font-semibold text-slate-600">
                  Kho
                  <select
                    className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    value={selectedWarehouseId}
                    onChange={(event) => {
                      setPage(0)
                      setSelectedWarehouseId(event.target.value)
                    }}
                  >
                    <option value="">Tất cả kho</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  onClick={handleOpenCreateModal}
                  className="flex min-h-10 items-center gap-2 rounded-md"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Tạo kế hoạch
                </Button>
              </div>
            </header>

            <section
              aria-labelledby="audit-list-heading"
              aria-busy={loading}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
                <div>
                  <h2 id="audit-list-heading" className="text-sm font-semibold text-slate-950">
                    Phiếu kiểm kê
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Hiển thị theo thời gian tạo mới nhất
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-500">
                  Số dòng
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPage(0)
                      setPageSize(Number(event.target.value))
                    }}
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                  >
                    {[10, 20, 50].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left text-sm">
                  <caption className="sr-only">Danh sách phiếu kiểm kê kho</caption>
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold tracking-[0.08em] text-slate-600 uppercase">
                    <tr>
                      <th scope="col" className="px-5 py-3">
                        Phiếu
                      </th>
                      <th scope="col" className="px-5 py-3">
                        Kho
                      </th>
                      <th scope="col" className="px-5 py-3">
                        Phạm vi
                      </th>
                      <th scope="col" className="px-5 py-3">
                        Người thực hiện
                      </th>
                      <th scope="col" className="px-5 py-3">
                        Vòng đếm
                      </th>
                      <th scope="col" className="px-5 py-3">
                        Trạng thái
                      </th>
                      <th scope="col" className="px-5 py-3">
                        Ngày tạo
                      </th>
                      <th scope="col" className="px-5 py-3 text-right">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <tr key={index} aria-hidden="true">
                          {Array.from({ length: 8 }).map((__, cellIndex) => (
                            <td key={cellIndex} className="px-5 py-4">
                              <span className="block h-4 animate-pulse rounded bg-slate-200" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : audits.length ? (
                      audits.map((audit) => {
                        const status = STATUS_CONFIG[audit.status] || {
                          label: audit.status,
                          className: 'border-slate-200 bg-slate-100 text-slate-700',
                        }
                        return (
                          <tr key={audit.id} className="hover:bg-slate-50">
                            <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-900">
                              AUD-{String(audit.id).slice(0, 8).toUpperCase()}
                            </td>
                            <td className="px-5 py-3.5 font-semibold text-slate-900">
                              {audit.warehouseName || '-'}
                            </td>
                            <td className="px-5 py-3.5 text-slate-700">
                              {SCOPE_LABELS[audit.scopeType] || audit.scopeType || '-'}
                            </td>
                            <td className="px-5 py-3.5 text-slate-700">
                              {audit.assignedToName || audit.requestedByName || 'Chưa phân công'}
                            </td>
                            <td className="px-5 py-3.5 text-slate-700 tabular-nums">
                              {audit.countRound || 1}
                            </td>
                            <td className="px-5 py-3.5">
                              <span
                                className={`inline-flex rounded border px-2 py-1 text-[11px] font-semibold ${status.className}`}
                              >
                                {status.label}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-slate-600 tabular-nums">
                              {audit.createdAt
                                ? moment(audit.createdAt).format('DD/MM/YYYY HH:mm')
                                : '-'}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <TableActionMenu
                                label={`Thao tác phiếu ${audit.id}`}
                                items={[
                                  {
                                    label: 'Xem chi tiết',
                                    icon: Eye,
                                    onClick: () => handleViewDetail(audit.id),
                                  },
                                ]}
                              />
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-6 py-16 text-center">
                          <ClipboardCheck
                            className="mx-auto h-7 w-7 text-slate-400"
                            aria-hidden="true"
                          />
                          <p className="mt-3 font-semibold text-slate-800">Chưa có phiếu kiểm kê</p>
                          <p className="mt-1 text-sm text-slate-500">
                            Tạo kế hoạch kiểm kê để bắt đầu đối soát tồn kho.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <span className="text-slate-500">
                  Trang {page + 1} / {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page === 0 || loading}
                    onClick={() => setPage((current) => Math.max(0, current - 1))}
                    aria-label="Trang trước"
                    className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={page + 1 >= totalPages || loading}
                    onClick={() => setPage((current) => current + 1)}
                    aria-label="Trang sau"
                    className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </footer>
            </section>
          </main>
        </div>
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Tạo kế hoạch kiểm kê"
        size="lg"
      >
        <FormShell onSubmit={handleCreateAudit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Kho <span className="text-red-600">*</span>
              <select
                value={formWarehouseId}
                onChange={(event) => handleWarehouseChange(event.target.value)}
                required
                className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Chọn kho</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Phạm vi <span className="text-red-600">*</span>
              <select
                value={formScopeType}
                onChange={(event) => handleScopeChange(event.target.value)}
                className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                <option value="WAREHOUSE">Toàn kho</option>
                <option value="RACK">Một rack</option>
                <option value="BIN">Một bin</option>
              </select>
            </label>
          </div>

          {formScopeType !== 'WAREHOUSE' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Rack <span className="text-red-600">*</span>
                <select
                  value={formRackId}
                  disabled={!formWarehouseId || scopeLoading}
                  onChange={(event) => {
                    setFormRackId(event.target.value)
                    setFormBinId('')
                  }}
                  required
                  className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                >
                  <option value="">{scopeLoading ? 'Đang tải layout...' : 'Chọn rack'}</option>
                  {racks.map((rack) => (
                    <option key={rack.id} value={rack.id}>
                      {rack.name || rack.code || rack.id}
                    </option>
                  ))}
                </select>
              </label>
              {formScopeType === 'BIN' && (
                <label className="block text-sm font-medium text-slate-700">
                  Bin <span className="text-red-600">*</span>
                  <select
                    value={formBinId}
                    disabled={!formRackId}
                    onChange={(event) => setFormBinId(event.target.value)}
                    required
                    className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  >
                    <option value="">Chọn bin</option>
                    {bins.map((bin) => (
                      <option key={bin.id} value={bin.id}>
                        {bin.name || bin.code || bin.id}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}

          {currentRole === 'TENANT' && (
            <label className="block text-sm font-medium text-slate-700">
              Phân công người kiểm đếm
              <select
                value={formAssignedToId}
                onChange={(event) => setFormAssignedToId(event.target.value)}
                className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Chưa phân công</option>
                {staffOptions.map((staff) => (
                  <option key={staff.userId} value={staff.userId}>
                    {staff.fullName || staff.email || staff.userId}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block text-sm font-medium text-slate-700">
            Ghi chú
            <textarea
              rows={3}
              placeholder="Mục đích hoặc hướng dẫn kiểm kê..."
              value={formNote}
              onChange={(event) => setFormNote(event.target.value)}
              className="mt-1.5 w-full rounded-md border border-slate-300 p-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" isLoading={creating}>
              Tạo kế hoạch
            </Button>
          </div>
        </FormShell>
      </Modal>
    </div>
  )
}

export default InventoryAuditPage
