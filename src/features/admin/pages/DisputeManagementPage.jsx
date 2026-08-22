import React, { useState, useEffect, useMemo } from 'react'
import { FormShell } from '@/form/FormControls'
import useEscapeKey from '@/hooks/useEscapeKey'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchDisputes,
  resolveDispute,
  setPage,
  setStatusFilter,
  clearResolveError,
} from '../../../store/adminDisputeManagement'
import { closeMobileSidebar } from '../../../store/uiSlide' // Đảm bảo đúng uiSlice / uiSlide tùy dự án của bạn
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Scale,
  AlertCircle,
  CheckCircle2,
  FileText,
  User,
  X,
  Loader2,
} from 'lucide-react'
import Badge from '../../../components/atoms/Badge'

// Import Sidebar và Header đồng bộ theo chuẩn layout mới
import Sidebar from '../../../components/SideBar'
import Header from '../../../components/HeaderDashboard'
import DisputeContractInfo from '../../dispute/components/DisputeContractInfo'
import { required } from '@/config/validation'

// ─── Enum / Constants ────────────────────────────────────────────────────────
const STATUS_OPTIONS = ['', 'OPEN', 'RESOLVED']

const STATUS_CONFIG = {
  OPEN: { label: 'Open', variant: 'warning', icon: AlertCircle },
  RESOLVED: { label: 'Resolved', variant: 'success', icon: CheckCircle2 },
}

const DEPOSIT_RESOLUTIONS = [
  { value: 'REFUND_TO_TENANT', label: 'Refund deposit to Tenant' },
  { value: 'FORFEIT_TO_OWNER', label: 'Deposit fine on Owner' },
  { value: 'KEEP_IN_SYSTEM', label: 'Retain the system' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatDate = (dt) => (dt ? new Date(dt).toLocaleString('en-US', { hour12: false }) : '—')

// ─── Resolve Modal ────────────────────────────────────────────────────────────
const ResolveModal = ({ dispute, onClose }) => {
  useEscapeKey(true, onClose)
  const dispatch = useDispatch()
  const { resolving, resolveError } = useSelector((state) => state.adminDispute)

  const [adminNote, setAdminNote] = useState('')
  const [depositResolution, setDepositResolution] = useState('')
  const [localError, setLocalError] = useState(null)

  useEffect(() => {
    dispatch(clearResolveError())
  }, [dispatch])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const noteError = required(adminNote, 'Admin notes')
    if (noteError) {
      setLocalError(noteError)
      return
    }
    const resolutionError = required(depositResolution, 'Deposit handling decision')
    if (resolutionError) {
      setLocalError(resolutionError)
      return
    }
    setLocalError(null)
    const result = await dispatch(
      resolveDispute({ id: dispute.id, adminNote: adminNote.trim(), depositResolution })
    )
    if (resolveDispute.fulfilled.match(result)) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Dispute resolution</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Review the submitted dispute information before resolving it.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-5 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm">
          <p className="mb-1 font-medium text-slate-700">Reason for complaint:</p>
          <p className="text-slate-600">{dispute.reason || '—'}</p>
        </div>

        <FormShell onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Decision to handle deposit <span className="text-rose-500">*</span>
            </label>
            <div className="space-y-2">
              {DEPOSIT_RESOLUTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                    depositResolution === opt.value
                      ? 'border-blue-500 bg-blue-50 text-blue-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="depositResolution"
                    value={opt.value}
                    checked={depositResolution === opt.value}
                    onChange={() => setDepositResolution(opt.value)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm font-medium">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Admin Notes <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={4}
              placeholder="Enter the reason and decide to resolve the dispute..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 transition-colors focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none"
            />
          </div>

          {(localError || resolveError) && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {localError || resolveError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={resolving}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resolving && <Loader2 size={15} className="animate-spin" />}
              Confirm resolution
            </button>
          </div>
        </FormShell>
      </motion.div>
    </div>
  )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const DetailModal = ({ dispute, onClose, onResolveClick }) => {
  useEscapeKey(true, onClose)
  const StatusIcon = STATUS_CONFIG[dispute.status]?.icon || AlertCircle

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl"
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

          {dispute.adminNote && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="mb-1.5 text-xs font-medium text-blue-500">Admin Notes</p>
              <p className="text-blue-800">{dispute.adminNote}</p>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            Close
          </button>
          {dispute.status === 'OPEN' && (
            <button
              onClick={() => {
                onClose()
                onResolveClick(dispute)
              }}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
            >
              <Scale size={15} />
              Solved
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const DisputeManagementPage = () => {
  const dispatch = useDispatch()

  // Lấy trạng thái từ Redux Store chung giống hệt OwnerDashboard mẫu
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)

  const {
    data: disputes,
    loading,
    error,
    page,
    totalPages,
    totalElements,
    size,
    statusFilter,
  } = useSelector((state) => state.adminDispute)

  const [searchText, setSearchText] = useState('')
  const [selectedDispute, setSelectedDispute] = useState(null)
  const [resolveTarget, setResolveTarget] = useState(null)

  useEffect(() => {
    dispatch(fetchDisputes({ page, size, status: statusFilter }))
  }, [dispatch, page, size, statusFilter])

  const filtered = useMemo(() => {
    const q = searchText.toLowerCase().trim()
    if (!q) return disputes
    return disputes.filter(
      (d) =>
        (d.id && d.id.toLowerCase().includes(q)) ||
        (d.contractId && d.contractId.toLowerCase().includes(q)) ||
        (d.raisedByName && d.raisedByName.toLowerCase().includes(q)) ||
        (d.reason && d.reason.toLowerCase().includes(q))
    )
  }, [disputes, searchText])

  const openCount = useMemo(() => disputes.filter((d) => d.status === 'OPEN').length, [disputes])
  const resolvedCount = useMemo(
    () => disputes.filter((d) => d.status === 'RESOLVED').length,
    [disputes]
  )

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header gọn gàng, tự điều phối hành vi */}
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
        {/* Thay đổi quyền sang ADMIN để Sidebar hiển thị đúng menu */}
        <Sidebar currentRole="ADMIN" />

        {/* CONTAINER CHÍNH - Đồng bộ khoảng cách pl-60 và pl-[72px] với tốc độ duration-150 */}
        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-[72px]'
          }`}
        >
          <main className="mx-auto w-full max-w-[1600px] space-y-6 p-6 md:p-8">
            {/* Page header */}
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Dispute Management</h1>
                <p className="mt-1 text-sm text-slate-500">
                  View and resolve contract disputes.
                  {totalElements > 0 && (
                    <span className="ml-1 font-semibold text-slate-700">
                      ({totalElements.toLocaleString()} total)
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

            {/* Filters */}
            <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 md:flex-row">
              <div className="relative w-full md:w-96">
                <Search
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Search by ID, contract, complainant..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-4 pl-9 text-sm transition-all focus:ring-2 focus:ring-blue-200 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter size={14} className="text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => dispatch(setStatusFilter(e.target.value))}
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
                  There are no relevant disputes.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        {['Complainant', 'Reason', 'Status', 'Creation date', ''].map((h) => (
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
                          <motion.tr
                            key={d.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="group transition-colors hover:bg-slate-50/60"
                          >
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                  <User size={13} />
                                </div>
                                <span className="font-medium text-slate-700">
                                  {d.raisedByName || '—'}
                                </span>
                              </div>
                            </td>
                            <td className="max-w-[200px] px-5 py-3.5">
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
                              <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                <button
                                  onClick={() => setSelectedDispute(d)}
                                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                                >
                                  Details
                                </button>
                                {d.status === 'OPEN' && (
                                  <button
                                    onClick={() => setResolveTarget(d)}
                                    className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-600"
                                  >
                                    Solved
                                  </button>
                                )}
                              </div>
                            </td>
                          </motion.tr>
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
                    Page {page + 1} / {totalPages} · {totalElements.toLocaleString()} disputes
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => dispatch(setPage(page - 1))}
                      disabled={page === 0 || loading}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => dispatch(setPage(page + 1))}
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

      {/* Modals Container */}
      <AnimatePresence>
        {selectedDispute && (
          <DetailModal
            dispute={selectedDispute}
            onClose={() => setSelectedDispute(null)}
            onResolveClick={(d) => setResolveTarget(d)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {resolveTarget && (
          <ResolveModal dispute={resolveTarget} onClose={() => setResolveTarget(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

export default DisputeManagementPage
