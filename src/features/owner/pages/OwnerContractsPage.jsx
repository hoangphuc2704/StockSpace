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
  Edit2,
  Trash2,
  Send,
  Eye,
  Plus
} from 'lucide-react'
import contractApi from '@/services/contractApi'
import uploadApi from '@/services/uploadApi'
import { toast } from 'react-hot-toast'
import { showApiErrorToast } from '@/config/apiError'
import { required, validateDateRange } from '@/config/validation'
import { formatVND } from '@/utils/currency'

// ─── Contract Draft Modal ───────────────────────────────────────────────────────────
const DraftModal = ({ isOpen, onClose, contractId, existingData = {}, onSuccess }) => {
  useEscapeKey(isOpen, onClose)
  
  const isEdit = !!contractId
  
  const [warehouseId, setWarehouseId] = useState(existingData.warehouseId || '')
  const [tenantEmail, setTenantEmail] = useState(existingData.tenantEmail || '')
  const [startDate, setStartDate] = useState(existingData.startDate || '')
  const [endDate, setEndDate] = useState(existingData.endDate || '')
  
  const [leasedWidth, setLeasedWidth] = useState(existingData.leasedWidth || '')
  const [leasedLength, setLeasedLength] = useState(existingData.leasedLength || '')
  const [leasedHeight, setLeasedHeight] = useState(existingData.leasedHeight || '')
  
  const [negotiatedMonthlyRent, setNegotiatedMonthlyRent] = useState(existingData.negotiatedMonthlyRent || '')
  const [ownerNote, setOwnerNote] = useState(existingData.ownerNote || '')
  
  const [contractFiles, setContractFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen) {
      setWarehouseId(existingData.warehouseId || '')
      setTenantEmail(existingData.tenantEmail || '')
      setStartDate(existingData.startDate || '')
      setEndDate(existingData.endDate || '')
      setLeasedWidth(existingData.leasedWidth || '')
      setLeasedLength(existingData.leasedLength || '')
      setLeasedHeight(existingData.leasedHeight || '')
      setNegotiatedMonthlyRent(existingData.negotiatedMonthlyRent || '')
      setOwnerNote(existingData.ownerNote || '')
      setContractFiles([])
      setError(null)
    }
  }, [isOpen, existingData])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    const dateError = validateDateRange(startDate, endDate)
    if (dateError) {
      setError(dateError)
      return
    }
    setError(null)
    setSubmitting(true)

    try {
      let uploadedUrls = existingData.paperContractFiles || []
      
      if (contractFiles.length > 0) {
        const res = await uploadApi.uploadImages(contractFiles.map((f) => f.file))
        if (!res?.data?.success) throw new Error(res?.data?.message || 'Upload photo failed')
        uploadedUrls = res.data.data
      }

      const payload = {
        warehouseId: !isEdit ? warehouseId : undefined,
        tenantEmail: !isEdit ? tenantEmail : undefined,
        startDate,
        endDate,
        leasedWidth: Number(leasedWidth),
        leasedLength: Number(leasedLength),
        leasedHeight: Number(leasedHeight),
        negotiatedMonthlyRent: negotiatedMonthlyRent ? Number(negotiatedMonthlyRent) : null,
        ownerNote,
        paperContractFiles: uploadedUrls
      }

      if (isEdit) {
        await contractApi.updateDraft(contractId, payload)
        toast.success('Contract draft updated.')
      } else {
        await contractApi.createDraft(payload)
        toast.success('Contract draft created.')
      }
      
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save draft.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="animate-in fade-in zoom-in-95 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            {isEdit ? <Edit2 className="h-5 w-5 text-blue-600" /> : <Plus className="h-5 w-5 text-blue-600" />}
            {isEdit ? 'Edit Contract Draft' : 'Create Contract Draft'}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <FormShell onSubmit={handleSubmit} className="space-y-4">
          
          {!isEdit && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-500">Warehouse ID <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                  placeholder="UUID"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-500">Tenant Email <span className="text-rose-500">*</span></label>
                <input
                  type="email"
                  required
                  value={tenantEmail}
                  onChange={(e) => setTenantEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                  placeholder="tenant@example.com"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-500">Start Date <span className="text-rose-500">*</span></label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-500">End Date <span className="text-rose-500">*</span></label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-500">Leased Width (m)</label>
              <input
                type="number" step="0.1"
                required
                value={leasedWidth}
                onChange={(e) => setLeasedWidth(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-500">Leased Length (m)</label>
              <input
                type="number" step="0.1"
                required
                value={leasedLength}
                onChange={(e) => setLeasedLength(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-500">Leased Height (m)</label>
              <input
                type="number" step="0.1"
                required
                value={leasedHeight}
                onChange={(e) => setLeasedHeight(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="mb-2 block text-xs font-bold text-slate-500">Negotiated Rent (Optional)</label>
              <input
                type="number"
                value={negotiatedMonthlyRent}
                onChange={(e) => setNegotiatedMonthlyRent(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900 outline-none"
              />
            </div>
          </div>

          <div>
             <label className="mb-2 block text-xs font-bold text-slate-500">Note</label>
              <textarea
                value={ownerNote}
                onChange={(e) => setOwnerNote(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900 outline-none"
              />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Photo of Paper Contract</label>
            <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    const newFiles = Array.from(e.target.files).map((file) => ({
                      file, preview: URL.createObjectURL(file)
                    }))
                    setContractFiles((prev) => [...prev, ...newFiles])
                    e.target.value = null
                  }
                }}
                className="w-full text-sm"
              />
              <div className="flex gap-2">
                 {contractFiles.map((f, i) => (
                    <img key={i} src={f.preview} alt="preview" className="h-16 w-16 rounded object-cover" />
                 ))}
                 {existingData.paperContractFiles && contractFiles.length === 0 && existingData.paperContractFiles.map((url, i) => (
                    <img key={i} src={url} alt="existing" className="h-16 w-16 rounded object-cover" />
                 ))}
              </div>
          </div>

          {error && <p className="text-rose-600 text-sm">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="submit" disabled={submitting} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
              {submitting ? 'Saving...' : 'Save Draft'}
            </button>
          </div>
        </FormShell>
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

  // Draft modal state
  const [isDraftOpen, setIsDraftOpen] = useState(false)
  const [editContract, setEditContract] = useState(null)

  // Viewer Modal
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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this draft?')) return
    try {
      await contractApi.deleteDraft(id)
      toast.success('Draft deleted')
      fetchContracts()
    } catch (error) {
      showApiErrorToast(error, 'Could not delete draft')
    }
  }

  const handleSubmit = async (id) => {
    if (!window.confirm('Send this contract to the tenant for confirmation?')) return
    try {
      await contractApi.submit(id)
      toast.success('Submitted to tenant')
      fetchContracts()
    } catch (error) {
      showApiErrorToast(error, 'Could not submit contract')
    }
  }

  const handleViewContract = (imageUrlRaw) => {
    try {
      if (!imageUrlRaw) throw new Error('No image')
      const imageArray = Array.isArray(imageUrlRaw) ? imageUrlRaw : [imageUrlRaw]
      if (!imageArray || imageArray.length === 0) throw new Error('Invalid URL')
      setViewerImages(imageArray)
      setViewerOpen(true)
    } catch {
      toast.error('No valid contract file.')
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
              onClick: () => window.open(`/owner/layoutwarehouses?warehouseId=${row.warehouseId}`, '_blank')
            },
            row.canEdit && {
              label: 'Edit Draft',
              icon: Edit2,
              onClick: () => { setEditContract(row); setIsDraftOpen(true) },
            },
            row.canSubmit && {
              label: 'Submit to Tenant',
              icon: Send,
              onClick: () => handleSubmit(row.id),
            },
            row.canDelete && {
              label: 'Delete',
              icon: Trash2,
              onClick: () => handleDelete(row.id),
              danger: true,
            },
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
        <Sidebar currentRole="OWNER" />

        <div className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'}`}>
          <main className="mx-auto w-full max-w-4000 space-y-6 p-6 md:p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">My Contracts</h1>
                <p className="text-sm text-slate-500">Manage your warehouse rental agreements.</p>
              </div>
              <button 
                onClick={() => { setEditContract(null); setIsDraftOpen(true) }}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700"
              >
                <Plus size={18} /> New Draft
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <DataTable columns={columns} data={contracts} isLoading={loading} />
            </div>
          </main>
        </div>
      </div>

      {isDraftOpen && (
        <DraftModal
          isOpen={isDraftOpen}
          onClose={() => setIsDraftOpen(false)}
          contractId={editContract?.id}
          existingData={editContract || {}}
          onSuccess={fetchContracts}
        />
      )}

      <ContractViewerModal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        images={viewerImages}
      />
    </div>
  )
}

export default OwnerContractsPage
