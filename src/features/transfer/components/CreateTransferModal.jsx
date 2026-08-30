import React, { useState, useEffect } from 'react'
import { FormShell } from '@/form/FormControls'
import useEscapeKey from '@/hooks/useEscapeKey'
import warehouseApi from '@/services/warehouse/warehouseApi'
import stockApi from '@/services/wms/stockApi'
import transferApi from '@/services/wms/transferApi'
import { toast } from 'react-hot-toast'
import { showApiErrorToast } from '@/config/apiError'
import { X, Plus, Loader2 } from 'lucide-react'
import Button from '@/components/atoms/Button'

const CreateTransferModal = ({ isOpen, onClose, sourceWarehouseId, onSuccess }) => {
  useEscapeKey(isOpen, onClose)

  const [warehouses, setWarehouses] = useState([])
  const [products, setProducts] = useState([])
  const [loadingInitial, setLoadingInitial] = useState(true)

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
    if (!sourceWarehouseId) {
      setLoadingInitial(false)
      return
    }

    const initData = async () => {
      setLoadingInitial(true)
      try {
        const [whRes, stockRes] = await Promise.all([
          warehouseApi.getMyWarehouses(),
          stockApi.getStockOverview(sourceWarehouseId, { page: 0, size: 200 })
        ])
        
        // Exclude current source warehouse
        const whList = (whRes.data?.data || []).filter(w => w.id !== sourceWarehouseId)
        setWarehouses(whList)

        const stockList = stockRes.data?.data?.content || []
        // Only show SKUs that have stock > 0
        setProducts(stockList.filter(s => s.totalQuantity > 0))
      } catch (error) {
        showApiErrorToast(error, 'Could not load required data.')
      } finally {
        setLoadingInitial(false)
      }
    }
    initData()
    setDestinationWarehouseId('')
    setSelectedSkuId('')
    setStockBatches([])
    setAllocations({})
    setNote('')
  }, [isOpen, sourceWarehouseId])

  useEffect(() => {
    if (!selectedSkuId) {
      setStockBatches([])
      setAllocations({})
      return
    }

    const fetchBatches = async () => {
      setLoadingBatches(true)
      try {
        const res = await stockApi.getStockBySku(selectedSkuId)
        const allBatches = Array.isArray(res.data?.data) 
          ? res.data.data 
          : res.data?.data?.locations || res.data?.data?.batches || []
        
        // Filter by source warehouse and has quantity > 0
        const sourceBatches = allBatches.filter(
          b => b.warehouseId === sourceWarehouseId && b.quantity > 0
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
  }, [selectedSkuId, sourceWarehouseId])

  if (!isOpen) return null

  const handleAllocationChange = (batchId, val) => {
    setAllocations(prev => ({
      ...prev,
      [batchId]: Number(val)
    }))
  }

  const totalRequestedQuantity = Object.values(allocations).reduce((sum, q) => sum + (Number(q) || 0), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()

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
    for (const batch of stockBatches) {
      const q = allocations[batch.id] || 0
      if (q > 0) {
        if (q > batch.quantity) {
          toast.error(`Quantity for batch in ${batch.rackName} exceeds available stock.`)
          return
        }
        sourceAllocations.push({
          sourceStockBatchId: batch.id || batch.stockBatchId,
          sourceRackId: batch.rackId,
          sourceBinId: batch.binId,
          quantity: q
        })
      }
    }

    const payload = {
      sourceWarehouseId,
      destinationWarehouseId,
      note,
      items: [
        {
          skuId: selectedSkuId,
          requestedQuantity: totalRequestedQuantity,
          sourceAllocations
        }
      ]
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="animate-in fade-in zoom-in-95 flex w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Plus className="h-5 w-5 text-blue-600" />
            </div>
            Create Stock Transfer
          </h3>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!sourceWarehouseId ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500">
            <p className="mb-4">No source warehouse selected.</p>
            <p className="text-sm">Please select a warehouse from the top menu first.</p>
          </div>
        ) : loadingInitial ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <FormShell onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Destination Warehouse <span className="text-rose-500">*</span></label>
                <select
                  required
                  value={destinationWarehouseId}
                  onChange={(e) => setDestinationWarehouseId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select destination...</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Product SKU <span className="text-rose-500">*</span></label>
                <select
                  required
                  value={selectedSkuId}
                  onChange={(e) => setSelectedSkuId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select product...</option>
                  {products.map(p => (
                    <option key={p.skuId} value={p.skuId}>[{p.skuCode}] {p.skuName} (Available: {p.totalQuantity})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="mb-4 flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700">Source Allocations</label>
                <span className="rounded-lg bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                  Total selected: {totalRequestedQuantity}
                </span>
              </div>
              
              {loadingBatches ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : stockBatches.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-4">No stock batches found for this product.</p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {stockBatches.map(batch => (
                    <div key={batch.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{batch.rackName} - {batch.binName}</p>
                        <p className="text-xs text-slate-500">Available: {batch.quantity}</p>
                      </div>
                      <div className="w-32">
                        <input
                          type="number"
                          min="0"
                          max={batch.quantity}
                          placeholder="0"
                          value={allocations[batch.id] || ''}
                          onChange={(e) => handleAllocationChange(batch.id, e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">Transfer Note</label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Move stock for peak season"
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Transfer Request'}
              </Button>
            </div>
          </FormShell>
        )}
      </div>
    </div>
  )
}

export default CreateTransferModal
