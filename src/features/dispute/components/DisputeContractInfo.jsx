import { Building2, CalendarDays, FileText, Phone, UserRound } from 'lucide-react'

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '—'

const formatMoney = (value) => {
  if (value == null || value === '') return '—'
  return `${Number(value).toLocaleString('vi-VN')} VND`
}

const shortId = (value) => {
  if (!value) return '—'
  const id = String(value)
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id
}

const parseFiles = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed.filter(Boolean)
  } catch {
    // Some old records contain a single URL or a database array string.
  }
  if (value.startsWith('[') && value.endsWith(']')) {
    return value
      .slice(1, -1)
      .split(',')
      .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean)
  }
  return [value]
}

const InfoCard = ({ label, value, className = '' }) => (
  <div className={`rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 ${className}`}>
    <p className="mb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{label}</p>
    <p className="text-sm font-semibold text-slate-800">{value || '—'}</p>
  </div>
)

const PersonCard = ({ title, id, name, email, phone }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
    <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
      <UserRound size={12} /> {title}
    </p>
    <p className="text-sm font-bold text-slate-800">{name || '—'}</p>
    {id && <p className="mt-1 font-mono text-[10px] text-slate-400">ID: {shortId(id)}</p>}
    {email && <p className="mt-1 break-all text-xs text-slate-500">{email}</p>}
    {phone && (
      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
        <Phone size={11} /> {phone}
      </p>
    )}
  </div>
)

const FileLinks = ({ label, value }) => {
  const files = parseFiles(value)
  if (!files.length) return null

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
        <FileText size={12} /> {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {files.map((file, index) => (
          <a
            key={`${file}-${index}`}
            href={file}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
          >
            View file {index + 1}
          </a>
        ))}
      </div>
    </div>
  )
}

const DisputeContractInfo = ({ dispute, showContractId = false }) => (
  <>
    {showContractId && (
      <InfoCard label="Contract" value={shortId(dispute.contractId)} />
    )}
    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
      <p className="mb-3 flex items-center gap-1 text-xs font-bold tracking-wide text-blue-700 uppercase">
        <Building2 size={14} /> Warehouse information
      </p>
      {dispute.warehouseId && (
        <p className="mb-3 font-mono text-[10px] text-blue-500">ID: {shortId(dispute.warehouseId)}</p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InfoCard label="Warehouse" value={dispute.warehouseName} />
        <InfoCard label="Address" value={dispute.warehouseAddress} />
      </div>
    </div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <InfoCard label="Deposit" value={formatMoney(dispute.depositAmount)} className="flex-1" />
      <InfoCard
        label="Start date"
        value={formatDate(dispute.startDate)}
        className="flex-1"
      />
      <InfoCard label="End date" value={formatDate(dispute.endDate)} className="flex-1" />
    </div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <PersonCard
        title="Tenant"
        id={dispute.tenantId}
        name={dispute.tenantName}
        email={dispute.tenantEmail}
        phone={dispute.tenantPhone}
      />
      <PersonCard
        title="Owner"
        id={dispute.ownerId}
        name={dispute.ownerName}
        email={dispute.ownerEmail}
        phone={dispute.ownerPhone}
      />
    </div>

    {dispute.cancelReason && (
      <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
        <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-amber-700">
          <CalendarDays size={12} /> Initial cancellation reason
        </p>
        <p className="text-sm text-amber-900">{dispute.cancelReason}</p>
      </div>
    )}

    <FileLinks label="Paper contract" value={dispute.paperContractImages} />
    <FileLinks label="Cancellation evidence" value={dispute.cancelEvidence} />
  </>
)

export default DisputeContractInfo
