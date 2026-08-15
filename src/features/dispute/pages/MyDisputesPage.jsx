import { useState, useEffect } from 'react'
import useEscapeKey from '@/hooks/useEscapeKey'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'
import Badge from '@/components/atoms/Badge'
import {
  Scale,
  AlertCircle,
  CheckCircle2,
  FileText,
  User,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Loader2,
  ImageIcon,
} from 'lucide-react'
import disputeApi from '@/services/disputeApi'

// ─── Constants ───────────────────────────────────────────────────────────────
const STATUS_OPTIONS = ['', 'OPEN', 'RESOLVED']

const STATUS_CONFIG = {
  OPEN: { label: 'Open', variant: 'warning', icon: AlertCircle },
  RESOLVED: { label: 'Resolved', variant: 'success', icon: CheckCircle2 },
}

const formatDate = (dt) => (dt ? new Date(dt).toLocaleString('en-US', { hour12: false }) : '—')

// ─── Detail Modal ────────────────────────────────────────────────────────────
const DetailModal = ({ dispute, onClose }) => {
  useEscapeKey(true, onClose)
  const StatusIcon = STATUS_CONFIG[dispute.status]?.icon || AlertCircle

  // Parse evidence images
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
        className="animate-in fade-in zoom-in-95 w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl duration-150"
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
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 text-sm">
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
const MyDisputesPage = ({ currentRole = 'TENANT' }) => {
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)

  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const size = 10

  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedDispute, setSelectedDispute] = useState(null)

  const fetchDisputes = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await disputeApi.getMyDisputes({ page, size })
      const paged = res?.data?.data
      setDisputes(paged?.content || [])
      setTotalPages(paged?.totalPages || 0)
      setTotalElements(paged?.totalElements || 0)
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load dispute list.')
      setDisputes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDisputes()
  }, [page])

  // Client-side filter (search + status)
  const filtered = disputes.filter((d) => {
    if (statusFilter && d.status !== statusFilter) return false
    if (searchText.trim()) {
      const q = searchText.toLowerCase().trim()
      return (
        (d.reason && d.reason.toLowerCase().includes(q)) ||
        (d.raisedByName && d.raisedByName.toLowerCase().includes(q))
      )
    }
    return true
  })

  const openCount = disputes.filter((d) => d.status === 'OPEN').length
  const resolvedCount = disputes.filter((d) => d.status === 'RESOLVED').length

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
        <Sidebar currentRole={currentRole} />

        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
          }`}
        >
          <main className="mx-auto w-full max-w-400 space-y-6 p-6 md:p-8">
            {/* Page header */}
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">My dispute</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Keep track of contract disputes you've submitted.
                  {totalElements > 0 && (
                    <span className="ml-1 font-semibold text-slate-700">
                      ({totalElements} total)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                ⚠️ {error}
              </div>
            )}

            {/* Summary cards */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {[
                {
                  label: 'Total dispute',
                  value: totalElements,
                  icon: Scale,
                  color: 'text-slate-600',
                  bg: 'bg-slate-100',
                },
                {
                  label: 'Open',
                  value: openCount,
                  icon: AlertCircle,
                  color: 'text-amber-600',
                  bg: 'bg-amber-50',
                },
                {
                  label: 'Resolved',
                  value: resolvedCount,
                  icon: CheckCircle2,
                  color: 'text-emerald-600',
                  bg: 'bg-emerald-50',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.bg} ${item.color}`}
                  >
                    <item.icon size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-2xl font-bold text-slate-900">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 md:flex-row">
              <div className="relative w-full md:w-96">
                <Search
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Search by reason or complainant..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-4 pl-9 text-sm transition-all focus:ring-2 focus:ring-blue-200 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter size={14} className="text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s ? STATUS_CONFIG[s]?.label || s : 'All status'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
                  <Loader2 size={28} className="animate-spin text-blue-400" />
                  <span className="text-sm">Loading data...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-20 text-center text-sm text-slate-400">
                  {disputes.length === 0
                    ? "You don't have any disputes yet."
                    : 'There are no disputes that match the filter.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        {['Reason', 'Status', 'Creation date', 'Handler', ''].map((h) => (
                          <th
                            key={h}
                            className="px-5 py-3.5 text-left text-xs font-bold tracking-wide text-slate-500 uppercase"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filtered.map((d) => {
                        const cfg = STATUS_CONFIG[d.status] || {}
                        return (
                          <tr key={d.id} className="group transition-colors hover:bg-slate-50/60">
                            <td className="max-w-50 px-5 py-3.5">
                              <p className="truncate text-slate-600" title={d.reason}>
                                {d.reason || '—'}
                              </p>
                            </td>
                            <td className="px-5 py-3.5">
                              <Badge
                                variant={cfg.variant || 'slate'}
                                size="sm"
                                className="rounded-full"
                              >
                                {cfg.label || d.status}
                              </Badge>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-slate-500">
                              {formatDate(d.createdAt)}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-slate-600">
                                {d.handledByName || 'Not assigned yet'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <button
                                onClick={() => setSelectedDispute(d)}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 opacity-0 transition-all group-hover:opacity-100 hover:bg-slate-50"
                              >
                                Details
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                  <span className="text-sm text-slate-500">
                    Page {page + 1} / {totalPages} · {totalElements} disputes
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0 || loading}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= totalPages - 1 || loading}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedDispute && (
        <DetailModal dispute={selectedDispute} onClose={() => setSelectedDispute(null)} />
      )}
    </div>
  )
}

export default MyDisputesPage
