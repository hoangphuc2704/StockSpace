import { useCallback, useState, useEffect } from 'react'
import { FormShell } from '@/form/FormControls'
import useEscapeKey from '@/hooks/useEscapeKey'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'
import ContractViewerModal from '@/components/ContractViewerModal'
import TableActionMenu from '@/components/TableActionMenu'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import {
  FileText,
  Upload,
  X,
  Loader2,
  Scale,
  ImageIcon,
  AlertCircle,
  CheckCircle2,
  User,
} from 'lucide-react'
import contractApi from '@/services/contractApi'
import uploadApi from '@/services/uploadApi'
import disputeApi from '@/services/disputeApi'
import { toast } from 'react-hot-toast'
import { showApiErrorToast } from '@/config/apiError'
import { required, validateDateRange } from '@/config/validation'
import { formatVND } from '@/utils/currency'
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
    const reasonError = required(reason, 'Dispute reason')
    if (reasonError) {
      setError(reasonError)
      return
    }
    setError(null)
    setSubmitting(true)

    try {
      await disputeApi.createDispute(
        { contractId, reason: reason.trim() },
        files.map((f) => f.file)
      )
      toast.success('Dispute submitted.')
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Submit dispute failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }))
      setFiles((prev) => [...prev, ...newFiles])
      e.target.value = null
    }
  }

  const removeFile = (index) => {
    setFiles((prev) => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index].preview)
      return updated.filter((_, i) => i !== index)
    })
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

        <FormShell onSubmit={handleSubmit} className="space-y-4">
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

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">
              Photo evidence (optional)
            </label>
            <label className="flex h-20 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200">
              <ImageIcon className="h-4 w-4 text-slate-400" />
              <span className="text-xs text-slate-500">Add photos of evidence</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            {files.length > 0 && (
              <div className="grid grid-cols-4 gap-2 pt-1">
                {files.map((item, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square overflow-hidden rounded-lg border"
                  >
                    <img src={item.preview} alt="evidence" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="absolute top-0.5 right-0.5 rounded-full bg-slate-900/60 p-0.5 text-white hover:bg-rose-600"
                    >
                      <X className="h-2.5 w-2.5" />
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
        </FormShell>
      </div>
    </div>
  )
}

// ─── Cancel Deal Modal ────────────────────────────────────────────────────────
const CancelDealModal = ({ contractId, onClose, onSuccess }) => {
  useEscapeKey(true, onClose)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

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
      await contractApi.ownerRequestCancel(contractId, { reason: reason.trim() })
      toast.success('Cancellation request sent.')
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="animate-in fade-in zoom-in-95 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl duration-150">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <X className="h-5 w-5 text-rose-600" /> Cancel Contract
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <FormShell onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold text-slate-500">
              Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Enter reason for cancelling this deal..."
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
              Back
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
                'Cancel Contract'
              )}
            </button>
          </div>
        </FormShell>
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
const OwnerContractsPage = () => {
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)

  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)

  useEscapeKey(isModalOpen, () => setIsModalOpen(false))
  const [selectedContractId, setSelectedContractId] = useState(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [contractFiles, setContractFiles] = useState([])

  // Contract Viewer Modal state
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerImages, setViewerImages] = useState([])

  // Dispute modal state
  const [disputeContractId, setDisputeContractId] = useState(null)

  // Cancel Deal modal state
  const [cancelContractId, setCancelContractId] = useState(null)

  const [viewDispute, setViewDispute] = useState(null)
  const [loadingDispute, setLoadingDispute] = useState(false)

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
    // Load contracts when this screen mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchContracts()
  }, [fetchContracts])

  // Contract expiry/cancellation is processed by the BE scheduler. Refresh the
  // list as soon as the owner receives the corresponding realtime notification.
  useEffect(() => {
    const handleRentalNotification = (event) => {
      if (String(event.detail?.type || '').toUpperCase() === 'RENTAL') {
        fetchContracts()
      }
    }

    window.addEventListener('new_notification', handleRentalNotification)
    return () => window.removeEventListener('new_notification', handleRentalNotification)
  }, [fetchContracts])

  const openUploadModal = (id) => {
    setSelectedContractId(id)
    setStartDate('')
    setEndDate('')
    setContractFiles([])
    setIsModalOpen(true)
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
          } catch {
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
    } catch {
      toast.error('No valid contract file.')
    }
  }

  const handleSubmitContract = async (e) => {
    e.preventDefault()
    const dateError = validateDateRange(startDate, endDate)
    if (dateError || contractFiles.length === 0) {
      toast.error('Complete the dates and contract file.')
      return
    }

    try {
      setSubmitLoading(true)

      // Upload multiple files using bulk API
      const res = await uploadApi.uploadImages(contractFiles.map((f) => f.file))
      if (!res?.data?.success) {
        throw new Error(res?.data?.message || 'Upload photo failed')
      }

      const uploadedUrls = res.data.data

      const payload = {
        startDate,
        endDate,
        paperContractImages: uploadedUrls,
      }
      await contractApi.submitOnlineContract(selectedContractId, payload)

      toast.success('Contract uploaded.')
      setIsModalOpen(false)
      fetchContracts()
    } catch (error) {
      showApiErrorToast(error, 'Could not upload contract.')
    } finally {
      setSubmitLoading(false)
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
          'Dispute details are unavailable.'
        )
      }
    } catch (error) {
      showApiErrorToast(error, 'Could not load dispute details.')
    } finally {
      setLoadingDispute(false)
    }
  }

  const columns = [
    {
      header: 'Tenant',
      render: (row) => (
        <div>
          <p className="font-bold text-slate-900">{row.tenantName}</p>
          <p className="text-[10px] text-slate-400">{row.tenantEmail}</p>
        </div>
      ),
    },
    { header: 'Warehouse', accessor: 'warehouseName' },
    {
      header: 'Deposit',
      render: (row) => (
        <span className="text-primary font-semibold">{formatVND(row.depositAmount)}</span>
      ),
    },
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
                : row.status === 'UNDER_NEGOTIATION'
                  ? 'warning'
                  : row.status === 'PENDING_TENANT_CONFIRM'
                    ? 'primary'
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
            row.status === 'UNDER_NEGOTIATION' && {
              label: 'Upload contract',
              icon: Upload,
              onClick: () => openUploadModal(row.id),
            },
            (row.status === 'UNDER_NEGOTIATION' || row.status === 'PENDING_TENANT_CONFIRM') && {
              label: 'Cancel request',
              icon: X,
              onClick: () => setCancelContractId(row.id),
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
        <Sidebar currentRole="OWNER" />

        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
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

      {/* Modal Upload Hợp Đồng */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="animate-in fade-in zoom-in-95 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl duration-150">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Upload className="h-5 w-5 text-blue-600" /> Upload the Contract
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <FormShell onSubmit={handleSubmitContract} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-500">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-500">
                    Closing Date
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">
                  Photo of Paper Contract (Can choose multiple)
                </label>
                <label className="flex h-20 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200">
                  <ImageIcon className="h-4 w-4 text-slate-400" />
                  <span className="text-xs text-slate-500">Add photos of contract</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const newFiles = Array.from(e.target.files).map((file) => ({
                          file,
                          preview: URL.createObjectURL(file),
                        }))
                        setContractFiles((prev) => [...prev, ...newFiles])
                        e.target.value = null
                      }
                    }}
                  />
                </label>

                {contractFiles.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {contractFiles.map((item, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-square overflow-hidden rounded-lg border"
                      >
                        <img
                          src={item.preview}
                          alt="contract"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            URL.revokeObjectURL(item.preview)
                            setContractFiles((prev) => prev.filter((_, i) => i !== idx))
                          }}
                          className="absolute top-0.5 right-0.5 rounded-full bg-slate-900/60 p-0.5 text-white hover:bg-rose-600"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-blue-700 disabled:bg-slate-300"
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Send to Tenant'
                  )}
                </button>
              </div>
            </FormShell>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {disputeContractId && (
        <DisputeModal
          contractId={disputeContractId}
          onClose={() => setDisputeContractId(null)}
          onSuccess={fetchContracts}
        />
      )}

      {/* Cancel Deal Modal */}
      {cancelContractId && (
        <CancelDealModal
          contractId={cancelContractId}
          onClose={() => setCancelContractId(null)}
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

export default OwnerContractsPage
