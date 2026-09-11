import { useState, useEffect } from 'react'
import { FormShell } from '@/form/FormControls'
import useEscapeKey from '@/hooks/useEscapeKey'
import layoutApi from '@/services/layoutApi'
import staffApi from '@/services/staff/staffApi'
import transferApi, { createTransferIdempotencyKey } from '@/services/wms/transferApi'
import { toast } from 'react-hot-toast'
import { showApiErrorToast } from '@/config/apiError'
import { AlertCircle, CheckCircle2, X, PackageCheck, Loader2, Plus, Trash2 } from 'lucide-react'
import Button from '@/components/atoms/Button'

const ReceiveTransferModal = ({ isOpen, onClose, transfer, onSuccess, currentRole = 'TENANT' }) => {
  useEscapeKey(isOpen, onClose)

  const [layout, setLayout] = useState(null)
  const [loadingLayout, setLoadingLayout] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Map of itemId -> [ { destinationRackId, destinationBinId, quantity } ]
  const [allocations, setAllocations] = useState({})

  useEffect(() => {
    if (!isOpen || !transfer) return

    const fetchLayout = async () => {
      setLoadingLayout(true)
      setLayout(null)
      try {
        const destinationWarehouse =
          transfer.currentDestinationWarehouse || transfer.destinationWarehouse
        const res = currentRole === 'STAFF'
          ? await staffApi.getStaffLayout(destinationWarehouse?.id)
          : await layoutApi.getTenantWarehouseLayout(destinationWarehouse?.id)
        const payload = res.data?.data || res.data || {}
        setLayout(payload)
      } catch (error) {
        showApiErrorToast(error, 'Could not load destination layout.')
      } finally {
        setLoadingLayout(false)
      }
    }
    fetchLayout()

    // Initialize allocations
    const initialAllocations = {}
    transfer.items?.forEach((item) => {
      const outstanding = Math.max(
        0,
        Number(item.requestedQuantity || 0) -
          Number(item.receivedQuantity || 0) -
          Number(item.returnedQuantity || 0)
      )
      if (outstanding > 0)
        initialAllocations[item.id] = [
          { destinationRackId: '', destinationBinId: '', quantity: '', disposition: 'GOOD' },
        ]
    })
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAllocations(initialAllocations)
  }, [currentRole, isOpen, transfer])

  if (!isOpen) return null

  const handleAddAllocation = (itemId) => {
    setAllocations((prev) => ({
      ...prev,
      [itemId]: [
        ...(prev[itemId] || []),
        { destinationRackId: '', destinationBinId: '', quantity: '', disposition: 'GOOD' },
      ],
    }))
  }

  const handleRemoveAllocation = (itemId, index) => {
    setAllocations((prev) => {
      const newAlloc = [...prev[itemId]]
      newAlloc.splice(index, 1)
      return { ...prev, [itemId]: newAlloc }
    })
  }

  const handleAllocationChange = (itemId, index, field, value) => {
    setAllocations((prev) => {
      const newAlloc = [...prev[itemId]]
      newAlloc[index] = { ...newAlloc[index], [field]: value }

      // Auto clear bin if rack changes
      if (field === 'destinationRackId') {
        newAlloc[index].destinationBinId = ''
      }
      return { ...prev, [itemId]: newAlloc }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const destinationAllocations = []

    for (const item of transfer?.items || []) {
      const allocs = allocations[item.id] || []
      const locations = new Set()
      let totalAllocated = 0
      for (const alloc of allocs) {
        const q = Number(alloc.quantity) || 0
        if (q === 0) continue
        if (!alloc.destinationRackId || !alloc.destinationBinId) {
          toast.error(`Please select Rack and Bin for product ${item.skuCode}`)
          return
        }
        if (q <= 0) {
          toast.error(`Quantity must be > 0 for product ${item.skuCode}`)
          return
        }
        const locationKey = `${alloc.destinationRackId}:${alloc.destinationBinId}`
        if (locations.has(locationKey)) {
          toast.error(`Use each destination Rack/Bin only once for product ${item.skuCode}`)
          return
        }
        locations.add(locationKey)
        totalAllocated += q
        destinationAllocations.push({
          itemId: item.id,
          destinationRackId: alloc.destinationRackId,
          destinationBinId: alloc.destinationBinId,
          quantity: q,
          disposition: alloc.disposition || 'GOOD',
        })
      }

      const outstanding = Math.max(
        0,
        Number(item.requestedQuantity || 0) -
          Number(item.receivedQuantity || 0) -
          Number(item.returnedQuantity || 0)
      )
      if (totalAllocated > outstanding) {
        toast.error(`Product ${item.skuCode}: quantity exceeds the outstanding ${outstanding}`)
        return
      }
    }

    if (!destinationAllocations.length) {
      toast.error('Add at least one received quantity.')
      return
    }

    try {
      setSubmitting(true)
      await transferApi.receiveTransfer(
        transfer.id,
        { allowPartial: true, destinationAllocations },
        createTransferIdempotencyKey()
      )
      onSuccess?.()
      onClose()
    } catch (error) {
      showApiErrorToast(error, 'Could not receive transfer.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="animate-in fade-in zoom-in-95 flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg border border-slate-300 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-6">
          <div>
            <p className="text-xs font-bold tracking-[0.12em] text-blue-700 uppercase">
              Final warehouse checkpoint
            </p>
            <h3 className="mt-1 flex items-center gap-2 text-xl font-bold tracking-tight text-slate-950">
              <div className="rounded-lg bg-blue-50 p-2">
                <PackageCheck className="h-5 w-5 text-blue-600" />
              </div>
              Receive Stock Transfer
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Post received stock into{' '}
              <strong className="text-slate-950">
                {(transfer?.currentDestinationWarehouse || transfer?.destinationWarehouse)?.name}
              </strong>
              .
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-blue-600" aria-hidden="true" />
              Dispatch approved
            </span>
            <span className="h-px w-8 bg-blue-300" aria-hidden="true" />
            <span className="inline-flex items-center gap-1.5 text-blue-700">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-700 text-[10px] text-white">
                3
              </span>
              Confirm destination bins
            </span>
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-slate-500">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden="true" />
            Confirming receipt completes the transfer and updates destination inventory.
          </p>
        </div>

        {loadingLayout ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            <span className="ml-2 text-sm text-slate-500">Loading destination layout...</span>
          </div>
        ) : !layout?.racks?.length ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
            <AlertCircle className="h-7 w-7 text-amber-500" aria-hidden="true" />
            <h4 className="mt-3 text-sm font-semibold text-slate-800">
              Destination layout unavailable
            </h4>
            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
              Set up an active layout for the destination warehouse before receiving this transfer.
            </p>
            <Button type="button" variant="outline" onClick={onClose} className="mt-4">
              Close
            </Button>
          </div>
        ) : (
          <FormShell onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6">
            <div className="mb-5 rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm leading-5 text-blue-900">
              Record the quantity that physically arrived. Partial receipts are supported; choose a
              disposition when stock is not in good condition.
            </div>
            <div className="space-y-5">
              {transfer?.items?.map((item) => {
                const itemAllocs = allocations[item.id] || []
                const totalAllocated = itemAllocs.reduce(
                  (sum, a) => sum + (Number(a.quantity) || 0),
                  0
                )
                const outstanding = Math.max(
                  0,
                  Number(item.requestedQuantity || 0) -
                    Number(item.receivedQuantity || 0) -
                    Number(item.returnedQuantity || 0)
                )

                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs"
                  >
                    <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="font-semibold text-slate-950">
                          [{item.skuCode}] {item.skuName}
                        </h4>
                        <p className="text-sm text-slate-500">
                          Outstanding: {outstanding} units · Already received:{' '}
                          {item.receivedQuantity || 0}
                        </p>
                      </div>
                      <span
                        className={`inline-flex w-fit items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold ${totalAllocated === item.requestedQuantity ? 'bg-emerald-100 text-emerald-700' : totalAllocated > item.requestedQuantity ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}
                      >
                        {totalAllocated > 0 && totalAllocated <= outstanding && (
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        Receiving: {totalAllocated} / {outstanding}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {itemAllocs.map((alloc, idx) => {
                        const selectedRack = layout?.racks?.find(
                          (r) => r.id === alloc.destinationRackId
                        )
                        const bins = selectedRack?.bins || []

                        return (
                          <div
                            key={idx}
                            className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_90px_150px_auto] sm:items-center"
                          >
                            <select
                              required
                              value={alloc.destinationRackId}
                              onChange={(e) =>
                                handleAllocationChange(
                                  item.id,
                                  idx,
                                  'destinationRackId',
                                  e.target.value
                                )
                              }
                              className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                            >
                              <option value="">Select Rack...</option>
                              {layout?.racks?.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))}
                            </select>

                            <select
                              required
                              disabled={!alloc.destinationRackId}
                              value={alloc.destinationBinId}
                              onChange={(e) =>
                                handleAllocationChange(
                                  item.id,
                                  idx,
                                  'destinationBinId',
                                  e.target.value
                                )
                              }
                              className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:bg-slate-100"
                            >
                              <option value="">Select Bin...</option>
                              {bins.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name}
                                </option>
                              ))}
                            </select>

                            <input
                              type="number"
                              min="1"
                              max={outstanding}
                              required
                              placeholder="Qty"
                              value={alloc.quantity}
                              onChange={(e) =>
                                handleAllocationChange(item.id, idx, 'quantity', e.target.value)
                              }
                              className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                            />

                            <select
                              value={alloc.disposition || 'GOOD'}
                              onChange={(e) =>
                                handleAllocationChange(item.id, idx, 'disposition', e.target.value)
                              }
                              className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                            >
                              <option value="GOOD">Good</option>
                              <option value="QUARANTINE">Quarantine</option>
                              <option value="DAMAGED">Damaged</option>
                              <option value="REJECTED">Rejected</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => handleRemoveAllocation(item.id, idx)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-md p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddAllocation(item.id)}
                      className="mt-4 flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700"
                    >
                      <Plus size={16} /> Add Destination Bin
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-md text-xs leading-5 text-slate-500">
                The transfer is completed only when all requested units are received as GOOD.
                Otherwise BE keeps it in receiving or reconciliation.
              </p>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={submitting}
                  disabled={submitting}
                  className="bg-blue-700 hover:bg-blue-800"
                >
                  {submitting ? 'Processing...' : 'Confirm receipt'}
                </Button>
              </div>
            </div>
          </FormShell>
        )}
      </div>
    </div>
  )
}

export default ReceiveTransferModal
