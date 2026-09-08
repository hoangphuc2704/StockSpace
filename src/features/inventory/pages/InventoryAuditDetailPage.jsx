import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Ban,
  CheckCircle,
  ClipboardCheck,
  PlayCircle,
  PlusCircle,
  RotateCcw,
  Save,
} from 'lucide-react'
import { FormShell } from '@/form/FormControls'
import Button from '@/components/atoms/Button'
import Modal from '@/components/organisms/Modal'
import Header from '@/components/HeaderDashboard'
import Sidebar from '@/components/SideBar'
import { useNavigate, useParams } from 'react-router-dom'
import auditApi from '@/services/wms/auditApi'
import productApi from '@/services/wms/productApi'
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
const COUNT_STATUS_LABELS = { UNCOUNTED: 'Chưa đếm', COUNTED: 'Đã đếm', SKIPPED: 'Bỏ qua' }

const InventoryAuditDetailPage = ({ currentRole }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  const currentUser = useSelector((state) => state.auth.user)

  const [audit, setAudit] = useState(null)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])
  const [starting, setStarting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [approving, setApproving] = useState(false)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [isRecountModalOpen, setIsRecountModalOpen] = useState(false)
  const [recountReason, setRecountReason] = useState('')
  const [recounting, setRecounting] = useState(false)
  const [isUnexpectedModalOpen, setIsUnexpectedModalOpen] = useState(false)
  const [unexpectedSkuId, setUnexpectedSkuId] = useState('')
  const [unexpectedRackId, setUnexpectedRackId] = useState('')
  const [unexpectedBinId, setUnexpectedBinId] = useState('')
  const [unexpectedQuantity, setUnexpectedQuantity] = useState(1)
  const [unexpectedNote, setUnexpectedNote] = useState('')
  const [unexpectedOptionsLoading, setUnexpectedOptionsLoading] = useState(false)
  const [addingUnexpected, setAddingUnexpected] = useState(false)
  const [skuOptions, setSkuOptions] = useState([])
  const [layout, setLayout] = useState(null)

  useActiveWarehouseContext(audit?.warehouseId)

  const handleBack = useCallback(() => {
    navigate(currentRole === 'STAFF' ? '/staff/inventory-audits' : '/tenant/inventory-audits')
  }, [currentRole, navigate])

  const fetchAuditDetail = useCallback(async () => {
    try {
      setLoading(true)
      const res = await auditApi.getAuditDetail(id)
      if (res.data?.success) {
        const nextAudit = res.data.data
        setAudit(nextAudit)
        setItems(
          (nextAudit.items || []).map((item) => ({
            ...item,
            actualQuantity: item.actualQuantity ?? '',
            varianceReason: item.varianceReason || '',
            note: item.note || '',
          }))
        )
      }
    } catch (error) {
      showApiErrorToast(error, 'Không thể tải chi tiết kiểm kê.')
      handleBack()
    } finally {
      setLoading(false)
    }
  }, [handleBack, id])

  useEffect(() => {
    // Load the route-bound audit record when its identifier changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (id) fetchAuditDetail()
  }, [fetchAuditDetail, id])

  const isCounting = audit?.status === 'IN_PROGRESS'
  const canStart = audit?.status === 'DRAFT' || audit?.status === 'RECOUNT_REQUIRED'
  const isSubmitted = audit?.status === 'SUBMITTED'
  const currentUserId = currentUser?.userId || currentUser?.id
  const canApprove =
    isSubmitted &&
    currentRole === 'TENANT' &&
    (!audit?.assignedToId || !currentUserId || String(audit.assignedToId) !== String(currentUserId))
  const canTenantCancel =
    currentRole === 'TENANT' && audit?.status !== 'APPROVED' && audit?.status !== 'CANCELLED'

  const handleItemChange = (itemId, field, value) => {
    setItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, [field]: value } : item))
    )
  }

  const buildCountPayload = (requireAll = false) => {
    const completedItems = items.filter(
      (item) => item.actualQuantity !== '' && item.actualQuantity !== null
    )
    if (requireAll && completedItems.length !== items.length) {
      toast.error('Vui lòng nhập số lượng thực tế cho tất cả sản phẩm.')
      return null
    }
    if (!completedItems.length && items.length) {
      toast.error('Chưa có số lượng kiểm đếm nào để lưu.')
      return null
    }
    if (
      completedItems.some((item) => {
        const quantity = Number(item.actualQuantity)
        return !Number.isInteger(quantity) || quantity < 0
      })
    ) {
      toast.error('Số lượng thực tế phải là số nguyên không âm.')
      return null
    }
    return {
      items: completedItems.map((item) => ({
        itemId: item.id,
        actualQuantity: Number(item.actualQuantity),
        note: item.note || '',
        varianceReason: item.varianceReason || '',
      })),
    }
  }

  const handleStartAudit = async () => {
    try {
      setStarting(true)
      const res = await auditApi.startAudit(id)
      if (res.data?.success) {
        toast.success(
          audit.status === 'RECOUNT_REQUIRED' ? 'Đã bắt đầu vòng kiểm lại.' : 'Đã bắt đầu kiểm kê.'
        )
        fetchAuditDetail()
      }
    } catch (error) {
      showApiErrorToast(error, 'Không thể bắt đầu kiểm kê.')
    } finally {
      setStarting(false)
    }
  }

  const handleSaveCounts = async () => {
    const payload = buildCountPayload(false)
    if (!payload) return
    try {
      setSaving(true)
      const res = await auditApi.saveCounts(id, payload)
      if (res.data?.success) {
        toast.success('Đã lưu kết quả kiểm đếm.')
        fetchAuditDetail()
      }
    } catch (error) {
      showApiErrorToast(error, 'Không thể lưu kết quả kiểm đếm.')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitAudit = async () => {
    const payload = buildCountPayload(true)
    if (!payload && items.length) return
    try {
      setSubmitting(true)
      if (items.length) await auditApi.saveCounts(id, payload)
      const res = await auditApi.submitAudit(id)
      if (res.data?.success) {
        toast.success('Đã nộp kết quả kiểm kê.')
        fetchAuditDetail()
      }
    } catch (error) {
      showApiErrorToast(error, 'Không thể nộp kết quả kiểm kê.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async () => {
    try {
      setApproving(true)
      const res = await auditApi.approveAudit(id)
      if (res.data?.success) {
        toast.success('Đã duyệt và cập nhật tồn kho.')
        fetchAuditDetail()
      }
    } catch (error) {
      showApiErrorToast(error, 'Không thể duyệt phiếu kiểm kê.')
    } finally {
      setApproving(false)
    }
  }

  const handleCancel = async (event) => {
    event.preventDefault()
    try {
      setCancelling(true)
      const reason = cancelReason.trim()
      const res = await auditApi.cancelAudit(id, reason ? { reason } : undefined)
      if (res.data?.success) {
        toast.success('Đã hủy phiếu kiểm kê.')
        setIsCancelModalOpen(false)
        setCancelReason('')
        fetchAuditDetail()
      }
    } catch (error) {
      showApiErrorToast(error, 'Không thể hủy phiếu kiểm kê.')
    } finally {
      setCancelling(false)
    }
  }

  const handleRecount = async (event) => {
    event.preventDefault()
    try {
      setRecounting(true)
      const res = await auditApi.recountAudit(id, { reason: recountReason.trim() })
      if (res.data?.success) {
        toast.success('Đã yêu cầu kiểm đếm lại.')
        setIsRecountModalOpen(false)
        setRecountReason('')
        fetchAuditDetail()
      }
    } catch (error) {
      showApiErrorToast(error, 'Không thể yêu cầu kiểm đếm lại.')
    } finally {
      setRecounting(false)
    }
  }

  const handleOpenUnexpectedModal = async () => {
    setUnexpectedSkuId('')
    setUnexpectedRackId('')
    setUnexpectedBinId('')
    setUnexpectedQuantity(1)
    setUnexpectedNote('')
    setIsUnexpectedModalOpen(true)
    try {
      setUnexpectedOptionsLoading(true)
      const requests = [productApi.getAllSKUs({ size: 100 })]
      if (audit.scopeType === 'WAREHOUSE') {
        requests.push(
          currentRole === 'STAFF'
            ? staffApi.getStaffLayout(audit.warehouseId)
            : layoutApi.getTenantWarehouseLayout(audit.warehouseId)
        )
      }
      const [products, layoutResponse] = await Promise.all(requests)
      setSkuOptions(Array.isArray(products) ? products : [])
      setLayout(layoutResponse?.data?.data || null)
    } catch (error) {
      showApiErrorToast(error, 'Không thể tải SKU hoặc vị trí kho.')
    } finally {
      setUnexpectedOptionsLoading(false)
    }
  }

  const unexpectedRacks = useMemo(
    () => (Array.isArray(layout?.racks) ? layout.racks : []),
    [layout]
  )
  const unexpectedRack = unexpectedRacks.find(
    (rack) => String(rack.id) === String(unexpectedRackId)
  )
  const unexpectedBins = Array.isArray(unexpectedRack?.bins) ? unexpectedRack.bins : []

  const handleAddUnexpectedItem = async (event) => {
    event.preventDefault()
    if (audit.scopeType === 'WAREHOUSE' && !unexpectedRackId) {
      toast.error('Vui lòng chọn rack nơi phát hiện hàng.')
      return
    }
    try {
      setAddingUnexpected(true)
      const res = await auditApi.addUnexpectedItem(id, {
        skuId: unexpectedSkuId,
        actualQuantity: Number(unexpectedQuantity),
        ...(unexpectedRackId ? { rackId: unexpectedRackId } : {}),
        ...(unexpectedBinId ? { binId: unexpectedBinId } : {}),
        note: unexpectedNote,
      })
      if (res.data?.success) {
        toast.success('Đã thêm hàng phát sinh.')
        setIsUnexpectedModalOpen(false)
        fetchAuditDetail()
      }
    } catch (error) {
      showApiErrorToast(error, 'Không thể thêm hàng phát sinh.')
    } finally {
      setAddingUnexpected(false)
    }
  }

  if (loading && !audit) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Header />
        <div className="flex pt-14">
          <Sidebar currentRole={currentRole} />
          <div className="flex flex-1 items-center justify-center py-24 text-sm text-slate-500">
            Đang tải chi tiết kiểm kê...
          </div>
        </div>
      </div>
    )
  }

  if (!audit) return null

  const status = STATUS_CONFIG[audit.status] || {
    label: audit.status,
    className: 'border-slate-200 bg-slate-100 text-slate-700',
  }

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
            <header className="flex flex-col gap-4 border-b border-slate-300 pb-5 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleBack}
                aria-label="Quay lại danh sách kiểm kê"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase">
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  Phiếu kiểm kê
                </div>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                  AUD-{String(audit.id).slice(0, 8).toUpperCase()}
                </h1>
              </div>
              <span
                className={`inline-flex self-start rounded border px-2 py-1 text-xs font-semibold sm:ml-auto ${status.className}`}
              >
                {status.label}
              </span>
            </header>

            {audit.status === 'RECOUNT_REQUIRED' && audit.reviewReason && (
              <div className="border-l-2 border-orange-500 bg-orange-50 px-4 py-3 text-sm text-orange-900">
                <strong>Lý do kiểm lại:</strong> {audit.reviewReason}
              </div>
            )}

            <section className="grid border border-slate-200 bg-white md:grid-cols-2 xl:grid-cols-4">
              {[
                ['Kho', audit.warehouseName || '-'],
                ['Phạm vi', SCOPE_LABELS[audit.scopeType] || audit.scopeType || '-'],
                [
                  'Người thực hiện',
                  audit.assignedToName || audit.requestedByName || 'Chưa phân công',
                ],
                ['Vòng kiểm đếm', audit.countRound || 1],
                ['Người tạo', audit.requestedByName || '-'],
                [
                  'Bắt đầu',
                  audit.startedAt ? moment(audit.startedAt).format('DD/MM/YYYY HH:mm') : '-',
                ],
                [
                  'Nộp kết quả',
                  audit.submittedAt ? moment(audit.submittedAt).format('DD/MM/YYYY HH:mm') : '-',
                ],
                ['Người duyệt', audit.approvedByName || '-'],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="border-b border-slate-200 px-4 py-3 md:border-r xl:[&:nth-child(4n)]:border-r-0 xl:[&:nth-last-child(-n+4)]:border-b-0"
                >
                  <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
                    {label}
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-slate-900">{value}</p>
                </div>
              ))}
            </section>

            {(audit.note || (audit.reviewReason && audit.status !== 'RECOUNT_REQUIRED')) && (
              <section className="grid gap-4 border border-slate-200 bg-white p-4 md:grid-cols-2">
                {audit.note && (
                  <div>
                    <h2 className="text-xs font-semibold text-slate-500 uppercase">
                      Ghi chú kế hoạch
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{audit.note}</p>
                  </div>
                )}
                {audit.reviewReason && audit.status !== 'RECOUNT_REQUIRED' && (
                  <div>
                    <h2 className="text-xs font-semibold text-slate-500 uppercase">Lý do xử lý</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{audit.reviewReason}</p>
                  </div>
                )}
              </section>
            )}

            <section
              aria-labelledby="audit-items-heading"
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <h2 id="audit-items-heading" className="text-sm font-semibold text-slate-950">
                    Sản phẩm kiểm đếm
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {items.length} dòng trong vòng kiểm đếm hiện tại
                  </p>
                </div>
                {currentRole === 'STAFF' && (
                  <span className="text-xs text-slate-500">Chế độ blind count</span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold tracking-[0.08em] text-slate-600 uppercase">
                    <tr>
                      <th className="px-4 py-3">SKU / Sản phẩm</th>
                      <th className="px-4 py-3">Vị trí</th>
                      <th className="px-4 py-3 text-right">Hệ thống</th>
                      <th className="px-4 py-3 text-right">Thực tế</th>
                      <th className="px-4 py-3 text-right">Chênh lệch</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {items.map((item) => {
                      const hasExpected =
                        Number.isFinite(Number(item.expectedQuantity)) &&
                        item.expectedQuantity !== null
                      const hasActual = item.actualQuantity !== '' && item.actualQuantity !== null
                      const difference =
                        hasExpected && hasActual
                          ? Number(item.actualQuantity) - Number(item.expectedQuantity)
                          : item.discrepancy
                      return (
                        <tr key={item.id} className="align-top hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <p className="font-mono text-xs font-semibold text-slate-900">
                              {item.skuCode || '-'}
                            </p>
                            <p className="mt-1 max-w-56 truncate text-xs text-slate-500">
                              {item.skuName || '-'}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {[item.rackName, item.binName].filter(Boolean).join(' / ') || '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-medium tabular-nums">
                            {hasExpected ? (
                              `${item.expectedQuantity} ${item.uomSymbol || ''}`
                            ) : (
                              <span className="text-xs text-slate-400">Được ẩn</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isCounting ? (
                              <input
                                type="number"
                                min="0"
                                aria-label={`Số lượng thực tế ${item.skuCode || item.id}`}
                                value={item.actualQuantity}
                                onChange={(event) =>
                                  handleItemChange(item.id, 'actualQuantity', event.target.value)
                                }
                                className="h-9 w-24 rounded-md border border-slate-300 px-2 text-right tabular-nums outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                              />
                            ) : (
                              <span className="font-medium tabular-nums">
                                {hasActual ? `${item.actualQuantity} ${item.uomSymbol || ''}` : '-'}
                              </span>
                            )}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-semibold tabular-nums ${difference > 0 ? 'text-emerald-700' : difference < 0 ? 'text-rose-700' : 'text-slate-600'}`}
                          >
                            {difference === null || difference === undefined
                              ? '-'
                              : `${difference > 0 ? '+' : ''}${difference}`}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            {COUNT_STATUS_LABELS[item.countStatus] || item.countStatus || '-'}
                          </td>
                          <td className="px-4 py-3">
                            {isCounting ? (
                              <input
                                type="text"
                                aria-label={`Ghi chú ${item.skuCode || item.id}`}
                                value={item.note}
                                onChange={(event) =>
                                  handleItemChange(item.id, 'note', event.target.value)
                                }
                                placeholder="Ghi chú"
                                className="h-9 min-w-36 rounded-md border border-slate-300 px-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                              />
                            ) : (
                              item.note || '-'
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {!items.length && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                          Chưa có dòng kiểm đếm trong vòng hiện tại.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-300 pt-4">
              {canTenantCancel && (
                <Button
                  variant="outline"
                  className="flex items-center gap-2 text-rose-700"
                  onClick={() => setIsCancelModalOpen(true)}
                >
                  <Ban className="h-4 w-4" />
                  Hủy phiếu
                </Button>
              )}
              {canStart && (
                <Button
                  onClick={handleStartAudit}
                  isLoading={starting}
                  className="flex items-center gap-2"
                >
                  <PlayCircle className="h-4 w-4" />
                  {audit.status === 'RECOUNT_REQUIRED' ? 'Bắt đầu kiểm lại' : 'Bắt đầu kiểm kê'}
                </Button>
              )}
              {isCounting && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleOpenUnexpectedModal}
                    className="flex items-center gap-2"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Thêm hàng phát sinh
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSaveCounts}
                    isLoading={saving}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Lưu tiến độ
                  </Button>
                  <Button
                    onClick={handleSubmitAudit}
                    isLoading={submitting}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Nộp kết quả
                  </Button>
                </>
              )}
              {isSubmitted && currentRole === 'TENANT' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsRecountModalOpen(true)}
                    className="flex items-center gap-2 text-orange-700"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Yêu cầu kiểm lại
                  </Button>
                  {canApprove && (
                    <Button
                      onClick={handleApprove}
                      isLoading={approving}
                      className="flex items-center gap-2 bg-emerald-700 text-white hover:bg-emerald-800"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Duyệt và cập nhật tồn
                    </Button>
                  )}
                </>
              )}
              {isSubmitted && currentRole === 'STAFF' && (
                <span className="border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600">
                  Đang chờ Tenant duyệt kết quả
                </span>
              )}
            </div>
          </main>
        </div>
      </div>

      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Hủy phiếu kiểm kê"
        size="md"
      >
        <FormShell onSubmit={handleCancel} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Lý do (không bắt buộc)
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Nhập lý do hủy..."
              className="mt-1.5 w-full rounded-md border border-slate-300 p-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsCancelModalOpen(false)}>
              Đóng
            </Button>
            <Button
              type="submit"
              className="bg-rose-700 text-white hover:bg-rose-800"
              isLoading={cancelling}
            >
              Xác nhận hủy
            </Button>
          </div>
        </FormShell>
      </Modal>

      <Modal
        isOpen={isRecountModalOpen}
        onClose={() => setIsRecountModalOpen(false)}
        title="Yêu cầu kiểm đếm lại"
        size="md"
      >
        <FormShell onSubmit={handleRecount} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Lý do <span className="text-red-600">*</span>
            <textarea
              rows={3}
              value={recountReason}
              onChange={(event) => setRecountReason(event.target.value)}
              required
              placeholder="Mô tả lý do cần kiểm lại..."
              className="mt-1.5 w-full rounded-md border border-slate-300 p-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsRecountModalOpen(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              className="bg-orange-700 text-white hover:bg-orange-800"
              isLoading={recounting}
            >
              Yêu cầu kiểm lại
            </Button>
          </div>
        </FormShell>
      </Modal>

      <Modal
        isOpen={isUnexpectedModalOpen}
        onClose={() => setIsUnexpectedModalOpen(false)}
        title="Thêm hàng phát sinh"
        size="md"
      >
        <FormShell onSubmit={handleAddUnexpectedItem} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            SKU <span className="text-red-600">*</span>
            <select
              value={unexpectedSkuId}
              onChange={(event) => setUnexpectedSkuId(event.target.value)}
              disabled={unexpectedOptionsLoading}
              required
              className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            >
              <option value="">{unexpectedOptionsLoading ? 'Đang tải SKU...' : 'Chọn SKU'}</option>
              {skuOptions.map((sku) => (
                <option key={sku.id} value={sku.id}>
                  [{sku.skuCode}] {sku.name}
                </option>
              ))}
            </select>
          </label>
          {audit.scopeType === 'WAREHOUSE' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Rack <span className="text-red-600">*</span>
                <select
                  value={unexpectedRackId}
                  onChange={(event) => {
                    setUnexpectedRackId(event.target.value)
                    setUnexpectedBinId('')
                  }}
                  required
                  className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Chọn rack</option>
                  {unexpectedRacks.map((rack) => (
                    <option key={rack.id} value={rack.id}>
                      {rack.name || rack.code || rack.id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Bin (không bắt buộc)
                <select
                  value={unexpectedBinId}
                  onChange={(event) => setUnexpectedBinId(event.target.value)}
                  disabled={!unexpectedRackId}
                  className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                >
                  <option value="">Không chọn bin</option>
                  {unexpectedBins.map((bin) => (
                    <option key={bin.id} value={bin.id}>
                      {bin.name || bin.code || bin.id}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <label className="block text-sm font-medium text-slate-700">
            Số lượng tìm thấy <span className="text-red-600">*</span>
            <input
              type="number"
              min="0"
              value={unexpectedQuantity}
              onChange={(event) => setUnexpectedQuantity(event.target.value)}
              required
              className="mt-1.5 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Ghi chú
            <textarea
              rows={2}
              value={unexpectedNote}
              onChange={(event) => setUnexpectedNote(event.target.value)}
              placeholder="Vị trí hoặc tình trạng phát hiện..."
              className="mt-1.5 w-full rounded-md border border-slate-300 p-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsUnexpectedModalOpen(false)}>
              Đóng
            </Button>
            <Button type="submit" isLoading={addingUnexpected}>
              Thêm sản phẩm
            </Button>
          </div>
        </FormShell>
      </Modal>
    </div>
  )
}

export default InventoryAuditDetailPage
