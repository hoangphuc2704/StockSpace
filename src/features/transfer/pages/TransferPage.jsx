import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  Clock3,
  Eye,
  Filter,
  Loader2,
  PackageCheck,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Truck,
  Undo2,
  X,
} from 'lucide-react'
import { closeMobileSidebar } from '@/store/uiSlide'
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'
import TableActionMenu from '@/components/TableActionMenu'
import transferApi, { createTransferIdempotencyKey } from '@/services/wms/transferApi'
import warehouseApi from '@/services/warehouse/warehouseApi'
import { toast } from 'react-hot-toast'
import { showApiErrorToast } from '@/config/apiError'
import { useConfirmDialog } from '@/components/ConfirmDialogProvider'
import CreateTransferModal from '../components/CreateTransferModal'
import ReceiveTransferModal from '../components/ReceiveTransferModal'
import TransferActionModal from '../components/TransferActionModal'
import TransferDetailModal from '../components/TransferDetailModal'
import useActiveWarehouseContext from '@/hooks/useActiveWarehouseContext'

const STATUS_META = {
  DRAFT: ['Draft', 'border-slate-200 bg-slate-100 text-slate-700', Clock3],
  PENDING: ['Awaiting allocation', 'border-amber-200 bg-amber-50 text-amber-800', Clock3],
  ALLOCATED: ['Allocated', 'border-indigo-200 bg-indigo-50 text-indigo-700', PackageCheck],
  PICKING: ['Picking', 'border-indigo-200 bg-indigo-50 text-indigo-700', PackageCheck],
  READY_TO_DISPATCH: ['Ready to dispatch', 'border-blue-200 bg-blue-50 text-blue-700', Truck],
  IN_TRANSIT: ['In transit', 'border-blue-200 bg-blue-50 text-blue-700', Truck],
  OVERDUE: ['Overdue', 'border-rose-200 bg-rose-50 text-rose-700', AlertCircle],
  ARRIVED_AT_DESTINATION: [
    'Arrived at destination',
    'border-cyan-200 bg-cyan-50 text-cyan-700',
    PackageCheck,
  ],
  RECEIVING: ['Receiving', 'border-cyan-200 bg-cyan-50 text-cyan-700', PackageCheck],
  PARTIALLY_RECEIVED: [
    'Partially received',
    'border-amber-200 bg-amber-50 text-amber-800',
    PackageCheck,
  ],
  SHORT_RECEIVED: ['Short received', 'border-amber-200 bg-amber-50 text-amber-800', AlertCircle],
  RECEIVE_REJECTED: ['Receipt rejected', 'border-rose-200 bg-rose-50 text-rose-700', X],
  RECONCILING: [
    'Needs reconciliation',
    'border-purple-200 bg-purple-50 text-purple-700',
    AlertCircle,
  ],
  RETRY_REQUESTED: ['Retry requested', 'border-indigo-200 bg-indigo-50 text-indigo-700', RotateCcw],
  RETURN_REQUESTED: ['Return requested', 'border-orange-200 bg-orange-50 text-orange-700', Undo2],
  RETURN_IN_TRANSIT: ['Return in transit', 'border-orange-200 bg-orange-50 text-orange-700', Truck],
  PARTIALLY_RETURNED: [
    'Partially returned',
    'border-orange-200 bg-orange-50 text-orange-700',
    Undo2,
  ],
  RETURNED: ['Returned', 'border-slate-200 bg-slate-100 text-slate-700', Undo2],
  COMPLETED: ['Completed', 'border-emerald-200 bg-emerald-50 text-emerald-700', CheckCircle2],
  LOST: ['Declared lost', 'border-rose-200 bg-rose-50 text-rose-700', AlertCircle],
  REJECTED: ['Rejected', 'border-rose-200 bg-rose-50 text-rose-700', X],
  CANCELLED: ['Cancelled', 'border-slate-200 bg-slate-100 text-slate-700', X],
}

const STATUS_FILTERS = [
  { id: 'ALL', label: 'All transfers' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'IN_PROGRESS', label: 'Allocation & picking' },
  { id: 'IN_TRANSIT', label: 'In transit' },
  { id: 'RECEIVING', label: 'Receiving' },
  { id: 'ATTENTION', label: 'Needs attention' },
  { id: 'CLOSED', label: 'Closed' },
]

const CLOSED_STATUSES = new Set(['COMPLETED', 'RETURNED', 'LOST', 'REJECTED', 'CANCELLED'])
const ATTENTION_STATUSES = new Set([
  'OVERDUE',
  'SHORT_RECEIVED',
  'RECEIVE_REJECTED',
  'RECONCILING',
  'RETRY_REQUESTED',
  'RETURN_REQUESTED',
  'RETURN_IN_TRANSIT',
  'PARTIALLY_RETURNED',
])
const IN_PROGRESS_STATUSES = new Set(['ALLOCATED', 'PICKING', 'READY_TO_DISPATCH'])
const RECEIVING_STATUSES = new Set(['ARRIVED_AT_DESTINATION', 'RECEIVING', 'PARTIALLY_RECEIVED'])

const getStatusMeta = (status) => {
  const [label, className, icon] = STATUS_META[status] || [
    status || 'Unknown',
    'border-slate-200 bg-slate-100 text-slate-700',
    AlertCircle,
  ]
  return { label, className, icon }
}

const matchesStatusFilter = (status, filter) => {
  if (filter === 'ALL') return true
  if (filter === 'CLOSED') return CLOSED_STATUSES.has(status)
  if (filter === 'IN_PROGRESS') return IN_PROGRESS_STATUSES.has(status)
  if (filter === 'RECEIVING') return RECEIVING_STATUSES.has(status)
  if (filter === 'ATTENTION') return ATTENTION_STATUSES.has(status)
  return status === filter
}

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : '—'
const totalRequested = (transfer) =>
  (transfer.items || []).reduce((sum, item) => sum + Number(item.requestedQuantity || 0), 0)
const totalOutstanding = (transfer) =>
  (transfer.items || []).reduce(
    (sum, item) =>
      sum +
      Math.max(
        0,
        Number(item.requestedQuantity || 0) -
          Number(item.receivedQuantity || 0) -
          Number(item.returnedQuantity || 0)
      ),
    0
  )
const totalReturnable = (transfer) =>
  (transfer.items || []).reduce(
    (sum, item) =>
      sum +
      Math.max(
        0,
        Number(item.shippedQuantity || 0) -
          Number(item.receivedGoodQuantity || 0) -
          Number(item.returnedQuantity || 0)
      ),
    0
  )

const ProgressRail = ({ status }) => {
  const steps = [
    ['Request', new Set(['DRAFT', 'PENDING'])],
    ['Allocate', new Set(['ALLOCATED', 'PICKING'])],
    ['Dispatch', new Set(['READY_TO_DISPATCH', 'IN_TRANSIT', 'OVERDUE'])],
    [
      'Receive',
      new Set([
        'ARRIVED_AT_DESTINATION',
        'RECEIVING',
        'PARTIALLY_RECEIVED',
        'SHORT_RECEIVED',
        'RECEIVE_REJECTED',
        'RECONCILING',
        'RETRY_REQUESTED',
        'RETURN_REQUESTED',
        'RETURN_IN_TRANSIT',
        'PARTIALLY_RETURNED',
        'COMPLETED',
        'LOST',
        'RETURNED',
      ]),
    ],
  ]
  const current =
    status === 'COMPLETED' || status === 'RETURNED' || status === 'LOST'
      ? 4
      : Math.max(
          0,
          steps.findIndex(([, statuses]) => statuses.has(status))
        )
  if (CLOSED_STATUSES.has(status) && !['COMPLETED', 'RETURNED', 'LOST'].includes(status))
    return <span className="text-xs font-medium text-slate-400">No further action</span>
  return (
    <div className="flex min-w-[235px] items-center gap-1.5">
      {steps.map(([label], index) => (
        <div key={label} className="flex min-w-0 flex-1 items-center gap-1.5 last:flex-none">
          <span
            className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${index < current ? 'bg-blue-700 text-white' : index === current ? 'border-2 border-blue-700 bg-blue-50 text-blue-700' : 'border border-slate-300 bg-white text-slate-400'}`}
          >
            {index < current ? <CheckCircle2 className="h-3 w-3" /> : index + 1}
          </span>
          <span
            className={`truncate text-[10px] font-semibold ${index <= current ? 'text-slate-700' : 'text-slate-400'}`}
          >
            {label}
          </span>
          {index < steps.length - 1 && (
            <span
              className={`h-px min-w-2 flex-1 ${index < current ? 'bg-blue-500' : 'bg-slate-200'}`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

const SummaryCard = ({ label, value, unit, description, icon: Icon, tone, featured }) => (
  <article
    className={`min-h-32 p-4 sm:p-5 ${featured ? 'bg-slate-900' : 'bg-white'} border-r border-slate-200 last:border-r-0`}
  >
    <div className="flex items-center justify-between gap-3">
      <p
        className={`text-[11px] font-bold tracking-[0.1em] uppercase ${featured ? 'text-slate-300' : 'text-slate-500'}`}
      >
        {label}
      </p>
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${featured ? 'bg-slate-800 text-blue-300' : tone}`}
      >
        <Icon className="h-4 w-4" />
      </span>
    </div>
    <p
      className={`mt-4 text-3xl font-bold tracking-tight tabular-nums ${featured ? 'text-white' : 'text-slate-950'}`}
    >
      {value}
      <span
        className={`ml-2 text-xs font-medium ${featured ? 'text-slate-400' : 'text-slate-500'}`}
      >
        {unit}
      </span>
    </p>
    <p className={`mt-2 text-xs leading-5 ${featured ? 'text-slate-300' : 'text-slate-600'}`}>
      {description}
    </p>
  </article>
)

const DecisionReasonModal = ({
  decision,
  reason,
  submitting,
  onReasonChange,
  onClose,
  onSubmit,
}) => {
  useEffect(() => {
    if (!decision) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !submitting) onClose()
    }
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [decision, onClose, submitting])
  if (!decision) return null
  const copy = {
    reject: [
      'Reject transfer request',
      'Reject transfer',
      'Explain why this request cannot be dispatched.',
      'rose',
    ],
    cancel: [
      'Cancel transfer request',
      'Cancel transfer',
      'Explain why this movement is no longer needed.',
      'amber',
    ],
    rejectReceipt: [
      'Reject destination receipt',
      'Reject receipt',
      'Record why the shipment cannot be accepted at the destination.',
      'rose',
    ],
    closeShort: [
      'Close short receipt',
      'Close short receipt',
      'Confirm that the remaining outstanding quantity will not be received in this attempt.',
      'amber',
    ],
    requestReturn: [
      'Request return to source',
      'Request return',
      'Explain why the shipped stock must be returned to the source warehouse.',
      'orange',
    ],
  }[decision.type]
  const transfer = decision.transfer
  const isDanger = copy[3] === 'rose'
  return (
    <div className="fixed inset-0 z-[1003] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
          <div>
            <p
              className={`text-[11px] font-bold tracking-[0.14em] uppercase ${isDanger ? 'text-rose-600' : 'text-amber-700'}`}
            >
              Transfer decision
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-950">{copy[0]}</h2>
            <p className="mt-1 text-xs text-slate-500">
              {transfer?.sourceWarehouse?.name} →{' '}
              {(transfer?.currentDestinationWarehouse || transfer?.destinationWarehouse)?.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <form onSubmit={onSubmit}>
          <div className="space-y-4 px-5 py-5 sm:px-6">
            <div
              className={`rounded-xl border px-4 py-3 text-sm leading-6 ${isDanger ? 'border-rose-100 bg-rose-50 text-rose-900' : 'border-amber-100 bg-amber-50 text-amber-900'}`}
            >
              {copy[2]}
            </div>
            <div>
              <label
                htmlFor="transfer-decision-reason"
                className="block text-sm font-semibold text-slate-800"
              >
                Reason <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="transfer-decision-reason"
                autoFocus
                required
                maxLength={2000}
                rows={5}
                value={reason}
                onChange={(event) => onReasonChange(event.target.value)}
                placeholder="Write a clear operational reason"
                className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
              <div className="mt-1 text-right text-xs text-slate-400">{reason.length}/2000</div>
            </div>
          </div>
          <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Keep transfer
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-60 ${isDanger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-800 hover:bg-slate-900'}`}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Saving' : copy[1]}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}

const TransferPage = ({ currentRole }) => {
  const confirmDialog = useConfirmDialog()
  const dispatch = useDispatch()
  const [searchParams] = useSearchParams()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  const [transfers, setTransfers] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [decision, setDecision] = useState(null)
  const [decisionReason, setDecisionReason] = useState('')
  const [decisionSubmitting, setDecisionSubmitting] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [receiveTransfer, setReceiveTransfer] = useState(null)
  const [action, setAction] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [currentUserId] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      return user.userId || user.id || ''
    } catch {
      return ''
    }
  })

  useActiveWarehouseContext(selectedWarehouseId)

  const fetchWarehouses = useCallback(async () => {
    try {
      const response = await warehouseApi.getMyWarehouses()
      const payload = response.data?.data
      const list = payload?.content || payload || []
      setWarehouses(list)
      setSelectedWarehouseId((current) => {
        const requested = searchParams.get('warehouseId')
        if (list.some((warehouse) => String(warehouse.id) === String(requested))) return requested
        return list.some((warehouse) => String(warehouse.id) === String(current))
          ? current
          : list[0]?.id || ''
      })
    } catch (error) {
      showApiErrorToast(error, 'Could not load warehouses.')
    }
  }, [searchParams])

  const fetchTransfers = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) setRefreshing(true)
      else setLoading(true)
      setLoadError('')
      const response = await transferApi.getTransfers({ page: 0, size: 100 })
      const payload = response.data?.data
      setTransfers(Array.isArray(payload) ? payload : payload?.content || [])
      setLastUpdated(new Date())
    } catch (error) {
      setLoadError('Transfer records are temporarily unavailable.')
      showApiErrorToast(error, 'Could not load transfer records.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    // Screen entry intentionally synchronizes both server-backed resources.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWarehouses()
    fetchTransfers()
  }, [fetchTransfers, fetchWarehouses])

  const contextTransfers = useMemo(
    () =>
      transfers.filter((transfer) => {
        if (!selectedWarehouseId) return true
        const currentDestination = transfer.currentDestinationWarehouse?.id
        return [
          transfer.sourceWarehouse?.id,
          transfer.destinationWarehouse?.id,
          currentDestination,
        ].some((id) => String(id) === String(selectedWarehouseId))
      }),
    [selectedWarehouseId, transfers]
  )

  const filteredTransfers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return contextTransfers.filter((transfer) => {
      if (!matchesStatusFilter(transfer.status, statusFilter)) return false
      if (!query) return true
      const searchable = [
        transfer.id,
        transfer.transferNo,
        transfer.status,
        transfer.note,
        transfer.sourceWarehouse?.name,
        transfer.destinationWarehouse?.name,
        transfer.currentDestinationWarehouse?.name,
        transfer.sourceStaff?.fullName,
        ...(transfer.items || []).flatMap((item) => [item.skuCode, item.skuName]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return searchable.includes(query)
    })
  }, [contextTransfers, searchQuery, statusFilter])

  const counts = useMemo(
    () =>
      STATUS_FILTERS.reduce(
        (result, filter) => ({
          ...result,
          [filter.id]: contextTransfers.filter((transfer) =>
            matchesStatusFilter(transfer.status, filter.id)
          ).length,
        }),
        {}
      ),
    [contextTransfers]
  )
  const activeWarehouse = warehouses.find(
    (warehouse) => String(warehouse.id) === String(selectedWarehouseId)
  )

  const refreshAfterMutation = async () => {
    await fetchTransfers({ silent: true })
  }
  const mutation = async (request, successMessage, errorMessage) => {
    try {
      await request()
      toast.success(successMessage)
      await refreshAfterMutation()
    } catch (error) {
      if (error.response?.status === 409) await refreshAfterMutation()
      showApiErrorToast(error, errorMessage)
    }
  }

  const handleAllocate = (transfer) =>
    mutation(
      () => transferApi.allocateTransfer(transfer.id, createTransferIdempotencyKey()),
      'Source stock allocated.',
      'Could not allocate source stock.'
    )
  const handlePickSuccess = refreshAfterMutation
  const handleApprove = async (transfer) => {
    const confirmed = await confirmDialog({
      title: 'Approve dispatch?',
      message: `Stock will be deducted from ${transfer.sourceWarehouse?.name || 'the source warehouse'} and the movement will enter transit.`,
      confirmText: 'Approve dispatch',
    })
    if (confirmed)
      await mutation(
        () => transferApi.approveDispatch(transfer.id, createTransferIdempotencyKey()),
        'Dispatch approved. Stock is now in transit.',
        'Could not approve dispatch.'
      )
  }
  const handleArrive = (transfer) =>
    mutation(
      () => transferApi.arriveTransfer(transfer.id, createTransferIdempotencyKey()),
      'Destination arrival recorded.',
      'Could not record arrival.'
    )
  const handleDispatchRetry = (transfer) =>
    mutation(
      () => transferApi.dispatchRetry(transfer.id, createTransferIdempotencyKey()),
      'Retry shipment dispatched.',
      'Could not dispatch retry.'
    )
  const handleDispatchReturn = (transfer) =>
    mutation(
      () => transferApi.dispatchReturn(transfer.id, createTransferIdempotencyKey()),
      'Return shipment dispatched.',
      'Could not dispatch return.'
    )

  const openDecision = (transfer, type) => {
    setDecision({ transfer, type })
    setDecisionReason('')
  }
  const closeDecision = (force = false) => {
    if (decisionSubmitting && !force) return
    setDecision(null)
    setDecisionReason('')
  }
  const submitDecision = async (event) => {
    event.preventDefault()
    if (!decision || !decisionReason.trim()) return
    setDecisionSubmitting(true)
    try {
      const id = decision.transfer.id
      const reason = decisionReason.trim()
      if (decision.type === 'reject') await transferApi.rejectTransfer(id, reason)
      if (decision.type === 'cancel') await transferApi.cancelTransfer(id, reason)
      if (decision.type === 'rejectReceipt')
        await transferApi.rejectReceipt(id, reason, createTransferIdempotencyKey())
      if (decision.type === 'closeShort')
        await transferApi.closeShort(id, reason, createTransferIdempotencyKey())
      if (decision.type === 'requestReturn')
        await transferApi.requestReturn(id, reason, createTransferIdempotencyKey())
      toast.success('Transfer decision saved.')
      closeDecision(true)
      await refreshAfterMutation()
    } catch (error) {
      if (error.response?.status === 409) await refreshAfterMutation()
      showApiErrorToast(error, 'Could not save transfer decision.')
    } finally {
      setDecisionSubmitting(false)
    }
  }

  const getPrimaryAction = (transfer) => {
    const tenant = currentRole === 'TENANT'
    const staff = currentRole === 'STAFF'
    const isAssignedPicker =
      !transfer.sourceStaff?.id || String(transfer.sourceStaff.id) === String(currentUserId)
    if ((tenant || staff) && transfer.status === 'PENDING')
      return {
        label: staff ? 'Allocate source stock' : 'Allocate stock',
        icon: PackageCheck,
        onClick: () => handleAllocate(transfer),
      }
    if (['ALLOCATED', 'PICKING'].includes(transfer.status) && (tenant || (staff && isAssignedPicker)))
      return {
        label: 'Confirm picking',
        icon: PackageCheck,
        onClick: () => setAction({ mode: 'pick', transfer }),
      }
    if (tenant && transfer.status === 'READY_TO_DISPATCH')
      return { label: 'Approve dispatch', icon: Truck, onClick: () => handleApprove(transfer) }
    if (
      tenant &&
      [
        'IN_TRANSIT',
        'OVERDUE',
        'ARRIVED_AT_DESTINATION',
        'RECEIVING',
        'PARTIALLY_RECEIVED',
      ].includes(transfer.status) &&
      totalOutstanding(transfer) > 0
    )
      return {
        label: 'Record receipt',
        icon: PackageCheck,
        onClick: () => setReceiveTransfer(transfer),
      }
    if (tenant && transfer.status === 'RETRY_REQUESTED')
      return {
        label: 'Dispatch retry',
        icon: RotateCcw,
        onClick: () => handleDispatchRetry(transfer),
      }
    if (tenant && transfer.status === 'RETURN_REQUESTED')
      return {
        label: 'Dispatch return',
        icon: Undo2,
        onClick: () => handleDispatchReturn(transfer),
      }
    if (tenant && transfer.status === 'RETURN_IN_TRANSIT')
      return {
        label: 'Receive return',
        icon: Undo2,
        onClick: () => setAction({ mode: 'returnReceive', transfer }),
      }
    if (tenant && transfer.status === 'RECONCILING')
      return {
        label: 'Reconcile',
        icon: CheckCircle2,
        onClick: () => setAction({ mode: 'reconcile', transfer }),
      }
    if (tenant && ['RECEIVE_REJECTED', 'SHORT_RECEIVED'].includes(transfer.status))
      return {
        label: 'Create retry',
        icon: RotateCcw,
        onClick: () => setAction({ mode: 'retry', transfer }),
      }
    return null
  }

  const getRoleHint = (transfer) => {
    if (currentRole !== 'STAFF') return ''
    if (
      ['ALLOCATED', 'PICKING'].includes(transfer.status) &&
      transfer.sourceStaff?.id &&
      String(transfer.sourceStaff.id) !== String(currentUserId)
    )
      return 'Assigned to another source staff'
    if (transfer.status === 'READY_TO_DISPATCH') return 'Waiting for tenant approval'
    if (
      [
        'IN_TRANSIT',
        'OVERDUE',
        'ARRIVED_AT_DESTINATION',
        'RECEIVING',
        'PARTIALLY_RECEIVED',
      ].includes(transfer.status)
    )
      return 'Waiting for tenant to record receipt'
    if (['RETRY_REQUESTED', 'RETURN_REQUESTED', 'RECONCILING'].includes(transfer.status))
      return 'Tenant action required'
    if (['COMPLETED', 'RETURNED', 'LOST', 'REJECTED', 'CANCELLED'].includes(transfer.status))
      return 'Workflow closed'
    return ''
  }

  const getSecondaryActions = (transfer) =>
    [
      { label: 'View details & timeline', icon: Eye, onClick: () => setDetailId(transfer.id) },
      currentRole === 'TENANT' && ['IN_TRANSIT', 'OVERDUE'].includes(transfer.status)
        ? { label: 'Mark arrived', icon: PackageCheck, onClick: () => handleArrive(transfer) }
        : null,
      currentRole === 'TENANT' &&
      ['IN_TRANSIT', 'OVERDUE', 'ARRIVED_AT_DESTINATION', 'RECEIVING'].includes(transfer.status) &&
      !transfer.items?.some((item) => Number(item.receivedQuantity) > 0)
        ? {
            label: 'Reject receipt',
            icon: X,
            danger: true,
            onClick: () => openDecision(transfer, 'rejectReceipt'),
          }
        : null,
      currentRole === 'TENANT' && transfer.status === 'PARTIALLY_RECEIVED'
        ? {
            label: 'Close short',
            icon: CheckCircle2,
            onClick: () => openDecision(transfer, 'closeShort'),
          }
        : null,
      currentRole === 'TENANT' &&
      ['RECEIVE_REJECTED', 'SHORT_RECEIVED', 'RECONCILING', 'PARTIALLY_RETURNED'].includes(
        transfer.status
      ) &&
      totalReturnable(transfer) > 0
        ? {
            label: 'Request return',
            icon: Undo2,
            danger: true,
            onClick: () => openDecision(transfer, 'requestReturn'),
          }
        : null,
      currentRole === 'TENANT' && ['RECEIVE_REJECTED', 'SHORT_RECEIVED'].includes(transfer.status)
        ? {
            label: 'Create retry',
            icon: RotateCcw,
            onClick: () => setAction({ mode: 'retry', transfer }),
          }
        : null,
      currentRole === 'TENANT' &&
      ['PENDING', 'ALLOCATED', 'PICKING', 'READY_TO_DISPATCH'].includes(transfer.status)
        ? {
            label: 'Cancel transfer',
            icon: X,
            danger: true,
            onClick: () => openDecision(transfer, 'cancel'),
          }
        : null,
      currentRole === 'TENANT' && transfer.status === 'PENDING'
        ? {
            label: 'Reject request',
            icon: X,
            danger: true,
            onClick: () => openDecision(transfer, 'reject'),
          }
        : null,
    ].filter(Boolean)

  const clearFilters = () => {
    setSelectedWarehouseId('')
    setSearchQuery('')
    setStatusFilter('ALL')
  }
  const handleCreated = async (createdTransfer) => {
    await refreshAfterMutation()
    setStatusFilter('PENDING')
    if (createdTransfer?.id) setDetailId(createdTransfer.id)
  }
  const handleReceiveSuccess = async () => {
    await refreshAfterMutation()
    toast.success('Receipt recorded. The workflow was refreshed.')
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
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
          className={`flex min-w-0 flex-1 flex-col transition-all duration-150 ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'}`}
        >
          <main className="mx-auto w-full max-w-[1600px] min-w-0 space-y-5 px-4 py-6 sm:px-6 md:py-8 lg:px-8">
            <header className="flex flex-col justify-between gap-5 border-b border-slate-300 pb-5 xl:flex-row xl:items-end">
              <div className="max-w-3xl min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
                  <span className="inline-flex items-center gap-1.5 tracking-[0.12em] uppercase">
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    Warehouse operations
                  </span>
                  <span className="h-3 w-px bg-slate-300" />
                  <span className="font-medium text-slate-700">
                    {activeWarehouse?.name || 'All warehouses'}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {warehouses.length} active warehouse{warehouses.length === 1 ? '' : 's'}
                  </span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                  Stock transfers
                </h1>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">
                  Move inventory between warehouses with a controlled approval, dispatch and receipt
                  trail.
                </p>
              </div>
              <div className="flex min-w-0 flex-col gap-2 xl:items-end">
                {lastUpdated && (
                  <span className="hidden items-center gap-1.5 text-xs text-slate-500 sm:inline-flex">
                    <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                    Updated {formatDate(lastUpdated)}
                  </span>
                )}
                <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
                  <label className="flex min-w-56 flex-1 flex-col gap-1.5 text-xs font-semibold text-slate-600 sm:flex-none">
                    Warehouse context
                    <select
                      value={selectedWarehouseId}
                      onChange={(event) => setSelectedWarehouseId(event.target.value)}
                      className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">All warehouses</option>
                      {warehouses.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => fetchTransfers({ silent: true })}
                    disabled={refreshing || loading}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`}
                    />
                    {refreshing ? 'Refreshing' : 'Refresh'}
                  </button>
                  {['TENANT', 'STAFF'].includes(currentRole) && (
                    <button
                      type="button"
                      onClick={() => setCreateOpen(true)}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800"
                    >
                      <Plus className="h-4 w-4" />
                      Create transfer
                    </button>
                  )}
                </div>
              </div>
            </header>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:px-5">
                <h2 className="text-sm font-semibold text-slate-950">Transfer workload</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  A single source of truth for allocation, dispatch, receipt and exception handling.
                </p>
              </div>
              <div className="grid grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  label="Total transfers"
                  value={counts.ALL || 0}
                  unit="records"
                  description={
                    activeWarehouse
                      ? `Visible in ${activeWarehouse.name}`
                      : 'Across your warehouse network'
                  }
                  icon={ArrowRightLeft}
                  tone="bg-blue-50 text-blue-700"
                  featured
                />
                <SummaryCard
                  label="Pending review"
                  value={counts.PENDING || 0}
                  unit="requests"
                  description="Waiting for source allocation"
                  icon={Clock3}
                  tone="bg-amber-50 text-amber-700"
                />
                <SummaryCard
                  label="In transit"
                  value={
                    contextTransfers.filter((transfer) =>
                      ['IN_TRANSIT', 'OVERDUE'].includes(transfer.status)
                    ).length
                  }
                  unit="requests"
                  description="Awaiting destination receipt"
                  icon={Truck}
                  tone="bg-blue-50 text-blue-700"
                />
                <SummaryCard
                  label="Needs attention"
                  value={counts.ATTENTION || 0}
                  unit="requests"
                  description="Exceptions, retries or returns"
                  icon={AlertCircle}
                  tone="bg-rose-50 text-rose-700"
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-slate-950">Transfer records</h2>
                      {refreshing && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      The next action is determined by the BE workflow status.
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {contextTransfers.length} records in this view
                  </span>
                </div>
                <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap gap-1.5" role="tablist">
                    {STATUS_FILTERS.map((filter) => (
                      <button
                        key={filter.id}
                        type="button"
                        role="tab"
                        aria-selected={statusFilter === filter.id}
                        onClick={() => setStatusFilter(filter.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${statusFilter === filter.id ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-transparent text-slate-600 hover:bg-slate-50'}`}
                      >
                        {filter.label}
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] ${statusFilter === filter.id ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'}`}
                        >
                          {counts[filter.id] || 0}
                        </span>
                      </button>
                    ))}
                  </div>
                  <label className="relative block w-full xl:max-w-xs">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <span className="sr-only">Search transfers</span>
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search ID, warehouse, SKU or note"
                      className="min-h-10 w-full rounded-lg border border-slate-300 bg-white pr-3 pl-9 text-sm outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>
              </div>
              {loadError && !loading ? (
                <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
                  <AlertCircle className="h-7 w-7 text-rose-500" />
                  <h3 className="mt-3 text-sm font-semibold">Transfer records unavailable</h3>
                  <p className="mt-1 text-sm text-slate-500">{loadError}</p>
                  <button
                    type="button"
                    onClick={() => fetchTransfers()}
                    className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try again
                  </button>
                </div>
              ) : loading ? (
                <div className="divide-y divide-slate-100">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={index}
                      className="grid min-w-[1100px] grid-cols-[180px_minmax(350px,1fr)_270px_190px_220px] gap-5 px-5 py-5"
                    >
                      <span className="h-4 animate-pulse rounded bg-slate-200" />
                      <span className="h-12 animate-pulse rounded bg-slate-200" />
                      <span className="h-8 animate-pulse rounded bg-slate-200" />
                      <span className="h-10 animate-pulse rounded bg-slate-200" />
                      <span className="h-9 animate-pulse rounded bg-slate-200" />
                    </div>
                  ))}
                </div>
              ) : filteredTransfers.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1200px] text-left text-sm">
                    <caption className="sr-only">Stock transfer records</caption>
                    <thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold tracking-[0.12em] text-slate-500 uppercase">
                      <tr>
                        <th className="px-5 py-3.5">Transfer</th>
                        <th className="px-5 py-3.5">Warehouse route</th>
                        <th className="px-5 py-3.5">Workflow status</th>
                        <th className="px-5 py-3.5">Created & assigned</th>
                        <th className="px-5 py-3.5 text-right">Next action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTransfers.map((transfer) => {
                        const meta = getStatusMeta(transfer.status)
                        const StatusIcon = meta.icon
                        const primary = getPrimaryAction(transfer)
                        const PrimaryIcon = primary?.icon
                        const source = transfer.sourceWarehouse?.name || 'Unknown source'
                        const originalDestination =
                          transfer.destinationWarehouse?.name || 'Unknown destination'
                        const currentDestination = transfer.currentDestinationWarehouse?.name
                        return (
                          <tr key={transfer.id} className="transition-colors hover:bg-blue-50/30">
                            <td className="px-5 py-4 align-top">
                              <button
                                type="button"
                                onClick={() => setDetailId(transfer.id)}
                                className="text-left"
                              >
                                <span className="font-mono text-xs font-bold text-blue-700">
                                  {transfer.transferNo ||
                                    `TRF-${String(transfer.id || '')
                                      .slice(0, 8)
                                      .toUpperCase()}`}
                                </span>
                                <span className="mt-1 block text-xs text-slate-500">
                                  {transfer.items?.length || 0} SKU · {totalRequested(transfer)}{' '}
                                  requested
                                </span>
                                {transfer.attempts?.length > 1 && (
                                  <span className="mt-1 block text-[11px] font-semibold text-indigo-600">
                                    {transfer.attempts.length} attempts
                                  </span>
                                )}
                              </button>
                            </td>
                            <td className="px-5 py-4 align-top">
                              <div className="grid max-w-[470px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                                <div className="min-w-0">
                                  <span className="block text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase">
                                    From
                                  </span>
                                  <span
                                    className="mt-1 block truncate font-semibold text-slate-950"
                                    title={source}
                                  >
                                    {source}
                                  </span>
                                </div>
                                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
                                <div className="min-w-0">
                                  <span className="block text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase">
                                    To
                                  </span>
                                  <span
                                    className="mt-1 block truncate font-semibold text-slate-950"
                                    title={currentDestination || originalDestination}
                                  >
                                    {currentDestination || originalDestination}
                                  </span>
                                </div>
                              </div>
                              {currentDestination && currentDestination !== originalDestination && (
                                <p className="mt-2 text-[11px] font-medium text-indigo-600">
                                  Original destination: {originalDestination}
                                </p>
                              )}
                              {transfer.items?.length > 0 && (
                                <p
                                  className="mt-1 max-w-[470px] truncate text-xs text-slate-500"
                                  title={transfer.items
                                    .map((item) => item.skuName || item.skuCode)
                                    .join(', ')}
                                >
                                  {transfer.items
                                    .map((item) => item.skuName || item.skuCode)
                                    .join(', ')}
                                </p>
                              )}
                            </td>
                            <td className="px-5 py-4 align-top">
                              <div className="flex flex-col gap-2">
                                <span
                                  className={`inline-flex w-fit items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold ${meta.className}`}
                                >
                                  <StatusIcon className="h-3.5 w-3.5" />
                                  {meta.label}
                                </span>
                                <ProgressRail status={transfer.status} />
                              </div>
                            </td>
                            <td className="px-5 py-4 align-top">
                              <span className="text-xs font-medium text-slate-700">
                                {formatDate(transfer.createdAt)}
                              </span>
                              <span className="mt-1 block text-xs text-slate-400">
                                Created by{' '}
                                {transfer.createdBy?.fullName ||
                                  transfer.createdBy?.name ||
                                  'Tenant'}
                              </span>
                              <span className="mt-2 block text-xs text-slate-600">
                                Source staff:{' '}
                                <strong>
                                  {transfer.sourceStaff?.fullName ||
                                    transfer.sourceStaff?.name ||
                                    'Not assigned'}
                                </strong>
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right align-top">
                              <div className="flex items-center justify-end gap-2">
                                {primary && (
                                  <button
                                    type="button"
                                    onClick={primary.onClick}
                                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-blue-700 px-3 text-xs font-bold text-white hover:bg-blue-800"
                                  >
                                    <PrimaryIcon className="h-3.5 w-3.5" />
                                    {primary.label}
                                  </button>
                                )}
                                <TableActionMenu
                                  label={`Actions for ${transfer.transferNo || transfer.id}`}
                                  items={getSecondaryActions(transfer)}
                                />
                              </div>
                              {primary && totalOutstanding(transfer) > 0 && (
                                <span className="mt-2 block text-right text-[11px] text-slate-500">
                                  Outstanding: {totalOutstanding(transfer)}
                                </span>
                              )}
                              {!primary && getRoleHint(transfer) && (
                                <span className="mt-2 block max-w-[220px] text-right text-[11px] font-medium text-slate-500">
                                  {getRoleHint(transfer)}
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                    <Filter className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold">
                    {contextTransfers.length ? 'No matching transfers' : 'No transfer records yet'}
                  </h3>
                  <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
                    {contextTransfers.length
                      ? 'Try another status, warehouse or search term.'
                      : 'Create a transfer request to start moving stock between active warehouses.'}
                  </p>
                  {contextTransfers.length ||
                  searchQuery ||
                  statusFilter !== 'ALL' ||
                  selectedWarehouseId ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-4 min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Clear filters
                    </button>
                  ) : (
                    ['TENANT', 'STAFF'].includes(currentRole) && (
                      <button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white"
                      >
                        <Plus className="h-4 w-4" />
                        Create transfer
                      </button>
                    )
                  )}
                </div>
              )}
              {!loading && !loadError && filteredTransfers.length > 0 && (
                <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/60 px-5 py-3 text-xs text-slate-500">
                  <span>
                    Showing {filteredTransfers.length} of {contextTransfers.length} transfers
                  </span>
                  <span>Open details for the full event audit trail</span>
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
      <CreateTransferModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        sourceWarehouseId={selectedWarehouseId}
        currentRole={currentRole}
        onSuccess={handleCreated}
      />
      <ReceiveTransferModal
        isOpen={Boolean(receiveTransfer)}
        onClose={() => setReceiveTransfer(null)}
        transfer={receiveTransfer}
        onSuccess={handleReceiveSuccess}
      />
      <TransferActionModal
        mode={action?.mode}
        isOpen={Boolean(action)}
        onClose={() => setAction(null)}
        transfer={action?.transfer}
        warehouses={warehouses}
        onSuccess={handlePickSuccess}
      />
      <TransferDetailModal
        isOpen={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        transferId={detailId}
      />
      <DecisionReasonModal
        decision={decision}
        reason={decisionReason}
        submitting={decisionSubmitting}
        onReasonChange={setDecisionReason}
        onClose={closeDecision}
        onSubmit={submitDecision}
      />
    </div>
  )
}

export default TransferPage
