import { useEffect, useState } from 'react'
import {
  ArrowRight,
  CalendarClock,
  Clock3,
  Layers3,
  Loader2,
  MapPin,
  Package,
  Truck,
  UserRound,
  Warehouse,
  X,
} from 'lucide-react'
import useEscapeKey from '@/hooks/useEscapeKey'
import transferApi from '@/services/wms/transferApi'
import { showApiErrorToast } from '@/config/apiError'

const STATUS_META = {
  DRAFT: ['Draft', 'border-slate-200 bg-slate-100 text-slate-700'],
  PENDING: ['Awaiting allocation', 'border-amber-200 bg-amber-50 text-amber-800'],
  ALLOCATED: ['Allocated', 'border-indigo-200 bg-indigo-50 text-indigo-700'],
  PICKING: ['Picking', 'border-indigo-200 bg-indigo-50 text-indigo-700'],
  READY_TO_DISPATCH: ['Ready to dispatch', 'border-blue-200 bg-blue-50 text-blue-700'],
  IN_TRANSIT: ['In transit', 'border-blue-200 bg-blue-50 text-blue-700'],
  OVERDUE: ['Overdue', 'border-rose-200 bg-rose-50 text-rose-700'],
  ARRIVED_AT_DESTINATION: ['Arrived at destination', 'border-cyan-200 bg-cyan-50 text-cyan-700'],
  RECEIVING: ['Receiving', 'border-cyan-200 bg-cyan-50 text-cyan-700'],
  PARTIALLY_RECEIVED: ['Partially received', 'border-amber-200 bg-amber-50 text-amber-800'],
  SHORT_RECEIVED: ['Short received', 'border-amber-200 bg-amber-50 text-amber-800'],
  RECEIVE_REJECTED: ['Receipt rejected', 'border-rose-200 bg-rose-50 text-rose-700'],
  RECONCILING: ['Needs reconciliation', 'border-purple-200 bg-purple-50 text-purple-700'],
  RETRY_REQUESTED: ['Retry requested', 'border-indigo-200 bg-indigo-50 text-indigo-700'],
  RETURN_REQUESTED: ['Return requested', 'border-orange-200 bg-orange-50 text-orange-700'],
  RETURN_IN_TRANSIT: ['Return in transit', 'border-orange-200 bg-orange-50 text-orange-700'],
  PARTIALLY_RETURNED: ['Partially returned', 'border-orange-200 bg-orange-50 text-orange-700'],
  RETURNED: ['Returned', 'border-slate-200 bg-slate-100 text-slate-700'],
  COMPLETED: ['Completed', 'border-emerald-200 bg-emerald-50 text-emerald-700'],
  LOST: ['Declared lost', 'border-rose-200 bg-rose-50 text-rose-700'],
  REJECTED: ['Rejected', 'border-rose-200 bg-rose-50 text-rose-700'],
  CANCELLED: ['Cancelled', 'border-slate-200 bg-slate-100 text-slate-700'],
}

const statusMeta = (status) => {
  const [label, className] = STATUS_META[status] || [
    status || 'Unknown',
    'border-slate-200 bg-slate-100 text-slate-700',
  ]
  return { label, className }
}

const formatDate = (value) => (value ? new Date(value).toLocaleString('en-GB') : '—')
const counter = (item, field) => Number(item?.[field] || 0)
const humanize = (value) =>
  String(value || '')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())
const outstanding = (item) =>
  Math.max(
    0,
    counter(item, 'requestedQuantity') -
      counter(item, 'receivedQuantity') -
      counter(item, 'returnedQuantity')
  )

const Stat = ({ label, value, tone = 'text-slate-950', hint }) => (
  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
    <p className="text-[10px] font-bold tracking-[0.12em] text-slate-500 uppercase">{label}</p>
    <p className={`mt-2 text-2xl font-bold tracking-tight tabular-nums ${tone}`}>{value}</p>
    {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
  </div>
)

const TransferDetailModal = ({ isOpen, onClose, transferId }) => {
  useEscapeKey(isOpen, onClose)
  const [loading, setLoading] = useState(true)
  const [transfer, setTransfer] = useState(null)
  const [timeline, setTimeline] = useState([])

  useEffect(() => {
    if (!isOpen || !transferId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTransfer(null)
      setTimeline([])
      return
    }
    const fetchData = async () => {
      setLoading(true)
      try {
        const [detailResponse, timelineResponse] = await Promise.all([
          transferApi.getTransferDetail(transferId),
          transferApi.getTransferTimeline(transferId),
        ])
        setTransfer(detailResponse.data?.data || detailResponse.data)
        const timelinePayload = timelineResponse.data?.data || timelineResponse.data
        setTimeline(
          Array.isArray(timelinePayload) ? timelinePayload : timelinePayload?.content || []
        )
      } catch (error) {
        showApiErrorToast(error, 'Could not load transfer details.')
        onClose()
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [isOpen, transferId, onClose])

  if (!isOpen) return null
  const meta = statusMeta(transfer?.status)
  const currentDestination = transfer?.currentDestinationWarehouse || transfer?.destinationWarehouse
  const items = transfer?.items || []
  const totals = items.reduce(
    (result, item) => ({
      requested: result.requested + counter(item, 'requestedQuantity'),
      picked: result.picked + counter(item, 'pickedQuantity'),
      shipped: result.shipped + counter(item, 'shippedQuantity'),
      received: result.received + counter(item, 'receivedQuantity'),
      returned: result.returned + counter(item, 'returnedQuantity'),
      outstanding: result.outstanding + outstanding(item),
    }),
    { requested: 0, picked: 0, shipped: 0, received: 0, returned: 0, outstanding: 0 }
  )
  const receivedPercent = totals.requested
    ? Math.min(100, Math.round((totals.received / totals.requested) * 100))
    : 0
  const hasReroutedDestination = currentDestination?.id !== transfer?.destinationWarehouse?.id

  return (
    <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-5">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-detail-title"
        className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100vh-2.5rem)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
          <div className="flex min-w-0 items-start gap-3">
            <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 sm:flex">
              <Package className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.16em] text-blue-700 uppercase">
                Transfer record
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2.5">
              <h2
                id="transfer-detail-title"
                className="truncate text-lg font-bold tracking-tight text-slate-950 sm:text-xl"
              >
                {transfer?.transferNo ||
                  (transfer
                    ? `TRF-${String(transfer.id).slice(0, 8).toUpperCase()}`
                    : 'Transfer details')}
              </h2>
              {transfer && (
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.className}`}
                >
                  {meta.label}
                </span>
              )}
              </div>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Full workflow, attempts and event audit trail
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close transfer details"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        {loading ? (
          <div className="flex min-h-72 items-center justify-center gap-3 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading transfer record
          </div>
        ) : !transfer ? (
          <div className="flex min-h-72 items-center justify-center text-sm text-slate-500">
            Transfer record not found.
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-slate-50/70 p-4 sm:p-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-2 text-[10px] font-bold tracking-[0.14em] text-slate-500 uppercase">
                <Warehouse className="h-4 w-4 text-blue-600" />
                Operational route
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_52px_minmax(0,1fr)] sm:items-center">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    Source warehouse
                  </p>
                  <p className="mt-2 truncate text-base font-bold text-slate-950">
                    {transfer.sourceWarehouse?.name || '—'}
                  </p>
                </div>
                <div className="flex justify-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-600">
                    <ArrowRight className="h-5 w-5" />
                  </span>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
                  <p className="flex items-center gap-2 text-xs font-semibold text-blue-700">
                    <Warehouse className="h-4 w-4 text-blue-500" />
                    Destination warehouse
                  </p>
                  <p className="mt-2 truncate text-base font-bold text-slate-950">
                    {transfer.destinationWarehouse?.name || '—'}
                  </p>
                </div>
              </div>
              {hasReroutedDestination && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2.5 text-sm text-indigo-900">
                  <RotateIcon />
                  Current destination: <strong>{currentDestination?.name || '—'}</strong>
                </div>
              )}
            </section>

            <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3 sm:p-5">
              <Info
                label="Source staff"
                value={transfer.sourceStaff?.fullName || transfer.sourceStaff?.name || 'Not assigned'}
                icon={UserRound}
              />
              <Info
                label="Destination staff"
                value={
                  transfer.destinationStaff?.fullName ||
                  transfer.destinationStaff?.name ||
                  'Not assigned'
                }
                icon={UserRound}
              />
              <Info
                label="Expected arrival"
                value={formatDate(transfer.expectedArrivalAt)}
                icon={CalendarClock}
              />
            </div>

            <section>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.14em] text-blue-700 uppercase">
                    Movement overview
                  </p>
                  <h3 className="mt-1 text-base font-bold text-slate-950">Quantity control</h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Track the quantity from source allocation to destination receipt.
                  </p>
                </div>
                <div className="min-w-44">
                  <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-500">
                    <span>Receipt progress</span>
                    <span>{receivedPercent}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${receivedPercent}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                <Stat
                  label="Requested"
                  value={totals.requested}
                  hint={`${items.length} SKU`}
                />
                <Stat
                  label="Picked"
                  value={totals.picked}
                  hint="Source scan"
                />
                <Stat
                  label="Shipped"
                  value={totals.shipped}
                  hint="Released in transit"
                />
                <Stat
                  label="Received"
                  value={totals.received}
                  hint={`${receivedPercent}% completed`}
                  tone="text-emerald-700"
                />
                <Stat
                  label="Outstanding"
                  value={totals.outstanding}
                  hint={totals.returned ? `${totals.returned} returned` : 'Still open'}
                  tone="text-amber-700"
                />
              </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.8fr)]">
              <section>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.14em] text-blue-700 uppercase">
                      <Package className="h-4 w-4" />
                      Transfer items
                    </p>
                    <p className="mt-1 text-sm text-slate-500">Quantity and bin allocation by SKU</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200">
                    {items.length} SKU{items.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="space-y-3">
                  {(transfer.items || []).map((item) => (
                    <article
                      key={item.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                      <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-slate-950">
                            {item.skuName || 'Unnamed SKU'}
                          </p>
                          <p className="mt-1 font-mono text-xs text-slate-500">
                            {item.skuCode || item.skuId}
                          </p>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-right text-xs sm:min-w-80">
                          <MiniMetric label="Requested" value={item.requestedQuantity} />
                          <MiniMetric label="Shipped" value={item.shippedQuantity || 0} tone="text-blue-700" />
                          <MiniMetric label="Received" value={item.receivedQuantity || 0} tone="text-emerald-700" />
                          <MiniMetric label="Open" value={outstanding(item)} tone="text-amber-700" />
                        </div>
                      </div>
                      <div className="grid gap-4 p-4 md:grid-cols-2">
                        <AllocationList
                          title="Source allocations"
                          allocations={item.sourceAllocations}
                          source
                        />
                        <AllocationList
                          title="Destination allocations"
                          allocations={item.destinationAllocations}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
              <section className="self-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-0">
                <div className="border-b border-slate-100 bg-white px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <Clock3 className="h-4 w-4" />
                      </span>
                      <span>
                        Event timeline
                        <span className="mt-0.5 block text-xs font-normal text-slate-500">
                          Audit trail of every checkpoint
                        </span>
                      </span>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                      {timeline.length} events
                    </span>
                  </div>
                </div>
                <div className="max-h-[34rem] overflow-y-auto p-4">
                  {timeline.length ? (
                    <div className="relative pl-5 before:absolute before:top-2 before:bottom-2 before:left-5 before:w-px before:bg-slate-200">
                    {timeline.map((event) => (
                      <div
                        key={event.id || `${event.command}-${event.createdAt}`}
                        className="relative mb-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 pl-4 last:mb-0"
                      >
                        <span className="absolute top-4 -left-1.5 h-3 w-3 rounded-full border-2 border-white bg-blue-600 shadow-sm" />
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-xs font-bold tracking-wide text-slate-800 uppercase">
                            {humanize(event.command) ||
                              `${event.fromStatus || '—'} → ${event.toStatus || '—'}`}
                          </p>
                          <time className="shrink-0 text-[11px] text-slate-500">
                            {formatDate(event.createdAt)}
                          </time>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {event.fromStatus || 'Created'} → {event.toStatus || '—'} ·{' '}
                          {event.actor?.fullName ||
                            event.actor?.name ||
                            event.actor?.email ||
                            'System'}
                        </p>
                        {event.reason && (
                          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                            {event.reason}
                          </p>
                        )}
                      </div>
                    ))}
                    </div>
                  ) : (
                    <p className="px-4 py-6 text-sm text-slate-500">
                      No timeline events available.
                    </p>
                  )}
                </div>
              </section>
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Truck className="h-4 w-4" />
                  </span>
                  <span>
                    Movement attempts
                    <span className="mt-0.5 block text-xs font-normal text-slate-500">
                      Dispatch and receiving legs
                    </span>
                  </span>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                  {transfer.attempts?.length || 0} recorded
                </span>
              </div>
              {transfer.attempts?.length ? (
                <div className="grid gap-3 p-4 md:grid-cols-2">
                  {transfer.attempts.map((attempt) => (
                    <div
                      key={attempt.id || attempt.sequenceNo}
                      className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-blue-700">Attempt #{attempt.sequenceNo}</span>
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold tracking-wide text-slate-600 uppercase">
                          {humanize(attempt.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                        {humanize(attempt.type)}
                      </p>
                      <span className="mt-4 block">
                        <b className="block text-xs text-slate-500">Route</b>
                        {attempt.sourceWarehouse?.name || '—'} →{' '}
                        {attempt.destinationWarehouse?.name || '—'}
                      </span>
                      <span className="mt-3 block rounded-lg bg-white px-3 py-2">
                        <b className="block text-xs text-slate-500">Progress</b>
                        {attempt.shippedQuantity || 0} shipped · {attempt.receivedQuantity || 0}{' '}
                        received
                      </span>
                      <span className="mt-3 block text-slate-500">
                        <b className="block text-xs text-slate-500">Receiver</b>
                        {attempt.destinationStaff?.fullName ||
                          attempt.destinationStaff?.name ||
                          'Not assigned'}
                      </span>
                      <span className="mt-3 block border-t border-slate-200 pt-3 text-xs text-slate-500">
                        Started {formatDate(attempt.startedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-4 py-5 text-sm text-slate-500">No movement attempts recorded.</p>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Layers3 className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-950">Record context</h3>
                  <p className="mt-0.5 text-xs text-slate-500">People, timing and decision details</p>
                </div>
              </div>
              <div className="grid gap-4 p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <Info
                label="Created by"
                value={transfer.createdBy?.fullName || transfer.createdBy?.name || '—'}
              />
              <Info
                label="Received by"
                value={transfer.receivedBy?.fullName || transfer.receivedBy?.name || '—'}
              />
              <Info label="Decision reason" value={transfer.decisionReason || '—'} />
              </div>
            </section>
          </div>
        )}
      </section>
    </div>
  )
}

const RotateIcon = () => (
  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-200 text-indigo-700">
    ↻
  </span>
)
const MiniMetric = ({ label, value, tone = 'text-slate-950' }) => (
  <div className="min-w-0 rounded-lg bg-slate-50 px-2 py-1.5">
    <p className="truncate text-[9px] font-semibold tracking-wide text-slate-400 uppercase">{label}</p>
    <p className={`mt-0.5 text-sm font-bold tabular-nums ${tone}`}>{value}</p>
  </div>
)
const Info = ({ label, value, icon: Icon }) => (
  <div className="min-w-0">
    <p className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">
      {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
      {label}
    </p>
    <p className="mt-1 break-words font-medium text-slate-800">{value}</p>
  </div>
)
const AllocationList = ({ title, allocations = [], source }) => (
  <section>
    <p className="mb-2 text-xs font-bold tracking-[0.08em] text-slate-500 uppercase">{title}</p>
    {allocations?.length ? (
      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {allocations.map((allocation, index) => (
          <div
            key={allocation.id || index}
            className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
          >
            <span className="min-w-0 truncate text-slate-600">
              {source
                ? `${allocation.sourceRackName || 'Rack'} / ${allocation.sourceBinName || 'Bin'}`
                : `${allocation.destinationRackName || 'Rack'} / ${allocation.destinationBinName || 'Bin'}`}
              {!source && allocation.disposition && (
                <em className="ml-1 text-slate-400 not-italic">· {allocation.disposition}</em>
              )}
            </span>
            <strong className="shrink-0 text-slate-950">{allocation.quantity}</strong>
          </div>
        ))}
      </div>
    ) : (
      <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-xs text-slate-500">
        No allocations yet.
      </p>
    )}
  </section>
)

export default TransferDetailModal
