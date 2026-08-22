import { useEffect, useMemo, useState } from 'react'
import { FormShell } from '@/form/FormControls'
import useEscapeKey from '@/hooks/useEscapeKey'
import { useDispatch, useSelector } from 'react-redux'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Eye,
  FileText,
  Loader2,
  MapPin,
  Save,
  ShieldCheck,
  User,
  Warehouse,
  X,
  XCircle,
} from 'lucide-react'
import { HiBars3 } from 'react-icons/hi2'
import logoDaidien from '../../../assets/logoDaidien.png'
import Badge from '../../../components/atoms/Badge'
import Sidebar from '../../../components/SideBar'
import { closeMobileSidebar, toggleSidebar } from '../../../store/uiSlide'
import {
  clearActionError,
  fetchAssignedInspections,
  setPage,
  submitReport,
} from '../../../store/inspectorManagement'
import { validateInspectionResult } from '@/config/validation'

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-US') : '---')

const shortId = (value) => (value ? `#${String(value).slice(0, 8).toUpperCase()}` : '---')

const getInspectionDate = (inspection) =>
  inspection?.inspectionDate ||
  inspection?.scheduledAt ||
  inspection?.appointmentDate ||
  inspection?.createdAt ||
  null

const getOwnerName = (inspection) =>
  inspection?.ownerName || inspection?.warehouseOwnerName || inspection?.createdByName || 'Not updated'

const getAddress = (inspection) =>
  inspection?.warehouseAddress || inspection?.address || inspection?.location || 'No address available'

const getSummaryText = (inspection) =>
  inspection?.reportNotes ||
  inspection?.notes ||
  inspection?.description ||
  inspection?.inspectionNote ||
  'No additional description is available.'

const STATUS_CONFIG = {
  ALL: { label: 'All', variant: 'outline' },
  PENDING: { label: 'Pending', variant: 'warning' },
  IN_PROGRESS: { label: 'In Progress', variant: 'primary' },
  PASSED: { label: 'Passed', variant: 'success' },
  FAILED: { label: 'Failed', variant: 'danger' },
}

const CHECKLIST_ITEMS = [
  { key: 'fireSafety', label: 'Fire safety system is compliant' },
  { key: 'electrical', label: 'Electrical and lighting systems operate correctly' },
  { key: 'structure', label: 'Warehouse structure is stable' },
  { key: 'cleanliness', label: 'Cleanliness and environment meet requirements' },
]

const StatCard = ({ title, value, hint, icon: Icon, tone = 'slate' }) => {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-100 text-blue-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    rose: 'bg-rose-100 text-rose-700',
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{hint}</p>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone] || tones.slate}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

const InspectionDetailModal = ({ inspection, onClose, onOpenSubmit }) => {
  useEscapeKey(Boolean(inspection), onClose)
  if (!inspection) return null

  const statusConfig = STATUS_CONFIG[inspection.status] || STATUS_CONFIG.ALL
  const canSubmit = inspection.status === 'PENDING' || inspection.status === 'IN_PROGRESS'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold text-slate-900">{inspection.warehouseName}</h2>
                <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
              </div>
              <p className="mt-2 font-mono text-xs text-slate-400">{shortId(inspection.id)}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.35fr_0.95fr]">
          <section className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Inspection Details</h3>
              <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Warehouse className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-500">Warehouse</p>
                    <p className="mt-1 font-semibold text-slate-900">{inspection.warehouseName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-500">Warehouse Owner</p>
                    <p className="mt-1 font-semibold text-slate-900">{getOwnerName(inspection)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 md:col-span-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-500">Address</p>
                    <p className="mt-1 font-semibold text-slate-900">{getAddress(inspection)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-500">Scheduled / Created</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {formatDate(getInspectionDate(inspection))}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-500">Last Updated</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {formatDate(inspection.updatedAt || inspection.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Description and Existing Notes</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{getSummaryText(inspection)}</p>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Inspection Guidelines</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Verify the warehouse condition, compare it with the registration details, and
                    document any issues that affect the inspection result.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Actions</h3>
              <div className="mt-4 space-y-3">
                <button
                  onClick={() => {
                    onClose()
                    onOpenSubmit(inspection)
                  }}
                  disabled={!canSubmit}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                >
                  <FileText className="h-4 w-4" />
                  {canSubmit ? 'Create Inspection Report' : 'Inspection Completed'}
                </button>
                <p className="text-xs leading-5 text-slate-500">
                  After submission, the inspection will be updated to passed or failed.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </motion.div>
    </div>
  )
}

const SubmitReportModal = ({ inspection, onClose }) => {
  useEscapeKey(Boolean(inspection), onClose)
  const dispatch = useDispatch()
  const { actionLoading, actionError } = useSelector((state) => state.inspectorManagement)
  const [status, setStatus] = useState(inspection.status === 'FAILED' ? 'FAILED' : 'PASSED')
  const [notes, setNotes] = useState('')
  const [localError, setLocalError] = useState('')
  const [checklist, setChecklist] = useState({
    fireSafety: true,
    electrical: true,
    structure: true,
    cleanliness: true,
  })

  useEffect(() => {
    dispatch(clearActionError())
  }, [dispatch])

  const passedCount = Object.values(checklist).filter(Boolean).length

  const toggleChecklist = (key) => {
    setChecklist((current) => ({ ...current, [key]: !current[key] }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validationError = validateInspectionResult({
      notes,
      status,
      passedCount,
      checklistLength: CHECKLIST_ITEMS.length,
    })
    if (validationError) {
      setLocalError(validationError)
      return
    }

    const result = await dispatch(
      submitReport({
        id: inspection.id,
        payload: {
          status,
          reportNotes: notes.trim(),
        },
      })
    )

    if (submitReport.fulfilled.match(result)) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Create Inspection Report</h2>
              <p className="mt-1 text-sm text-slate-500">
                {inspection.warehouseName} · {shortId(inspection.id)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <FormShell onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <div>
                <label className="mb-3 block text-sm font-semibold text-slate-800">
                  Inspection Result
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setStatus('PASSED')}
                    className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                      status === 'PASSED'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <CheckCircle2 className="h-4 w-4" />
                      Passed
                    </div>
                    <p className="mt-2 text-xs leading-5">
                      Select when every checklist item passes and the warehouse can be approved.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('FAILED')}
                    className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                      status === 'FAILED'
                        ? 'border-rose-300 bg-rose-50 text-rose-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <XCircle className="h-4 w-4" />
                      Failed
                    </div>
                    <p className="mt-2 text-xs leading-5">
                      Select when an item is noncompliant and the owner must make corrections.
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Report / Detailed Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={7}
                  placeholder="Describe the current condition, verified details, passed items, and required corrections..."
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition-colors focus:border-blue-400 focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900">Inspection Checklist</h3>
                  <Badge variant="outline">{passedCount}/{CHECKLIST_ITEMS.length}</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {CHECKLIST_ITEMS.map((item) => (
                    <label
                      key={item.key}
                      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={checklist[item.key]}
                        onChange={() => toggleChecklist(item.key)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300"
                      />
                      <span className="leading-5">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-slate-600">
                Selecting <span className="font-semibold text-slate-900">Passed</span> requires
                every checklist item to pass. Otherwise, select{' '}
                <span className="font-semibold text-slate-900">Failed</span> and explain why.
              </div>
            </div>
          </div>

          {(localError || actionError) && (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{localError || actionError}</span>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Inspection Result
            </button>
          </div>
        </FormShell>
      </motion.div>
    </div>
  )
}

const InspectorInspectionsPage = () => {
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  const { inspections, loading, error, page, size, totalPages, totalElements } = useSelector(
    (state) => state.inspectorManagement
  )

  const [statusFilter, setStatusFilter] = useState('ALL')
  const [detailInspection, setDetailInspection] = useState(null)
  const [submitInspection, setSubmitInspection] = useState(null)

  useEffect(() => {
    dispatch(fetchAssignedInspections({ page, size }))
  }, [dispatch, page, size])

  const filteredInspections = useMemo(() => {
    if (statusFilter === 'ALL') return inspections
    return inspections.filter((inspection) => inspection.status === statusFilter)
  }, [inspections, statusFilter])

  const stats = useMemo(() => {
    const pending = inspections.filter((inspection) => inspection.status === 'PENDING').length
    const inProgress = inspections.filter((inspection) => inspection.status === 'IN_PROGRESS').length
    const passed = inspections.filter((inspection) => inspection.status === 'PASSED').length
    const failed = inspections.filter((inspection) => inspection.status === 'FAILED').length

    return { pending, inProgress, passed, failed }
  }, [inspections])

  const openSubmitModal = (inspection) => {
    setDetailInspection(null)
    setSubmitInspection(inspection)
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="rounded-full p-2 text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200"
          >
            <HiBars3 className="h-6 w-6" />
          </button>

          <div className="flex items-center gap-2">
            <div className="shrink-0 rounded-lg bg-white p-1.5">
              <a href="/" aria-label="Back to landing page">
                <img src={logoDaidien} alt="Logo" className="h-10 w-16 object-contain" />
              </a>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-950">
              StockSpace Inspector
            </span>
          </div>
        </div>
      </header>

      <div className="md:hidden">
        {isMobileOpen && (
          <button
            className="fixed inset-0 z-40 bg-slate-900/30"
            onClick={() => dispatch(closeMobileSidebar())}
          />
        )}
      </div>

      <div className="flex pt-14">
        <Sidebar currentRole="INSPECTOR" />

        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
          }`}
        >
          <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
            <section className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-6 py-7 text-white shadow-sm">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Inspection Workspace
                  </div>
                  <h1 className="mt-4 text-3xl font-bold tracking-tight">
                    Warehouse Inspection Workspace
                  </h1>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Track assigned inspections, review warehouse details, and submit inspection
                    reports from one workspace.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Total</p>
                    <p className="mt-2 text-2xl font-bold">{totalElements || inspections.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Pending</p>
                    <p className="mt-2 text-2xl font-bold">{stats.pending}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-300">In Progress</p>
                    <p className="mt-2 text-2xl font-bold">{stats.inProgress}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Completed</p>
                    <p className="mt-2 text-2xl font-bold">{stats.passed + stats.failed}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
              <StatCard
                title="Pending"
                value={stats.pending}
                hint="New inspections awaiting initial review."
                icon={ClipboardCheck}
                tone="blue"
              />
              <StatCard
                title="In Progress"
                value={stats.inProgress}
                hint="Inspections currently being processed."
                icon={Clock3}
                tone="slate"
              />
              <StatCard
                title="Passed"
                value={stats.passed}
                hint="Warehouses that meet approval requirements."
                icon={CheckCircle2}
                tone="emerald"
              />
              <StatCard
                title="Failed"
                value={stats.failed}
                hint="Inspections requiring additional corrections."
                icon={XCircle}
                tone="rose"
              />
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Assigned Inspections</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Select an inspection to view its details and create a report.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                    const active = statusFilter === key
                    return (
                      <button
                        key={key}
                        onClick={() => setStatusFilter(key)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                          active
                            ? 'bg-slate-900 text-white'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {config.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {error && (
                <div className="mt-5 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                {loading ? (
                  <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-slate-500">
                    <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
                    <p className="text-sm">Loading inspections...</p>
                  </div>
                ) : filteredInspections.length === 0 ? (
                  <div className="px-6 py-20 text-center">
                    <p className="text-base font-semibold text-slate-900">
                      No inspections match the current filter.
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      Try another status filter or wait for new assignments.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px] text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide">
                            Inspection
                          </th>
                          <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide">
                            Warehouse
                          </th>
                          <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide">
                            Owner
                          </th>
                          <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide">
                            Scheduled / Created
                          </th>
                          <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide">
                            Status
                          </th>
                          <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredInspections.map((inspection) => {
                          const statusConfig =
                            STATUS_CONFIG[inspection.status] || STATUS_CONFIG.ALL
                          const canSubmit =
                            inspection.status === 'PENDING' || inspection.status === 'IN_PROGRESS'

                          return (
                            <motion.tr
                              key={inspection.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="transition-colors hover:bg-slate-50"
                            >
                              <td className="px-5 py-4">
                                <p className="font-mono text-xs font-bold tracking-wide text-slate-500">
                                  {shortId(inspection.id)}
                                </p>
                                <p className="mt-2 text-sm text-slate-600">
                                  Updated: {formatDate(inspection.updatedAt || inspection.createdAt)}
                                </p>
                              </td>
                              <td className="px-5 py-4">
                                <p className="font-semibold text-slate-900">
                                  {inspection.warehouseName}
                                </p>
                                <p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-slate-500">
                                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                  <span>{getAddress(inspection)}</span>
                                </p>
                              </td>
                              <td className="px-5 py-4">
                                <p className="font-medium text-slate-800">
                                  {getOwnerName(inspection)}
                                </p>
                              </td>
                              <td className="px-5 py-4 text-slate-600">
                                {formatDate(getInspectionDate(inspection))}
                              </td>
                              <td className="px-5 py-4">
                                <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setDetailInspection(inspection)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                                  >
                                    <Eye className="h-4 w-4" />
                                    View
                                  </button>
                                  <button
                                    onClick={() => openSubmitModal(inspection)}
                                    disabled={!canSubmit}
                                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                  >
                                    <FileText className="h-4 w-4" />
                                    Report
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {totalPages > 1 && (
                <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-500">
                    Page {page + 1} / {totalPages} · {totalElements.toLocaleString()} inspections
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => dispatch(setPage(page - 1))}
                      disabled={page === 0 || loading}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="min-w-12 text-center text-sm font-semibold text-slate-700">
                      {page + 1}
                    </span>
                    <button
                      onClick={() => dispatch(setPage(page + 1))}
                      disabled={page >= totalPages - 1 || loading}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </section>
          </main>
        </div>
      </div>

      <AnimatePresence>
        {detailInspection && (
          <InspectionDetailModal
            inspection={detailInspection}
            onClose={() => setDetailInspection(null)}
            onOpenSubmit={openSubmitModal}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {submitInspection && (
          <SubmitReportModal
            key={submitInspection.id}
            inspection={submitInspection}
            onClose={() => setSubmitInspection(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default InspectorInspectionsPage
