import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle,
  ClipboardList,
  AlertTriangle,
  Clock3,
  Edit3,
  Eye,
  FileCheck2,
  FileText,
  Loader2,
  PackageOpen,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react'
import { FormShell } from '@/form/FormControls'
import useEscapeKey from '@/hooks/useEscapeKey'
import { closeMobileSidebar } from '@/store/uiSlide'
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'
import ContractViewerModal from '@/components/ContractViewerModal'
import TableActionMenu from '@/components/TableActionMenu'
import contractApi from '@/services/contractApi'
import { toast } from 'react-hot-toast'
import { showApiErrorToast } from '@/config/apiError'
import { required } from '@/config/validation'
import { useConfirmDialog } from '@/components/ConfirmDialogProvider'
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
  ACTIVE: {
    label: 'Active',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  SCHEDULED: { label: 'Scheduled', className: 'border-blue-200 bg-blue-50 text-blue-800' },
  REJECTED: { label: 'Rejected', className: 'border-rose-200 bg-rose-50 text-rose-800' },
  EXPIRED: { label: 'Expired', className: 'border-slate-200 bg-slate-100 text-slate-700' },
}

const getStatusMeta = (status) =>
  CONTRACT_STATUS_META[status] || {
    label: status || 'Unknown',
    className: 'border-slate-200 bg-slate-100 text-slate-700',
  }

const formatContractDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(`${dateString}T00:00:00`)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-GB')
}

const formatContractReference = (id) =>
  `CT-${
    String(id || '')
      .slice(0, 8)
      .toUpperCase() || '-'
  }`

const getDaysUntilEnd = (contract) => {
  if (contract.status !== 'ACTIVE' || !contract.endDate) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(`${contract.endDate}T00:00:00`)
  if (Number.isNaN(endDate.getTime())) return null

  return Math.ceil((endDate - today) / 86_400_000)
}

const isExpiringSoon = (contract) => {
  const daysUntilEnd = getDaysUntilEnd(contract)
  if (daysUntilEnd === null) return false
  return daysUntilEnd >= 0 && daysUntilEnd <= 30
}

const ReasonModal = ({ isOpen, title, action, contractId, onClose, onSuccess }) => {
  useEscapeKey(isOpen, onClose)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReason('')
      setError(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (event) => {
    event.preventDefault()
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

  const isRejecting = action === 'reject'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="contract-reason-title"
        className="w-full max-w-md overflow-hidden rounded-lg border border-slate-300 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="tracking-0.1em text-xs font-semibold text-slate-500 uppercase">
              Contract review
            </p>
            <h3 id="contract-reason-title" className="mt-1 text-lg font-bold text-slate-950">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close contract review"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <FormShell onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
          {isRejecting && (
            <div className="border-l-2 border-rose-500 bg-rose-50 px-3 py-2.5 text-sm leading-5 text-rose-900">
              Rejecting this contract will end the current approval process for this agreement.
            </div>
          )}
          <div>
            <label
              htmlFor="contract-reason"
              className="mb-1.5 block text-sm font-semibold text-slate-800"
            >
              Reason <span className="text-rose-600">*</span>
            </label>
            <textarea
              id="contract-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              placeholder={`Enter a reason to ${isRejecting ? 'reject' : 'request changes to'} the contract...`}
              className="w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 transition-colors outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          {error && <p className="text-sm text-rose-700">{error}</p>}
          <footer className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                isRejecting
                  ? 'bg-rose-700 hover:bg-rose-800 focus-visible:ring-rose-600'
                  : 'bg-blue-700 hover:bg-blue-800 focus-visible:ring-blue-600'
              }`}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {submitting ? 'Sending...' : 'Send request'}
            </button>
          </footer>
        </FormShell>
      </section>
    </div>
  )
}

const getRenewalDuration = (contract) => {
  if (!contract?.startDate || !contract?.endDate) return '-'
  const start = new Date(`${contract.startDate}T00:00:00`)
  const end = new Date(`${contract.endDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '-'
  const days = Math.max(Math.round((end - start) / 86_400_000) + 1, 0)
  return `${days} days`
}

const getPricingLabel = (pricingType) =>
  ({
    FIXED_MONTHLY: 'Fixed monthly rent',
    PER_SQUARE_METER_MONTHLY: 'Per square meter / month',
    NEGOTIATED: 'Negotiated monthly rent',
  })[pricingType] || pricingType || 'Not specified'

const RenewalReviewModal = ({
  isOpen,
  contract,
  previousContract,
  onClose,
  onConfirm,
  onRequestChanges,
  onViewContract,
}) => {
  useEscapeKey(isOpen, onClose)

  const [step, setStep] = useState(0)
  const [accepted, setAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep(0)
    setAccepted(false)
    setSubmitting(false)
    setError('')
  }, [contract, isOpen])

  if (!isOpen || !contract) return null

  const steps = [
    { label: 'Overview', caption: 'Compare the contract timeline', icon: CalendarDays },
    { label: 'Terms', caption: 'Review rent and warehouse terms', icon: FileCheck2 },
    { label: 'Confirmation', caption: 'Accept the renewal request', icon: ShieldCheck },
  ]

  const handleNext = () => {
    setError('')
    setStep((current) => Math.min(current + 1, steps.length - 1))
  }

  const handleBack = () => {
    setError('')
    setStep((current) => Math.max(current - 1, 0))
  }

  const handleConfirm = async () => {
    if (!accepted) {
      setError('Please confirm that you have reviewed and accepted the renewal terms.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await onConfirm(contract.id)
      onClose()
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Could not confirm this renewal. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="renewal-review-title"
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <header className="border-b border-slate-200 bg-gradient-to-br from-blue-50 via-white to-slate-50 px-5 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold tracking-[0.12em] text-blue-700 uppercase">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Contract renewal
              </div>
              <h2 id="renewal-review-title" className="mt-2 text-xl font-bold text-slate-950">
                Review renewal request
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Review the proposed terms before continuing the warehouse agreement.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label="Close renewal review"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white hover:text-slate-700 disabled:opacity-50"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <ol className="mt-6 grid grid-cols-3 gap-2">
            {steps.map((item, index) => {
              const Icon = item.icon
              const isCurrent = index === step
              const isComplete = index < step
              return (
                <li key={item.label} className="min-w-0">
                  <div
                    className={`flex items-center gap-2 border-b-2 pb-2 ${
                      isCurrent
                        ? 'border-blue-600 text-blue-700'
                        : isComplete
                          ? 'border-emerald-500 text-emerald-700'
                          : 'border-slate-200 text-slate-400'
                    }`}
                  >
                    <span
                      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isCurrent
                          ? 'bg-blue-600 text-white'
                          : isComplete
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isComplete ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold sm:text-sm">{item.label}</span>
                      <span className="hidden truncate text-[11px] text-slate-500 sm:block">
                        {item.caption}
                      </span>
                    </span>
                  </div>
                </li>
              )
            })}
          </ol>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          {step === 0 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold tracking-[0.08em] text-blue-700 uppercase">
                      Renewal proposal
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-slate-950">
                      {contract.warehouseName || 'Warehouse'}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Proposed by {contract.ownerName || 'the warehouse owner'}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
                    <Clock3 className="h-3.5 w-3.5" />
                    Awaiting your review
                  </span>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold tracking-[0.08em] text-slate-500 uppercase">
                    Current contract
                  </p>
                  <p className="mt-3 text-sm font-semibold text-slate-900">
                    {formatContractDate(previousContract?.startDate)} →{' '}
                    {formatContractDate(previousContract?.endDate)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Ends on {formatContractDate(previousContract?.endDate)}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <p className="text-xs font-bold tracking-[0.08em] text-emerald-700 uppercase">
                    Renewal period
                  </p>
                  <p className="mt-3 text-sm font-semibold text-slate-900">
                    {formatContractDate(contract.startDate)} → {formatContractDate(contract.endDate)}
                  </p>
                  <p className="mt-1 text-xs text-emerald-700">
                    Continuous renewal · {getRenewalDuration(contract)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                <p>
                  Your current warehouse access remains unchanged until the renewal start date.
                  Confirming early schedules the next contract without interrupting your workspace.
                </p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold tracking-[0.08em] text-slate-500 uppercase">
                    Monthly rent
                  </p>
                  <p className="mt-2 text-xl font-bold text-slate-950">
                    {formatVND(contract.finalMonthlyRent || 0)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{getPricingLabel(contract.pricingType)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold tracking-[0.08em] text-slate-500 uppercase">
                    Contract duration
                  </p>
                  <p className="mt-2 text-xl font-bold text-slate-950">
                    {getRenewalDuration(contract)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    From {formatContractDate(contract.startDate)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold tracking-[0.08em] text-slate-500 uppercase">
                  Leased warehouse space
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-slate-500">Area</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {contract.leasedAreaM2 ? `${contract.leasedAreaM2} m²` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Width</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {contract.leasedWidth ? `${contract.leasedWidth} m` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Length</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {contract.leasedLength ? `${contract.leasedLength} m` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Height</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {contract.leasedHeight ? `${contract.leasedHeight} m` : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {contract.ownerNote && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <p className="text-xs font-bold tracking-[0.08em] text-blue-700 uppercase">
                    Owner note
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {contract.ownerNote}
                  </p>
                </div>
              )}

              {contract.paperContractFiles?.length > 0 && (
                <button
                  type="button"
                  onClick={() => onViewContract(contract.paperContractFiles)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/50"
                >
                  <span className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">
                        View renewal documents
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {contract.paperContractFiles.length} document
                        {contract.paperContractFiles.length === 1 ? '' : 's'} attached
                      </span>
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                  <div>
                    <p className="font-bold text-emerald-900">Everything is ready to confirm</p>
                    <p className="mt-1 text-sm leading-6 text-emerald-800">
                      The renewal will be scheduled for the proposed period. Your current contract,
                      layout, inventory, and staff access remain active until the transition date.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold tracking-[0.08em] text-slate-500 uppercase">
                  Final summary
                </p>
                <dl className="mt-3 divide-y divide-slate-100 text-sm">
                  <div className="flex items-center justify-between gap-4 py-2">
                    <dt className="text-slate-500">Warehouse</dt>
                    <dd className="text-right font-semibold text-slate-900">
                      {contract.warehouseName || '-'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2">
                    <dt className="text-slate-500">Renewal period</dt>
                    <dd className="text-right font-semibold text-slate-900">
                      {formatContractDate(contract.startDate)} → {formatContractDate(contract.endDate)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2">
                    <dt className="text-slate-500">Monthly rent</dt>
                    <dd className="text-right font-semibold text-slate-900">
                      {formatVND(contract.finalMonthlyRent || 0)}
                    </dd>
                  </div>
                </dl>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-blue-300">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(event) => {
                    setAccepted(event.target.checked)
                    setError('')
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600"
                />
                <span className="text-sm leading-6 text-slate-700">
                  I confirm that I have reviewed the renewal dates, rent, warehouse area, and
                  attached documents, and I agree to continue with this contract.
                </span>
              </label>

              <p className="text-xs leading-5 text-slate-500">
                Need a correction? You can request changes instead of confirming this renewal.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
              {error}
            </div>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="min-h-10 rounded-lg px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-white hover:text-slate-900 disabled:opacity-50"
            >
              Cancel
            </button>
            {step === 2 && onRequestChanges && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onRequestChanges(contract.id)
                }}
                disabled={submitting}
                className="min-h-10 rounded-lg border border-amber-200 bg-white px-3 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-50"
              >
                Request changes
              </button>
            )}
          </div>
          <div className="flex justify-end gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={submitting}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            )}
            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? 'Confirming...' : 'Confirm renewal'}
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  )
}

const TenantContractsPage = () => {
  const confirmDialog = useConfirmDialog()
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)

  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [reasonModalOpen, setReasonModalOpen] = useState(false)
  const [reasonAction, setReasonAction] = useState(null)
  const [selectedContractId, setSelectedContractId] = useState(null)
  const [renewalReviewContract, setRenewalReviewContract] = useState(null)
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

  const contractSummary = useMemo(
    () => ({
      total: contracts.length,
      active: contracts.filter((contract) => contract.status === 'ACTIVE').length,
      expiringSoon: contracts.filter(isExpiringSoon).length,
    }),
    [contracts]
  )

  const nearestExpiringContract = useMemo(
    () =>
      contracts.filter(isExpiringSoon).sort((a, b) => getDaysUntilEnd(a) - getDaysUntilEnd(b))[0] ||
      null,
    [contracts]
  )

  const confirmContractRequest = async (id) => {
    await contractApi.confirm(id)
    toast.success('Contract confirmed and activated.')
    await fetchContracts()
  }

  const handleConfirmContract = async (contract) => {
    if (contract?.renewedFromContractId) {
      setRenewalReviewContract(contract)
      return
    }

    const confirmed = await confirmDialog({
      title: 'Confirm contract',
      message: 'Are you sure you want to confirm this contract?',
      confirmText: 'Confirm contract',
    })
    if (!confirmed) return

    try {
      await confirmContractRequest(contract.id)
    } catch (error) {
      showApiErrorToast(error, 'Could not confirm contract.')
    }
  }

  const openRequestChanges = (id) => {
    setSelectedContractId(id)
    setReasonAction('request-changes')
    setReasonModalOpen(true)
  }

  const handleViewContract = (imageUrlRaw) => {
    try {
      if (!imageUrlRaw) throw new Error('No image')
      const imageArray = Array.isArray(imageUrlRaw) ? imageUrlRaw : [imageUrlRaw]
      if (!imageArray || imageArray.length === 0) throw new Error('Invalid URL')
      setViewerImages(imageArray)
      setViewerOpen(true)
    } catch {
      toast.error('Contract file unavailable.')
    }
  }

  const getActions = (contract) =>
    [
      contract.paperContractFiles?.length > 0 && {
        label: 'View paper contract',
        icon: FileText,
        onClick: () => handleViewContract(contract.paperContractFiles),
      },
      contract.canViewLayout && {
        label: 'View warehouse layout',
        icon: Eye,
        onClick: () => window.open(`/tenant/contracts/${contract.id}/layout`, '_blank'),
      },
      contract.canConfirm && {
        label: contract.renewedFromContractId ? 'Review renewal' : 'Confirm contract',
        icon: contract.renewedFromContractId ? RefreshCw : CheckCircle,
        onClick: () => handleConfirmContract(contract),
      },
      contract.canRequestChanges && {
        label: 'Request changes',
        icon: Edit3,
        onClick: () => openRequestChanges(contract.id),
      },
      contract.canReject && {
        label: 'Reject contract',
        icon: X,
        onClick: () => {
          setSelectedContractId(contract.id)
          setReasonAction('reject')
          setReasonModalOpen(true)
        },
        danger: true,
      },
      contract.canManageWms && {
        label: 'Open WMS',
        icon: PackageOpen,
        onClick: () =>
          window.open(`/tenant/inventory?warehouseId=${contract.warehouseId}`, '_blank'),
      },
    ].filter(Boolean)

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header />
      <div className="md:hidden">
        {isMobileOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-slate-900/40"
            onClick={() => dispatch(closeMobileSidebar())}
          />
        )}
      </div>

      <div className="flex pt-14">
        <Sidebar currentRole="TENANT" />
        <div
          className={`flex min-w-0 flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
          }`}
        >
          <main className="max-w-1600px mx-auto w-full space-y-5 px-4 py-6 sm:px-6 md:py-8 lg:px-8">
            <header className="flex flex-col gap-5 border-b border-slate-300 pb-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
                  <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                  Tenant operations
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                  My Contracts
                </h1>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">
                  Manage and track your warehouse rental contracts.
                </p>
              </div>

              <dl className="grid grid-cols-3 divide-x divide-slate-200 border border-slate-200 bg-white text-left">
                <div className="min-w-104px px-3 py-2.5 sm:px-4">
                  <dt className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
                    Total contracts
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-slate-950 tabular-nums">
                    {loading ? '-' : contractSummary.total}
                  </dd>
                </div>
                <div className="min-w-104px px-3 py-2.5 sm:px-4">
                  <dt className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
                    Active
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-emerald-700 tabular-nums">
                    {loading ? '-' : contractSummary.active}
                  </dd>
                </div>
                <div className="min-w-104px px-3 py-2.5 sm:px-4">
                  <dt className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
                    Expiring soon
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-amber-700 tabular-nums">
                    {loading ? '-' : contractSummary.expiringSoon}
                  </dd>
                </div>
              </dl>
            </header>

            {nearestExpiringContract && (
              <aside
                role="status"
                className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
                  getDaysUntilEnd(nearestExpiringContract) <= 7
                    ? 'border-rose-200 bg-rose-50 text-rose-900'
                    : 'border-amber-200 bg-amber-50 text-amber-900'
                }`}
              >
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {getDaysUntilEnd(nearestExpiringContract) <= 7
                      ? 'Contract expiring soon'
                      : 'Contract requires attention'}
                  </p>
                  <p className="mt-0.5 text-sm opacity-85">
                    {nearestExpiringContract.warehouseName || 'Unknown warehouse'} ·{' '}
                    {getDaysUntilEnd(nearestExpiringContract)} days remaining, until{' '}
                    {formatContractDate(nearestExpiringContract.endDate)}.
                  </p>
                </div>
              </aside>
            )}

            <section
              aria-labelledby="contract-records-heading"
              aria-busy={loading}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs"
            >
              <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <h2
                    id="contract-records-heading"
                    className="text-sm font-semibold text-slate-950"
                  >
                    Contract list
                  </h2>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  {loading ? 'Loading contracts' : `${contracts.length} contracts displayed`}
                </span>
              </div>

              <div className="overflow-x-auto">
                {loading ? (
                  <div className="min-w-1060px divide-y divide-slate-200" aria-hidden="true">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-[170px_180px_minmax(200px,1fr)_150px_190px_130px_64px] items-center gap-5 px-5 py-4"
                      >
                        {Array.from({ length: 7 }).map((__, cellIndex) => (
                          <span
                            key={cellIndex}
                            className="h-4 animate-pulse rounded bg-slate-200"
                            style={{ width: `${cellIndex === 2 ? 85 : 65}%` }}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                ) : contracts.length > 0 ? (
                  <table className="min-w-1060px w-full text-left text-sm">
                    <caption className="sr-only">Warehouse rental contracts</caption>
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold tracking-[0.08em] text-slate-600 uppercase">
                      <tr>
                        <th scope="col" className="px-5 py-3">
                          Owner
                        </th>
                        <th scope="col" className="px-5 py-3">
                          Warehouse
                        </th>
                        <th scope="col" className="px-5 py-3 text-right">
                          Rent
                        </th>
                        <th scope="col" className="px-5 py-3">
                          Term
                        </th>
                        <th scope="col" className="px-5 py-3">
                          Status
                        </th>
                        <th scope="col" className="px-5 py-3 text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {contracts.map((contract) => {
                        const statusMeta = getStatusMeta(contract.status)
                        const actions = getActions(contract)
                        return (
                          <tr key={contract.id} className="transition-colors hover:bg-slate-50">
                            <td className="px-5 py-3.5 align-middle">
                              <p className="font-semibold text-slate-900">
                                {contract.ownerName || '-'}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">Warehouse owner</p>
                            </td>
                            <td className="px-5 py-3.5 align-middle">
                              <p className="max-w-72 truncate font-semibold text-slate-900">
                                {contract.warehouseName || '-'}
                              </p>
                              <p className="mt-1 max-w-72 truncate text-xs text-slate-500">
                                {contract.warehouseAddress || 'No warehouse address'}
                              </p>
                            </td>
                            <td className="px-5 py-3.5 text-right align-middle">
                              <p className="font-semibold text-slate-950 tabular-nums">
                                {formatVND(contract.finalMonthlyRent || 0)}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">/ month</p>
                            </td>
                            <td className="px-5 py-3.5 align-middle">
                              <p className="font-medium text-slate-800 tabular-nums">
                                {formatContractDate(contract.startDate)}{' '}
                                <span className="px-1 text-slate-400">→</span>{' '}
                                {formatContractDate(contract.endDate)}
                              </p>
                              {contract.status === 'EXPIRED' ? (
                                <p className="mt-1 text-xs font-medium text-rose-700">Expired</p>
                              ) : (
                                (() => {
                                  const daysUntilEnd = getDaysUntilEnd(contract)
                                  if (
                                    daysUntilEnd === null ||
                                    daysUntilEnd < 0 ||
                                    daysUntilEnd > 30
                                  ) {
                                    return null
                                  }
                                  return (
                                    <p
                                      className={`mt-1 text-xs font-medium ${daysUntilEnd <= 7 ? 'text-rose-700' : 'text-amber-700'}`}
                                    >
                                      {daysUntilEnd === 0
                                        ? 'Expires today'
                                        : `${daysUntilEnd} days remaining`}
                                    </p>
                                  )
                                })()
                              )}
                            </td>
                            <td className="px-5 py-3.5 align-middle">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-semibold ${statusMeta.className}`}
                              >
                                <span
                                  className="h-1.5 w-1.5 rounded-full bg-current opacity-80"
                                  aria-hidden="true"
                                />
                                {statusMeta.label}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right align-middle">
                              <TableActionMenu
                                label={`Actions for ${formatContractReference(contract.id)}`}
                                items={actions}
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
                    <FileText className="h-7 w-7 text-slate-400" aria-hidden="true" />
                    <h3 className="mt-3 text-sm font-semibold text-slate-800">No contracts yet</h3>
                    <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                      You do not have any warehouse rental contracts to track.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </main>
        </div>
      </div>

      <RenewalReviewModal
        isOpen={Boolean(renewalReviewContract)}
        contract={renewalReviewContract}
        previousContract={
          renewalReviewContract?.renewedFromContractId
            ? contracts.find(
                (contract) =>
                  String(contract.id) === String(renewalReviewContract.renewedFromContractId)
              )
            : null
        }
        onClose={() => setRenewalReviewContract(null)}
        onConfirm={confirmContractRequest}
        onRequestChanges={openRequestChanges}
        onViewContract={handleViewContract}
      />

      <ReasonModal
        isOpen={reasonModalOpen}
        title={reasonAction === 'reject' ? 'Reject contract' : 'Request changes'}
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
