import React, { useState, useEffect } from 'react'
import { FormShell } from '@/form/FormControls'
import useEscapeKey from '@/hooks/useEscapeKey'
import layoutApi from '@/services/layoutApi'
import transferApi from '@/services/wms/transferApi'
import { toast } from 'react-hot-toast'
import { showApiErrorToast } from '@/config/apiError'
import { X, PackageCheck, Loader2, Plus, Trash2 } from 'lucide-react'
import Button from '@/components/atoms/Button'

const ReceiveTransferModal = ({ isOpen, onClose, transfer, onSuccess }) => {
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
      try {
        const res = await layoutApi.getLayout(transfer.destinationWarehouse?.id)
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
    transfer.items?.forEach(item => {
      initialAllocations[item.id] = []
    })
    setAllocations(initialAllocations)

  }, [isOpen, transfer])

  if (!isOpen) return null

  const handleAddAllocation = (itemId) => {
    setAllocations(prev => ({
      ...prev,
      [itemId]: [...prev[itemId], { destinationRackId: '', destinationBinId: '', quantity: '' }]
    }))
  }

  const handleRemoveAllocation = (itemId, index) => {
    setAllocations(prev => {
      const newAlloc = [...prev[itemId]]
      newAlloc.splice(index, 1)
      return { ...prev, [itemId]: newAlloc }
    })
  }

  const handleAllocationChange = (itemId, index, field, value) => {
    setAllocations(prev => {
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

    for (const item of transfer.items) {
      const allocs = allocations[item.id] || []
      
      let totalAllocated = 0
      for (const alloc of allocs) {
        const q = Number(alloc.quantity) || 0
        if (!alloc.destinationRackId || !alloc.destinationBinId) {
          toast.error(`Please select Rack and Bin for product ${item.skuCode}`)
          return
        }
        if (q <= 0) {
          toast.error(`Quantity must be > 0 for product ${item.skuCode}`)
          return
        }
        totalAllocated += q
        destinationAllocations.push({
          itemId: item.id,
          destinationRackId: alloc.destinationRackId,
          destinationBinId: alloc.destinationBinId,
          quantity: q
        })
      }

      if (totalAllocated !== item.requestedQuantity) {
        toast.error(`Product ${item.skuCode}: Allocated ${totalAllocated} does not match requested ${item.requestedQuantity}`)
        return
      }
    }

    try {
      setSubmitting(true)
      await transferApi.receiveTransfer(transfer.id, { destinationAllocations })
      toast.success('Transfer received successfully.')
      onSuccess?.()
      onClose()
    } catch (error) {
      showApiErrorToast(error, 'Could not receive transfer.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="animate-in fade-in zoom-in-95 flex w-full max-w-4xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <div>
            <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <div className="bg-emerald-100 p-2 rounded-lg">
                <PackageCheck className="h-5 w-5 text-emerald-600" />
              </div>
              Receive Stock Transfer
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Destination: <strong className="text-slate-900">{transfer?.destinationWarehouse?.name}</strong>
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loadingLayout ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            <span className="ml-2 text-sm text-slate-500">Loading destination layout...</span>
          </div>
        ) : (
          <FormShell onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
            {transfer?.items?.map(item => {
              const itemAllocs = allocations[item.id] || []
              const totalAllocated = itemAllocs.reduce((sum, a) => sum + (Number(a.quantity) || 0), 0)
              
              return (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                    <div>
                      <h4 className="font-bold text-slate-900">[{item.skuCode}] {item.skuName}</h4>
                      <p className="text-sm text-slate-500">Source Request: {item.requestedQuantity} units</p>
                    </div>
                    <span className={`rounded-lg px-3 py-1 text-xs font-bold ${totalAllocated === item.requestedQuantity ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      Allocated: {totalAllocated} / {item.requestedQuantity}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {itemAllocs.map((alloc, idx) => {
                      const selectedRack = layout?.racks?.find(r => r.id === alloc.destinationRackId)
                      const bins = selectedRack?.bins || []

                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <select
                            required
                            value={alloc.destinationRackId}
                            onChange={(e) => handleAllocationChange(item.id, idx, 'destinationRackId', e.target.value)}
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="">Select Rack...</option>
                            {layout?.racks?.map(r => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>

                          <select
                            required
                            disabled={!alloc.destinationRackId}
                            value={alloc.destinationBinId}
                            onChange={(e) => handleAllocationChange(item.id, idx, 'destinationBinId', e.target.value)}
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100"
                          >
                            <option value="">Select Bin...</option>
                            {bins.map(b => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>

                          <input
                            type="number"
                            min="1"
                            max={item.requestedQuantity}
                            required
                            placeholder="Qty"
                            value={alloc.quantity}
                            onChange={(e) => handleAllocationChange(item.id, idx, 'quantity', e.target.value)}
                            className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          />

                          <button 
                            type="button" 
                            onClick={() => handleRemoveAllocation(item.id, idx)}
                            className="p-2 text-slate-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50"
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
                    className="mt-4 flex items-center gap-1 text-sm font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    <Plus size={16} /> Add Destination Bin
                  </button>
                </div>
              )
            })}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
                {submitting ? 'Processing...' : 'Confirm Receipt'}
              </Button>
            </div>
          </FormShell>
        )}
      </div>
    </div>
  )
}

export default ReceiveTransferModal
