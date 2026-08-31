import React, { useEffect, useState } from 'react'
import { X, Loader2, ArrowRight, Package, User } from 'lucide-react'
import useEscapeKey from '@/hooks/useEscapeKey'
import transferApi from '@/services/wms/transferApi'
import { showApiErrorToast } from '@/config/apiError'
import Badge from '@/components/atoms/Badge'

const TransferDetailModal = ({ isOpen, onClose, transferId }) => {
  useEscapeKey(isOpen, onClose)

  const [loading, setLoading] = useState(true)
  const [transfer, setTransfer] = useState(null)

  useEffect(() => {
    if (!isOpen || !transferId) {
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

  const getStatusBadge = (status) => {
    const variants = {
      PENDING: 'warning',
      IN_TRANSIT: 'secondary',
      COMPLETED: 'success',
      REJECTED: 'danger',
      CANCELLED: 'slate'
    }
    return <Badge variant={variants[status] || 'slate'}>{status}</Badge>
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="animate-in fade-in zoom-in-95 flex w-full max-w-4xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <div>
            <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Package className="h-6 w-6 text-blue-600" />
              Transfer Details
            </h3>
            {transfer && (
              <p className="mt-1 text-sm text-slate-500 font-mono">
                ID: {transfer.id}
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : !transfer ? (
          <div className="flex items-center justify-center p-12 text-slate-500">
            Transfer not found.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            {/* Header / Route Info */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-6 border border-slate-200">
              <div className="flex-1 text-center">
                <p className="text-sm font-semibold text-slate-500 mb-1">Source</p>
                <p className="font-bold text-lg text-slate-900">{transfer.sourceWarehouse?.name || '-'}</p>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center px-4">
                <div className="mb-2">{getStatusBadge(transfer.status)}</div>
                <ArrowRight className="h-6 w-6 text-slate-400" />
              </div>
              
              <div className="flex-1 text-center">
                <p className="text-sm font-semibold text-slate-500 mb-1">Destination</p>
                <p className="font-bold text-lg text-slate-900">{transfer.destinationWarehouse?.name || '-'}</p>
              </div>
            </div>

            {/* Note & Timeline Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500 mb-1">Transfer Note</p>
                  <p className="text-sm text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {transfer.note || <span className="italic text-slate-400">No note provided</span>}
                  </p>
                </div>
                {transfer.decisionReason && (
                  <div>
                    <p className="text-sm font-semibold text-rose-500 mb-1">Decision Reason</p>
                    <p className="text-sm text-slate-900 bg-rose-50 p-3 rounded-lg border border-rose-100">
                      {transfer.decisionReason}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 p-4 bg-white text-sm">
                <h4 className="font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">Timeline</h4>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Created:</span>
                  <span className="font-medium text-slate-900">{formatDate(transfer.createdAt)}</span>
                </div>
                {transfer.approvedAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Dispatched:</span>
                    <span className="font-medium text-slate-900">{formatDate(transfer.approvedAt)}</span>
                  </div>
                )}
                {transfer.receivedAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Received:</span>
                    <span className="font-medium text-slate-900">{formatDate(transfer.receivedAt)}</span>
                  </div>
                )}
                {transfer.rejectedAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Rejected:</span>
                    <span className="font-medium text-rose-600">{formatDate(transfer.rejectedAt)}</span>
                  </div>
                )}
                {transfer.cancelledAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Cancelled:</span>
                    <span className="font-medium text-slate-900">{formatDate(transfer.cancelledAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <div>
              <h4 className="text-lg font-bold text-slate-900 mb-4">Transfer Items</h4>
              <div className="space-y-4">
                {(transfer.items || []).map((item, idx) => (
                  <div key={item.id || idx} className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-900">{item.skuName}</p>
                        <p className="text-xs text-slate-500 font-mono mt-1">{item.skuCode}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-500 mb-1">Total Requested</p>
                        <span className="inline-flex items-center justify-center rounded-lg bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">
                          {item.requestedQuantity}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Source Allocations */}
                      <div>
                        <p className="text-sm font-bold text-slate-700 mb-2">Dispatched From (Source)</p>
                        {(!item.sourceAllocations || item.sourceAllocations.length === 0) ? (
                          <p className="text-xs text-slate-500 italic">No source allocations.</p>
                        ) : (
                          <div className="space-y-2">
                            {item.sourceAllocations.map((alloc, aidx) => (
                              <div key={aidx} className="flex justify-between text-sm bg-white border border-slate-100 p-2 rounded-lg">
                                <span className="text-slate-600">{alloc.sourceRackName || 'Unknown Rack'} - {alloc.sourceBinName || 'Unknown Bin'}</span>
                                <span className="font-medium text-slate-900">Qty: {alloc.quantity}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Destination Allocations */}
                      <div>
                        <p className="text-sm font-bold text-slate-700 mb-2">Received Into (Destination)</p>
                        {(!item.destinationAllocations || item.destinationAllocations.length === 0) ? (
                          <p className="text-xs text-slate-500 italic">Pending receipt.</p>
                        ) : (
                          <div className="space-y-2">
                            {item.destinationAllocations.map((alloc, aidx) => (
                              <div key={aidx} className="flex justify-between text-sm bg-white border border-slate-100 p-2 rounded-lg">
                                <span className="text-slate-600">{alloc.destinationRackName || 'Unknown Rack'} - {alloc.destinationBinName || 'Unknown Bin'}</span>
                                <span className="font-medium text-slate-900">Qty: {alloc.quantity}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

export default TransferDetailModal
