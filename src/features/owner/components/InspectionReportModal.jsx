import useEscapeKey from '@/hooks/useEscapeKey'
import Badge from '../../../components/atoms/Badge'
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Image as ImageIcon,
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

const getChecklistLabel = (key) =>
  OWNER_INFORMATION_LABELS[key] ||
  GENERAL_CHECKLIST.find((item) => item.key === key)?.label ||
  String(key)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (character) => character.toUpperCase())

const parseChecklist = (value) => {
  if (!value) return {}

  let parsed = value
  for (let attempt = 0; attempt < 2 && typeof parsed === 'string'; attempt += 1) {
    try {
      parsed = JSON.parse(parsed)
    } catch {
      return {}
    }
  }

  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
}

const getChecklistBoolean = (value) => {
  const candidate =
    value && typeof value === 'object' && !Array.isArray(value) && 'verified' in value
      ? value.verified
      : value

  if (typeof candidate === 'boolean') return candidate
  if (typeof candidate !== 'string') return null

  const normalized = candidate.trim().toLowerCase()
  if (['true', 'passed', 'pass', 'yes', 'ok', 'verified'].includes(normalized)) return true
  if (['false', 'failed', 'fail', 'no', 'rejected', 'unverified'].includes(normalized)) return false
  return null
}

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Not available'

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-US')
    : 'Not available'

const getInspectionDate = (inspection) =>
  inspection?.inspectedAt ||
  inspection?.inspectionDate ||
  inspection?.scheduledAt ||
  inspection?.appointmentDate ||
  inspection?.createdAt ||
  null

const getOwnerName = (inspection, warehouse) =>
  inspection?.ownerName ||
  inspection?.warehouseOwnerName ||
  inspection?.createdByName ||
  warehouse?.ownerName ||
  warehouse?.owner?.fullName ||
  warehouse?.owner?.name ||
  'Not available'

const getInspectorName = (inspection) =>
  inspection?.inspectorName ||
  inspection?.inspectorFullName ||
  inspection?.inspector?.fullName ||
  inspection?.inspector?.name ||
  'Not available'

const getWarehouseAddress = (inspection, warehouse) =>
  inspection?.warehouseAddress ||
  inspection?.address ||
  inspection?.location ||
  warehouse?.address ||
  'Not available'

const getDescription = (inspection) =>
  inspection?.notes ||
  inspection?.reportNotes ||
  inspection?.description ||
  inspection?.inspectionNote ||
  'No description was provided.'

const getReportImages = (inspection) => {
  const images =
    inspection?.images ||
    inspection?.reportImages ||
    inspection?.imageUrls ||
    inspection?.reportImageUrls
  if (!Array.isArray(images)) return []

  return images
    .map((image) => (typeof image === 'string' ? image : image?.url || image?.imageUrl))
    .filter(Boolean)
}

const getReason = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) ? value.reason : null

const getChecklistEntries = (checklist) => {
  const knownEntries = GENERAL_CHECKLIST.filter((item) =>
    Object.prototype.hasOwnProperty.call(checklist, item.key)
  )
  const knownKeys = new Set(knownEntries.map((item) => item.key))
  const extraEntries = Object.keys(checklist)
    .filter((key) => key !== 'ownerInformation' && !knownKeys.has(key))
    .map((key) => ({ key, label: getChecklistLabel(key) }))

  return [...knownEntries, ...extraEntries]
}

const getStatusConfig = (status) => {
  const normalized = String(status || '').toUpperCase()
  if (normalized === 'PASSED') {
    return {
      label: 'Passed',
      variant: 'success',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    }
  }
  if (normalized === 'FAILED') {
    return {
      label: 'Failed',
      variant: 'danger',
      className: 'border-rose-200 bg-rose-50 text-rose-700',
    }
  }
  if (normalized === 'IN_PROGRESS') {
    return {
      label: 'In progress',
      variant: 'primary',
      className: 'border-sky-200 bg-sky-50 text-sky-700',
    }
  }
  return {
    label: 'Pending',
    variant: 'warning',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  }
}

const InspectionReportModal = ({ inspection, warehouse, onClose }) => {
  useEscapeKey(Boolean(inspection), onClose)
  if (!inspection) return null

  const normalizedStatus = String(inspection.status || '').toUpperCase()
  const statusConfig = getStatusConfig(normalizedStatus)
  const checklist = parseChecklist(inspection.checklistData)
  const ownerInformation = parseChecklist(checklist.ownerInformation)
  const ownerInformationKeys = Object.keys(OWNER_INFORMATION_LABELS)
  const ownerInformationEntries = [
    ...ownerInformationKeys.map((key) => [key, ownerInformation[key]]),
    ...Object.entries(ownerInformation).filter(([key]) => !ownerInformationKeys.includes(key)),
  ]
  const checklistEntries = getChecklistEntries(checklist)
  const warehouseName = inspection.warehouseName || warehouse?.name || 'Unknown warehouse'
  const warehouseAddress = getWarehouseAddress(inspection, warehouse)
  const ownerName = getOwnerName(inspection, warehouse)
  const inspectorName = getInspectorName(inspection)
  const reportImages = getReportImages(inspection)
  const passedChecklistCount = checklistEntries.filter(
    ({ key }) => getChecklistBoolean(checklist[key]) === true
  ).length

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm"
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
              <Badge
                variant={statusConfig.variant}
                className={`w-fit whitespace-nowrap ${statusConfig.className}`}
              >
                {statusConfig.label}
              </Badge>
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
                  {formatDateTime(getInspectionDate(inspection))}
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
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <p className="font-medium text-slate-500">Last updated</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {formatDate(inspection.updatedAt || inspection.createdAt)}
                </p>
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
              {getDescription(inspection)}
            </p>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Owner Information Check</h3>
            <div className="mt-3 space-y-3">
              {ownerInformationEntries.map(([key, item]) => {
                const result = getChecklistBoolean(item)
                const reason = getReason(item)
                return (
                  <div
                    key={key}
                    className={`rounded-xl border bg-white px-3 py-3 ${
                      result === true
                        ? 'border-emerald-200'
                        : result === false
                          ? 'border-rose-200'
                          : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-2 text-sm">
                      {result === true ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      ) : result === false ? (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                      ) : (
                        <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      )}
                      <span className="font-semibold text-slate-800">
                        {getChecklistLabel(key)}
                      </span>
                      {result === null && (
                        <span className="ml-auto text-xs text-slate-400">Not recorded</span>
                      )}
                    </div>
                    {reason && (
                      <p className="mt-2 pl-6 text-sm leading-5 text-rose-700">{reason}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">Inspection Checklist</h3>
              <span className="text-xs font-semibold text-slate-500">
                {passedChecklistCount}/{checklistEntries.length || GENERAL_CHECKLIST.length} passed
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {(checklistEntries.length ? checklistEntries : GENERAL_CHECKLIST).map((item) => {
                const hasResult = Object.prototype.hasOwnProperty.call(checklist, item.key)
                const result = hasResult ? getChecklistBoolean(checklist[item.key]) : null
                return (
                  <div
                    key={item.key}
                    className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700"
                  >
                    {result === true ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    ) : result === false ? (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                    ) : (
                      <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <span className="min-w-0 flex-1">{item.label}</span>
                    {result === null && (
                      <span className="ml-auto shrink-0 text-xs text-slate-400">Not recorded</span>
                    )}
                    {result === false && getReason(checklist[item.key]) && (
                      <span className="sr-only">{getReason(checklist[item.key])}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {reportImages.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ImageIcon className="h-4 w-4 text-slate-500" />
                Inspection Report Images ({reportImages.length})
              </h3>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {reportImages.map((url, index) => (
                  <a
                    key={`${url}-${index}`}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="group aspect-video overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                  >
                    <img
                      src={url}
                      alt={`Inspection report ${index + 1}`}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none'
                      }}
                    />
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>

        <div
          className={`flex shrink-0 items-center justify-between gap-4 border-t px-6 py-4 ${
            normalizedStatus === 'PASSED'
              ? 'border-emerald-200 bg-emerald-50'
              : normalizedStatus === 'FAILED'
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
          <Badge
            variant={statusConfig.variant}
            className={`w-fit whitespace-nowrap ${statusConfig.className}`}
          >
            {statusConfig.label}
          </Badge>
        </div>
      </div>
    </div>
  )
}

export default InspectionReportModal
