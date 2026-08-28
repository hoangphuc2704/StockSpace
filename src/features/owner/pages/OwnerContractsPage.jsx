import { useCallback, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { FileText, X, Edit2, Trash2, Send, Eye, Plus } from 'lucide-react'
import contractApi from '@/services/contractApi'
import warehouseApi from '@/services/warehouse/warehouseApi'
import uploadApi from '@/services/uploadApi'
import { toast } from 'react-hot-toast'
import { showApiErrorToast } from '@/config/apiError'
import { validateDateRange } from '@/config/validation'
import { formatVND } from '@/utils/currency'

// ─── Contract Draft Modal ───────────────────────────────────────────────────────────
const apiData = (response) => response?.data?.data ?? response?.data ?? null

const DraftModal = ({
  isOpen,
  onClose,
  contractId,
  existingData = {},
  warehouses = [],
  warehousesLoading = false,
  onSuccess,
}) => {
  useEscapeKey(isOpen, onClose)

  const isEdit = !!contractId

  const [warehouseId, setWarehouseId] = useState(existingData.warehouseId || '')
  const [tenantEmail, setTenantEmail] = useState(existingData.tenantEmail || '')
  const [startDate, setStartDate] = useState(existingData.startDate || '')
  const [endDate, setEndDate] = useState(existingData.endDate || '')

  const [leasedWidth, setLeasedWidth] = useState(existingData.leasedWidth || '')
  const [leasedLength, setLeasedLength] = useState(existingData.leasedLength || '')
  const [leasedHeight, setLeasedHeight] = useState(existingData.leasedHeight || '')

  const [negotiatedMonthlyRent, setNegotiatedMonthlyRent] = useState(
    existingData.negotiatedMonthlyRent ??
      (existingData.pricingType === 'NEGOTIATED' ? existingData.finalMonthlyRent : '')
  )
  const [ownerNote, setOwnerNote] = useState(existingData.ownerNote || '')

  const [contractFiles, setContractFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [previewData, setPreviewData] = useState(null)
  const [previewPayload, setPreviewPayload] = useState(null)

  const selectedWarehouse = warehouses.find(
    (warehouse) => String(warehouse.id) === String(warehouseId)
  )
  const pricingType = existingData.pricingType || selectedWarehouse?.rentalPricingType || ''
  const isNegotiated = pricingType === 'NEGOTIATED'

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWarehouseId(existingData.warehouseId || '')
      setTenantEmail(existingData.tenantEmail || '')
      setStartDate(existingData.startDate || '')
      setEndDate(existingData.endDate || '')
      setLeasedWidth(existingData.leasedWidth || '')
      setLeasedLength(existingData.leasedLength || '')
      setLeasedHeight(existingData.leasedHeight || '')
      setNegotiatedMonthlyRent(
        existingData.negotiatedMonthlyRent ??
          (existingData.pricingType === 'NEGOTIATED' ? existingData.finalMonthlyRent : '')
      )
      setOwnerNote(existingData.ownerNote || '')
      setContractFiles([])
      setError(null)
      setPreviewData(null)
      setPreviewPayload(null)
    }
  }, [isOpen, existingData])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isEdit && previewData && previewPayload) {
      setSubmitting(true)
      setError(null)
      try {
        const response = await contractApi.createDraft(previewPayload)
        const createdContract = apiData(response)
        toast.success('Contract draft created. Continue by configuring its layout.')
        onSuccess?.(createdContract)
        onClose()
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to create contract draft.')
      } finally {
        setSubmitting(false)
      }
      return
    }

    const dateError = validateDateRange(startDate, endDate)
    if (dateError) {
      setError(dateError)
      return
    }
    if (!isEdit && !warehouseId) {
      setError('Please select a warehouse.')
      return
    }
    if ([leasedWidth, leasedLength, leasedHeight].some((value) => Number(value) <= 0)) {
      setError('Leased width, length and height must be greater than 0.')
      return
    }
    if (isNegotiated && Number(negotiatedMonthlyRent) <= 0) {
      setError('Negotiated monthly rent must be greater than 0.')
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
        negotiatedMonthlyRent: isNegotiated ? Number(negotiatedMonthlyRent) : null,
        ownerNote,
        paperContractFiles: uploadedUrls,
      }

      if (isEdit) {
        const response = await contractApi.updateDraft(contractId, payload)
        toast.success('Contract draft updated.')
        onSuccess?.(apiData(response))
        onClose()
      } else {
        const previewResponse = await contractApi.preview(payload)
        setPreviewData(apiData(previewResponse))
        setPreviewPayload(payload)
        toast.success('Preview generated. Review the terms before creating the draft.')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save draft.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="animate-in fade-in zoom-in-95 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            {isEdit ? (
              <Edit2 className="h-5 w-5 text-blue-600" />
            ) : (
              <Plus className="h-5 w-5 text-blue-600" />
            )}
            {isEdit ? 'Edit Contract Draft' : 'Create Contract Draft'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <FormShell onSubmit={handleSubmit} className="space-y-4">
          {!isEdit && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-500">
                  Warehouse <span className="text-rose-500">*</span>
                </label>
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  disabled={previewData || warehousesLoading || warehouses.length === 0}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:bg-slate-100"
                >
                  <option value="">
                    {warehousesLoading ? 'Loading warehouses...' : 'Select a warehouse'}
                  </option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} · {warehouse.rentalPricingType || 'Pricing not set'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-500">
                  Tenant Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={tenantEmail}
                  onChange={(e) => setTenantEmail(e.target.value)}
                  disabled={Boolean(previewData)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  placeholder="tenant@example.com"
                />
              </div>
            </div>
          )}

          {pricingType && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Pricing model: <strong>{pricingType}</strong>. The final rental amount is calculated
              and frozen by the backend in the contract.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-500">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={Boolean(previewData)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-500">
                End Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={Boolean(previewData)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-500">
                Leased Width (m)
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={leasedWidth}
                onChange={(e) => setLeasedWidth(e.target.value)}
                disabled={Boolean(previewData)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-500">
                Leased Length (m)
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={leasedLength}
                onChange={(e) => setLeasedLength(e.target.value)}
                disabled={Boolean(previewData)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-500">
                Leased Height (m)
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={leasedHeight}
                onChange={(e) => setLeasedHeight(e.target.value)}
                disabled={Boolean(previewData)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {isNegotiated && (
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-500">
                  Negotiated Rent (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  value={negotiatedMonthlyRent}
                  onChange={(e) => setNegotiatedMonthlyRent(e.target.value)}
                  disabled={Boolean(previewData)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900 outline-none"
                />
              </div>
            )}
          </div>

          {previewData && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-bold tracking-wider text-emerald-700 uppercase">
                Contract preview
              </p>
              <div className="mt-3 grid gap-3 text-sm text-emerald-950 sm:grid-cols-3">
                <div>
                  <span className="block text-xs text-emerald-700">Final monthly rent</span>
                  <strong>{formatVND(previewData.finalMonthlyRent || 0)}</strong>
                </div>
                <div>
                  <span className="block text-xs text-emerald-700">Leased area</span>
                  <strong>
                    {previewData.leasedAreaM2 ?? Number(leasedWidth) * Number(leasedLength)} m²
                  </strong>
                </div>
                <div>
                  <span className="block text-xs text-emerald-700">Layout area</span>
                  <strong>
                    {previewData.leasedWidth ?? leasedWidth} ×{' '}
                    {previewData.leasedLength ?? leasedLength} ×{' '}
                    {previewData.leasedHeight ?? leasedHeight} m
                  </strong>
                </div>
              </div>
              <p className="mt-3 text-xs text-emerald-800">
                Review the values above, then create the draft. You will configure the contract
                layout in the next step.
              </p>
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs font-bold text-slate-500">Note</label>
            <textarea
              value={ownerNote}
              onChange={(e) => setOwnerNote(e.target.value)}
              disabled={Boolean(previewData)}
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
              disabled={Boolean(previewData)}
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
              className="w-full text-sm"
            />
            <div className="flex gap-2">
              {contractFiles.map((f, i) => (
                <img
                  key={i}
                  src={f.preview}
                  alt="preview"
                  className="h-16 w-16 rounded object-cover"
                />
              ))}
              {existingData.paperContractFiles &&
                contractFiles.length === 0 &&
                existingData.paperContractFiles.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt="existing"
                    className="h-16 w-16 rounded object-cover"
                  />
                ))}
            </div>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            {previewData && !isEdit && (
              <button
                type="button"
                onClick={() => {
                  setPreviewData(null)
                  setPreviewPayload(null)
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Edit terms
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting
                ? 'Saving...'
                : previewData && !isEdit
                  ? 'Create Draft'
                  : isEdit
                    ? 'Update Draft'
                    : 'Preview Terms'}
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
  const navigate = useNavigate()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)

  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [warehouses, setWarehouses] = useState([])
  const [warehousesLoading, setWarehousesLoading] = useState(true)

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchContracts()
  }, [fetchContracts])

  const fetchWarehouses = useCallback(async () => {
    try {
      setWarehousesLoading(true)
      const response = await warehouseApi.getOwnerWarehouses({
        page: 0,
        size: 100,
        sortBy: 'createdAt',
        sortDir: 'desc',
      })
      const payload = apiData(response)
      setWarehouses(Array.isArray(payload) ? payload : payload?.content || [])
    } catch (error) {
      console.error('Error getting owner warehouses:', error)
      showApiErrorToast(error, 'Could not load your warehouses.')
    } finally {
      setWarehousesLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWarehouses()
  }, [fetchWarehouses])

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
          EXPIRED: 'slate',
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
            (row.canEdit || row.canViewLayout) && {
              label: row.canEdit ? 'Configure Layout' : 'View Layout',
              icon: Eye,
              onClick: () => window.open(`/owner/contracts/${row.id}/layout`, '_blank'),
            },
            row.canEdit && {
              label: 'Edit Draft',
              icon: Edit2,
              onClick: () => {
                setEditContract(row)
                setIsDraftOpen(true)
              },
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

  const handleDraftSuccess = useCallback(
    (contract) => {
      fetchContracts()
      if (contract?.id) navigate(`/owner/contracts/${contract.id}/layout`)
    },
    [fetchContracts, navigate]
  )

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
        <Sidebar currentRole="OWNER" />

        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'}`}
        >
          <main className="mx-auto w-full max-w-4000 space-y-6 p-6 md:p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">My Contracts</h1>
                <p className="text-sm text-slate-500">Manage your warehouse rental agreements.</p>
              </div>
              <button
                onClick={() => {
                  setEditContract(null)
                  setIsDraftOpen(true)
                }}
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
          warehouses={warehouses}
          warehousesLoading={warehousesLoading}
          onSuccess={handleDraftSuccess}
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
