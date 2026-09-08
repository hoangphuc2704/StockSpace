import { useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, Clock3, FileText, Loader2, PackageCheck, Truck, Warehouse, X } from 'lucide-react'
import useEscapeKey from '@/hooks/useEscapeKey'
import transferApi from '@/services/wms/transferApi'
import { showApiErrorToast } from '@/config/apiError'

const TRANSFER_STATUS_META = {
  PENDING: { label: 'Pending', className: 'border-amber-200 bg-amber-50 text-amber-800' },
  IN_TRANSIT: { label: 'In transit', className: 'border-blue-200 bg-blue-50 text-blue-700' },
  COMPLETED: { label: 'Completed', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  REJECTED: { label: 'Rejected', className: 'border-rose-200 bg-rose-50 text-rose-700' },
  CANCELLED: { label: 'Cancelled', className: 'border-slate-200 bg-slate-100 text-slate-700' },
}

const getStatusMeta = (status) =>
  TRANSFER_STATUS_META[status] || {
    label: status || 'Unknown',
    className: 'border-slate-200 bg-slate-100 text-slate-700',
  }

const formatDate = (dateString) => (dateString ? new Date(dateString).toLocaleString() : '-')

const WORKFLOW_STEPS = [
  { label: 'Request created', description: 'Awaiting dispatch approval', icon: FileText },
  { label: 'Dispatch approved', description: 'Stock is in transit', icon: Truck },
  { label: 'Destination received', description: 'Inventory updated', icon: PackageCheck },
]

const TransferDetailModal = ({ isOpen, onClose, transferId }) => {
  useEscapeKey(isOpen, onClose)

  const [loading, setLoading] = useState(true)
  const [transfer, setTransfer] = useState(null)

  useEffect(() => {
    if (!isOpen || !transferId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTransfer(null)
      return
    }

    const fetchDetail = async () => {
      setLoading(true)
      try {
        const res = await transferApi.getTransferDetail(transferId)
        setTransfer(res.data?.data)
      } catch (error) {
        showApiErrorToast(error, 'Could not load transfer details.')
        onClose()
      } finally {
        setLoading(false)
      }
    }

    fetchDetail()
  }, [isOpen, transferId, onClose])

  if (!isOpen) return null

  const statusMeta = getStatusMeta(transfer?.status)
  const currentStepIndex = transfer?.status === 'COMPLETED'
    ? 2
    : transfer?.status === 'IN_TRANSIT'
      ? 1
      : 0
  const isClosed = ['REJECTED', 'CANCELLED'].includes(transfer?.status)
  const timelineEntries = [
    { label: 'Created', value: transfer?.createdAt },
    { label: 'Dispatched', value: transfer?.approvedAt },
    { label: 'Received', value: transfer?.receivedAt },
    { label: 'Rejected', value: transfer?.rejectedAt, danger: true },
    { label: 'Cancelled', value: transfer?.cancelledAt },
  ].filter((entry) => entry.value)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-detail-title"
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-slate-300 bg-white shadow-xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
              Transfer record
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2.5">
              <h2
                id="transfer-detail-title"
                className="text-xl font-bold tracking-tight text-slate-950"
              >
                Transfer details
              </h2>
              {transfer && (
                <span
                  className={`inline-flex items-center rounded border px-2 py-1 text-[11px] font-semibold ${statusMeta.className}`}
                >
                  {statusMeta.label}
                </span>
              )}
            </div>
            {transfer && (
              <p className="mt-1 font-mono text-xs text-slate-500">
                TRF-{String(transfer.id).slice(0, 8).toUpperCase()}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close transfer details"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {loading ? (
          <div
            className="flex min-h-72 items-center justify-center gap-3 text-sm text-slate-500"
            role="status"
          >
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            Loading transfer record
          </div>
        ) : !transfer ? (
          <div className="flex min-h-72 items-center justify-center px-6 text-center text-sm text-slate-500">
            Transfer record not found.
          </div>
        ) : (
          <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
            <section
              aria-labelledby="transfer-route-heading"
              className="border-b border-slate-200 pb-5"
            >
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase">
                <Warehouse className="h-3.5 w-3.5" aria-hidden="true" />
                <h3 id="transfer-route-heading">Warehouse route</h3>
              </div>
              <div className="grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-5">
                <div className="min-w-0 border-l-2 border-slate-300 pl-3">
                  <p className="text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase">
                    Source warehouse
                  </p>
                  <p className="mt-1 truncate text-lg font-semibold text-slate-950">
                    {transfer.sourceWarehouse?.name || 'Unknown warehouse'}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 sm:hidden" aria-hidden="true" />
                <div
                  className="hidden items-center gap-2 text-slate-400 sm:flex"
                  aria-hidden="true"
                >
                  <span className="h-px w-8 bg-slate-300" />
                  <ArrowRight className="h-5 w-5" />
                  <span className="h-px w-8 bg-slate-300" />
                </div>
                <div className="min-w-0 border-l-2 border-blue-600 pl-3 sm:border-r-2 sm:border-l-0 sm:pr-3 sm:text-right">
                  <p className="text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase">
                    Destination warehouse
                  </p>
                  <p className="mt-1 truncate text-lg font-semibold text-slate-950">
                    {transfer.destinationWarehouse?.name || 'Unknown warehouse'}
                  </p>
                </div>
              </div>
            </section>

            <section aria-labelledby="transfer-lifecycle-heading" className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase">Process visibility</p>
                  <h3 id="transfer-lifecycle-heading" className="mt-1 text-base font-semibold text-slate-950">Transfer lifecycle</h3>
                </div>
                <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}>
                  {statusMeta.label}
                </span>
              </div>

              {isClosed ? (
                <p className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-600">
                  This transfer is closed and no further warehouse action is available.
                </p>
              ) : (
                <ol className="mt-5 grid gap-4 md:grid-cols-3">
                  {WORKFLOW_STEPS.map((step, index) => {
                    const StepIcon = step.icon
                    const completed = index < currentStepIndex || transfer.status === 'COMPLETED'
                    const current = index === currentStepIndex

                    return (
                      <li key={step.label} className="relative flex gap-3 md:block">
                        {index < WORKFLOW_STEPS.length - 1 && (
                          <span className={`absolute left-4 top-8 hidden h-px w-[calc(100%-1rem)] md:block ${index < currentStepIndex ? 'bg-emerald-400' : 'bg-slate-200'}`} aria-hidden="true" />
                        )}
                        <span className={`relative z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${completed ? 'border-emerald-600 bg-emerald-600 text-white' : current ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 bg-white text-slate-400'}`}>
                          {completed ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <StepIcon className="h-4 w-4" aria-hidden="true" />}
                        </span>
                        <div className="md:mt-3">
                          <p className={`text-sm font-semibold ${current ? 'text-blue-700' : completed ? 'text-slate-950' : 'text-slate-500'}`}>{step.label}</p>
                          <p className="mt-0.5 text-xs leading-5 text-slate-500">{step.description}</p>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </section>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
              <section aria-labelledby="transfer-notes-heading">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase">
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  <h3 id="transfer-notes-heading">Operational notes</h3>
                </div>
                <div className="border-y border-slate-200 py-3 text-sm leading-6 text-slate-700">
                  {transfer.note || (
                    <span className="text-slate-500">No note was provided for this transfer.</span>
                  )}
                </div>
                {transfer.decisionReason && (
                  <div className="mt-4 border-l-2 border-rose-500 bg-rose-50 px-3 py-2.5">
                    <p className="text-xs font-semibold tracking-[0.1em] text-rose-700 uppercase">
                      Decision reason
                    </p>
                    <p className="mt-1 text-sm leading-6 text-rose-900">
                      {transfer.decisionReason}
                    </p>
                  </div>
                )}
              </section>

              <section
                aria-labelledby="transfer-timeline-heading"
                className="border border-slate-200"
              >
                <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <Clock3 className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  <h3
                    id="transfer-timeline-heading"
                    className="text-sm font-semibold text-slate-950"
                  >
                    Timeline
                  </h3>
                </div>
                <dl className="divide-y divide-slate-200">
                  {timelineEntries.length > 0 ? (
                    timelineEntries.map((entry) => (
                      <div
                        key={entry.label}
                        className="flex items-baseline justify-between gap-4 px-4 py-3 text-sm"
                      >
                        <dt className="text-slate-500">{entry.label}</dt>
                        <dd
                          className={`text-right font-medium tabular-nums ${entry.danger ? 'text-rose-700' : 'text-slate-950'}`}
                        >
                          {formatDate(entry.value)}
                        </dd>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-5 text-sm text-slate-500">
                      No event timestamps are available.
                    </div>
                  )}
                </dl>
              </section>
            </div>

            <section aria-labelledby="transfer-items-heading">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3
                    id="transfer-items-heading"
                    className="text-base font-semibold text-slate-950"
                  >
                    Transfer items
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Source and destination locations by SKU
                  </p>
                </div>
                <span className="text-sm font-medium text-slate-500">
                  {transfer.items?.length || 0} SKU
                </span>
              </div>

              <div className="space-y-4">
                {(transfer.items || []).map((item, index) => (
                  <article
                    key={item.id || index}
                    className="overflow-hidden rounded-lg border border-slate-200"
                  >
                    <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {item.skuName || 'Unnamed SKU'}
                        </p>
                        <p className="mt-1 font-mono text-xs text-slate-500">
                          {item.skuCode || 'No SKU code'}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">
                          Requested quantity
                        </p>
                        <p className="mt-1 text-lg font-semibold text-slate-950 tabular-nums">
                          {item.requestedQuantity ?? '-'}
                        </p>
                      </div>
                    </div>

                    <div className="grid lg:grid-cols-2 lg:divide-x lg:divide-slate-200">
                      <section className="p-4" aria-label="Source allocations">
                        <p className="mb-2 text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase">
                          Dispatched from
                        </p>
                        {item.sourceAllocations?.length ? (
                          <div className="divide-y divide-slate-200 border-y border-slate-200">
                            {item.sourceAllocations.map((allocation, allocationIndex) => (
                              <div
                                key={allocationIndex}
                                className="flex items-center justify-between gap-4 py-2.5 text-sm"
                              >
                                <span className="min-w-0 truncate text-slate-700">
                                  {allocation.sourceRackName || 'Unknown rack'} /{' '}
                                  {allocation.sourceBinName || 'Unknown bin'}
                                </span>
                                <span className="shrink-0 font-semibold text-slate-950 tabular-nums">
                                  {allocation.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="border-y border-slate-200 py-3 text-sm text-slate-500">
                            No source allocations recorded.
                          </p>
                        )}
                      </section>

                      <section
                        className="border-t border-slate-200 p-4 lg:border-t-0"
                        aria-label="Destination allocations"
                      >
                        <p className="mb-2 text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase">
                          Received into
                        </p>
                        {item.destinationAllocations?.length ? (
                          <div className="divide-y divide-slate-200 border-y border-slate-200">
                            {item.destinationAllocations.map((allocation, allocationIndex) => (
                              <div
                                key={allocationIndex}
                                className="flex items-center justify-between gap-4 py-2.5 text-sm"
                              >
                                <span className="min-w-0 truncate text-slate-700">
                                  {allocation.destinationRackName || 'Unknown rack'} /{' '}
                                  {allocation.destinationBinName || 'Unknown bin'}
                                </span>
                                <span className="shrink-0 font-semibold text-slate-950 tabular-nums">
                                  {allocation.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="border-y border-slate-200 py-3 text-sm text-slate-500">
                            Waiting for destination receipt.
                          </p>
                        )}
                      </section>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </section>
    </div>
  )
}

export default TransferDetailModal
