import React, { useState, useEffect } from 'react'
import { ArrowLeft, Save, CheckCircle, XCircle } from 'lucide-react'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import Modal from '@/components/organisms/Modal'
import Header from '@/components/HeaderDashboard'
import Sidebar from '@/components/SideBar'
import { useParams, useNavigate } from 'react-router-dom'
import auditApi from '@/services/wms/auditApi'
import { toast } from 'react-hot-toast'
import moment from 'moment'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import { getEnglishApiMessage } from '@/utils/englishMessages'

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', type: 'warning' },
  APPROVED: { label: 'Approved', type: 'success' },
  REJECTED: { label: 'Rejected', type: 'error' },
  SUBMITTED: { label: 'Awaiting approval', type: 'info' },
  COMPLETED: { label: 'Completed', type: 'success' },
}

const InventoryAuditDetailPage = ({ currentRole }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)

  const [audit, setAudit] = useState(null)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])

  // Modal từ chối
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [approving, setApproving] = useState(false)

  const fetchAuditDetail = async () => {
    try {
      setLoading(true)
      const res = await auditApi.getAuditDetail(id)
      if (res.data?.success) {
        setAudit(res.data.data)
        // copy items into state to allow editing actualQuantity
        const fetchedItems = res.data.data.items || []
        setItems(
          fetchedItems.map((item) => ({
            ...item,
            // Mặc định actualQuantity bằng expectedQuantity nếu chưa nhập
            actualQuantity:
              item.actualQuantity !== null ? item.actualQuantity : item.expectedQuantity,
          }))
        )
      }
    } catch (error) {
      toast.error(getEnglishApiMessage(error, 'Could not load audit details.'))
      handleBack()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) fetchAuditDetail()
  }, [id])

  const handleBack = () => {
    if (currentRole === 'STAFF') {
      navigate('/staff/inventory-audits')
    } else {
      navigate('/tenant/inventory-audits')
    }
  }

  const handleQuantityChange = (batchId, value) => {
    const num = parseInt(value, 10)
    setItems((prev) =>
      prev.map((item) =>
        item.batchId === batchId ? { ...item, actualQuantity: isNaN(num) ? 0 : num } : item
      )
    )
  }

  const handleNoteChange = (batchId, value) => {
    setItems((prev) =>
      prev.map((item) => (item.batchId === batchId ? { ...item, note: value } : item))
    )
  }

  const handleSubmitAudit = async () => {
    try {
      setSubmitting(true)
      const payload = {
        items: items.map((item) => ({
          batchId: item.batchId,
          actualQuantity: item.actualQuantity,
          note: item.note || '',
        })),
      }
      const res = await auditApi.submitAudit(id, payload)
      if (res.data?.success) {
      toast.success('Count submitted.')
        fetchAuditDetail()
      }
    } catch (error) {
      toast.error(getEnglishApiMessage(error, 'Could not submit count.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async () => {
    try {
      setApproving(true)
      const res = await auditApi.approveAudit(id)
      if (res.data?.success) {
      toast.success('Audit approved.')
        fetchAuditDetail()
      }
    } catch (error) {
      toast.error(getEnglishApiMessage(error, 'Could not approve audit.'))
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async (e) => {
    e.preventDefault()
    try {
      setRejecting(true)
      const res = await auditApi.rejectAudit(id, { reason: rejectReason })
      if (res.data?.success) {
      toast.success('Audit rejected.')
        setIsRejectModalOpen(false)
        fetchAuditDetail()
      }
    } catch (error) {
      toast.error(getEnglishApiMessage(error, 'Could not reject audit.'))
    } finally {
      setRejecting(false)
    }
  }

  if (loading && !audit) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <Header />
        <div className="flex pt-14">
          <Sidebar currentRole={currentRole} />
          <div className="flex flex-1 items-center justify-center pt-20">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!audit) return null

  const isPending = audit.status === 'PENDING'
  const isSubmitted = audit.status === 'SUBMITTED'
  const statusConfig = STATUS_CONFIG[audit.status] || { label: audit.status, type: 'default' }

  const columns = [
    {
      accessor: 'skuCode',
      header: 'SKU',
    },
    {
      accessor: 'skuName',
      header: 'Product',
    },
    {
      accessor: 'location',
      header: 'Location',
      render: (row) => `${row.rackName || ''} - ${row.binName || ''}`,
    },
    {
      accessor: 'expectedQuantity',
      header: 'System quantity',
      render: (row) => `${row.expectedQuantity} ${row.uomSymbol || ''}`,
    },
    {
      accessor: 'actualQuantity',
      header: 'Counted quantity',
      render: (row) => {
        if (isPending) {
          return (
            <input
              type="number"
              min="0"
              className="focus:border-brand-500 focus:ring-brand-500 w-24 rounded-lg border border-slate-300 px-2 py-1 outline-none focus:ring-1"
              value={row.actualQuantity}
              onChange={(e) => handleQuantityChange(row.batchId, e.target.value)}
            />
          )
        }
        return `${row.actualQuantity} ${row.uomSymbol || ''}`
      },
    },
    {
      accessor: 'discrepancy',
      header: 'Difference',
      render: (row) => {
        const diff = isPending ? row.actualQuantity - row.expectedQuantity : row.discrepancy

        let colorClass = 'text-slate-600'
        let sign = ''
        if (diff > 0) {
          colorClass = 'text-green-600 font-medium'
          sign = '+'
        } else if (diff < 0) {
          colorClass = 'text-red-600 font-medium'
        }

        return (
          <span className={colorClass}>
            {sign}
            {diff}
          </span>
        )
      },
    },
    {
      accessor: 'note',
      header: 'Note',
      render: (row) => {
        if (isPending) {
          return (
            <input
              type="text"
              className="focus:border-brand-500 focus:ring-brand-500 w-full min-w-30 rounded-lg border border-slate-300 px-2 py-1 outline-none focus:ring-1"
              value={row.note || ''}
              placeholder="Note..."
              onChange={(e) => handleNoteChange(row.batchId, e.target.value)}
            />
          )
        }
        return row.note || '-'
      },
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header />
      <div className="md:hidden">
        {isMobileOpen && (
          <button
            className="fixed inset-0 z-40 bg-slate-900/30"
            onClick={() => dispatch(closeMobileSidebar())}
          />
        )}
      </div>
      <div className="flex pt-14">
        <Sidebar currentRole={currentRole} />
        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
          }`}
        >
          <main className="mx-auto w-full max-w-400 space-y-8 p-6 md:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBack}
                  className="rounded-full p-2 transition-colors hover:bg-slate-200"
                >
                  <ArrowLeft className="h-5 w-5 text-slate-600" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Audit details
                  </h1>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Badge type={statusConfig.type} className="px-3 py-1 text-sm">
                    {statusConfig.label}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="mb-4 text-lg font-semibold text-slate-900">Overview</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Warehouse:</span>
                      <span className="font-medium text-slate-900">{audit.warehouseName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Created by:</span>
                      <span className="font-medium text-slate-900">{audit.requestedByName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Created:</span>
                      <span className="font-medium text-slate-900">
                        {moment(audit.createdAt).format('DD/MM/YYYY HH:mm')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Note:</span>
                      <span className="font-medium text-slate-900">{audit.note || 'None'}</span>
                    </div>
                  </div>
                </div>

                {(audit.approvedByName || audit.status === 'REJECTED') && (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-semibold text-slate-900">
                      Approval details
                    </h3>
                    <div className="space-y-3 text-sm">
                      {audit.approvedByName && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Approved by:</span>
                          <span className="font-medium text-slate-900">{audit.approvedByName}</span>
                        </div>
                      )}
                      {audit.updatedAt && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Updated:</span>
                          <span className="font-medium text-slate-900">
                            {moment(audit.updatedAt).format('DD/MM/YYYY HH:mm')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 p-4">
                  <h3 className="font-semibold text-slate-900">Counted products</h3>
                </div>
                <DataTable columns={columns} data={items} loading={loading} />
              </div>

              {/* Actions based on status */}
              <div className="flex justify-end gap-3 pt-2">
                {isPending && (
                  <Button
                    onClick={handleSubmitAudit}
                    isLoading={submitting}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save count
                  </Button>
                )}

                {isSubmitted && currentRole === 'TENANT' && (
                  <>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                      onClick={() => setIsRejectModalOpen(true)}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      onClick={handleApprove}
                      isLoading={approving}
                      className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve & update stock
                    </Button>
                  </>
                )}

                {isSubmitted && currentRole === 'STAFF' && (
                  <span className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-sm text-slate-500 italic">
                    Awaiting tenant approval
                  </span>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject audit"
        size="md"
      >
        <form onSubmit={handleReject} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Rejection reason <span className="text-red-500">*</span>
            </label>
            <textarea
              className="focus:border-brand-500 focus:ring-brand-500 w-full rounded-lg border border-slate-300 p-2.5 outline-none focus:ring-1"
              rows={3}
              placeholder="Enter a rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="outline"
              className="bg-red-600 text-white hover:bg-red-700"
              isLoading={rejecting}
            >
              Reject
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default InventoryAuditDetailPage
