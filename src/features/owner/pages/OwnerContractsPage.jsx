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
import OwnerDataTable from '../components/OwnerDataTable'
import { FileText, X, Edit2, Trash2, Send, Eye, Plus, RefreshCw } from 'lucide-react'
import contractApi from '@/services/contractApi'
import warehouseApi from '@/services/warehouse/warehouseApi'
import uploadApi from '@/services/uploadApi'
import { toast } from 'react-hot-toast'
import { showApiErrorToast } from '@/config/apiError'
import { validateDateRange } from '@/config/validation'
import { formatVND } from '@/utils/currency'

const CONTRACT_STATUS_META = {
  DRAFT: { label: 'Draft', className: 'border-slate-200 bg-slate-100 text-slate-700' },
  PENDING_TENANT_CONFIRM: {
    label: 'Pending confirmation',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  CHANGES_REQUESTED: {
    label: 'Changes requested',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  ACTIVE: { label: 'Active', className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  SCHEDULED: {
    label: 'Scheduled',
    className: 'border-blue-200 bg-blue-50 text-blue-800',
  },
  REJECTED: { label: 'Rejected', className: 'border-rose-200 bg-rose-50 text-rose-800' },
  EXPIRED: { label: 'Expired', className: 'border-slate-200 bg-slate-100 text-slate-700' },
}

const getContractStatusMeta = (status) =>
  CONTRACT_STATUS_META[status] || {
    label: status || 'Unknown',
    className: 'border-slate-200 bg-slate-100 text-slate-700',
  }

const formatContractDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(`${dateString}T00:00:00`)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-GB')
}

const addDaysToDate = (dateString, days) => {
  if (!dateString) return ''
  const date = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  date.setDate(date.getDate() + days)
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

const getDaysUntilEnd = (contract) => {
  if (contract.status !== 'ACTIVE' || !contract.endDate) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(`${contract.endDate}T00:00:00`)
  if (Number.isNaN(endDate.getTime())) return null

  return Math.ceil((endDate - today) / 86_400_000)
}

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
  const isRenewal = Boolean(existingData.renewedFromContractId)

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
  const [defaultLayout, setDefaultLayout] = useState(null)
  const [defaultLayoutLoading, setDefaultLayoutLoading] = useState(false)
  const [defaultLayoutError, setDefaultLayoutError] = useState(null)

  const selectedWarehouse = warehouses.find(
    (warehouse) => String(warehouse.id) === String(warehouseId)
  )
  const pricingType = existingData.pricingType || selectedWarehouse?.rentalPricingType || ''
  const isNegotiated = pricingType === 'NEGOTIATED'
  const isFixedPricing = pricingType === 'FIXED_MONTHLY'

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
      setDefaultLayout(null)
      setDefaultLayoutError(null)
    }
  }, [isOpen, existingData])

  // Sync the draft layout preview whenever the selected warehouse changes.
  useEffect(() => {
    let active = true

    if (!isOpen || !warehouseId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDefaultLayout(null)
      setDefaultLayoutLoading(false)
      setDefaultLayoutError(null)
      return () => {
        active = false
      }
    }

    setDefaultLayoutLoading(true)
    setDefaultLayoutError(null)

    warehouseApi
      .getOwnerWarehouseLayout(warehouseId)
      .then((response) => {
        const layout = apiData(response)
        const dimensions = {
          width: Number(layout?.width),
          length: Number(layout?.length),
          height: Number(layout?.height),
        }

        if (
          !Number.isFinite(dimensions.width) ||
          !Number.isFinite(dimensions.length) ||
          !Number.isFinite(dimensions.height) ||
          dimensions.width <= 0 ||
          dimensions.length <= 0 ||
          dimensions.height <= 0
        ) {
          throw new Error('The selected warehouse has no valid default layout dimensions.')
        }

        if (active) {
          setDefaultLayout(dimensions)
          // A partial rental is split on the warehouse floor, so it always
          // uses the full warehouse height. Keep the value in the payload
          // while removing the height input from the form.
          setLeasedHeight(String(dimensions.height))
          if (!isEdit) {
            setLeasedWidth(String(dimensions.width))
            setLeasedLength(String(dimensions.length))
          }
        }
      })
      .catch((requestError) => {
        if (!active) return
        setDefaultLayout(null)
        setDefaultLayoutError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            'Could not load the warehouse default layout.'
        )
      })
      .finally(() => {
        if (active) setDefaultLayoutLoading(false)
      })

    return () => {
      active = false
    }
  }, [isOpen, isEdit, warehouseId])

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
    const requestedDimensions = {
      width: Number(leasedWidth),
      length: Number(leasedLength),
      height: Number(leasedHeight),
    }
    if (Object.values(requestedDimensions).some((value) => !Number.isFinite(value) || value <= 0)) {
      setError('Leased width, length and height must be greater than 0.')
      return
    }
    if (defaultLayoutLoading) {
      setError('Please wait while the warehouse default layout is loading.')
      return
    }
    if (!defaultLayout) {
      setError(defaultLayoutError || 'The warehouse default layout could not be loaded.')
      return
    }

    const exceedsDefaultLayout =
      requestedDimensions.width > defaultLayout.width ||
      requestedDimensions.length > defaultLayout.length ||
      requestedDimensions.height > defaultLayout.height
    if (exceedsDefaultLayout) {
      setError(
        `Leased dimensions must not exceed the default layout (${defaultLayout.width} × ${defaultLayout.length} × ${defaultLayout.height} m).`
      )
      return
    }

    if (
      isFixedPricing &&
      ['width', 'length', 'height'].some(
        (dimension) => Math.abs(requestedDimensions[dimension] - defaultLayout[dimension]) > 1e-9
      )
    ) {
      setError(
        `FIXED_MONTHLY requires the complete default layout (${defaultLayout.width} × ${defaultLayout.length} × ${defaultLayout.height} m).`
      )
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
        leasedWidth: requestedDimensions.width,
        leasedLength: requestedDimensions.length,
        leasedHeight: requestedDimensions.height,
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
      <div className="animate-in fade-in zoom-in-95 max-h-[calc(100dvh-1rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            {isEdit ? (
              <Edit2 className="h-5 w-5 text-blue-600" />
            ) : (
              <Plus className="h-5 w-5 text-blue-600" />
            )}
            {isEdit ? (isRenewal ? 'Edit Renewal Draft' : 'Edit Contract Draft') : 'Create Contract Draft'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <FormShell onSubmit={handleSubmit} className="space-y-3">
          {!isEdit && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

          {warehouseId && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {defaultLayoutLoading ? (
                'Loading the selected warehouse default layout...'
              ) : defaultLayout ? (
                <>
                  Default layout:{' '}
                  <strong>
                    {defaultLayout.width} × {defaultLayout.length} × {defaultLayout.height} m
                  </strong>
                  .
                  {isFixedPricing
                    ? ' Fixed monthly contracts must use all of this space.'
                    : ' You can enter a smaller valid area.'}
                </>
              ) : (
                <span className="text-rose-600">
                  {defaultLayoutError || 'The warehouse default layout is unavailable.'}
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-500">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={Boolean(previewData) || isRenewal}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
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
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-500">
                Leased Width (m)
              </label>
              <input
                type="number"
                min="1"
                max={defaultLayout?.width}
                step="1"
                required
                value={leasedWidth}
                onChange={(e) => setLeasedWidth(e.target.value)}
                disabled={Boolean(previewData) || isRenewal}
                readOnly={isFixedPricing && Boolean(defaultLayout)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-500">
                Leased Length (m)
              </label>
              <input
                type="number"
                min="1"
                max={defaultLayout?.length}
                step="1"
                required
                value={leasedLength}
                onChange={(e) => setLeasedLength(e.target.value)}
                disabled={Boolean(previewData) || isRenewal}
                readOnly={isFixedPricing && Boolean(defaultLayout)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900 outline-none"
              />
            </div>
            {defaultLayout && (
              <div className="flex items-center rounded-xl border border-blue-100 bg-blue-50 px-4 py-2">
                <div>
                  <span className="block text-xs font-bold text-blue-700">Leased Height</span>
                  <strong className="text-sm text-blue-950">{defaultLayout.height} m</strong>
                  <span className="ml-2 text-xs text-blue-700">Full warehouse height</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

// ─── Contract Renewal Modal ─────────────────────────────────────────────────────────
const RenewalModal = ({ isOpen, onClose, sourceContract, onSuccess }) => {
  useEscapeKey(isOpen, onClose)

  const [endDate, setEndDate] = useState('')
  const [negotiatedMonthlyRent, setNegotiatedMonthlyRent] = useState('')
  const [ownerNote, setOwnerNote] = useState('')
  const [contractFiles, setContractFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const startDate = addDaysToDate(sourceContract?.endDate, 1)
  const isNegotiated = sourceContract?.pricingType === 'NEGOTIATED'

  useEffect(() => {
    if (isOpen && sourceContract) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEndDate('')
      setNegotiatedMonthlyRent(
        sourceContract.pricingType === 'NEGOTIATED' ? sourceContract.finalMonthlyRent || '' : ''
      )
      setOwnerNote('')
      setContractFiles([])
      setError(null)
    }
  }, [isOpen, sourceContract])

  if (!isOpen || !sourceContract) return null

  const handleSubmit = async (event) => {
    event.preventDefault()

    const dateError = validateDateRange(startDate, endDate)
    if (dateError) {
      setError(dateError)
      return
    }
    if (new Date(endDate) < new Date(addDaysToDate(startDate, 6))) {
      setError('A renewal must last at least 7 days.')
      return
    }
    if (isNegotiated && Number(negotiatedMonthlyRent) <= 0) {
      setError('Negotiated monthly rent must be greater than 0.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      let uploadedUrls
      if (contractFiles.length > 0) {
        const response = await uploadApi.uploadImages(contractFiles.map((item) => item.file))
        if (!response?.data?.success) {
          throw new Error(response?.data?.message || 'Could not upload paper contract files.')
        }
        uploadedUrls = response.data.data
      }

      const payload = {
        endDate,
        negotiatedMonthlyRent: isNegotiated ? Number(negotiatedMonthlyRent) : null,
        ownerNote: ownerNote.trim() || undefined,
        paperContractFiles: uploadedUrls,
      }
      const response = await contractApi.createRenewalDraft(sourceContract.id, payload)
      toast.success('Renewal draft created.')
      onSuccess?.(apiData(response))
      onClose()
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Could not create renewal draft.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="animate-in fade-in zoom-in-95 max-h-[calc(100dvh-1rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            Request Contract Renewal
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <FormShell onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-950">
            <p className="font-bold">{sourceContract.warehouseName || 'Warehouse'}</p>
            <p className="mt-1 text-blue-800">
              Tenant: {sourceContract.tenantName || sourceContract.tenantEmail || '-'}
            </p>
            <p className="mt-1 text-blue-800">
              Current contract: {formatContractDate(sourceContract.startDate)} →{' '}
              {formatContractDate(sourceContract.endDate)}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-500">Renewal Start Date</label>
              <input
                type="date"
                value={startDate}
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-sm text-slate-700"
              />
              <p className="mt-1 text-xs text-slate-500">Automatically starts after the current contract ends.</p>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-500">
                Renewal End Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                min={addDaysToDate(startDate, 6)}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
              <p className="mt-1 text-xs text-slate-500">Minimum renewal duration: 7 days.</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Pricing model: <strong>{sourceContract.pricingType || '-'}</strong>. Warehouse, tenant,
            leased dimensions, and layout are inherited from the current contract.
          </div>

          {isNegotiated && (
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-500">
                Negotiated Monthly Rent <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={negotiatedMonthlyRent}
                onChange={(event) => setNegotiatedMonthlyRent(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
              <p className="mt-1 text-xs text-slate-500">
                Current amount: {formatVND(sourceContract.finalMonthlyRent || 0)} / month
              </p>
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs font-bold text-slate-500">Owner Note</label>
            <textarea
              value={ownerNote}
              onChange={(event) => setOwnerNote(event.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              placeholder="Add renewal terms or a note for the tenant..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Paper Contract Files (optional now)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                if (event.target.files && event.target.files.length > 0) {
                  const newFiles = Array.from(event.target.files).map((file) => ({
                    file,
                    preview: URL.createObjectURL(file),
                  }))
                  setContractFiles((previous) => [...previous, ...newFiles])
                  event.target.value = null
                }
              }}
              className="w-full text-sm"
            />
            <p className="text-xs text-slate-500">
              At least one paper contract file is required before submitting the renewal to the tenant.
            </p>
            <div className="flex gap-2">
              {contractFiles.map((item, index) => (
                <img
                  key={index}
                  src={item.preview}
                  alt="Paper contract preview"
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
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? 'Creating...' : 'Create Renewal Draft'}
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

  // Renewal modal state
  const [isRenewalOpen, setIsRenewalOpen] = useState(false)
  const [renewalSource, setRenewalSource] = useState(null)

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

  useEffect(() => {
    const handleContractNotification = (event) => {
      const type = String(event.detail?.type || '').toUpperCase()
      if (type === 'CONTRACT_EXPIRY_REMINDER' || type === 'CONTRACT_EXPIRED') {
        fetchContracts()
      }
    }

    window.addEventListener('new_notification', handleContractNotification)
    return () => window.removeEventListener('new_notification', handleContractNotification)
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

  const handleDelete = async (contract) => {
    const isRenewalDraft = Boolean(contract?.renewedFromContractId)
    const message = isRenewalDraft
      ? 'Cancel this renewal draft? The current contract will remain unchanged.'
      : 'Are you sure you want to delete this draft?'
    if (!window.confirm(message)) return
    try {
      await contractApi.deleteDraft(contract.id)
      toast.success(isRenewalDraft ? 'Renewal draft cancelled' : 'Draft deleted')
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
    // {
    //   header: 'Contract',
    //   render: (row) => (
    //     <div>
    //       <p className="font-mono text-xs font-semibold text-slate-900">
    //         {formatContractReference(row.id)}
    //       </p>
    //       <p className="mt-1 text-xs text-slate-500">Warehouse rental contract</p>
    //     </div>
    //   ),
    // },
    {
      header: 'Tenant',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.tenantName || '-'}</p>
          <p className="mt-1 text-xs text-slate-500">{row.tenantEmail || 'Tenant'}</p>
        </div>
      ),
    },
    {
      header: 'Warehouse',
      render: (row) => (
        <div>
          <p className="max-w-72 truncate font-semibold text-slate-900">
            {row.warehouseName || '-'}
          </p>
          <p className="mt-1 max-w-72 truncate text-xs text-slate-500">
            {row.warehouseAddress || 'No warehouse address'}
          </p>
        </div>
      ),
    },
    {
      header: 'Rent',
      render: (row) => (
        <div className="text-right">
          <p className="font-semibold text-slate-950 tabular-nums">
            {formatVND(row.finalMonthlyRent || 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500">/ month</p>
        </div>
      ),
    },
    {
      header: 'Term',
      render: (row) => (
        <div className="text-xs">
          <div className="font-medium text-slate-800 tabular-nums">
            {formatContractDate(row.startDate)} <span className="px-1 text-slate-400">→</span>{' '}
            {formatContractDate(row.endDate)}
          </div>
          {row.status === 'EXPIRED' ? (
            <p className="mt-1 font-medium text-rose-700">Expired</p>
          ) : (
            (() => {
              const daysUntilEnd = getDaysUntilEnd(row)
              if (daysUntilEnd === null || daysUntilEnd < 0 || daysUntilEnd > 30) return null
              return (
                <p
                  className={`mt-1 font-medium ${daysUntilEnd <= 7 ? 'text-rose-700' : 'text-amber-700'}`}
                >
                  {daysUntilEnd === 0 ? 'Expires today' : `Expires in ${daysUntilEnd} days`}
                </p>
              )
            })()
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      render: (row) => {
        const statusMeta = getContractStatusMeta(row.status)
        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-semibold ${statusMeta.className}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden="true" />
            {statusMeta.label}
          </span>
        )
      },
    },
    {
      header: 'Actions',
      render: (row) => (
        <TableActionMenu
          items={[
            row.canCreateRenewal && {
              label: 'Request Renewal',
              icon: RefreshCw,
              onClick: () => {
                setRenewalSource(row)
                setIsRenewalOpen(true)
              },
            },
            row.paperContractFiles?.length > 0 && {
              label: 'View Paper Contract',
              icon: FileText,
              onClick: () => handleViewContract(row.paperContractFiles),
            },
            (row.canEditContractLayout || row.canViewLayout) && {
              label: row.canEditContractLayout ? 'Configure Layout' : 'View Layout',
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
              label: row.renewedFromContractId ? 'Cancel Renewal Draft' : 'Delete Draft',
              icon: Trash2,
              onClick: () => handleDelete(row),
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
          <main className="mx-auto w-full max-w-4000 space-y-6 p-4 sm:p-6 md:p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">My Contracts</h1>
                <p className="text-sm text-slate-500">Manage your warehouse rental agreements.</p>
              </div>
              <button
                onClick={() => {
                  setEditContract(null)
                  setIsDraftOpen(true)
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700 sm:w-auto"
              >
                <Plus size={18} /> New Draft
              </button>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
              <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">Contract list</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Manage warehouse rental agreements and available actions
                  </p>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  {loading ? 'Loading contracts' : `${contracts.length} contracts displayed`}
                </span>
              </div>
              <OwnerDataTable columns={columns} data={contracts} wide />
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

      {isRenewalOpen && (
        <RenewalModal
          isOpen={isRenewalOpen}
          sourceContract={renewalSource}
          onClose={() => {
            setIsRenewalOpen(false)
            setRenewalSource(null)
          }}
          onSuccess={() => fetchContracts()}
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
