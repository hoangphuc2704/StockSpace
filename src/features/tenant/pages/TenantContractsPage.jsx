import React, { useState, useEffect } from 'react'
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
  Scale,
  X,
  ImageIcon,
  AlertCircle,
  CheckCircle2,
  User,
} from 'lucide-react'
import contractApi from '@/services/contractApi'
import disputeApi from '@/services/disputeApi'
import { toast } from 'react-hot-toast'
import { useConfirmDialog } from '@/components/ConfirmDialogProvider'
import DisputeContractInfo from '@/features/dispute/components/DisputeContractInfo'

// ─── Helpers ─────────────────────────────────────────────────────────────────
/** Kiểm tra hợp đồng còn trong vòng 7 ngày kể từ createdAt */
const isWithin7Days = (createdAt) => {
  if (!createdAt) return false
  const created = new Date(createdAt)
  const now = new Date()
  const diffMs = now - created
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays <= 7
}

/** Trạng thái hợp đồng cho phép mở dispute */
const DISPUTABLE_STATUSES = ['ACTIVE', 'PENDING_HANDOVER', 'PENDING_CANCEL']

const STATUS_CONFIG = {
  OPEN: { label: 'Open', variant: 'warning', icon: AlertCircle },
  RESOLVED: { label: 'Resolved', variant: 'success', icon: CheckCircle2 },
}
const formatDate = (dt) => (dt ? new Date(dt).toLocaleString('en-US', { hour12: false }) : '—')

// ─── Dispute Modal ───────────────────────────────────────────────────────────
const DisputeModal = ({ contractId, onClose, onSuccess }) => {
  useEscapeKey(true, onClose)
  const [reason, setReason] = useState('')
  const [files, setFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!reason.trim()) {
      setError('Please enter the reason for the dispute.')
      return
    }
    setError(null)
    setSubmitting(true)

    try {
      await disputeApi.createDispute({ contractId, reason: reason.trim() }, files)
      toast.success('Dispute request sent successfully! Admin will handle it soon.')
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Submit dispute failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="animate-in fade-in zoom-in-95 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl duration-150">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Scale className="h-5 w-5 text-amber-600" /> Open dispute
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          <strong>Note:</strong> Disputes will be sent to system Admin. Inspector will be assigned
          to examine and make a judgment. Admin will be the final decision maker on deposit
          processing.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold text-slate-500">
              Reason for dispute <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Describe in detail the reason for the dispute: handover issue, violation of commitment, deposit..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 transition-colors focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold text-slate-500">
              Photo evidence (optional)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-1.5 file:text-xs file:font-bold file:text-blue-600 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
            />
            {files.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {files.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                  >
                    <ImageIcon size={12} />
                    <span className="max-w-30 truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-amber-600 disabled:bg-slate-300"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Scale className="mr-1.5 h-3.5 w-3.5" />
                  Submit dispute
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Report Failed Modal ────────────────────────────────────────────────────────
const ReportFailedModal = ({ contractId, onClose, onSuccess }) => {
  useEscapeKey(true, onClose)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!reason.trim()) {
      setError('Please enter the reason.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await contractApi.tenantReportFailed(contractId, { reason: reason.trim() })
      toast.success('Reported failure successfully! Dispute ticket has been opened.')
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
      <div className="animate-in fade-in zoom-in-95 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl duration-150">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <X className="h-5 w-5 text-rose-600" /> Report Failure / Reject
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          <strong>Note:</strong> By rejecting this contract, it will be marked as disputed and sent
          to the Admin.
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold text-slate-500">
              Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Describe why you are rejecting this contract..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 transition-colors focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100 focus:outline-none"
            />
          </div>
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-rose-700 disabled:bg-slate-300"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Sending...
                </>
              ) : (
                'Report & Reject'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Detail Modal ────────────────────────────────────────────────────────────
const DetailModal = ({ dispute, onClose }) => {
  useEscapeKey(true, onClose)
  const StatusIcon = STATUS_CONFIG[dispute.status]?.icon || AlertCircle

  let evidenceImages = []
  if (dispute.evidenceImages) {
    try {
      evidenceImages = JSON.parse(dispute.evidenceImages)
    } catch {
      if (typeof dispute.evidenceImages === 'string' && dispute.evidenceImages.startsWith('[')) {
        const content = dispute.evidenceImages.slice(1, -1)
        if (content) evidenceImages = content.split(',').map((s) => s.trim())
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-in fade-in zoom-in-95 w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Scale size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Dispute details</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <span className="font-medium text-slate-600">Status</span>
            <Badge
              variant={STATUS_CONFIG[dispute.status]?.variant || 'slate'}
              size="sm"
              className="rounded-full"
            >
              <StatusIcon size={12} className="mr-1 inline" />
              {STATUS_CONFIG[dispute.status]?.label || dispute.status}
            </Badge>
          </div>

          <DisputeContractInfo dispute={dispute} />

          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="mb-1 text-xs text-slate-400">Creation date</p>
              <p className="font-medium text-slate-700">{formatDate(dispute.createdAt)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="mb-1 flex items-center gap-1 text-xs text-slate-400">
                <User size={11} /> Complainant
              </p>
              <p className="font-semibold text-slate-800">{dispute.raisedByName || '—'}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="mb-1 flex items-center gap-1 text-xs text-slate-400">
                <User size={11} /> Handler
              </p>
              <p className="font-semibold text-slate-800">{dispute.handledByName || 'Not yet'}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="mb-1 flex items-center gap-1 text-xs text-slate-400">
              <FileText size={11} /> Reason for complaint
            </p>
            <p className="text-slate-700">{dispute.reason || '—'}</p>
          </div>

          {evidenceImages.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="mb-2 flex items-center gap-1 text-xs text-slate-400">
                <ImageIcon size={11} /> Photo evidence
              </p>
              <div className="flex flex-wrap gap-2">
                {evidenceImages.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={url}
                      alt={`Evidence ${i + 1}`}
                      className="h-20 w-20 rounded-lg border border-slate-200 object-cover transition-transform hover:scale-105"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {dispute.adminNote && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="mb-1.5 text-xs font-medium text-blue-500">Admin Notes / Ruling</p>
              <p className="text-blue-800">{dispute.adminNote}</p>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            Close
          </button>
        </div>
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

  // Dispute modal state
  const [disputeContractId, setDisputeContractId] = useState(null)

  // Report Failed modal state
  const [reportFailedId, setReportFailedId] = useState(null)

  const [viewDispute, setViewDispute] = useState(null)
  const [loadingDispute, setLoadingDispute] = useState(false)

  // Contract Viewer Modal state
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerImages, setViewerImages] = useState([])

  const fetchContracts = async () => {
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
  }

  useEffect(() => {
    fetchContracts()
  }, [])

  const handleConfirmContract = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Confirm contract',
      message: 'Are you sure you want to confirm this contract?',
      confirmText: 'Confirm contract',
    })
    if (!confirmed) return

    try {
      await contractApi.tenantConfirmContract(id)
      toast.success('Contract successfully confirmed! The contract has taken effect (ACTIVE).')
      fetchContracts()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Contract validation failed')
    }
  }

  const handleRespondCancel = async (id, agree) => {
    const confirmed = await confirmDialog({
      title: agree ? 'Agree to Cancel' : 'Reject Cancel Request',
      message: agree
        ? 'Are you sure you want to AGREE to cancel this deal? Your deposit will be refunded.'
        : 'Are you sure you want to REJECT this cancel request? This will escalate to a dispute.',
      confirmText: 'Confirm',
    })
    if (!confirmed) return

    try {
      await contractApi.tenantRespondCancel(id, { agree })
      toast.success(agree ? 'Deal cancelled.' : 'Deal disputed.')
      fetchContracts()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed')
    }
  }

  const handleViewContract = (imageUrlRaw) => {
    try {
      if (!imageUrlRaw) throw new Error('No image')

      let imageArray = []

      if (Array.isArray(imageUrlRaw)) {
        imageArray = imageUrlRaw
      } else if (typeof imageUrlRaw === 'string') {
        if (imageUrlRaw.startsWith('[')) {
          try {
            imageArray = JSON.parse(imageUrlRaw)
          } catch (e) {
            // Fallback for Java List.toString()
            const content = imageUrlRaw.slice(1, -1)
            if (content) {
              imageArray = content.split(',').map((url) => url.trim())
            }
          }
        } else {
          imageArray = [imageUrlRaw]
        }
      }

      if (!imageArray || imageArray.length === 0) throw new Error('Invalid URL')
      setViewerImages(imageArray)
      setViewerOpen(true)
    } catch (error) {
      toast.error(
        'The warehouse owner has not uploaded the contract or could not find a valid file!'
      )
    }
  }

  const handleViewDispute = async (contractId) => {
    try {
      setLoadingDispute(true)
      const res = await disputeApi.getMyDisputes({ size: 100 })
      const myDisputes = res?.data?.data?.content || []
      const dispute = myDisputes.find((d) => d.contractId === contractId)

      if (dispute) {
        setViewDispute(dispute)
      } else {
        toast.error(
          'No details of the dispute you opened for this contract were found.\n\n(Note: You can only view it if you are the person who directly opened the dispute).'
        )
      }
    } catch (err) {
      toast.error('Error when retrieving dispute information.')
    } finally {
      setLoadingDispute(false)
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
      header: 'Term',
      render: (row) => (
        <div className="grid grid-cols-[max-content_1fr] gap-x-2 gap-y-1 text-xs whitespace-nowrap">
          <span className="text-slate-400">Start:</span>
          <span className="font-medium">
            {row.startDate ? new Date(row.startDate).toLocaleDateString('en-US') : 'N/A'}
          </span>
          <span className="text-slate-400">Finish:</span>
          <span className="font-medium">
            {row.endDate ? new Date(row.endDate).toLocaleDateString('en-US') : 'N/A'}
          </span>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge
          variant={
            row.status === 'ACTIVE'
              ? 'success'
              : row.status === 'DISPUTED'
                ? 'danger'
                : row.status === 'PENDING_TENANT_CONFIRM'
                  ? 'warning'
                  : 'secondary'
          }
        >
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      render: (row) => (
        <TableActionMenu
          items={[
            row.paperContractImages && {
              label: 'View contract',
              icon: FileText,
              onClick: () => handleViewContract(row.paperContractImages),
            },
            row.status === 'PENDING_TENANT_CONFIRM' && {
              label: 'Confirm contract',
              icon: CheckCircle,
              onClick: () => handleConfirmContract(row.id),
            },
            (row.status === 'UNDER_NEGOTIATION' || row.status === 'PENDING_TENANT_CONFIRM') && {
              label: 'Reject & report',
              icon: X,
              onClick: () => setReportFailedId(row.id),
              danger: true,
            },
            row.status === 'PENDING_CANCEL' && {
              label: 'Agree cancellation',
              icon: CheckCircle,
              onClick: () => handleRespondCancel(row.id, true),
            },
            row.status === 'PENDING_CANCEL' && {
              label: 'Reject cancellation',
              icon: X,
              onClick: () => handleRespondCancel(row.id, false),
              danger: true,
            },
            DISPUTABLE_STATUSES.includes(row.status) &&
              isWithin7Days(row.createdAt) && {
                label: 'Open dispute',
                icon: Scale,
                onClick: () => setDisputeContractId(row.id),
              },
            row.status === 'DISPUTED' && { label: 'In dispute', icon: Scale, disabled: true },
            (row.status === 'DISPUTED' || row.status === 'CANCELLED') && {
              label: 'Dispute details',
              icon: Scale,
              onClick: () => handleViewDispute(row.id),
              disabled: loadingDispute,
            },
          ]}
        />
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header />

      {/* MOBILE OVERLAY */}
      <div className="md:hidden">
        {isMobileOpen && (
          <button
            className="fixed inset-0 z-40 bg-slate-900/30"
            onClick={() => dispatch(closeMobileSidebar())}
          />
        )}
      </div>

      <div className="flex pt-14">
        <Sidebar currentRole="TENANT" />

        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
          }`}
        >
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

      {/* Dispute Modal */}
      {disputeContractId && (
        <DisputeModal
          contractId={disputeContractId}
          onClose={() => setDisputeContractId(null)}
          onSuccess={fetchContracts}
        />
      )}

      {/* Report Failed Modal */}
      {reportFailedId && (
        <ReportFailedModal
          contractId={reportFailedId}
          onClose={() => setReportFailedId(null)}
          onSuccess={fetchContracts}
        />
      )}

      {/* View Dispute Modal */}
      {viewDispute && <DetailModal dispute={viewDispute} onClose={() => setViewDispute(null)} />}
      {/* Viewer Modal */}
      <ContractViewerModal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        images={viewerImages}
      />
    </div>
  )
}

export default TenantContractsPage
