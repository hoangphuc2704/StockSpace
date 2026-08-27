import React, { useCallback, useState, useEffect } from 'react'
import { FormShell } from '@/form/FormControls'
import useEscapeKey from '@/hooks/useEscapeKey'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import ContractViewerModal from '@/components/ContractViewerModal'
import TableActionMenu from '@/components/TableActionMenu'
import {
  FileText,
  CheckCircle,
  Loader2,
  X,
  AlertCircle,
  Eye,
  Edit3,
  Box
} from 'lucide-react'
import contractApi from '@/services/contractApi'
import { toast } from 'react-hot-toast'
import { showApiErrorToast } from '@/config/apiError'
import { required } from '@/config/validation'
import { useConfirmDialog } from '@/components/ConfirmDialogProvider'
import { formatVND } from '@/utils/currency'

// ─── Reason Modal for Reject or Request Changes ─────────────────────────────────
const ReasonModal = ({ isOpen, title, action, contractId, onClose, onSuccess }) => {
  useEscapeKey(isOpen, onClose)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen) {
      setReason('')
      setError(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    const reasonError = required(reason, 'Reason')
    if (reasonError) {
      setError(reasonError)
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      if (action === 'request-changes') {
        await contractApi.requestChanges(contractId, reason.trim())
        toast.success('Changes requested successfully.')
      } else if (action === 'reject') {
        await contractApi.reject(contractId, reason.trim())
        toast.success('Contract rejected.')
      }
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Submit failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="animate-in fade-in zoom-in-95 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            {action === 'reject' ? <X className="h-5 w-5 text-rose-600" /> : <Edit3 className="h-5 w-5 text-amber-600" />} 
            {title}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {action === 'reject' && (
           <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
             <strong>Note:</strong> Rejecting will mark the contract as REJECTED and you will not proceed with this deal.
           </div>
        )}

        <FormShell onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold text-slate-500">Reason <span className="text-rose-500">*</span></label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder={`Describe why you are ${action === 'reject' ? 'rejecting' : 'requesting changes to'} this contract...`}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-400 focus:bg-white focus:outline-none"
            />
          </div>
          {error && <p className="text-rose-600 text-sm">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 border">Cancel</button>
            <button type="submit" disabled={submitting} className={`rounded-xl px-4 py-2 text-sm font-bold text-white ${action === 'reject' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-500 hover:bg-amber-600'}`}>
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </FormShell>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
const TenantContractsPage = () => {
  const confirmDialog = useConfirmDialog()
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)

  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [reasonModalOpen, setReasonModalOpen] = useState(false)
  const [reasonAction, setReasonAction] = useState(null) // 'request-changes' | 'reject'
  const [selectedContractId, setSelectedContractId] = useState(null)

  // Contract Viewer Modal state
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerImages, setViewerImages] = useState([])

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true)
      const res = await contractApi.getMyContracts({ page: 0, size: 20 })
      if (res?.data?.success) {
        setContracts(res.data.data.content || [])
      }
    } catch (error) {
      console.error('Error getting list of contracts:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchContracts()
  }, [fetchContracts])

  const handleConfirmContract = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Confirm contract',
      message: 'Are you sure you want to confirm this contract?',
      confirmText: 'Confirm contract',
    })
    if (!confirmed) return

    try {
      await contractApi.confirm(id)
      toast.success('Contract confirmed and activated.')
      fetchContracts()
    } catch (error) {
      showApiErrorToast(error, 'Could not confirm contract.')
    }
  }

  const handleViewContract = (imageUrlRaw) => {
    try {
      if (!imageUrlRaw) throw new Error('No image')
      const imageArray = Array.isArray(imageUrlRaw) ? imageUrlRaw : [imageUrlRaw]
      if (!imageArray || imageArray.length === 0) throw new Error('Invalid URL')
      setViewerImages(imageArray)
      setViewerOpen(true)
    } catch (error) {
      toast.error('Contract file unavailable.')
    }
  }

  const columns = [
    {
      header: 'Owner',
      render: (row) => (
        <div>
          <p className="font-bold text-slate-900">{row.ownerName}</p>
        </div>
      ),
    },
    { header: 'Warehouse', accessor: 'warehouseName' },
    {
      header: 'Rent',
      render: (row) => (
        <span className="text-primary font-semibold">{formatVND(row.finalMonthlyRent || 0)}</span>
      ),
    },
    {
      header: 'Term',
      render: (row) => (
        <div className="text-xs">
          <div>Start: {row.startDate}</div>
          <div>End: {row.endDate}</div>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (row) => {
        const variants = {
          DRAFT: 'secondary',
          PENDING_TENANT_CONFIRM: 'warning',
          CHANGES_REQUESTED: 'warning',
          ACTIVE: 'success',
          REJECTED: 'danger',
          EXPIRED: 'slate'
        }
        return <Badge variant={variants[row.status] || 'slate'}>{row.status}</Badge>
      },
    },
    {
      header: 'Actions',
      render: (row) => (
        <TableActionMenu
          items={[
            row.paperContractFiles?.length > 0 && {
              label: 'View Paper Contract',
              icon: FileText,
              onClick: () => handleViewContract(row.paperContractFiles),
            },
            row.canViewLayout && {
              label: 'View Layout',
              icon: Eye,
              onClick: () => window.open(`/tenant/contract-layout/${row.id}`, '_blank')
            },
            row.canConfirm && {
              label: 'Confirm contract',
              icon: CheckCircle,
              onClick: () => handleConfirmContract(row.id),
            },
            row.canRequestChanges && {
              label: 'Request Changes',
              icon: Edit3,
              onClick: () => {
                 setSelectedContractId(row.id)
                 setReasonAction('request-changes')
                 setReasonModalOpen(true)
              },
            },
            row.canReject && {
              label: 'Reject',
              icon: X,
              onClick: () => {
                 setSelectedContractId(row.id)
                 setReasonAction('reject')
                 setReasonModalOpen(true)
              },
              danger: true,
            },
            row.canManageWms && {
              label: 'Open WMS',
              icon: Box,
              onClick: () => window.open(`/tenant/wms/${row.warehouseId}`, '_blank')
            }
          ].filter(Boolean)}
        />
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header />
      <div className="md:hidden">
        {isMobileOpen && (
          <button className="fixed inset-0 z-40 bg-slate-900/30" onClick={() => dispatch(closeMobileSidebar())} />
        )}
      </div>

      <div className="flex pt-14">
        <Sidebar currentRole="TENANT" />

        <div className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'}`}>
          <main className="mx-auto w-full max-w-4000 space-y-6 p-6 md:p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">My Contracts</h1>
                <p className="text-sm text-slate-500">Manage your warehouse rental agreements.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <DataTable columns={columns} data={contracts} isLoading={loading} />
            </div>
          </main>
        </div>
      </div>

      <ReasonModal
        isOpen={reasonModalOpen}
        title={reasonAction === 'reject' ? 'Reject Contract' : 'Request Changes'}
        action={reasonAction}
        contractId={selectedContractId}
        onClose={() => setReasonModalOpen(false)}
        onSuccess={fetchContracts}
      />

      <ContractViewerModal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        images={viewerImages}
      />
    </div>
  )
}

export default TenantContractsPage
