import useEscapeKey from '@/hooks/useEscapeKey'
import Badge from '../../../components/atoms/Badge'
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  MapPin,
  User,
  Warehouse,
  X,
  XCircle,
} from 'lucide-react'

const GENERAL_CHECKLIST = [
  { key: 'fireSafety', label: 'Fire safety system is compliant' },
  { key: 'electrical', label: 'Electrical and lighting systems operate correctly' },
  { key: 'structure', label: 'Warehouse structure is stable' },
  { key: 'cleanliness', label: 'Cleanliness and environment meet requirements' },
]

const OWNER_INFORMATION_LABELS = {
  warehouseName: 'Warehouse name',
  warehouseAddress: 'Warehouse address',
  ownerName: 'Warehouse owner',
  physicalDetails: 'Warehouse type, capacity, dimensions and layout',
  descriptionAndImages: 'Warehouse description and submitted images',
}

const parseChecklist = (value) => {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Not available'

const getStatusConfig = (status) => {
  const normalized = String(status || '').toUpperCase()
  if (normalized === 'PASSED') return { label: 'Passed', variant: 'success' }
  if (normalized === 'FAILED') return { label: 'Failed', variant: 'danger' }
  if (normalized === 'IN_PROGRESS') return { label: 'In progress', variant: 'primary' }
  return { label: 'Pending', variant: 'warning' }
}

const InspectionReportModal = ({ inspection, warehouse, onClose }) => {
  useEscapeKey(Boolean(inspection), onClose)
  if (!inspection) return null

  const statusConfig = getStatusConfig(inspection.status)
  const checklist = parseChecklist(inspection.checklistData)
  const ownerInformation = checklist.ownerInformation || {}
  const warehouseName = inspection.warehouseName || warehouse?.name || 'Unknown warehouse'
  const warehouseAddress = inspection.warehouseAddress || warehouse?.address || 'Not available'
  const ownerName = inspection.ownerName || warehouse?.ownerName || 'Not available'
  const inspectorName = inspection.inspectorName || 'Not available'

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <ClipboardCheck className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold text-slate-900">Inspection Report</h2>
              <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-500">{warehouseName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <p className="font-medium text-slate-500">Inspection date</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {formatDateTime(inspection.inspectedAt || inspection.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <p className="font-medium text-slate-500">Inspector</p>
                <p className="mt-1 font-semibold text-slate-900">{inspectorName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 sm:col-span-2">
              <Warehouse className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <p className="font-medium text-slate-500">Warehouse inspected</p>
                <p className="mt-1 font-semibold text-slate-900">{warehouseName}</p>
                <p className="mt-1 flex items-start gap-1.5 text-slate-600">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  {warehouseAddress}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 sm:col-span-2">
              <User className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <p className="font-medium text-slate-500">Warehouse Owner</p>
                <p className="mt-1 font-semibold text-slate-900">{ownerName}</p>
              </div>
            </div>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Inspection Description</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {inspection.notes || inspection.reportNotes || 'No description was provided.'}
            </p>
          </section>

          {Object.keys(ownerInformation).length > 0 && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Owner Information Check</h3>
              <div className="mt-3 space-y-3">
                {Object.entries(ownerInformation).map(([key, item]) => {
                  const verified = item?.verified !== false
                  return (
                    <div
                      key={key}
                      className={`rounded-xl border bg-white px-3 py-3 ${
                        verified ? 'border-emerald-200' : 'border-rose-200'
                      }`}
                    >
                      <div className="flex items-start gap-2 text-sm">
                        {verified ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                        )}
                        <span className="font-semibold text-slate-800">
                          {OWNER_INFORMATION_LABELS[key] || key}
                        </span>
                      </div>
                      {!verified && item?.reason && (
                        <p className="mt-2 pl-6 text-sm leading-5 text-rose-700">{item.reason}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">Inspection Checklist</h3>
              <span className="text-xs font-semibold text-slate-500">
                {GENERAL_CHECKLIST.filter((item) => checklist[item.key] === true).length}/
                {GENERAL_CHECKLIST.length} passed
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {GENERAL_CHECKLIST.map((item) => {
                const hasResult = Object.prototype.hasOwnProperty.call(checklist, item.key)
                const passed = hasResult && checklist[item.key] === true
                return (
                  <div
                    key={item.key}
                    className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700"
                  >
                    {!hasResult ? (
                      <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-slate-300" />
                    ) : passed ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                    )}
                    <span>{item.label}</span>
                    {!hasResult && <span className="ml-auto text-xs text-slate-400">Not recorded</span>}
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        <div
          className={`flex shrink-0 items-center justify-between gap-4 border-t px-6 py-4 ${
            inspection.status === 'PASSED'
              ? 'border-emerald-200 bg-emerald-50'
              : inspection.status === 'FAILED'
                ? 'border-rose-200 bg-rose-50'
                : 'border-slate-100 bg-slate-50'
          }`}
        >
          <div>
            <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">
              Final result
            </p>
            <p className="mt-1 text-sm text-slate-600">Result recorded by the Inspector</p>
          </div>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>
      </div>
    </div>
  )
}

export default InspectionReportModal
