import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { useLanguage } from '@/i18n/LanguageContext'

const STATUS_CONFIG = {
  EDIT_REQUESTED: {
    label: { vi: 'Yêu cầu mở lại', en: 'Edit requested' },
    className: 'border-purple-200 bg-purple-50 text-purple-800',
  },
  REOPENED: {
    label: { vi: 'Đã mở lại', en: 'Reopened' },
    className: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  },
  PENDING: {
    label: { vi: 'Kế hoạch cũ', en: 'Legacy pending' },
    className: 'border-slate-200 bg-slate-100 text-slate-700',
  },
  DRAFT: {
    label: { vi: 'Bản nháp', en: 'Draft' },
    className: 'border-slate-200 bg-slate-100 text-slate-700',
  },
  IN_PROGRESS: {
    label: { vi: 'Đang kiểm đếm', en: 'In progress' },
    className: 'border-blue-200 bg-blue-50 text-blue-800',
  },
  SUBMITTED: {
    label: { vi: 'Chờ duyệt', en: 'Submitted' },
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  RECOUNT_REQUIRED: {
    label: { vi: 'Cần kiểm lại', en: 'Recount required' },
    className: 'border-orange-200 bg-orange-50 text-orange-800',
  },
  APPROVED: {
    label: { vi: 'Đã duyệt', en: 'Approved' },
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  REJECTED: {
    label: { vi: 'Đã từ chối (cũ)', en: 'Rejected (legacy)' },
    className: 'border-rose-200 bg-rose-50 text-rose-800',
  },
  CANCELLED: {
    label: { vi: 'Đã hủy', en: 'Cancelled' },
    className: 'border-red-200 bg-red-50 text-red-800',
  },
}

const SCOPE_LABELS = { WAREHOUSE: 'Whole warehouse', RACK: 'By Rack', BIN: 'By Bin' }
const COUNT_STATUS_LABELS = { UNCOUNTED: 'Uncounted', COUNTED: 'Counted', SKIPPED: 'Skipped' }
const DUPLICATE_ITEM_MESSAGE =
  'This SKU already exists at this location. Enter the final actual quantity on the existing row.'

const sameId = (firstId, secondId) => String(firstId ?? '') === String(secondId ?? '')

const InventoryAuditDetailPage = ({ currentRole }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  const currentUser = useSelector((state) => state.auth.user)
  const { language } = useLanguage()

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
  const [isEditRequestModalOpen, setIsEditRequestModalOpen] = useState(false)
  const [editReason, setEditReason] = useState('')
  const [requestingEdit, setRequestingEdit] = useState(false)
  const [approvingEdit, setApprovingEdit] = useState(false)
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
  const [highlightedItemId, setHighlightedItemId] = useState(null)
  const itemRowRefs = useRef(new Map())
  const quantityInputRefs = useRef(new Map())
  const focusItemTimerRef = useRef(null)
  const clearHighlightTimerRef = useRef(null)

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
      showApiErrorToast(error, 'Could not load audit details.')
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

  const notifyInventoryRefresh = () => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(
      new CustomEvent('stockspace:inventory-refresh', {
        detail: { warehouseId: audit?.warehouseId },
      })
    )
  }

  useEffect(() => {
    if (!audit?.warehouseId) return
    notifyInventoryRefresh()
    // Audit status changes are the source of truth for stock masking/unmasking.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audit?.status, audit?.warehouseId])

  useEffect(
    () => () => {
      window.clearTimeout(focusItemTimerRef.current)
      window.clearTimeout(clearHighlightTimerRef.current)
    },
    []
  )

  const currentUserId = currentUser?.userId || currentUser?.id
  const canOperateAsStaff =
    currentRole !== 'STAFF' ||
    Boolean(
      audit?.assignedToId && currentUserId && String(audit.assignedToId) === String(currentUserId)
    )
  const isCounting =
    canOperateAsStaff && (audit?.status === 'IN_PROGRESS' || audit?.status === 'REOPENED')
  const canStart =
    canOperateAsStaff && (audit?.status === 'DRAFT' || audit?.status === 'RECOUNT_REQUIRED')
  const isSubmitted = audit?.status === 'SUBMITTED'
  const isEditRequested = audit?.status === 'EDIT_REQUESTED'
  const canApprove =
    isSubmitted &&
    currentRole === 'TENANT' &&
    (!audit?.assignedToId || !currentUserId || String(audit.assignedToId) !== String(currentUserId))
  const canTenantCancel =
    currentRole === 'TENANT' && audit?.status !== 'APPROVED' && audit?.status !== 'CANCELLED'
  const canSaveNotes =
    canOperateAsStaff &&
    currentRole === 'STAFF' &&
    (isSubmitted || isEditRequested) &&
    items.length > 0
  const canRequestEdit = canOperateAsStaff && currentRole === 'STAFF' && isSubmitted
  const canApproveEdit = currentRole === 'TENANT' && isEditRequested
  const displayItems = useMemo(
    () => [
      ...items.filter((item) => item.itemOrigin !== 'UNEXPECTED'),
      ...items.filter((item) => item.itemOrigin === 'UNEXPECTED'),
    ],
    [items]
  )

  const focusExistingItem = useCallback((itemId) => {
    const itemKey = String(itemId)
    setIsUnexpectedModalOpen(false)
    setHighlightedItemId(itemKey)
    window.clearTimeout(focusItemTimerRef.current)
    window.clearTimeout(clearHighlightTimerRef.current)
    focusItemTimerRef.current = window.setTimeout(() => {
      itemRowRefs.current.get(itemKey)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      quantityInputRefs.current.get(itemKey)?.focus({ preventScroll: true })
    }, 150)
    clearHighlightTimerRef.current = window.setTimeout(() => {
      setHighlightedItemId(null)
    }, 2500)
  }, [])

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
      toast.error('Enter the actual quantity for every product.')
      return null
    }
    if (!completedItems.length && items.length) {
      toast.error('There are no counted quantities to save.')
      return null
    }
    if (
      completedItems.some((item) => {
        const quantity = Number(item.actualQuantity)
        return !Number.isInteger(quantity) || quantity < 0
      })
    ) {
      toast.error('Actual quantities must be non-negative whole numbers.')
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

  const buildNotesPayload = () => ({
    items: items.map((item) => ({
      itemId: item.id,
      note: item.note || '',
      varianceReason: item.varianceReason || '',
    })),
  })

  const handleStartAudit = async () => {
    try {
      setStarting(true)
      const res = await auditApi.startAudit(id)
      if (res.data?.success) {
        toast.success(
          audit.status === 'RECOUNT_REQUIRED'
            ? 'The recount cycle has started.'
            : 'The audit has started.'
        )
        fetchAuditDetail()
      }
    } catch (error) {
      showApiErrorToast(error, 'Could not start the audit.')
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
        toast.success('Count results saved.')
        fetchAuditDetail()
      }
    } catch (error) {
      showApiErrorToast(error, 'Could not save count results.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!items.length) return
    try {
      setSaving(true)
      const res = await auditApi.saveNotes(id, buildNotesPayload())
      if (res.data?.success) {
        toast.success('Audit note saved.')
        fetchAuditDetail()
      }
    } catch (error) {
      showApiErrorToast(error, 'Could not save the audit note.')
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
        toast.success('Audit results submitted.')
        fetchAuditDetail()
      }
    } catch (error) {
      showApiErrorToast(error, 'Could not submit audit results.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async () => {
    try {
      setApproving(true)
      const res = await auditApi.approveAudit(id)
      if (res.data?.success) {
        toast.success('Audit approved and inventory updated.')
        fetchAuditDetail()
      }
    } catch (error) {
      showApiErrorToast(error, 'Could not approve the audit.')
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
        toast.success('Audit canceled.')
        setIsCancelModalOpen(false)
        setCancelReason('')
        fetchAuditDetail()
      }
    } catch (error) {
      showApiErrorToast(error, 'Could not cancel the audit.')
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
        toast.success('Recount requested.')
        setIsRecountModalOpen(false)
        setRecountReason('')
        fetchAuditDetail()
      }
    } catch (error) {
      showApiErrorToast(error, 'Could not request a recount.')
    } finally {
      setRecounting(false)
    }
  }

  const handleRequestEdit = async (event) => {
    event.preventDefault()
    const reason = editReason.trim()
    if (!reason) return
    try {
      setRequestingEdit(true)
      const res = await auditApi.requestEdit(id, { reason })
      if (res.data?.success) {
        toast.success('Reopen request submitted.')
        setIsEditRequestModalOpen(false)
        setEditReason('')
        fetchAuditDetail()
      }
    } catch (error) {
      showApiErrorToast(error, 'Could not submit the reopen request.')
    } finally {
      setRequestingEdit(false)
    }
  }

  const handleApproveEdit = async () => {
    try {
      setApprovingEdit(true)
      const res = await auditApi.approveEdit(id)
      if (res.data?.success) {
        toast.success('Count editing has been reopened.')
        fetchAuditDetail()
      }
    } catch (error) {
      showApiErrorToast(error, 'Could not approve the reopen request.')
    } finally {
      setApprovingEdit(false)
    }
  }

  const handleOpenUnexpectedModal = async () => {
    const scopeType = audit.scopeType || 'WAREHOUSE'
    setUnexpectedSkuId('')
    setUnexpectedRackId(scopeType === 'RACK' ? audit.scopeRackId || '' : '')
    setUnexpectedBinId('')
    setUnexpectedQuantity(1)
    setUnexpectedNote('')
    setLayout(null)
    setIsUnexpectedModalOpen(true)
    try {
      setUnexpectedOptionsLoading(true)
      const requests = [productApi.getAllSKUs({ size: 100 })]
      if (scopeType === 'RACK' || scopeType === 'WAREHOUSE') {
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
      showApiErrorToast(error, 'Could not load SKUs or warehouse locations.')
    } finally {
      setUnexpectedOptionsLoading(false)
    }
  }

  const layoutRacks = Array.isArray(layout?.racks) ? layout.racks : []
  const unexpectedRacks =
    audit?.scopeType === 'RACK'
      ? layoutRacks.filter((rack) => sameId(rack.id, audit.scopeRackId))
      : layoutRacks
  const unexpectedRack = unexpectedRacks.find(
    (rack) => String(rack.id) === String(unexpectedRackId)
  )
  const unexpectedBins = Array.isArray(unexpectedRack?.bins) ? unexpectedRack.bins : []
  const scopeType = audit?.scopeType || 'WAREHOUSE'
  const hasUnexpectedLocationConfigurationError =
    (!unexpectedOptionsLoading &&
      scopeType === 'RACK' &&
      (!audit?.scopeRackId || !unexpectedRack || unexpectedBins.length === 0)) ||
    (scopeType === 'BIN' && !audit?.scopeBinId) ||
    (!unexpectedOptionsLoading && scopeType === 'WAREHOUSE' && unexpectedRacks.length === 0) ||
    (scopeType === 'WAREHOUSE' && Boolean(unexpectedRackId) && unexpectedBins.length === 0)

  const handleAddUnexpectedItem = async (event) => {
    event.preventDefault()
    const quantity = Number(unexpectedQuantity)
    if (!unexpectedSkuId) {
      toast.error('Select an SKU.')
      return
    }
    if (unexpectedQuantity === '' || !Number.isInteger(quantity) || quantity < 0) {
      toast.error('The found quantity must be a non-negative whole number.')
      return
    }
    if (scopeType === 'BIN' && !audit.scopeBinId) {
      toast.error('The audit record is missing its audit bin. Reload the page or contact an administrator.')
      return
    }
    if (scopeType === 'RACK' && !audit.scopeRackId) {
      toast.error('The audit record is missing its audit rack. Reload the page or contact an administrator.')
      return
    }
    if (scopeType === 'RACK' && !unexpectedBinId) {
      toast.error('Select the bin where the stock was found.')
      return
    }
    if (scopeType === 'WAREHOUSE' && !unexpectedRackId) {
      toast.error('Select the rack where the stock was found.')
      return
    }
    if (scopeType === 'WAREHOUSE' && !unexpectedBinId) {
      toast.error('Select the bin where the stock was found.')
      return
    }

    const resolvedRackId = scopeType === 'BIN' ? audit.scopeRackId : unexpectedRackId
    const resolvedBinId = scopeType === 'BIN' ? audit.scopeBinId : unexpectedBinId
    const existingItem = items.find(
      (item) =>
        sameId(item.skuId, unexpectedSkuId) &&
        sameId(item.rackId, resolvedRackId) &&
        sameId(item.binId, resolvedBinId)
    )

    try {
      setAddingUnexpected(true)
      const res = await auditApi.addUnexpectedItem(id, {
        skuId: unexpectedSkuId,
        actualQuantity: quantity,
        ...(scopeType !== 'BIN' ? { rackId: resolvedRackId, binId: resolvedBinId } : {}),
        note: unexpectedNote,
      })
      if (res.data?.success) {
        toast.success('Found stock added.')
        setIsUnexpectedModalOpen(false)
        fetchAuditDetail()
      }
    } catch (error) {
      const errorCode = error?.response?.data?.code || error?.response?.data?.errorCode
      if (errorCode === 'AUDIT_ITEM_DUPLICATE') {
        toast.error(DUPLICATE_ITEM_MESSAGE, { id: 'audit-item-duplicate' })
        if (existingItem) {
          focusExistingItem(existingItem.id)
        } else {
          setIsUnexpectedModalOpen(false)
        }
        return
      }
      showApiErrorToast(error, 'Could not add found stock.')
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
            Loading audit details...
          </div>
        </div>
      </div>
    )
  }

  if (!audit) return null

  const status = STATUS_CONFIG[audit.status] || {
    label: { vi: audit.status, en: audit.status },
    className: 'border-slate-200 bg-slate-100 text-slate-700',
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header />
      <div className="md:hidden">
        {isMobileOpen && (
          <button
            type="button"
            aria-label="Close navigation"
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
                aria-label="Back to audit list"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase">
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  Inventory audit
                </div>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                  AUD-{String(audit.id).slice(0, 8).toUpperCase()}
                </h1>
              </div>
              <span
                className={`inline-flex self-start rounded border px-2 py-1 text-xs font-semibold sm:ml-auto ${status.className}`}
              >
                {status.label[language] || status.label.en}
              </span>
            </header>

            {audit.status === 'RECOUNT_REQUIRED' && audit.reviewReason && (
              <div className="border-l-2 border-orange-500 bg-orange-50 px-4 py-3 text-sm text-orange-900">
                <strong>Recount reason:</strong> {audit.reviewReason}
              </div>
            )}

            <section className="grid border border-slate-200 bg-white md:grid-cols-2 xl:grid-cols-4">
              {[
                ['Warehouse', audit.warehouseName || '-'],
                ['Scope', SCOPE_LABELS[audit.scopeType] || audit.scopeType || '-'],
                [
                  'Assigned to',
                  audit.assignedToName || audit.requestedByName || 'Not assigned',
                ],
                ['Count round', audit.countRound || 1],
                ['Created by', audit.requestedByName || '-'],
                [
                  'Started',
                  audit.startedAt ? moment(audit.startedAt).format('DD/MM/YYYY HH:mm') : '-',
                ],
                [
                  'Submitted',
                  audit.submittedAt ? moment(audit.submittedAt).format('DD/MM/YYYY HH:mm') : '-',
                ],
                ['Approved by', audit.approvedByName || '-'],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="border-b border-slate-200 px-3 py-2.5 md:border-r xl:[&:nth-child(4n)]:border-r-0 xl:[&:nth-last-child(-n+4)]:border-b-0"
                >
                  <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
                    {label}
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-slate-900">{value}</p>
                </div>
              ))}
            </section>

            {(audit.note || (audit.reviewReason && audit.status !== 'RECOUNT_REQUIRED')) && (
              <section className="grid gap-3 border border-slate-200 bg-white p-3 md:grid-cols-2">
                {audit.note && (
                  <div>
                    <h2 className="text-xs font-semibold text-slate-500 uppercase">
                      Plan notes
                    </h2>
                    <p className="mt-1.5 text-sm leading-6 text-slate-700">{audit.note}</p>
                  </div>
                )}
                {audit.reviewReason && audit.status !== 'RECOUNT_REQUIRED' && (
                  <div>
                    <h2 className="text-xs font-semibold text-slate-500 uppercase">Review reason</h2>
                    <p className="mt-1.5 text-sm leading-6 text-slate-700">{audit.reviewReason}</p>
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
                    Counted products
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {items.length} items in the current count round
                  </p>
                </div>
                {currentRole === 'STAFF' && isCounting && (
                  <span className="text-xs text-slate-500">Blind count mode</span>
                )}
                {canSaveNotes && (
                  <span className="text-xs text-purple-700">Notes only</span>
                )}
              </div>
              <div className="table-scroll-container min-w-0 max-w-full overflow-x-auto">
                <table className="w-full min-w-[960px] text-left text-sm">
                  <thead className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 text-[11px] font-semibold tracking-[0.08em] text-slate-600 uppercase shadow-sm">
                    <tr>
                      <th className="sticky left-0 z-30 bg-slate-50 px-4 py-3 shadow-[2px_0_4px_-2px_rgba(15,23,42,0.2)]">SKU / Product</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3 text-right">System</th>
                      <th className="px-4 py-3 text-right">Actual</th>
                      <th className="px-4 py-3 text-right">Difference</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {displayItems.map((item) => {
                      const hasExpected =
                        Number.isFinite(Number(item.expectedQuantity)) &&
                        item.expectedQuantity !== null
                      const hasActual = item.actualQuantity !== '' && item.actualQuantity !== null
                      const difference =
                        hasExpected && hasActual
                          ? Number(item.actualQuantity) - Number(item.expectedQuantity)
                          : item.discrepancy
                      const isUnexpected = item.itemOrigin === 'UNEXPECTED'
                      const isSnapshot = item.itemOrigin === 'SNAPSHOT'
                      return (
                        <tr
                          key={item.id}
                          ref={(element) => {
                            const itemKey = String(item.id)
                            if (element) itemRowRefs.current.set(itemKey, element)
                            else itemRowRefs.current.delete(itemKey)
                          }}
                          data-audit-item-id={item.id}
                          className={`group align-top transition-colors ${
                            highlightedItemId === String(item.id)
                              ? 'bg-amber-100 ring-2 ring-amber-400 ring-inset'
                              : isUnexpected
                                ? 'bg-amber-50/70 hover:bg-amber-100/70'
                                : 'hover:bg-slate-50'
                          }`}
                        >
                          <td
                            className={`sticky left-0 z-10 px-4 py-3 shadow-[2px_0_4px_-2px_rgba(15,23,42,0.14)] ${
                              highlightedItemId === String(item.id)
                                ? 'bg-amber-100'
                                : isUnexpected
                                  ? 'bg-amber-50/70 group-hover:bg-amber-100/70'
                                  : 'bg-white group-hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="font-mono text-xs font-semibold text-slate-900">
                                {item.skuCode || '-'}
                              </p>
                              {(isUnexpected || isSnapshot) && (
                                <span
                                  className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                                    isUnexpected
                                      ? 'border-amber-300 bg-amber-100 text-amber-800'
                                      : 'border-slate-200 bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {isUnexpected ? 'Unexpected' : 'From records'}
                                </span>
                              )}
                            </div>
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
                                <span className="text-xs text-slate-400">Hidden</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isCounting ? (
                              <input
                                ref={(element) => {
                                  const itemKey = String(item.id)
                                  if (element) quantityInputRefs.current.set(itemKey, element)
                                  else quantityInputRefs.current.delete(itemKey)
                                }}
                                type="number"
                                min="0"
                                aria-label={`Actual quantity for ${item.skuCode || item.id}`}
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
                            {isCounting || canSaveNotes ? (
                              <input
                                type="text"
                                aria-label={`Note for ${item.skuCode || item.id}`}
                                value={item.note}
                                onChange={(event) =>
                                  handleItemChange(item.id, 'note', event.target.value)
                                }
                                placeholder="Notes"
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
                          No count items in the current round.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-300 pt-4">
              {currentRole === 'STAFF' && !canOperateAsStaff && (
                <span className="mr-auto border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600">
                  This audit is not assigned to you
                </span>
              )}
              {canTenantCancel && (
                <Button
                  variant="outline"
                  className="flex items-center gap-2 text-rose-700"
                  onClick={() => setIsCancelModalOpen(true)}
                >
                  <Ban className="h-4 w-4" />
                  Cancel audit
                </Button>
              )}
              {canStart && (
                <Button
                  onClick={handleStartAudit}
                  isLoading={starting}
                  className="flex items-center gap-2"
                >
                  <PlayCircle className="h-4 w-4" />
                  {audit.status === 'RECOUNT_REQUIRED' ? 'Start recount' : 'Start audit'}
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
                    Add unexpected item
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSaveCounts}
                    isLoading={saving}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save progress
                  </Button>
                  <Button
                    onClick={handleSubmitAudit}
                    isLoading={submitting}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Submit results
                  </Button>
                </>
              )}
              {canSaveNotes && (
                <Button
                  variant="outline"
                  onClick={handleSaveNotes}
                  isLoading={saving}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save notes
                </Button>
              )}
              {canRequestEdit && (
                <Button
                  variant="outline"
                  onClick={() => setIsEditRequestModalOpen(true)}
                  className="flex items-center gap-2 text-purple-700"
                >
                  <RotateCcw className="h-4 w-4" />
                  Request quantity edit
                </Button>
              )}
              {isSubmitted && currentRole === 'TENANT' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsRecountModalOpen(true)}
                    className="flex items-center gap-2 text-orange-700"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Request recount
                  </Button>
                  {canApprove && (
                    <Button
                      onClick={handleApprove}
                      isLoading={approving}
                      className="flex items-center gap-2 bg-emerald-700 text-white hover:bg-emerald-800"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve and update stock
                    </Button>
                  )}
                </>
              )}
              {canApproveEdit && (
                <Button
                  onClick={handleApproveEdit}
                  isLoading={approvingEdit}
                  className="flex items-center gap-2 bg-purple-700 text-white hover:bg-purple-800"
                >
                  <CheckCircle className="h-4 w-4" />
                  Allow editing
                </Button>
              )}
              {isSubmitted && currentRole === 'STAFF' && (
                <span className="border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600">
                  Waiting for tenant approval
                </span>
              )}
              {isEditRequested && currentRole === 'STAFF' && (
                <span className="border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-800">
                  Waiting for tenant edit approval
                </span>
              )}
            </div>
          </main>
        </div>
      </div>

      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel inventory audit"
        size="md"
      >
        <FormShell onSubmit={handleCancel} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Reason (optional)
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Enter a cancellation reason..."
              className="mt-1.5 w-full rounded-md border border-slate-300 p-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsCancelModalOpen(false)}>
              Close
            </Button>
            <Button
              type="submit"
              className="bg-rose-700 text-white hover:bg-rose-800"
              isLoading={cancelling}
            >
              Confirm cancellation
            </Button>
          </div>
        </FormShell>
      </Modal>

      <Modal
        isOpen={isEditRequestModalOpen}
        onClose={() => setIsEditRequestModalOpen(false)}
        title="Request audit reopening"
        size="md"
      >
        <FormShell onSubmit={handleRequestEdit} className="space-y-4">
          <div className="rounded-lg border border-purple-100 bg-purple-50 px-3 py-2 text-sm text-purple-900">
            The tenant will review this request before allowing the counted quantities to be updated.
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Reason <span className="text-red-600">*</span>
            <textarea
              rows={4}
              value={editReason}
              onChange={(event) => setEditReason(event.target.value)}
              required
              placeholder="Describe why the quantities need to be edited..."
              className="mt-1.5 w-full rounded-md border border-slate-300 p-3 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
            />
          </label>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditRequestModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-purple-700 text-white hover:bg-purple-800"
              isLoading={requestingEdit}
            >
              Send request
            </Button>
          </div>
        </FormShell>
      </Modal>

      <Modal
        isOpen={isRecountModalOpen}
        onClose={() => setIsRecountModalOpen(false)}
        title="Request recount"
        size="md"
      >
        <FormShell onSubmit={handleRecount} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Reason <span className="text-red-600">*</span>
            <textarea
              rows={3}
              value={recountReason}
              onChange={(event) => setRecountReason(event.target.value)}
              required
              placeholder="Describe why a recount is needed..."
              className="mt-1.5 w-full rounded-md border border-slate-300 p-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsRecountModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-orange-700 text-white hover:bg-orange-800"
              isLoading={recounting}
            >
              Request recount
            </Button>
          </div>
        </FormShell>
      </Modal>

      <Modal
        isOpen={isUnexpectedModalOpen}
        onClose={() => setIsUnexpectedModalOpen(false)}
        title="Add unexpected item"
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
              <option value="">{unexpectedOptionsLoading ? 'Loading SKUs...' : 'Select SKU'}</option>
              {skuOptions.map((sku) => (
                <option key={sku.id} value={sku.id}>
                  [{sku.skuCode}] {sku.name}
                </option>
              ))}
            </select>
          </label>
          {scopeType === 'BIN' && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Fixed location
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {[audit.scopeRackName, audit.scopeBinName].filter(Boolean).join(' / ') ||
                  'Location information unavailable'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Unexpected items will be recorded in the Bin covered by this audit.
              </p>
            </div>
          )}
          {scopeType === 'RACK' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  Fixed Rack
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {audit.scopeRackName || 'Rack information unavailable'}
                </p>
              </div>
              <label className="block text-sm font-medium text-slate-700">
                Bin <span className="text-red-600">*</span>
                <select
                  value={unexpectedBinId}
                  onChange={(event) => setUnexpectedBinId(event.target.value)}
                  disabled={unexpectedOptionsLoading || unexpectedBins.length === 0}
                  required
                  className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                >
                  <option value="">
                    {unexpectedOptionsLoading ? 'Loading bins...' : 'Select bin'}
                  </option>
                  {unexpectedBins.map((bin) => (
                    <option key={bin.id} value={bin.id}>
                      {bin.name || bin.code || bin.id}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {scopeType === 'WAREHOUSE' && (
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
                  <option value="">Select rack</option>
                  {unexpectedRacks.map((rack) => (
                    <option key={rack.id} value={rack.id}>
                      {rack.name || rack.code || rack.id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Bin <span className="text-red-600">*</span>
                <select
                  value={unexpectedBinId}
                  onChange={(event) => setUnexpectedBinId(event.target.value)}
                  disabled={!unexpectedRackId || unexpectedBins.length === 0}
                  required
                  className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                >
                  <option value="">Select bin</option>
                  {unexpectedBins.map((bin) => (
                    <option key={bin.id} value={bin.id}>
                      {bin.name || bin.code || bin.id}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {hasUnexpectedLocationConfigurationError && (
            <div
              role="alert"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            >
              The audit scope location configuration is invalid or no available bin was found.
              Check the warehouse layout and try again.
            </div>
          )}
          <label className="block text-sm font-medium text-slate-700">
            Found quantity <span className="text-red-600">*</span>
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
            Notes
            <textarea
              rows={2}
              value={unexpectedNote}
              onChange={(event) => setUnexpectedNote(event.target.value)}
              placeholder="Condition or additional description..."
              className="mt-1.5 w-full rounded-md border border-slate-300 p-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsUnexpectedModalOpen(false)}>
              Close
            </Button>
            <Button
              type="submit"
              isLoading={addingUnexpected}
              disabled={
                addingUnexpected ||
                unexpectedOptionsLoading ||
                hasUnexpectedLocationConfigurationError
              }
            >
              Add product
            </Button>
          </div>
        </FormShell>
      </Modal>
    </div>
  )
}

export default InventoryAuditDetailPage
