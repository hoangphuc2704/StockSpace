import { useEffect, useState } from 'react'
import { ArrowRight, Clock3, Loader2, Package, Truck, Warehouse, X } from 'lucide-react'
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
const outstanding = (item) =>
  Math.max(
    0,
    counter(item, 'requestedQuantity') -
      counter(item, 'receivedQuantity') -
      counter(item, 'returnedQuantity')
  )

const Stat = ({ label, value, tone = 'text-slate-950' }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3">
    <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">{label}</p>
    <p className={`mt-1 text-lg font-bold tabular-nums ${tone}`}>{value}</p>
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

  return (
    <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-detail-title"
        className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-[0.14em] text-blue-700 uppercase">
              Transfer record
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h2
                id="transfer-detail-title"
                className="text-xl font-bold tracking-tight text-slate-950"
              >
                {transfer?.transferNo ||
                  (transfer
                    ? `TRF-${String(transfer.id).slice(0, 8).toUpperCase()}`
                    : 'Transfer details')}
              </h2>
              {transfer && (
                <span
                  className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${meta.className}`}
                >
                  {meta.label}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Full workflow, attempts and event audit trail
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close transfer details"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
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
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
            <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2 text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">
                <Warehouse className="h-4 w-4" />
                Warehouse route
              </div>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
                <div>
                  <p className="text-xs text-slate-500">Source warehouse</p>
                  <p className="mt-1 text-base font-semibold text-slate-950">
                    {transfer.sourceWarehouse?.name || '—'}
                  </p>
                </div>
                <ArrowRight className="hidden h-5 w-5 text-blue-500 sm:block" />
                <div>
                  <p className="text-xs text-slate-500">Original destination</p>
                  <p className="mt-1 text-base font-semibold text-slate-950">
                    {transfer.destinationWarehouse?.name || '—'}
                  </p>
                </div>
              </div>
              {currentDestination?.id !== transfer.destinationWarehouse?.id && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
                  <RotateIcon />
                  Current destination: <strong>{currentDestination?.name || '—'}</strong>
                </div>
              )}
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-950">Quantity control</h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    BE calculates outstanding and returnable quantities per item.
                  </p>
                </div>
                <span
                  className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${meta.className}`}
                >
                  {meta.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <Stat
                  label="Requested"
                  value={transfer.items?.reduce(
                    (sum, item) => sum + counter(item, 'requestedQuantity'),
                    0
                  )}
                />
                <Stat
                  label="Picked"
                  value={transfer.items?.reduce(
                    (sum, item) => sum + counter(item, 'pickedQuantity'),
                    0
                  )}
                />
                <Stat
                  label="Shipped"
                  value={transfer.items?.reduce(
                    (sum, item) => sum + counter(item, 'shippedQuantity'),
                    0
                  )}
                />
                <Stat
                  label="Received"
                  value={transfer.items?.reduce(
                    (sum, item) => sum + counter(item, 'receivedQuantity'),
                    0
                  )}
                  tone="text-emerald-700"
                />
                <Stat
                  label="Outstanding"
                  value={transfer.items?.reduce((sum, item) => sum + outstanding(item), 0)}
                  tone="text-amber-700"
                />
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
              <section>
                <div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">
                  <Package className="h-4 w-4" />
                  Transfer items
                </div>
                <div className="space-y-3">
                  {(transfer.items || []).map((item) => (
                    <article
                      key={item.id}
                      className="overflow-hidden rounded-xl border border-slate-200"
                    >
                      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-slate-950">
                            {item.skuName || 'Unnamed SKU'}
                          </p>
                          <p className="mt-1 font-mono text-xs text-slate-500">
                            {item.skuCode || item.skuId}
                          </p>
                        </div>
                        <div className="grid grid-cols-4 gap-3 text-right text-xs">
                          <span>
                            <b className="block text-base text-slate-950">
                              {item.requestedQuantity}
                            </b>
                            requested
                          </span>
                          <span>
                            <b className="block text-base text-blue-700">
                              {item.shippedQuantity || 0}
                            </b>
                            shipped
                          </span>
                          <span>
                            <b className="block text-base text-emerald-700">
                              {item.receivedQuantity || 0}
                            </b>
                            received
                          </span>
                          <span>
                            <b className="block text-base text-amber-700">{outstanding(item)}</b>
                            open
                          </span>
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
              <section className="overflow-hidden rounded-xl border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                    <Clock3 className="h-4 w-4 text-slate-500" />
                    Event timeline
                  </div>
                </div>
                <div className="max-h-[32rem] divide-y divide-slate-100 overflow-y-auto">
                  {timeline.length ? (
                    timeline.map((event) => (
                      <div
                        key={event.id || `${event.command}-${event.createdAt}`}
                        className="px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-800">
                            {event.command ||
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
                    ))
                  ) : (
                    <p className="px-4 py-6 text-sm text-slate-500">
                      No timeline events available.
                    </p>
                  )}
                </div>
              </section>
            </div>

            <section className="rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950">
                <Truck className="h-4 w-4 text-slate-500" />
                Movement attempts
              </div>
              {transfer.attempts?.length ? (
                <div className="divide-y divide-slate-100">
                  {transfer.attempts.map((attempt) => (
                    <div
                      key={attempt.id || attempt.sequenceNo}
                      className="grid gap-3 px-4 py-3 text-sm md:grid-cols-[80px_110px_1fr_1fr_150px]"
                    >
                      <span className="font-bold text-blue-700">#{attempt.sequenceNo}</span>
                      <span className="font-semibold text-slate-700">{attempt.type}</span>
                      <span>
                        <b className="block text-xs text-slate-500">Route</b>
                        {attempt.sourceWarehouse?.name || '—'} →{' '}
                        {attempt.destinationWarehouse?.name || '—'}
                      </span>
                      <span>
                        <b className="block text-xs text-slate-500">Progress</b>
                        {attempt.shippedQuantity || 0} shipped · {attempt.receivedQuantity || 0}{' '}
                        received
                      </span>
                      <span className="text-slate-500">
                        {attempt.status}
                        <br />
                        {formatDate(attempt.startedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-4 py-5 text-sm text-slate-500">No movement attempts recorded.</p>
              )}
            </section>

            <section className="grid gap-4 border-t border-slate-200 pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Info
                label="Created by"
                value={transfer.createdBy?.fullName || transfer.createdBy?.name || '—'}
              />
              <Info
                label="Source staff"
                value={
                  transfer.sourceStaff?.fullName || transfer.sourceStaff?.name || 'Not assigned'
                }
              />
              <Info label="Expected arrival" value={formatDate(transfer.expectedArrivalAt)} />
              <Info label="Decision reason" value={transfer.decisionReason || '—'} />
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
const Info = ({ label, value }) => (
  <div>
    <p className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">{label}</p>
    <p className="mt-1 font-medium break-words text-slate-800">{value}</p>
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
