import { useEffect, useState } from 'react'
import { ArrowRight, Loader2, Warehouse, X } from 'lucide-react'
import { FormShell } from '@/form/FormControls'
import useEscapeKey from '@/hooks/useEscapeKey'
import warehouseApi from '@/services/warehouse/warehouseApi'
import stockApi from '@/services/wms/stockApi'
import transferApi from '@/services/wms/transferApi'
import { toast } from 'react-hot-toast'
import { showApiErrorToast } from '@/config/apiError'

const CreateTransferModal = ({ isOpen, onClose, sourceWarehouseId, onSuccess }) => {
  useEscapeKey(isOpen, onClose)

  const [allWarehouses, setAllWarehouses] = useState([])
  const [products, setProducts] = useState([])
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)

  const [selectedSourceWarehouseId, setSelectedSourceWarehouseId] = useState('')
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('')
  const [selectedSkuId, setSelectedSkuId] = useState('')
  const [stockBatches, setStockBatches] = useState([])
  const [loadingBatches, setLoadingBatches] = useState(false)
  const [note, setNote] = useState('')

  // Map of batchId -> quantity allocated
  const [allocations, setAllocations] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const fetchWarehouses = async () => {
      setLoadingInitial(true)
      try {
        const whRes = await warehouseApi.getMyWarehouses()
        setAllWarehouses(whRes.data?.data || [])
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
  }, [isOpen, sourceWarehouseId])

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
          (batch) => batch.skuId === selectedSkuId && batch.quantity > 0
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
      await transferApi.createTransfer(payload)
      toast.success('Transfer request created.')
      onSuccess?.()
      onClose()
    } catch (error) {
      showApiErrorToast(error, 'Could not create transfer.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-transfer-title"
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-slate-300 bg-white shadow-2xl"
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
                      className="mb-1.5 block text-sm font-semibold text-slate-800"
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
                      }}
                      className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 transition-colors outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Select source warehouse</option>
                      {allWarehouses.map((warehouse) => (
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
                      className="mb-1.5 block text-sm font-semibold text-slate-800"
                    >
                      Destination warehouse <span className="text-rose-600">*</span>
                    </label>
                    <select
                      id="transfer-destination"
                      required
                      value={destinationWarehouseId}
                      onChange={(event) => setDestinationWarehouseId(event.target.value)}
                      disabled={!selectedSourceWarehouseId}
                      className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 transition-colors outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    >
                      <option value="">Select destination warehouse</option>
                      {allWarehouses
                        .filter((warehouse) => warehouse.id !== selectedSourceWarehouseId)
                        .map((warehouse) => (
                          <option key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </option>
                        ))}
                    </select>
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
                    className="text-sm font-semibold text-slate-900"
                  >
                    Product to move
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Only SKUs with available stock at the selected source are shown.
                  </p>
                </div>
                <label
                  htmlFor="transfer-sku"
                  className="mb-1.5 block text-sm font-semibold text-slate-800"
                >
                  Product SKU <span className="text-rose-600">*</span>
                </label>
                <select
                  id="transfer-sku"
                  required
                  value={selectedSkuId}
                  onChange={(event) => setSelectedSkuId(event.target.value)}
                  disabled={!selectedSourceWarehouseId || loadingProducts}
                  className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 transition-colors outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
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
                className="overflow-hidden border border-slate-200"
              >
                <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3
                      id="source-allocations-heading"
                      className="text-sm font-semibold text-slate-900"
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
                            <p className="truncate text-sm font-semibold text-slate-900">
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
                              className="mb-1 block text-xs font-semibold text-slate-600"
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
                              className="min-h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 transition-colors outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
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
                  className="mb-1.5 block text-sm font-semibold text-slate-800"
                >
                  Transfer note <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <textarea
                  id="transfer-note"
                  rows={2}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Add operational context for this movement"
                  className="w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 transition-colors outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </section>
            </div>

            <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-6">
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
            </footer>
          </FormShell>
        )}
      </section>
    </div>
  )
}

export default CreateTransferModal
