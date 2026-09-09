import { useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, Loader2, Warehouse, X } from 'lucide-react'
import { FormShell } from '@/form/FormControls'
import useEscapeKey from '@/hooks/useEscapeKey'
import warehouseApi from '@/services/warehouse/warehouseApi'
import staffApi from '@/services/staff/staffApi'
import stockApi from '@/services/wms/stockApi'
import transferApi from '@/services/wms/transferApi'
import { toast } from 'react-hot-toast'
import { showApiErrorToast } from '@/config/apiError'

const CreateTransferModal = ({
  isOpen,
  onClose,
  sourceWarehouseId,
  currentRole = 'TENANT',
  onSuccess,
}) => {
  useEscapeKey(isOpen, onClose)

  const [allWarehouses, setAllWarehouses] = useState([])
  const [products, setProducts] = useState([])
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [loadingStaff, setLoadingStaff] = useState(false)
  const [sourceStaff, setSourceStaff] = useState([])
  const [staffWarehouseIds, setStaffWarehouseIds] = useState([])

  const [selectedSourceWarehouseId, setSelectedSourceWarehouseId] = useState('')
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('')
  const [selectedSkuId, setSelectedSkuId] = useState('')
  const [stockBatches, setStockBatches] = useState([])
  const [loadingBatches, setLoadingBatches] = useState(false)
  const [note, setNote] = useState('')
  const [expectedArrivalAt, setExpectedArrivalAt] = useState('')
  const [sourceStaffId, setSourceStaffId] = useState('')

  // Map of batchId -> quantity allocated
  const [allocations, setAllocations] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const fetchWarehouses = async () => {
      setLoadingInitial(true)
      try {
        const requests = [warehouseApi.getMyWarehouses()]
        if (currentRole === 'STAFF') requests.push(staffApi.getMyWorkHistory())
        const [whRes, historyRes] = await Promise.all(requests)
        const warehousePayload = whRes.data?.data
        setAllWarehouses(warehousePayload?.content || warehousePayload || [])
        if (currentRole === 'STAFF') {
          const assignments = historyRes?.data?.data?.warehouseAssignments || []
          const assignedIds = assignments
            .filter((assignment) => assignment.status === 'ACTIVE')
            .map((assignment) => String(assignment.warehouseId))
          setStaffWarehouseIds(assignedIds)
          const assignedWarehouses = (warehousePayload?.content || warehousePayload || []).filter((warehouse) => assignedIds.includes(String(warehouse.id)))
          const preferredSource = assignedWarehouses.some((warehouse) => String(warehouse.id) === String(sourceWarehouseId))
            ? sourceWarehouseId
            : assignedWarehouses[0]?.id || ''
          setSelectedSourceWarehouseId(preferredSource)
        } else {
          setStaffWarehouseIds([])
        }
      } catch (error) {
        showApiErrorToast(error, 'Could not load warehouses.')
      } finally {
        setLoadingInitial(false)
      }
    }
    fetchWarehouses()

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedSourceWarehouseId(sourceWarehouseId || '')
    setDestinationWarehouseId('')
    setSelectedSkuId('')
    setStockBatches([])
    setAllocations({})
    setNote('')
    setExpectedArrivalAt('')
    let currentStaffId = ''
    if (currentRole === 'STAFF') {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        currentStaffId = user.userId || user.id || ''
      } catch {
        currentStaffId = ''
      }
    }
    setSourceStaffId(currentStaffId)
    setSourceStaff([])
    setStaffWarehouseIds([])
  }, [currentRole, isOpen, sourceWarehouseId])

  useEffect(() => {
    if (!isOpen || !selectedSourceWarehouseId || currentRole !== 'TENANT') return

    const fetchAssignedStaff = async () => {
      setLoadingStaff(true)
      try {
        const response = await staffApi.listStaffs({ page: 0, size: 100 })
        const staffList = response.data?.data?.content || response.data?.data || []
        const assignedStaff = await Promise.all(
          staffList.map(async (staff) => {
            const staffUserId = staff.userId || staff.memberId
            if (!staffUserId) return null
            try {
              const assignmentResponse = await staffApi.getWarehouseAssignments(staffUserId)
              const assignments = assignmentResponse.data?.data || []
              const isActive = assignments.some(
                (assignment) =>
                  assignment.status === 'ACTIVE' &&
                  String(assignment.warehouseId) === String(selectedSourceWarehouseId)
              )
              return isActive ? { ...staff, userId: staffUserId } : null
            } catch {
              return null
            }
          })
        )
        setSourceStaff(assignedStaff.filter(Boolean))
      } catch (error) {
        showApiErrorToast(error, 'Could not load assigned staff.')
        setSourceStaff([])
      } finally {
        setLoadingStaff(false)
      }
    }

    fetchAssignedStaff()
  }, [currentRole, isOpen, selectedSourceWarehouseId])

  useEffect(() => {
    if (!selectedSourceWarehouseId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProducts([])
      return
    }

    const fetchProducts = async () => {
      setLoadingProducts(true)
      try {
        const stockRes = await stockApi.getStockOverview(selectedSourceWarehouseId, {
          page: 0,
          size: 200,
        })
        const stockList = stockRes.data?.data?.content || []
        // Only show SKUs that have stock > 0
        setProducts(stockList.filter((stock) => stock.totalQuantity > 0))
      } catch (error) {
        showApiErrorToast(error, 'Could not load products.')
      } finally {
        setLoadingProducts(false)
      }
    }
    fetchProducts()
  }, [selectedSourceWarehouseId])

  useEffect(() => {
    if (!selectedSkuId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStockBatches([])
      setAllocations({})
      return
    }

    const fetchBatches = async () => {
      setLoadingBatches(true)
      try {
        // We use getAllStock to get StockBatchResponse objects which contain rackId and binId.
        // getStockBySku returns StockLocationDto which lacks rackId and binId.
        const allWarehouseBatches = await stockApi.getAllStock(selectedSourceWarehouseId)

        // Filter by SKU and has quantity > 0
        const sourceBatches = allWarehouseBatches.filter(
          (batch) => String(batch.skuId) === String(selectedSkuId) && Number(batch.quantity) > 0
        )
        setStockBatches(sourceBatches)
        setAllocations({})
      } catch (error) {
        showApiErrorToast(error, 'Could not load stock batches.')
      } finally {
        setLoadingBatches(false)
      }
    }
    fetchBatches()
  }, [selectedSkuId, selectedSourceWarehouseId])

  if (!isOpen) return null

  const handleAllocationChange = (batchId, value) => {
    setAllocations((previous) => ({
      ...previous,
      [batchId]: Number(value),
    }))
  }

  const totalRequestedQuantity = Object.values(allocations).reduce(
    (sum, quantity) => sum + (Number(quantity) || 0),
    0
  )

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!destinationWarehouseId) {
      toast.error('Select a destination warehouse.')
      return
    }
    if (!selectedSkuId) {
      toast.error('Select a product to transfer.')
      return
    }
    if (totalRequestedQuantity <= 0) {
      toast.error('Allocate at least 1 unit to transfer.')
      return
    }

    const sourceAllocations = []
    for (let index = 0; index < stockBatches.length; index += 1) {
      const batch = stockBatches[index]
      const batchKey = batch.id || batch.stockBatchId || `batch-${index}`
      const quantity = allocations[batchKey] || 0
      if (quantity > 0) {
        if (quantity > batch.quantity) {
          toast.error(`Quantity for batch in ${batch.rackName} exceeds available stock.`)
          return
        }
        sourceAllocations.push({
          sourceStockBatchId: batch.id || batch.stockBatchId || batch.batchId || null,
          sourceRackId: batch.rackId,
          sourceBinId: batch.binId,
          quantity: Number(quantity),
        })
      }
    }

    const payload = {
      sourceWarehouseId: selectedSourceWarehouseId,
      destinationWarehouseId,
      ...(sourceStaffId ? { sourceStaffId } : {}),
      ...(expectedArrivalAt ? { expectedArrivalAt: `${expectedArrivalAt}:00` } : {}),
      note,
      items: [
        {
          skuId: selectedSkuId,
          requestedQuantity: totalRequestedQuantity,
          sourceAllocations,
        },
      ],
    }

    try {
      setSubmitting(true)
      const response = await transferApi.createTransfer(payload)
      const createdTransfer = response?.data?.data
      toast.success('Transfer request created.')
      await onSuccess?.(createdTransfer)
      onClose()
    } catch (error) {
      showApiErrorToast(error, 'Could not create transfer.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-xs sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-transfer-title"
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-slate-300 bg-white shadow-xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
              New warehouse movement
            </p>
            <h2
              id="create-transfer-title"
              className="mt-1 text-xl font-bold tracking-tight text-slate-950"
            >
              Create stock transfer
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Select the route, SKU, and source locations to allocate.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close create transfer"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1.5 text-blue-700">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-700 text-[10px] text-white">
                1
              </span>
              Route
            </span>
            <span className="h-px w-8 bg-slate-300" aria-hidden="true" />
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px]">
                2
              </span>
              Source allocation
            </span>
            <span className="h-px w-8 bg-slate-300" aria-hidden="true" />
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px]">
                3
              </span>
              Submit for approval
            </span>
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-slate-500">
            <CheckCircle2
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600"
              aria-hidden="true"
            />
            Creating the request does not deduct stock. Source stock changes only after dispatch
            approval.
          </p>
        </div>

        {loadingInitial ? (
          <div
            className="flex min-h-72 items-center justify-center gap-3 text-sm text-slate-500"
            role="status"
          >
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            Loading warehouse options
          </div>
        ) : (
          <FormShell onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
              <section aria-labelledby="transfer-route-form-heading">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase">
                  <Warehouse className="h-3.5 w-3.5" aria-hidden="true" />
                  <h3 id="transfer-route-form-heading">Transfer route</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end">
                  <div>
                    <label
                      htmlFor="transfer-source"
                      className="mb-1.5 block text-sm font-semibold text-slate-700"
                    >
                      Source warehouse <span className="text-rose-600">*</span>
                    </label>
                    <select
                      id="transfer-source"
                      required
                      value={selectedSourceWarehouseId}
                      onChange={(event) => {
                        setSelectedSourceWarehouseId(event.target.value)
                        setSelectedSkuId('')
                        setDestinationWarehouseId('')
                        setSourceStaffId('')
                      }}
                      className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 transition-colors outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Select source warehouse</option>
                      {allWarehouses
                        .filter((warehouse) => currentRole !== 'STAFF' || staffWarehouseIds.includes(String(warehouse.id)))
                        .map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </option>
                        ))}
                    </select>
                  </div>

                  <ArrowRight
                    className="mb-3 hidden h-5 w-5 text-slate-400 sm:block"
                    aria-hidden="true"
                  />

                  <div>
                    <label
                      htmlFor="transfer-destination"
                      className="mb-1.5 block text-sm font-semibold text-slate-700"
                    >
                      Destination warehouse <span className="text-rose-600">*</span>
                    </label>
                    <select
                      id="transfer-destination"
                      required
                      value={destinationWarehouseId}
                      onChange={(event) => setDestinationWarehouseId(event.target.value)}
                      disabled={!selectedSourceWarehouseId}
                      className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 transition-colors outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    >
                      <option value="">Select destination warehouse</option>
                      {allWarehouses
                        .filter((warehouse) => currentRole !== 'STAFF' || staffWarehouseIds.includes(String(warehouse.id)))
                        .filter(
                          (warehouse) => String(warehouse.id) !== String(selectedSourceWarehouseId)
                        )
                        .map((warehouse) => (
                          <option key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="transfer-source-staff"
                      className="mb-1.5 block text-sm font-semibold text-slate-700"
                    >
                      Source staff <span className="font-normal text-slate-500">(optional)</span>
                    </label>
                    <select
                      id="transfer-source-staff"
                      value={sourceStaffId}
                      onChange={(event) => setSourceStaffId(event.target.value)}
                      disabled={
                        !selectedSourceWarehouseId || loadingStaff || currentRole === 'STAFF'
                      }
                      className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 transition-colors outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      <option value="">
                        {currentRole === 'STAFF'
                          ? 'Current staff is not available'
                          : loadingStaff
                            ? 'Loading assigned staff'
                            : 'Assign later'}
                      </option>
                      {currentRole === 'STAFF' && sourceStaffId && (
                        <option value={sourceStaffId}>You — assigned source staff</option>
                      )}
                      {sourceStaff.map((staff) => (
                        <option
                          key={staff.userId || staff.memberId}
                          value={staff.userId || staff.memberId}
                        >
                          {staff.fullName || staff.name || staff.email || 'Warehouse staff'}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-slate-500">
                      {currentRole === 'STAFF'
                        ? 'This request will use your staff account as the source picker.'
                        : 'Only active staff assigned to the source warehouse can pick this transfer.'}
                    </p>
                  </div>
                  <div>
                    <label
                      htmlFor="transfer-expected-arrival"
                      className="mb-1.5 block text-sm font-semibold text-slate-700"
                    >
                      Expected arrival{' '}
                      <span className="font-normal text-slate-500">(optional)</span>
                    </label>
                    <input
                      id="transfer-expected-arrival"
                      type="datetime-local"
                      value={expectedArrivalAt}
                      min={new Date().toISOString().slice(0, 16)}
                      onChange={(event) => setExpectedArrivalAt(event.target.value)}
                      className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 transition-colors outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      If blank, BE applies its default arrival window.
                    </p>
                  </div>
                </div>
              </section>

              <section
                aria-labelledby="transfer-product-heading"
                className="border-t border-slate-200 pt-5"
              >
                <div className="mb-3">
                  <h3
                    id="transfer-product-heading"
                    className="text-sm font-semibold text-slate-950"
                  >
                    Product to move
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Only SKUs with available stock at the selected source are shown.
                  </p>
                </div>
                <label
                  htmlFor="transfer-sku"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Product SKU <span className="text-rose-600">*</span>
                </label>
                <select
                  id="transfer-sku"
                  required
                  value={selectedSkuId}
                  onChange={(event) => setSelectedSkuId(event.target.value)}
                  disabled={!selectedSourceWarehouseId || loadingProducts}
                  className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 transition-colors outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">
                    {loadingProducts ? 'Loading available products' : 'Select product SKU'}
                  </option>
                  {products.map((product) => (
                    <option key={product.skuId} value={product.skuId}>
                      [{product.skuCode}] {product.skuName} (Available: {product.totalQuantity})
                    </option>
                  ))}
                </select>
              </section>

              <section
                aria-labelledby="source-allocations-heading"
                className="overflow-hidden rounded-lg border border-slate-200"
              >
                <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3
                      id="source-allocations-heading"
                      className="text-sm font-semibold text-slate-950"
                    >
                      Source allocations
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Allocate quantities from the available rack and bin locations.
                    </p>
                  </div>
                  <output
                    className="self-start rounded border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 sm:self-auto"
                    aria-live="polite"
                  >
                    Total selected: {totalRequestedQuantity.toLocaleString()}
                  </output>
                </div>

                {loadingBatches ? (
                  <div
                    className="flex min-h-36 items-center justify-center gap-2 text-sm text-slate-500"
                    role="status"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Loading source stock
                  </div>
                ) : stockBatches.length === 0 ? (
                  <div className="flex min-h-36 flex-col items-center justify-center px-5 py-6 text-center">
                    <Warehouse className="h-6 w-6 text-slate-400" aria-hidden="true" />
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      No source stock available
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Choose a source warehouse and product with available stock to allocate.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {stockBatches.map((batch, index) => {
                      const batchKey = batch.id || batch.stockBatchId || `batch-${index}`
                      const inputId = `allocation-${batchKey}`
                      return (
                        <div
                          key={batchKey}
                          className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_150px] sm:items-center"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950">
                              {batch.rackName || 'Unknown rack'} · {batch.binName || 'Unknown bin'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Available quantity:{' '}
                              {batch.quantity?.toLocaleString?.() ?? batch.quantity}
                            </p>
                          </div>
                          <div>
                            <label
                              htmlFor={inputId}
                              className="mb-1 block text-xs font-semibold text-slate-700"
                            >
                              Quantity to transfer
                            </label>
                            <input
                              id={inputId}
                              type="number"
                              min="0"
                              max={batch.quantity}
                              placeholder="0"
                              value={allocations[batchKey] || ''}
                              onChange={(event) =>
                                handleAllocationChange(batchKey, event.target.value)
                              }
                              className="min-h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 transition-colors outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              <section aria-labelledby="transfer-note-heading">
                <label
                  id="transfer-note-heading"
                  htmlFor="transfer-note"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Transfer note <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <textarea
                  id="transfer-note"
                  rows={2}
                  maxLength={1000}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Add operational context for this movement"
                  className="w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 transition-colors outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </section>
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs leading-5 text-slate-500">
                The request will be saved as{' '}
                <span className="font-bold text-amber-700">Awaiting dispatch</span>.
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="min-h-10 rounded-md border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {submitting ? 'Creating transfer' : 'Create transfer request'}
                </button>
              </div>
            </footer>
          </FormShell>
        )}
      </section>
    </div>
  )
}

export default CreateTransferModal
