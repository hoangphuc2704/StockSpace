import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  PackageCheck,
  RotateCcw,
  Undo2,
  UserRound,
  X,
} from 'lucide-react'
import useEscapeKey from '@/hooks/useEscapeKey'
import layoutApi from '@/services/layoutApi'
import staffApi from '@/services/staff/staffApi'
import transferApi, { createTransferIdempotencyKey } from '@/services/wms/transferApi'
import { showApiErrorToast } from '@/config/apiError'
import { toast } from 'react-hot-toast'

const modalCopy = {
  pick: {
    title: 'Confirm source picking',
    eyebrow: 'Source warehouse',
    action: 'Confirm picked quantities',
    icon: PackageCheck,
  },
  retry: {
    title: 'Retry this transfer',
    eyebrow: 'Transfer recovery',
    action: 'Create retry',
    icon: RotateCcw,
  },
  assignDestinationStaff: {
    title: 'Assign destination receiver',
    eyebrow: 'Destination warehouse',
    action: 'Save assignment',
    icon: UserRound,
  },
  returnReceive: {
    title: 'Receive returned stock',
    eyebrow: 'Source warehouse',
    action: 'Confirm return receipt',
    icon: Undo2,
  },
  reconcile: {
    title: 'Resolve transfer exception',
    eyebrow: 'Reconciliation',
    action: 'Save resolution',
    icon: CheckCircle2,
  },
}

const returnableQuantity = (item) =>
  Math.max(
    0,
    Number(item.shippedQuantity || 0) -
      Number(item.receivedGoodQuantity || 0) -
      Number(item.returnedQuantity || 0)
  )

const pickedQuantity = (allocation) => Number(allocation?.pickedQuantity || 0)
const allocationRemainingQuantity = (allocation) =>
  Math.max(0, Number(allocation?.remainingQuantity || 0))
const itemRemainingToPick = (item) =>
  Math.max(0, Number(item?.requestedQuantity || 0) - Number(item?.pickedQuantity || 0))

const Field = ({ label, children, hint }) => (
  <div>
    <label className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>
    {children}
    {hint && <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>}
  </div>
)

const selectClass =
  'min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100'
const inputClass =
  'min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100'

const TransferActionModal = ({ mode, isOpen, onClose, transfer, warehouses = [], onSuccess }) => {
  useEscapeKey(isOpen, onClose)
  const copy = modalCopy[mode]
  const currentDestinationId =
    transfer?.currentDestinationWarehouse?.id || transfer?.destinationWarehouse?.id
  const [submitting, setSubmitting] = useState(false)
  const [reason, setReason] = useState('')
  const [expectedArrivalAt, setExpectedArrivalAt] = useState('')
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('')
  const [destinationStaffId, setDestinationStaffId] = useState('')
  const [destinationStaff, setDestinationStaff] = useState([])
  const [loadingStaff, setLoadingStaff] = useState(false)
  const [lines, setLines] = useState([])
  const [layout, setLayout] = useState(null)
  const [loadingLayout, setLoadingLayout] = useState(false)

  const items = useMemo(() => transfer?.items || [], [transfer])
  const sourceAllocations = useMemo(
    () =>
      items.flatMap((item) =>
        (item.sourceAllocations || []).map((allocation) => ({ ...allocation, item }))
      ),
    [items]
  )
  const pickSummary = useMemo(() => {
    if (mode !== 'pick') return null
    const requested = items.reduce((sum, item) => sum + Number(item.requestedQuantity || 0), 0)
    const picked = items.reduce((sum, item) => sum + Number(item.pickedQuantity || 0), 0)
    const remaining = items.reduce((sum, item) => sum + itemRemainingToPick(item), 0)
    const currentOperation = lines.reduce(
      (sum, line) => sum + Math.max(0, Number(line.quantity || 0)),
      0
    )
    return {
      requested,
      picked,
      remaining,
      currentOperation,
      afterOperation: picked + currentOperation,
      expectedStatus:
        currentOperation > 0 && picked + currentOperation >= requested
          ? 'READY_TO_DISPATCH'
          : 'PICKING',
    }
  }, [items, lines, mode])

  useEffect(() => {
    if (!isOpen || !transfer || !mode) return
    // This effect resets the form whenever a different workflow action is opened.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReason('')
    setExpectedArrivalAt('')
    setDestinationWarehouseId('')
    setDestinationStaffId(
      mode === 'assignDestinationStaff' ? transfer.destinationStaff?.id || '' : ''
    )
    if (mode === 'pick') {
      setLines(
        sourceAllocations.map((allocation) => ({
          sourceAllocationId: allocation.id,
          quantity: '',
        }))
      )
    } else if (mode === 'returnReceive') {
      setLines(
        items
          .filter((item) => returnableQuantity(item) > 0)
          .map((item) => ({
            itemId: item.id,
            quantity: '',
            sourceRackId: '',
            sourceBinId: '',
            disposition: 'GOOD',
            note: '',
          }))
      )
    } else {
      setLines([])
    }
  }, [isOpen, mode, transfer, items, sourceAllocations])

  useEffect(() => {
    if (!isOpen || !transfer || !['retry', 'assignDestinationStaff'].includes(mode)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDestinationStaff([])
      return
    }

    const warehouseId = mode === 'assignDestinationStaff'
      ? (transfer.currentDestinationWarehouse || transfer.destinationWarehouse)?.id
      : destinationWarehouseId
    if (!warehouseId) {
      setDestinationStaff([])
      return
    }

    const loadDestinationStaff = async () => {
      setLoadingStaff(true)
      try {
        const response = await staffApi.listStaffs({
          page: 0,
          size: 100,
          warehouseId,
          active: true,
        })
        const staffList = response.data?.data?.content || response.data?.data || []
        setDestinationStaff(
          staffList.map((staff) => ({
            ...staff,
            userId: staff.userId || staff.memberId,
          }))
        )
      } catch (error) {
        showApiErrorToast(error, 'Could not load destination staff.')
        setDestinationStaff([])
      } finally {
        setLoadingStaff(false)
      }
    }
    loadDestinationStaff()
  }, [destinationWarehouseId, isOpen, mode, transfer])

  useEffect(() => {
    if (!isOpen || mode !== 'returnReceive' || !transfer?.sourceWarehouse?.id) return
    const loadLayout = async () => {
      setLoadingLayout(true)
      try {
        const response = await layoutApi.getTenantWarehouseLayout(transfer.sourceWarehouse.id)
        setLayout(response.data?.data || response.data || {})
      } catch (error) {
        showApiErrorToast(error, 'Could not load source warehouse layout.')
      } finally {
        setLoadingLayout(false)
      }
    }
    loadLayout()
  }, [isOpen, mode, transfer])

  if (!isOpen || !transfer || !copy) return null

  const updateLine = (index, field, value) => {
    setLines((current) =>
      current.map((line, lineIndex) => {
        if (lineIndex !== index) return line
        return {
          ...line,
          [field]: value,
          ...(field.endsWith('RackId') ? { sourceBinId: '' } : {}),
          ...(field === 'disposition' && value === 'GOOD' ? { note: '' } : {}),
        }
      })
    )
  }

  const fillAllocationRemaining = (index) => {
    const allocation = sourceAllocations[index]
    if (!allocation) return
    updateLine(index, 'quantity', String(allocationRemainingQuantity(allocation)))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    let payload
    if (mode === 'pick') {
      const pickLines = lines
        .filter((line) => Number(line.quantity) > 0)
        .map((line) => ({
          sourceAllocationId: line.sourceAllocationId,
          quantity: Number(line.quantity),
        }))
      if (!pickLines.length) return toast.error('Enter at least one picked quantity.')
      if (
        lines.some(
          (line, index) =>
            Number(line.quantity) < 0 ||
            !Number.isInteger(Number(line.quantity)) ||
            Number(line.quantity) > allocationRemainingQuantity(sourceAllocations[index])
        )
      )
        return toast.error('Picked quantity must be a whole number within the remaining allocation.')
      const pickedByItem = new Map()
      lines.forEach((line, index) => {
        const quantity = Number(line.quantity || 0)
        if (quantity <= 0) return
        const itemId = sourceAllocations[index]?.item?.id
        pickedByItem.set(itemId, (pickedByItem.get(itemId) || 0) + quantity)
      })
      for (const [itemId, quantity] of pickedByItem) {
        const item = items.find((entry) => String(entry.id) === String(itemId))
        if (quantity > itemRemainingToPick(item))
          return toast.error(
            `Picked quantity exceeds the remaining quantity for ${item?.skuCode || 'this SKU'}.`
          )
      }
      payload = { lines: pickLines }
    } else if (mode === 'retry') {
      if (!destinationWarehouseId || !reason.trim())
        return toast.error('Select a destination and enter a reason.')
      payload = {
        destinationWarehouseId,
        ...(destinationStaffId ? { destinationStaffId } : {}),
        ...(expectedArrivalAt ? { expectedArrivalAt: `${expectedArrivalAt}:00` } : {}),
        reason: reason.trim(),
      }
    } else if (mode === 'assignDestinationStaff') {
      if (!destinationStaffId) return toast.error('Select the staff member who will receive this transfer.')
      payload = {
        destinationStaffId,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      }
    } else if (mode === 'returnReceive') {
      const returnLines = lines.filter((line) => Number(line.quantity) > 0)
      if (!returnLines.length) return toast.error('Enter at least one returned quantity.')
      if (returnLines.some((line) => !line.sourceRackId || !line.sourceBinId))
        return toast.error('Select a source rack and bin for every returned line.')
      if (
        returnLines.some(
          (line) =>
            Number(line.quantity) >
            returnableQuantity(items.find((item) => item.id === line.itemId))
        )
      )
        return toast.error('Returned quantity exceeds the returnable quantity.')
      if (
        returnLines.some(
          (line) => (line.disposition || 'GOOD') === 'REJECTED' && !line.note?.trim()
        )
      )
        return toast.error('Enter a reason for every rejected returned line.')
      payload = {
        reason: reason.trim() || 'Returned stock received at source warehouse.',
        allowPartial: true,
        lines: returnLines.map((line) => {
          const disposition = line.disposition || 'GOOD'
          return {
            itemId: line.itemId,
            quantity: Number(line.quantity),
            sourceRackId: line.sourceRackId,
            sourceBinId: line.sourceBinId,
            disposition,
            note: disposition === 'REJECTED' ? line.note.trim() : null,
          }
        }),
      }
    } else {
      if (!lines.length) return toast.error('Choose a reconciliation resolution.')
      payload = {
        resolution: lines[0].resolution,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      }
    }

    try {
      setSubmitting(true)
      if (mode === 'pick')
        await transferApi.pickTransfer(transfer.id, payload, createTransferIdempotencyKey())
      if (mode === 'retry')
        await transferApi.retryTransfer(transfer.id, payload, createTransferIdempotencyKey())
      if (mode === 'assignDestinationStaff')
        await transferApi.assignDestinationStaff(transfer.id, payload, createTransferIdempotencyKey())
      if (mode === 'returnReceive')
        await transferApi.receiveReturn(transfer.id, payload, createTransferIdempotencyKey())
      if (mode === 'reconcile')
        await transferApi.reconcileTransfer(transfer.id, payload, createTransferIdempotencyKey())
      toast.success('Transfer updated successfully.')
      await onSuccess?.()
      onClose()
    } catch (error) {
      if (error.response?.status === 409) {
        await onSuccess?.()
        onClose()
      }
      showApiErrorToast(error, 'Could not update transfer.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1002] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <copy.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-[0.14em] text-blue-700 uppercase">
                {copy.eyebrow}
              </p>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-950">{copy.title}</h2>
              <p className="mt-1 truncate text-xs text-slate-500">
                TRF-{String(transfer.id).slice(0, 8).toUpperCase()} ·{' '}
                {transfer.sourceWarehouse?.name} →{' '}
                {(transfer.currentDestinationWarehouse || transfer.destinationWarehouse)?.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-5 p-5 sm:p-6">
            {mode === 'pick' && (
              <>
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm leading-6 text-blue-900">
                  Record the additional quantity picked in this operation. Stock is deducted only
                  when the tenant approves dispatch.
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MiniStat label="Requested" value={pickSummary.requested} />
                  <MiniStat label="Picked before" value={pickSummary.picked} tone="text-blue-700" />
                  <MiniStat label="Remaining" value={pickSummary.remaining} tone="text-amber-700" />
                  <MiniStat
                    label="This operation"
                    value={pickSummary.currentOperation}
                    tone="text-emerald-700"
                  />
                </div>
              </>
            )}
            {mode === 'retry' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="New destination warehouse *">
                  <select
                    required
                    value={destinationWarehouseId}
                    onChange={(e) => {
                      setDestinationWarehouseId(e.target.value)
                      setDestinationStaffId('')
                    }}
                    className={selectClass}
                  >
                    <option value="">Select destination</option>
                    {warehouses
                      .filter(
                        (warehouse) =>
                          String(warehouse.id) !== String(transfer.sourceWarehouse?.id) &&
                          String(warehouse.id) !== String(currentDestinationId)
                      )
                      .map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Expected arrival (optional)">
                  <input
                    type="datetime-local"
                    value={expectedArrivalAt}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(e) => setExpectedArrivalAt(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
            )}
            {(mode === 'retry' || mode === 'assignDestinationStaff') && (
              <Field
                label={mode === 'retry' ? 'Destination staff (optional)' : 'Destination staff *'}
                hint="Only active staff assigned to the current destination can receive this transfer."
              >
                <select
                  required={mode === 'assignDestinationStaff'}
                  value={destinationStaffId}
                  onChange={(e) => setDestinationStaffId(e.target.value)}
                  disabled={loadingStaff}
                  className={selectClass}
                >
                  <option value="">
                    {loadingStaff ? 'Loading assigned staff' : 'Select destination staff'}
                  </option>
                  {destinationStaff.map((staff) => (
                    <option key={staff.userId || staff.memberId} value={staff.userId || staff.memberId}>
                      {staff.fullName || staff.name || staff.email || 'Warehouse staff'}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {mode === 'pick' && (
              <div className="space-y-3">
                {sourceAllocations.length ? (
                  sourceAllocations.map((allocation, index) => (
                    <div
                      key={allocation.id || index}
                      className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-[minmax(0,1fr)_120px_140px] sm:items-center"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {allocation.sourceRackName || 'Source rack'} ·{' '}
                          {allocation.sourceBinName || 'Source bin'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {allocation.item.skuCode} · Reserved up to {allocation.quantity} units
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                          <span>Planned: <strong className="text-slate-700">{allocation.quantity}</strong></span>
                          <span>Picked: <strong className="text-blue-700">{pickedQuantity(allocation)}</strong></span>
                          <span>Remaining: <strong className="text-amber-700">{allocationRemainingQuantity(allocation)}</strong></span>
                        </div>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={allocationRemainingQuantity(allocation)}
                        step="1"
                        value={lines[index]?.quantity || ''}
                        onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                        placeholder="Add qty"
                        disabled={allocationRemainingQuantity(allocation) === 0}
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={() => fillAllocationRemaining(index)}
                        disabled={submitting || allocationRemainingQuantity(allocation) === 0}
                        className="rounded-lg border border-blue-200 px-2.5 py-2 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Pick all remaining
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    No source allocations are available to pick.
                  </p>
                )}
              </div>
            )}
            {mode === 'pick' && pickSummary && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-700">Picking preview</span>
                  <span className="font-bold tabular-nums text-slate-950">
                    {pickSummary.currentOperation} this operation · {pickSummary.afterOperation} total picked
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Expected status:{' '}
                  <strong className="text-slate-700">
                    {pickSummary.expectedStatus === 'READY_TO_DISPATCH'
                      ? 'Ready to dispatch'
                      : 'Picking'}
                  </strong>
                </p>
              </div>
            )}
            {mode === 'returnReceive' &&
              (loadingLayout ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading source layout
                </div>
              ) : (
                <div className="space-y-3">
                  {lines.map((line, index) => {
                    const item = items.find((entry) => entry.id === line.itemId)
                    const rack = layout?.racks?.find((entry) => entry.id === line.sourceRackId)
                    return (
                      <div key={line.itemId} className="rounded-xl border border-slate-200 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {item?.skuCode} · {item?.skuName}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Returnable: {returnableQuantity(item)} units
                            </p>
                          </div>
                          <input
                            type="number"
                            min="1"
                            max={returnableQuantity(item)}
                            value={line.quantity}
                            onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                            placeholder="Qty"
                            className={`${inputClass} max-w-28`}
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <select
                            value={line.sourceRackId}
                            onChange={(e) => updateLine(index, 'sourceRackId', e.target.value)}
                            className={selectClass}
                          >
                            <option value="">Select rack</option>
                            {(layout?.racks || []).map((rackOption) => (
                              <option key={rackOption.id} value={rackOption.id}>
                                {rackOption.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={line.sourceBinId}
                            disabled={!line.sourceRackId}
                            onChange={(e) => updateLine(index, 'sourceBinId', e.target.value)}
                            className={selectClass}
                          >
                            <option value="">Select bin</option>
                            {(rack?.bins || []).map((bin) => (
                              <option key={bin.id} value={bin.id}>
                                {bin.name}
                              </option>
                            ))}
                          </select>
                          <div className="sm:col-span-2">
                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                              Returned stock condition
                            </label>
                            <select
                              value={line.disposition || 'GOOD'}
                              onChange={(event) =>
                                updateLine(index, 'disposition', event.target.value)
                              }
                              className={selectClass}
                            >
                              <option value="GOOD">Good - add to source inventory</option>
                              <option value="REJECTED">
                                Rejected - add to source inventory with a reason
                              </option>
                            </select>
                          </div>
                        </div>
                        {line.disposition === 'REJECTED' && (
                          <div className="mt-3">
                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                              Separate handling reason <span className="text-rose-600">*</span>
                            </label>
                            <textarea
                              required
                              maxLength={1000}
                              rows={2}
                              value={line.note}
                              onChange={(event) => updateLine(index, 'note', event.target.value)}
                              placeholder="Explain why the returned stock needs separate handling"
                              className={`${inputClass} resize-none py-2.5`}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            {mode === 'reconcile' && (
              <Field
                label="Resolution *"
                hint="Accept as-is completes the transfer. Declare lost records the missing quantity. Return to source starts a return attempt."
              >
                <select
                  required
                  value={lines[0]?.resolution || ''}
                  onChange={(e) => setLines([{ resolution: e.target.value }])}
                  className={selectClass}
                >
                  <option value="">Choose a resolution</option>
                  <option value="ACCEPT_AS_IS">Accept as-is</option>
                  <option value="DECLARE_LOST">Declare lost</option>
                  <option value="RETURN_TO_SOURCE">Return to source</option>
                </select>
              </Field>
            )}
            {(mode === 'retry' || mode === 'assignDestinationStaff' || mode === 'returnReceive' || mode === 'reconcile') && (
              <Field
                label={
                  mode === 'reconcile'
                    ? 'Resolution note (optional)'
                    : mode === 'assignDestinationStaff'
                      ? 'Assignment note (optional)'
                      : 'Reason'
                }
              >
                <textarea
                  required={mode === 'retry'}
                  maxLength={2000}
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain the operational decision"
                  className={`${inputClass} resize-none py-2.5`}
                />
              </Field>
            )}
            {mode === 'returnReceive' && (
              <div className="flex gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                Both Good and Rejected returned stock are added to source inventory. Rejected stock
                requires a reason for separate handling. The remaining returnable quantity stays
                open for the next receipt.
              </div>
            )}
          </div>
          <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Saving' : mode === 'pick' ? 'Save picking' : copy.action}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}

const MiniStat = ({ label, value, tone = 'text-slate-950' }) => (
  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-xs">
    <p className="text-[10px] font-bold tracking-[0.1em] text-slate-500 uppercase">{label}</p>
    <p className={`mt-1 text-xl font-bold tabular-nums ${tone}`}>{value}</p>
  </div>
)

export default TransferActionModal
