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
  Search,
  Truck,
  X,
  ChevronRight,
} from 'lucide-react'
import { closeMobileSidebar } from '@/store/uiSlide'
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'
import TableActionMenu from '@/components/TableActionMenu'
import transferApi from '@/services/wms/transferApi'
import warehouseApi from '@/services/warehouse/warehouseApi'
import { toast } from 'react-hot-toast'
import { showApiErrorToast } from '@/config/apiError'
import { useConfirmDialog } from '@/components/ConfirmDialogProvider'
import CreateTransferModal from '../components/CreateTransferModal'
import ReceiveTransferModal from '../components/ReceiveTransferModal'
import TransferDetailModal from '../components/TransferDetailModal'
import useActiveWarehouseContext from '@/hooks/useActiveWarehouseContext'

const WORKFLOW_STEPS = [
  {
    key: 'PENDING',
    number: '01',
    label: 'Request created',
    description: 'Review the source allocation before anything leaves the warehouse.',
  },
  {
    key: 'IN_TRANSIT',
    number: '02',
    label: 'Dispatch approved',
    description: 'Source stock is deducted and the movement is now in transit.',
  },
  {
    key: 'COMPLETED',
    number: '03',
    label: 'Destination received',
    description: 'Choose destination bins and post the stock into the receiving warehouse.',
  },
]

const TRANSFER_STATUS_META = {
  PENDING: {
    label: 'Awaiting dispatch',
    shortLabel: 'Pending',
    description: 'Waiting for dispatch approval',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
    icon: Clock3,
  },
  IN_TRANSIT: {
    label: 'In transit',
    shortLabel: 'In transit',
    description: 'Ready to be received at destination',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
    icon: Truck,
  },
  COMPLETED: {
    label: 'Completed',
    shortLabel: 'Completed',
    description: 'Stock posted to the destination warehouse',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: CheckCircle2,
  },
  REJECTED: {
    label: 'Rejected',
    shortLabel: 'Rejected',
    description: 'The request was rejected before dispatch',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
    icon: X,
  },
  CANCELLED: {
    label: 'Cancelled',
    shortLabel: 'Cancelled',
    description: 'The request is closed without moving stock',
    className: 'border-slate-200 bg-slate-100 text-slate-700',
    icon: X,
  },
}

const STATUS_FILTERS = [
  { id: 'ALL', label: 'All transfers' },
  { id: 'PENDING', label: 'Awaiting dispatch' },
  { id: 'IN_TRANSIT', label: 'In transit' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CLOSED', label: 'Closed' },
]

const getTransferStatusMeta = (status) =>
  TRANSFER_STATUS_META[status] || {
    label: status || 'Unknown',
    shortLabel: status || 'Unknown',
    description: 'Status unavailable',
    className: 'border-slate-200 bg-slate-100 text-slate-700',
    icon: AlertCircle,
  }

const formatDate = (dateString) => {
  if (!dateString) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

const isClosedTransfer = (status) => status === 'REJECTED' || status === 'CANCELLED'

const matchesStatusFilter = (status, filter) => {
  if (filter === 'ALL') return true
  if (filter === 'CLOSED') return isClosedTransfer(status)
  return status === filter
}

const WorkflowRail = ({ status, compact = false }) => {
  if (isClosedTransfer(status)) {
    const meta = getTransferStatusMeta(status)
    const Icon = meta.icon
    return (
      <div className={`flex items-center gap-2 ${compact ? '' : 'rounded-lg border border-rose-100 bg-rose-50/70 px-3 py-2'}`}>
        <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${status === 'REJECTED' ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-600'}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-800">{meta.label}</p>
          {!compact && <p className="mt-0.5 text-xs text-slate-500">No further action is available</p>}
        </div>
      </div>
    )
  }

  const currentIndex = status === 'PENDING' ? 0 : status === 'IN_TRANSIT' ? 1 : 2
  return (
    <div className={compact ? 'min-w-[205px]' : 'rounded-lg border border-slate-200 bg-white p-4'}>
      <div className="flex items-center">
        {WORKFLOW_STEPS.map((step, index) => {
          const complete = index < currentIndex
          const current = index === currentIndex
          return (
            <div key={step.key} className="flex min-w-0 flex-1 items-center last:flex-none">
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    complete
                      ? 'bg-blue-700 text-white'
                      : current
                        ? 'border-2 border-blue-700 bg-blue-50 text-blue-700'
                        : 'border border-slate-300 bg-white text-slate-400'
                  }`}
                >
                  {complete ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : step.number}
                </span>
                <span className={`truncate text-[11px] font-semibold ${current ? 'text-slate-950' : complete ? 'text-blue-700' : 'text-slate-400'}`}>
                  {compact ? step.label.replace('Request created', 'Request').replace('Dispatch approved', 'Dispatch').replace('Destination received', 'Receive') : step.label}
                </span>
              </div>
              {index < WORKFLOW_STEPS.length - 1 && (
                <span className={`mx-2 h-px min-w-4 flex-1 ${index < currentIndex ? 'bg-blue-500' : 'bg-slate-200'}`} aria-hidden="true" />
              )}
            </div>
          )
        })}
      </div>
      {!compact && (
        <p className="mt-3 text-xs leading-5 text-slate-500">{getTransferStatusMeta(status).description}</p>
      )}
    </div>
  )
}

const SummaryCard = ({ label, value, unit, description, icon: Icon, tone, dividerClass, featured = false }) => (
  <article className={`group relative min-h-32 p-4 transition-colors sm:min-h-36 sm:p-5 ${dividerClass || ''} ${featured ? 'bg-slate-900 hover:bg-slate-800' : 'bg-white hover:bg-slate-50'}`}>
    <div className="flex items-center justify-between gap-3">
      <p className={`text-xs font-semibold tracking-[0.1em] uppercase ${featured ? 'text-slate-300' : 'text-slate-500'}`}>{label}</p>
      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${featured ? 'bg-slate-800 text-blue-300' : tone}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
    </div>
    <div className="mt-4 flex items-baseline gap-2">
      <span className={`text-2xl font-bold tracking-tight tabular-nums sm:text-3xl ${featured ? 'text-white' : 'text-slate-950'}`}>{value}</span>
      <span className={`text-xs font-medium ${featured ? 'text-slate-400' : 'text-slate-500'}`}>{unit}</span>
    </div>
    <div className="mt-3 flex items-center justify-between gap-3">
      <span className={`line-clamp-2 text-xs sm:text-sm ${featured ? 'text-slate-300' : 'text-slate-600'}`}>{description}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </div>
  </article>
)

const DecisionReasonModal = ({ decision, reason, submitting, onReasonChange, onClose, onSubmit }) => {
  const isReject = decision?.type === 'reject'

  useEffect(() => {
    if (!decision) return undefined

    const closeWithEscape = (event) => {
      if (event.key === 'Escape' && !submitting) onClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeWithEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeWithEscape)
    }
  }, [decision, onClose, submitting])

  if (!decision) return null

  const title = isReject ? 'Reject transfer request' : 'Cancel transfer request'
  const actionLabel = isReject ? 'Reject transfer' : 'Cancel transfer'
  const helper = isReject
    ? 'Explain why this movement cannot be dispatched. The reason will be saved in the transfer timeline.'
    : 'Explain why this movement is no longer needed. Only pending requests can be cancelled.'
  const transferReference = `TRF-${String(decision.transfer?.id || '').slice(0, 8).toUpperCase()}`
  const sourceWarehouse = decision.transfer?.sourceWarehouse?.name || 'Unknown source'
  const destinationWarehouse = decision.transfer?.destinationWarehouse?.name || 'Unknown destination'
  const DecisionIcon = isReject ? X : ArrowRightLeft
  const titleId = `transfer-decision-title-${decision.transfer?.id || 'request'}`
  const reasonId = `transfer-decision-reason-${decision.transfer?.id || 'request'}`

  return (
    <div className="fixed inset-0 z-1001 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isReject ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'}`}>
              <DecisionIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className={`text-[11px] font-bold tracking-[0.14em] uppercase ${isReject ? 'text-rose-600' : 'text-amber-700'}`}>
                Transfer decision
              </p>
              <h2 id={titleId} className="mt-1 text-lg font-bold tracking-tight text-slate-950">{title}</h2>
              <p className="mt-1 truncate text-xs text-slate-500" title={`${sourceWarehouse} → ${destinationWarehouse}`}>
                {transferReference} · {sourceWarehouse} <span className="px-1 text-slate-300">→</span> {destinationWarehouse}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close decision dialog"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={onSubmit}>
          <div className="space-y-5 px-5 py-5 sm:px-6">
            <div className={`flex gap-3 rounded-xl border px-4 py-3.5 text-sm leading-5 ${isReject ? 'border-rose-100 bg-rose-50 text-rose-900' : 'border-amber-100 bg-amber-50 text-amber-900'}`}>
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{helper}</p>
            </div>

            <div>
              <label htmlFor={reasonId} className="block text-sm font-semibold text-slate-800">
                Decision reason <span className="text-rose-600">*</span>
              </label>
              <textarea
                id={reasonId}
                aria-describedby={`${reasonId}-hint`}
                autoFocus
                required
                maxLength={2000}
                rows={5}
                value={reason}
                onChange={(event) => onReasonChange(event.target.value)}
                placeholder={isReject ? 'Describe why the transfer cannot be dispatched...' : 'Describe why this transfer is no longer needed...'}
                className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
              <div id={`${reasonId}-hint`} className="mt-1.5 flex items-center justify-between gap-3 text-xs text-slate-400">
                <span>This reason will be saved in the transfer timeline.</span>
                <span className="shrink-0 tabular-nums">{reason.length}/2000</span>
              </div>
            </div>
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Keep request
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${isReject ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-800 hover:bg-slate-900'}`}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {submitting ? 'Saving decision' : actionLabel}
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

  useActiveWarehouseContext(selectedWarehouseId)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [receiveModalOpen, setReceiveModalOpen] = useState(false)
  const [selectedTransferForReceive, setSelectedTransferForReceive] = useState(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedTransferIdForDetail, setSelectedTransferIdForDetail] = useState(null)

  const fetchWarehouses = useCallback(async () => {
    try {
      const response = await warehouseApi.getMyWarehouses()
      const list = response.data?.data?.content || response.data?.data || []
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
    } catch (error) {
      showApiErrorToast(error, 'Could not load warehouses.')
    }
  }, [searchParams])

  const fetchTransfers = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) setRefreshing(true)
      else setLoading(true)
      setLoadError('')
      const res = await transferApi.getTransfers({ page: 0, size: 100 })
      const payload = res?.data?.data
      setTransfers(Array.isArray(payload) ? payload : payload?.content || [])
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error getting list of transfers:', error)
      setLoadError('We could not load transfer records right now.')
      showApiErrorToast(error, 'Could not load transfer records.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    // Server-backed data is intentionally loaded when this screen mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWarehouses()
    fetchTransfers()
  }, [fetchTransfers, fetchWarehouses])

  const contextTransfers = useMemo(
    () =>
      transfers.filter((transfer) => {
        if (!selectedWarehouseId) return true
        return (
          String(transfer.sourceWarehouse?.id) === String(selectedWarehouseId) ||
          String(transfer.destinationWarehouse?.id) === String(selectedWarehouseId)
        )
      }),
    [selectedWarehouseId, transfers]
  )

  const filteredTransfers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    return contextTransfers.filter((transfer) => {
      if (!matchesStatusFilter(transfer.status, statusFilter)) return false
      if (!normalizedQuery) return true
      const searchable = [
        transfer.id,
        transfer.sourceWarehouse?.name,
        transfer.destinationWarehouse?.name,
        transfer.note,
        transfer.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return searchable.includes(normalizedQuery)
    })
  }, [contextTransfers, searchQuery, statusFilter])

  const filterCounts = useMemo(() => {
    const counts = { ALL: contextTransfers.length, PENDING: 0, IN_TRANSIT: 0, COMPLETED: 0, CLOSED: 0 }
    contextTransfers.forEach((transfer) => {
      if (counts[transfer.status] !== undefined) counts[transfer.status] += 1
      if (isClosedTransfer(transfer.status)) counts.CLOSED += 1
    })
    return counts
  }, [contextTransfers])

  const openDetails = useCallback((transferId) => {
    setSelectedTransferIdForDetail(transferId)
    setDetailModalOpen(true)
  }, [])

  const handleCreated = async (createdTransfer) => {
    await fetchTransfers({ silent: true })
    setStatusFilter('PENDING')
    if (createdTransfer?.id) openDetails(createdTransfer.id)
  }

  const handleApproveDispatch = async (transfer) => {
    const confirmed = await confirmDialog({
      title: 'Approve dispatch?',
      message: `This will deduct the allocated stock from ${transfer.sourceWarehouse?.name || 'the source warehouse'} and move the transfer to In transit.`,
      confirmText: 'Approve dispatch',
    })
    if (!confirmed) return

    try {
      await transferApi.approveDispatch(transfer.id)
      toast.success('Dispatch approved. Stock is now in transit.')
      await fetchTransfers({ silent: true })
    } catch (error) {
      showApiErrorToast(error, 'Could not approve dispatch.')
    }
  }

  const openDecision = (transfer, type) => {
    setDecision({ transfer, type })
    setDecisionReason('')
  }

  const closeDecision = (force = false) => {
    if (decisionSubmitting && !force) return
    setDecision(null)
    setDecisionReason('')
  }

  const handleDecisionSubmit = async (event) => {
    event.preventDefault()
    if (!decision || !decisionReason.trim()) return
    setDecisionSubmitting(true)
    try {
      if (decision.type === 'reject') {
        await transferApi.rejectTransfer(decision.transfer.id, decisionReason.trim())
        toast.success('Transfer request rejected.')
      } else {
        await transferApi.cancelTransfer(decision.transfer.id, decisionReason.trim())
        toast.success('Transfer request cancelled.')
      }
      closeDecision(true)
      await fetchTransfers({ silent: true })
    } catch (error) {
      showApiErrorToast(error, `Could not ${decision.type} transfer request.`)
    } finally {
      setDecisionSubmitting(false)
    }
  }

  const openReceive = (transfer) => {
    setSelectedTransferForReceive(transfer)
    setReceiveModalOpen(true)
  }

  const handleReceiveSuccess = async () => {
    await fetchTransfers({ silent: true })
    toast.success('Transfer completed and destination stock updated.')
  }

  const clearFilters = () => {
    setSelectedWarehouseId('')
    setSearchQuery('')
    setStatusFilter('ALL')
  }

  const getPrimaryAction = (transfer) => {
    if (currentRole !== 'TENANT') return null
    if (transfer.status === 'PENDING') {
      return { label: 'Approve dispatch', icon: Truck, onClick: () => handleApproveDispatch(transfer) }
    }
    if (transfer.status === 'IN_TRANSIT') {
      return { label: 'Receive stock', icon: PackageCheck, onClick: () => openReceive(transfer) }
    }
    return null
  }

  const getSecondaryActions = (transfer) => [
    {
      label: 'View workflow',
      icon: Eye,
      onClick: () => openDetails(transfer.id),
    },
    currentRole === 'TENANT' && transfer.status === 'PENDING'
      ? { label: 'Reject request', icon: X, danger: true, onClick: () => openDecision(transfer, 'reject') }
      : null,
    currentRole === 'TENANT' && transfer.status === 'PENDING'
      ? { label: 'Cancel request', icon: X, danger: true, onClick: () => openDecision(transfer, 'cancel') }
      : null,
  ].filter(Boolean)

  const activeWarehouse = warehouses.find((warehouse) => String(warehouse.id) === String(selectedWarehouseId))
  const pendingCount = filterCounts.PENDING
  const inTransitCount = filterCounts.IN_TRANSIT
  const completedCount = filterCounts.COMPLETED
  const closedCount = filterCounts.CLOSED

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      <Header />
      <div className="md:hidden">
        {isMobileOpen && (
          <button type="button" aria-label="Close navigation" className="fixed inset-0 z-40 bg-slate-900/40" onClick={() => dispatch(closeMobileSidebar())} />
        )}
      </div>

      <div className="flex pt-14">
        <Sidebar currentRole={currentRole} />
        <div className={`flex min-w-0 flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'}`}>
          <main className="mx-auto w-full max-w-[1600px] min-w-0 space-y-5 px-4 py-6 sm:px-6 md:py-8 lg:px-8">
            <header className="flex flex-col justify-between gap-5 border-b border-slate-300 pb-5 xl:flex-row xl:items-end">
              <div className="min-w-0 max-w-3xl">
                <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500 xl:flex-nowrap">
                  <span className="inline-flex shrink-0 items-center gap-1.5 tracking-[0.12em] uppercase">
                    <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    Warehouse operations
                  </span>
                  <span className="h-3 w-px shrink-0 bg-slate-300" aria-hidden="true" />
                  <span className="whitespace-nowrap font-medium text-slate-700">{activeWarehouse?.name || 'All warehouses'}</span>
                  <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-medium text-slate-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                    {warehouses.length} active warehouse{warehouses.length === 1 ? '' : 's'}
                  </span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">Stock transfers</h1>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">
                  Move inventory between your warehouses with a clear approval trail from request to receipt.
                </p>
              </div>

              <div className="flex min-w-0 flex-col gap-2 xl:items-end">
                {lastUpdated && (
                  <span className="hidden items-center gap-1.5 text-xs text-slate-500 sm:inline-flex">
                    <Clock3 className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    Updated {formatDate(lastUpdated)}
                  </span>
                )}
                <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto xl:flex-nowrap">
                  <label className="flex min-w-56 flex-1 flex-col gap-1.5 text-xs font-semibold text-slate-600 sm:flex-none">
                    Warehouse context
                    <select aria-label="Warehouse context" className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-xs outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100" value={selectedWarehouseId} onChange={(event) => setSelectedWarehouseId(event.target.value)}>
                      <option value="">All warehouses</option>
                      {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
                    </select>
                  </label>
                  <button type="button" onClick={() => fetchTransfers({ silent: true })} disabled={refreshing || loading} className="inline-flex min-h-10 shrink-0 items-center gap-2 self-end rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60">
                    <RefreshCw className={`h-4 w-4 text-slate-500 ${refreshing ? 'animate-spin text-blue-600' : ''}`} aria-hidden="true" />
                    <span>{refreshing ? 'Refreshing' : 'Refresh'}</span>
                  </button>
                  {currentRole === 'TENANT' && (
                    <button type="button" onClick={() => setCreateModalOpen(true)} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 self-end whitespace-nowrap rounded-md bg-blue-700 px-4 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none">
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Create transfer
                    </button>
                  )}
                </div>
              </div>
            </header>

            <section aria-labelledby="transfer-summary-heading" className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:px-5">
                <div>
                  <h2 id="transfer-summary-heading" className="text-sm font-semibold text-slate-950">Transfer resources</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Current movement workload across your warehouse network</p>
                </div>
                <span className="text-xs font-medium text-slate-500">Click a record below to view the full workflow</span>
              </div>
              <div className="grid grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  label="Total transfers"
                  value={filterCounts.ALL}
                  unit="records"
                  description={activeWarehouse ? `Visible in ${activeWarehouse.name}` : 'Across your warehouse network'}
                  icon={ArrowRightLeft}
                  tone="bg-blue-50 text-blue-700"
                  dividerClass="border-r border-b border-slate-200 xl:border-b-0"
                  featured
                />
                <SummaryCard
                  label="Awaiting dispatch"
                  value={pendingCount}
                  unit="requests"
                  description="Needs tenant review before stock moves"
                  icon={Clock3}
                  tone="bg-amber-50 text-amber-700"
                  dividerClass="border-b border-slate-200 xl:border-r xl:border-b-0"
                />
                <SummaryCard
                  label="In transit"
                  value={inTransitCount}
                  unit="requests"
                  description="Ready for destination receipt"
                  icon={Truck}
                  tone="bg-blue-50 text-blue-700"
                  dividerClass="border-r border-slate-200 xl:border-r"
                />
                <SummaryCard
                  label="Completed"
                  value={completedCount}
                  unit="requests"
                  description={closedCount ? `${closedCount} request${closedCount === 1 ? '' : 's'} closed separately` : 'No rejected or cancelled requests'}
                  icon={CheckCircle2}
                  tone="bg-emerald-50 text-emerald-700"
                />
              </div>
            </section>

            <section aria-labelledby="workflow-guide-heading" className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
              <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:px-5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 id="workflow-guide-heading" className="text-sm font-semibold text-slate-950">Transfer workflow</h2>
                    <p className="mt-0.5 text-xs text-slate-500">Three controlled checkpoints keep every movement traceable.</p>
                  </div>
                  <span className="text-xs font-medium text-slate-500">Request → dispatch → receipt</span>
                </div>
              </div>
              <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.5fr)]">
                <div>
                  <p className="text-sm font-semibold text-slate-800">One movement, three checkpoints</p>
                  <p className="mt-1.5 text-sm leading-6 text-slate-600">Each request keeps the source deduction and destination receipt visible, so the next action is always clear.</p>
                  {currentRole === 'TENANT' && <p className="mt-4 rounded-lg border border-blue-100 bg-blue-50/50 px-3.5 py-3 text-xs leading-5 text-slate-600"><span className="font-semibold text-slate-800">Tenant checkpoints:</span> approve dispatch to release source stock, then receive stock to post it into the destination.</p>}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {WORKFLOW_STEPS.map((step, index) => (
                    <div key={step.key} className="relative rounded-lg border border-slate-200 bg-white p-4">
                      <span className="text-xs font-semibold tracking-[0.12em] text-blue-700">{step.number}</span>
                      <h3 className="mt-2 text-sm font-semibold text-slate-800">{step.label}</h3>
                      <p className="mt-1.5 text-xs leading-5 text-slate-500">{step.description}</p>
                      {index < WORKFLOW_STEPS.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-white p-0.5 text-blue-400 sm:block" aria-hidden="true" />}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section aria-labelledby="transfer-records-heading" className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
              <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 id="transfer-records-heading" className="text-sm font-semibold text-slate-950">Transfer records</h2>
                      {refreshing && <Loader2 className="h-4 w-4 animate-spin text-blue-600" aria-label="Refreshing" />}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Review the next action, audit trail and warehouse route for every movement.</p>
                  </div>
                  <span className="text-xs text-slate-500">{contextTransfers.length} records in this view</span>
                </div>

                <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Transfer status filters">
                    {STATUS_FILTERS.map((filter) => (
                      <button key={filter.id} type="button" role="tab" aria-selected={statusFilter === filter.id} onClick={() => setStatusFilter(filter.id)} className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-semibold transition ${statusFilter === filter.id ? 'border-blue-200 bg-blue-50/70 text-blue-700' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}>
                        {filter.label}
                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${statusFilter === filter.id ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'}`}>{filterCounts[filter.id]}</span>
                      </button>
                    ))}
                  </div>
                  <label className="relative block w-full xl:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <span className="sr-only">Search transfers</span>
                    <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search ID, warehouse or note" className="min-h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
                  </label>
                </div>
              </div>

              {loadError && !loading ? (
                <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
                  <AlertCircle className="h-7 w-7 text-rose-500" aria-hidden="true" />
                  <h3 className="mt-3 text-sm font-semibold text-slate-800">Transfer records unavailable</h3>
                  <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{loadError}</p>
                  <button type="button" onClick={() => fetchTransfers()} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md bg-blue-700 px-3.5 text-sm font-semibold text-white transition hover:bg-blue-800"><RefreshCw className="h-4 w-4" aria-hidden="true" />Try again</button>
                </div>
              ) : loading ? (
                <div className="divide-y divide-slate-100" aria-busy="true" aria-label="Loading transfer records">
                  {Array.from({ length: 5 }).map((_, index) => <div key={index} className="grid min-w-[1050px] grid-cols-[150px_minmax(320px,1fr)_240px_145px_180px] items-center gap-5 px-5 py-5"><span className="h-4 animate-pulse rounded bg-slate-200" /><span className="h-10 animate-pulse rounded bg-slate-200" /><span className="h-7 animate-pulse rounded bg-slate-200" /><span className="h-10 animate-pulse rounded bg-slate-200" /><span className="ml-auto h-9 w-32 animate-pulse rounded bg-slate-200" /></div>)}
                </div>
              ) : filteredTransfers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1050px] text-left text-sm">
                    <caption className="sr-only">Stock transfer records</caption>
                    <thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                      <tr>
                        <th scope="col" className="px-5 py-3.5">Transfer</th>
                        <th scope="col" className="px-5 py-3.5">Warehouse route</th>
                        <th scope="col" className="px-5 py-3.5">Workflow status</th>
                        <th scope="col" className="px-5 py-3.5">Created</th>
                        <th scope="col" className="px-5 py-3.5 text-right">Next action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTransfers.map((transfer) => {
                        const statusMeta = getTransferStatusMeta(transfer.status)
                        const StatusIcon = statusMeta.icon
                        const transferReference = String(transfer.id || 'Unknown').slice(0, 8).toUpperCase()
                        const primaryAction = getPrimaryAction(transfer)
                        const PrimaryIcon = primaryAction?.icon
                        const totalSku = transfer.items?.length || 0
                        const totalQuantity = transfer.items?.reduce((sum, item) => sum + (Number(item.requestedQuantity) || 0), 0) || 0
                        return (
                          <tr key={transfer.id} className="group transition-colors hover:bg-blue-50/30">
                            <td className="px-5 py-4 align-top">
                              <button type="button" onClick={() => openDetails(transfer.id)} className="text-left focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                                <span className="font-mono text-xs font-bold text-blue-700">TRF-{transferReference}</span>
                                <span className="mt-1 block text-xs text-slate-500">{totalSku} SKU · {totalQuantity.toLocaleString()} units</span>
                              </button>
                            </td>
                            <td className="px-5 py-4 align-top">
                              <div className="grid max-w-[450px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                <div className="min-w-0"><span className="block text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase">From</span><span className="mt-1 block truncate font-semibold text-slate-950" title={transfer.sourceWarehouse?.name}>{transfer.sourceWarehouse?.name || 'Unknown warehouse'}</span></div>
                                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
                <div className="min-w-0"><span className="block text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase">To</span><span className="mt-1 block truncate font-semibold text-slate-950" title={transfer.destinationWarehouse?.name}>{transfer.destinationWarehouse?.name || 'Unknown warehouse'}</span></div>
                              </div>
                              {transfer.note && <p className="mt-2 max-w-[450px] truncate text-xs text-slate-500" title={transfer.note}>“{transfer.note}”</p>}
                            </td>
                              <td className="px-5 py-4 align-top"><div className="flex flex-col gap-2"><span className={`inline-flex w-fit items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.className}`}><StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />{statusMeta.label}</span><WorkflowRail status={transfer.status} compact /></div></td>
                            <td className="px-5 py-4 align-top"><span className="text-xs font-medium text-slate-700">{formatDate(transfer.createdAt)}</span><span className="mt-1 block text-xs text-slate-400">Created by {transfer.createdBy?.fullName || 'Tenant'}</span></td>
                              <td className="px-5 py-4 text-right align-top"><div className="flex items-center justify-end gap-2">{primaryAction && <button type="button" onClick={primaryAction.onClick} className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-blue-700 px-3 text-xs font-bold text-white transition hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:outline-none"><PrimaryIcon className="h-3.5 w-3.5" aria-hidden="true" />{primaryAction.label}</button>}<TableActionMenu label={`Actions for transfer ${transferReference}`} items={getSecondaryActions(transfer)} /></div>{!primaryAction && <span className="mt-2 block text-xs text-slate-400">No further action</span>}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Filter className="h-5 w-5" aria-hidden="true" /></span>
                  <h3 className="mt-4 text-sm font-semibold text-slate-800">{contextTransfers.length ? 'No matching transfers' : 'No transfer records yet'}</h3>
                  <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{contextTransfers.length ? 'Try another status, warehouse or search term.' : 'Create a transfer request to start moving stock between your active warehouses.'}</p>
                  {(contextTransfers.length > 0 || searchQuery || statusFilter !== 'ALL' || selectedWarehouseId) ? <button type="button" onClick={clearFilters} className="mt-4 inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Clear filters</button> : currentRole === 'TENANT' && <button type="button" onClick={() => setCreateModalOpen(true)} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md bg-blue-700 px-3.5 text-sm font-semibold text-white transition hover:bg-blue-800"><Plus className="h-4 w-4" aria-hidden="true" />Create transfer</button>}
                </div>
              )}

              {!loading && !loadError && filteredTransfers.length > 0 && <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/60 px-5 py-3 text-xs text-slate-500"><span>Showing {filteredTransfers.length} of {contextTransfers.length} transfer{contextTransfers.length === 1 ? '' : 's'}</span><span>Use View workflow for the full audit trail</span></div>}
            </section>
          </main>
        </div>
      </div>

      <CreateTransferModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} sourceWarehouseId={selectedWarehouseId} onSuccess={handleCreated} />
      <ReceiveTransferModal isOpen={receiveModalOpen} onClose={() => { setReceiveModalOpen(false); setSelectedTransferForReceive(null) }} transfer={selectedTransferForReceive} onSuccess={handleReceiveSuccess} />
      <TransferDetailModal isOpen={detailModalOpen} onClose={() => { setDetailModalOpen(false); setSelectedTransferIdForDetail(null) }} transferId={selectedTransferIdForDetail} />
      <DecisionReasonModal decision={decision} reason={decisionReason} submitting={decisionSubmitting} onReasonChange={setDecisionReason} onClose={closeDecision} onSubmit={handleDecisionSubmit} />
    </div>
  )
}

export default TransferPage
