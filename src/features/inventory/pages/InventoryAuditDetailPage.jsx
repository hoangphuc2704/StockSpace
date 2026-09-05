import React, { useState, useEffect } from 'react'
import { FormShell } from '@/form/FormControls'
import { ArrowLeft, Save, CheckCircle, PlayCircle, RotateCcw, PlusCircle, Ban } from 'lucide-react'
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
import { showApiErrorToast } from '@/config/apiError'
import useActiveWarehouseContext from '@/hooks/useActiveWarehouseContext'

const STATUS_CONFIG = {
  DRAFT: { label: 'Draft', type: 'default' },
  PENDING: { label: 'Planned', type: 'warning' },
  IN_PROGRESS: { label: 'In Progress', type: 'info' },
  SUBMITTED: { label: 'Awaiting approval', type: 'warning' },
  RECOUNT_REQUIRED: { label: 'Recount Required', type: 'error' },
  APPROVED: { label: 'Approved', type: 'success' },
  REJECTED: { label: 'Rejected', type: 'error' },
  CANCELLED: { label: 'Cancelled', type: 'error' },
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

  // States for Modals and Loading
  const [starting, setStarting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [approving, setApproving] = useState(false)

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const [isRecountModalOpen, setIsRecountModalOpen] = useState(false)
  const [recountReason, setRecountReason] = useState('')
  const [recounting, setRecounting] = useState(false)

  const [isUnexpectedModalOpen, setIsUnexpectedModalOpen] = useState(false)
  const [unexpectedSkuCode, setUnexpectedSkuCode] = useState('')
  const [unexpectedQuantity, setUnexpectedQuantity] = useState(1)
  const [unexpectedNote, setUnexpectedNote] = useState('')
  const [addingUnexpected, setAddingUnexpected] = useState(false)

  useActiveWarehouseContext(audit?.warehouseId)

  const fetchAuditDetail = async () => {
    try {
      setLoading(true)
      const res = await auditApi.getAuditDetail(id)
      if (res.data?.success) {
        setAudit(res.data.data)
        const fetchedItems = res.data.data.items || []
        setItems(
          fetchedItems.map((item) => ({
            ...item,
            actualQuantity: item.actualQuantity !== null ? item.actualQuantity : item.expectedQuantity,
          }))
        )
      }
    } catch (error) {
      showApiErrorToast(error, 'Could not load audit details.')
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

  const handleQuantityChange = (itemId, value) => {
    const num = parseInt(value, 10)
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, actualQuantity: isNaN(num) ? 0 : num } : item
      )
    )
  }

  const handleNoteChange = (itemId, value) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, note: value } : item))
    )
  }

  const handleStartAudit = async () => {
    try {
      setStarting(true)
      const res = await auditApi.startAudit(id)
      if (res.data?.success) {
        toast.success('Audit started.')
        fetchAuditDetail()
      }
    } catch (error) {
      showApiErrorToast(error, 'Could not start audit.')
    } finally {
      setStarting(false)
    }
  }

  const handleSaveCounts = async () => {
    try {
      setSaving(true)
      const payload = {
        items: items.map((item) => ({
          itemId: item.id,
          actualQuantity: item.actualQuantity,
          note: item.note || '',
        })),
      }
      const res = await auditApi.saveCounts(id, payload)
      if (res.data?.success) {
        toast.success('Counts saved.')
        // fetchAuditDetail()
      }
    } catch (error) {
      showApiErrorToast(error, 'Could not save counts.')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitAudit = async () => {
    try {
      setSubmitting(true)
      const res = await auditApi.submitAudit(id)
      if (res.data?.success) {
        toast.success('Audit submitted.')
        fetchAuditDetail()
      }
    } catch (error) {
      showApiErrorToast(error, 'Could not submit audit.')
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
      showApiErrorToast(error, 'Could not approve audit.')
    } finally {
      setApproving(false)
    }
  }

  const handleCancel = async (e) => {
    e.preventDefault()
    try {
      setCancelling(true)
      const res = await auditApi.cancelAudit(id, { reason: cancelReason })
      if (res.data?.success) {
        toast.success('Audit cancelled.')
        setIsCancelModalOpen(false)
        fetchAuditDetail()
      }
    } catch (error) {
      showApiErrorToast(error, 'Could not cancel audit.')
    } finally {
      setCancelling(false)
    }
  }

  const handleRecount = async (e) => {
    e.preventDefault()
    try {
      setRecounting(true)
      const res = await auditApi.recountAudit(id, { reason: recountReason })
      if (res.data?.success) {
        toast.success('Recount requested.')
        setIsRecountModalOpen(false)
        fetchAuditDetail()
      }
    } catch (error) {
      showApiErrorToast(error, 'Could not request recount.')
    } finally {
      setRecounting(false)
    }
  }

  const handleAddUnexpectedItem = async (e) => {
    e.preventDefault()
    try {
      setAddingUnexpected(true)
      const res = await auditApi.addUnexpectedItem(id, {
        skuCode: unexpectedSkuCode,
        actualQuantity: unexpectedQuantity,
        note: unexpectedNote
      })
      if (res.data?.success) {
        toast.success('Unexpected item added.')
        setIsUnexpectedModalOpen(false)
        setUnexpectedSkuCode('')
        setUnexpectedQuantity(1)
        setUnexpectedNote('')
        fetchAuditDetail()
      }
    } catch (error) {
      showApiErrorToast(error, 'Could not add unexpected item.')
    } finally {
      setAddingUnexpected(false)
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

  const isDraft = audit.status === 'DRAFT' || audit.status === 'PENDING'
  const isInProgress = audit.status === 'IN_PROGRESS' || audit.status === 'RECOUNT_REQUIRED'
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
      header: 'System qty',
      render: (row) => `${row.expectedQuantity} ${row.uomSymbol || ''}`,
    },
    {
      accessor: 'actualQuantity',
      header: 'Counted qty',
      render: (row) => {
        if (isInProgress) {
          return (
            <input
              type="number"
              min="0"
              className="focus:border-brand-500 focus:ring-brand-500 w-24 rounded-lg border border-slate-300 px-2 py-1 outline-none focus:ring-1"
              value={row.actualQuantity}
              onChange={(e) => handleQuantityChange(row.id, e.target.value)}
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
        const diff = isInProgress ? row.actualQuantity - row.expectedQuantity : row.discrepancy

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
        if (isInProgress) {
          return (
            <input
              type="text"
              className="focus:border-brand-500 focus:ring-brand-500 w-full min-w-30 rounded-lg border border-slate-300 px-2 py-1 outline-none focus:ring-1"
              value={row.note || ''}
              placeholder="Note..."
              onChange={(e) => handleNoteChange(row.id, e.target.value)}
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

                {(audit.approvedByName || audit.status === 'REJECTED' || audit.status === 'CANCELLED') && (
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
                {isDraft && (
                  <>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                      onClick={() => setIsCancelModalOpen(true)}
                    >
                      <Ban className="h-4 w-4" />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleStartAudit}
                      isLoading={starting}
                      className="flex items-center gap-2 bg-brand-600 text-white hover:bg-brand-700"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Start audit
                    </Button>
                  </>
                )}

                {isInProgress && (
                  <>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 text-slate-600"
                      onClick={() => setIsUnexpectedModalOpen(true)}
                    >
                      <PlusCircle className="h-4 w-4" />
                      Add unexpected item
                    </Button>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                      onClick={() => setIsCancelModalOpen(true)}
                    >
                      <Ban className="h-4 w-4" />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveCounts}
                      isLoading={saving}
                      variant="outline"
                      className="flex items-center gap-2 text-brand-600 border-brand-200 hover:bg-brand-50"
                    >
                      <Save className="h-4 w-4" />
                      Save progress
                    </Button>
                    <Button
                      onClick={handleSubmitAudit}
                      isLoading={submitting}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Submit count
                    </Button>
                  </>
                )}

                {isSubmitted && currentRole === 'TENANT' && (
                  <>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 text-amber-600 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                      onClick={() => setIsRecountModalOpen(true)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Request Recount
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
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel audit"
        size="md"
      >
        <FormShell onSubmit={handleCancel} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Reason (Optional)
            </label>
            <textarea
              className="focus:border-brand-500 focus:ring-brand-500 w-full rounded-lg border border-slate-300 p-2.5 outline-none focus:ring-1"
              rows={3}
              placeholder="Enter a reason..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsCancelModalOpen(false)}>
              Close
            </Button>
            <Button
              type="submit"
              variant="outline"
              className="bg-red-600 text-white hover:bg-red-700"
              isLoading={cancelling}
            >
              Cancel Audit
            </Button>
          </div>
        </FormShell>
      </Modal>

      <Modal
        isOpen={isRecountModalOpen}
        onClose={() => setIsRecountModalOpen(false)}
        title="Request Recount"
        size="md"
      >
        <FormShell onSubmit={handleRecount} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              className="focus:border-brand-500 focus:ring-brand-500 w-full rounded-lg border border-slate-300 p-2.5 outline-none focus:ring-1"
              rows={3}
              placeholder="Why is a recount needed?"
              value={recountReason}
              onChange={(e) => setRecountReason(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsRecountModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-amber-600 text-white hover:bg-amber-700"
              isLoading={recounting}
            >
              Request Recount
            </Button>
          </div>
        </FormShell>
      </Modal>

      <Modal
        isOpen={isUnexpectedModalOpen}
        onClose={() => setIsUnexpectedModalOpen(false)}
        title="Add Unexpected Item"
        size="md"
      >
        <FormShell onSubmit={handleAddUnexpectedItem} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              SKU Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="focus:border-brand-500 focus:ring-brand-500 w-full rounded-lg border border-slate-300 p-2.5 outline-none focus:ring-1"
              placeholder="E.g., SKU-123"
              value={unexpectedSkuCode}
              onChange={(e) => setUnexpectedSkuCode(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Found Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              className="focus:border-brand-500 focus:ring-brand-500 w-full rounded-lg border border-slate-300 p-2.5 outline-none focus:ring-1"
              value={unexpectedQuantity}
              onChange={(e) => setUnexpectedQuantity(parseInt(e.target.value, 10))}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Note
            </label>
            <textarea
              className="focus:border-brand-500 focus:ring-brand-500 w-full rounded-lg border border-slate-300 p-2.5 outline-none focus:ring-1"
              rows={2}
              placeholder="Where was it found?"
              value={unexpectedNote}
              onChange={(e) => setUnexpectedNote(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsUnexpectedModalOpen(false)}>
              Close
            </Button>
            <Button
              type="submit"
              isLoading={addingUnexpected}
            >
              Add Item
            </Button>
          </div>
        </FormShell>
      </Modal>
    </div>
  )
}

export default InventoryAuditDetailPage
