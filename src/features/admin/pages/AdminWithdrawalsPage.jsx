import React, { useState, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
    fetchWithdrawals,
    approveWithdrawal,
    rejectWithdrawal,
    setPage,
    setStatusFilter,
    clearActionError,
} from '../../../store/adminWithdrawals'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    XCircle,
    Clock,
    Banknote,
    User,
    X,
    Loader2,
    AlertCircle,
} from 'lucide-react'
import { HiBars3 } from 'react-icons/hi2'
import Badge from '../../../components/atoms/Badge'
import Sidebar from '../../../components/SideBar'
import logoDaidien from '../../../assets/logoDaidien.png'

// ─── Enum / Constants từ BE ─────────────────────────────────────────────────
// ApprovalStatus enum: PENDING | APPROVED | REJECTED
const STATUS_OPTIONS = ['', 'PENDING', 'APPROVED', 'REJECTED']

const STATUS_CONFIG = {
    PENDING: { label: 'Chờ duyệt', variant: 'warning', icon: Clock },
    APPROVED: { label: 'Đã duyệt', variant: 'success', icon: CheckCircle2 },
    REJECTED: { label: 'Từ chối', variant: 'danger', icon: XCircle },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatVND = (amount) =>
    amount != null
        ? Number(amount).toLocaleString('vi-VN') + ' ₫'
        : '—'

const formatDate = (dt) =>
    dt ? new Date(dt).toLocaleString('vi-VN', { hour12: false }) : '—'

const shortId = (id) => (id ? `#${String(id).slice(0, 8).toUpperCase()}` : '—')

// ─── Reject Modal ─────────────────────────────────────────────────────────────
const RejectModal = ({ withdrawal, onClose }) => {
    const dispatch = useDispatch()
    const { actionLoading, actionError } = useSelector((state) => state.adminWithdrawals)

    const [adminNotes, setAdminNotes] = useState('')
    const [localError, setLocalError] = useState(null)

    useEffect(() => {
        dispatch(clearActionError())
    }, [dispatch])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!adminNotes.trim()) {
            setLocalError('Vui lòng nhập lý do từ chối.')
            return
        }
        setLocalError(null)
        const result = await dispatch(rejectWithdrawal({ id: withdrawal.id, adminNotes: adminNotes.trim() }))
        if (rejectWithdrawal.fulfilled.match(result)) {
            onClose()
        }
    }

    const displayError = localError || actionError

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-5 flex items-start justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Từ chối yêu cầu rút tiền</h2>
                        <p className="mt-0.5 text-sm text-slate-500">
                            {shortId(withdrawal.id)} · {formatVND(withdrawal.amount)}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Withdrawal info */}
                <div className="mb-5 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm space-y-1">
                    <p><span className="text-slate-500">Ngân hàng:</span> <span className="font-medium text-slate-800">{withdrawal.bankName || '—'}</span></p>
                    <p><span className="text-slate-500">Số TK:</span> <span className="font-mono font-medium text-slate-800">{withdrawal.bankAccountNumber || '—'}</span></p>
                    <p><span className="text-slate-500">Chủ TK:</span> <span className="font-medium text-slate-800">{withdrawal.bankAccountHolder || '—'}</span></p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                            Lý do từ chối <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            rows={3}
                            placeholder="Nhập lý do từ chối yêu cầu rút tiền..."
                            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 transition-colors focus:border-rose-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-100"
                        />
                    </div>

                    {displayError && (
                        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{displayError}</p>
                    )}

                    <div className="flex justify-end gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={actionLoading}
                            className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {actionLoading && <Loader2 size={15} className="animate-spin" />}
                            Xác nhận từ chối
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const DetailModal = ({ withdrawal, onClose, onApprove, onReject }) => {
    const { actionLoading } = useSelector((state) => state.adminWithdrawals)
    const StatusIcon = STATUS_CONFIG[withdrawal.status]?.icon || Clock

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-5 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Banknote size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Chi tiết yêu cầu rút tiền</h2>
                            <p className="text-xs text-slate-400">{shortId(withdrawal.id)}</p>
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
                    {/* Status */}
                    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <span className="font-medium text-slate-600">Trạng thái</span>
                        <Badge variant={STATUS_CONFIG[withdrawal.status]?.variant || 'slate'} size="sm" className="rounded-full">
                            <StatusIcon size={12} className="mr-1 inline" />
                            {STATUS_CONFIG[withdrawal.status]?.label || withdrawal.status}
                        </Badge>
                    </div>

                    {/* Amount */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="mb-1 text-xs text-slate-400">Số tiền rút</p>
                        <p className="text-xl font-bold text-slate-900">{formatVND(withdrawal.amount)}</p>
                    </div>

                    {/* Bank info */}
                    <div className="grid grid-cols-1 gap-3">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="mb-1 text-xs text-slate-400">Ngân hàng</p>
                            <p className="font-semibold text-slate-800">{withdrawal.bankName || '—'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                                <p className="mb-1 text-xs text-slate-400">Số tài khoản</p>
                                <p className="font-mono font-semibold text-slate-800">{withdrawal.bankAccountNumber || '—'}</p>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                                <p className="mb-1 text-xs text-slate-400">Chủ tài khoản</p>
                                <p className="font-semibold text-slate-800">{withdrawal.bankAccountHolder || '—'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="mb-1 text-xs text-slate-400">Ngày tạo</p>
                            <p className="text-slate-700">{formatDate(withdrawal.createdAt)}</p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="mb-1 text-xs text-slate-400">Cập nhật</p>
                            <p className="text-slate-700">{formatDate(withdrawal.updatedAt)}</p>
                        </div>
                    </div>

                    {/* Admin notes */}
                    {withdrawal.adminNotes && (
                        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                            <p className="mb-1.5 text-xs text-blue-500 font-medium">Ghi chú Admin</p>
                            <p className="text-blue-800">{withdrawal.adminNotes}</p>
                        </div>
                    )}

                    {/* Transaction ID */}
                    {withdrawal.transactionId && (
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="mb-1 text-xs text-slate-400">Transaction ID</p>
                            <p className="font-mono text-xs text-slate-600">{withdrawal.transactionId}</p>
                        </div>
                    )}
                </div>

                <div className="mt-5 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                    >
                        Đóng
                    </button>
                    {withdrawal.status === 'PENDING' && (
                        <>
                            <button
                                onClick={() => { onClose(); onReject(withdrawal) }}
                                className="flex items-center gap-2 rounded-xl border border-rose-200 px-5 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                            >
                                <XCircle size={15} />
                                Từ chối
                            </button>
                            <button
                                onClick={() => { onClose(); onApprove(withdrawal) }}
                                disabled={actionLoading}
                                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
                            >
                                {actionLoading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                                Duyệt
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const AdminWithdrawalsPage = () => {
    const dispatch = useDispatch()

    // Redux state
    const { isSidebarExpanded } = useSelector((state) => state.ui)
    const {
        data: withdrawals,
        loading,
        error,
        page,
        totalPages,
        totalElements,
        size,
        statusFilter,
        actionLoading,
        actionError,
    } = useSelector((state) => state.adminWithdrawals)

    // Local UI state
    const [searchText, setSearchText] = useState('')
    const [selectedItem, setSelectedItem] = useState(null)   // detail modal
    const [rejectTarget, setRejectTarget] = useState(null)   // reject modal

    // Fetch khi page/size/filter thay đổi
    useEffect(() => {
        dispatch(fetchWithdrawals({ page, size, status: statusFilter }))
    }, [dispatch, page, size, statusFilter])

    // Inline approve (không cần modal)
    const handleApprove = async (w) => {
        await dispatch(approveWithdrawal({ id: w.id, adminNotes: 'Duyệt bởi Admin' }))
    }

    // Client-side search
    const filtered = useMemo(() => {
        const q = searchText.toLowerCase().trim()
        if (!q) return withdrawals
        return withdrawals.filter((w) =>
            (w.id && w.id.toLowerCase().includes(q)) ||
            (w.bankName && w.bankName.toLowerCase().includes(q)) ||
            (w.bankAccountNumber && w.bankAccountNumber.includes(q)) ||
            (w.bankAccountHolder && w.bankAccountHolder.toLowerCase().includes(q))
        )
    }, [withdrawals, searchText])

    // Summary từ data thực trang hiện tại
    const pendingCount = withdrawals.filter((w) => w.status === 'PENDING').length
    const pendingTotal = withdrawals
        .filter((w) => w.status === 'PENDING')
        .reduce((s, w) => s + Number(w.amount ?? 0), 0)
    const approvedTotal = withdrawals
        .filter((w) => w.status === 'APPROVED')
        .reduce((s, w) => s + Number(w.amount ?? 0), 0)

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* TOP HEADER */}
            <header className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
                <div className="flex items-center gap-4">
                    <button className="rounded-full p-2 text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200">
                        <HiBars3 className="h-6 w-6" />
                    </button>
                    <div className="flex cursor-pointer items-center gap-2">
                        <div className="shrink-0 rounded-lg bg-white p-1.5">
                            <img src={logoDaidien} alt="Logo" className="h-10 w-17" />
                        </div>
                        <span className="font-display text-xl font-bold tracking-tight text-slate-950">
                            StockSpace Admin
                        </span>
                    </div>
                </div>
            </header>

            <div className="flex pt-14">
                <Sidebar currentRole="ADMIN" />

                <div
                    className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'}`}
                >
                    <main className="mx-auto w-full max-w-400 space-y-6 p-6 md:p-8">
                        {/* Page header */}
                        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">Yêu cầu Rút tiền</h1>
                                <p className="mt-1 text-sm text-slate-500">
                                    Duyệt và xử lý các yêu cầu rút tiền từ người dùng.
                                    {totalElements > 0 && (
                                        <span className="ml-1 font-semibold text-slate-700">
                                            ({totalElements.toLocaleString()} tổng)
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Error banner */}
                        {(error || actionError) && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                <AlertCircle size={14} className="mr-1.5 inline" />
                                {error || actionError}
                            </div>
                        )}

                        {/* Summary cards — từ data thực trang hiện tại */}
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                            {[
                                {
                                    label: 'Tổng yêu cầu',
                                    value: totalElements,
                                    icon: Banknote,
                                    color: 'text-slate-600',
                                    bg: 'bg-slate-100',
                                    isCount: true,
                                },
                                {
                                    label: 'Chờ duyệt (trang này)',
                                    value: pendingCount,
                                    extra: formatVND(pendingTotal),
                                    icon: Clock,
                                    color: 'text-amber-600',
                                    bg: 'bg-amber-50',
                                    isCount: true,
                                },
                                {
                                    label: 'Đã duyệt (trang này)',
                                    value: formatVND(approvedTotal),
                                    icon: CheckCircle2,
                                    color: 'text-emerald-600',
                                    bg: 'bg-emerald-50',
                                    isCount: false,
                                },
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                                >
                                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${item.bg} ${item.color}`}>
                                        <item.icon size={24} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">{item.label}</p>
                                        <p className="mt-0.5 text-2xl font-bold text-slate-900">{item.value}</p>
                                        {item.extra && <p className="text-xs text-slate-400">{item.extra}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Filters */}
                        <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 md:flex-row">
                            <div className="relative w-full md:w-96">
                                <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Tìm theo ID, ngân hàng, số tài khoản..."
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-4 pl-9 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-200"
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
                                            {s ? STATUS_CONFIG[s]?.label || s : 'Tất cả trạng thái'}
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
                                    <span className="text-sm">Đang tải dữ liệu...</span>
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="py-20 text-center text-sm text-slate-400">
                                    Không có yêu cầu nào phù hợp.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50">
                                                {['ID', 'Số tiền', 'Ngân hàng', 'Số TK / Chủ TK', 'Trạng thái', 'Ngày tạo', ''].map((h) => (
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
                                            {filtered.map((w) => {
                                                const cfg = STATUS_CONFIG[w.status] || {}
                                                return (
                                                    <motion.tr
                                                        key={w.id}
                                                        initial={{ opacity: 0, y: 4 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="group transition-colors hover:bg-slate-50/60"
                                                    >
                                                        <td className="px-5 py-3.5">
                                                            <span className="font-mono text-xs font-bold text-slate-500" title={w.id}>
                                                                {shortId(w.id)}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <span className="font-bold text-slate-800">{formatVND(w.amount)}</span>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <span className="text-slate-700">{w.bankName || '—'}</span>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <p className="font-mono text-xs text-slate-600">{w.bankAccountNumber || '—'}</p>
                                                            <p className="text-slate-500 text-xs mt-0.5">{w.bankAccountHolder || '—'}</p>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <Badge variant={cfg.variant || 'slate'} size="sm" className="rounded-full">
                                                                {cfg.label || w.status}
                                                            </Badge>
                                                        </td>
                                                        <td className="whitespace-nowrap px-5 py-3.5 text-slate-500">
                                                            {formatDate(w.createdAt)}
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                                                <button
                                                                    onClick={() => setSelectedItem(w)}
                                                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                                                                >
                                                                    Chi tiết
                                                                </button>
                                                                {w.status === 'PENDING' && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => setRejectTarget(w)}
                                                                            className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                                                                        >
                                                                            Từ chối
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleApprove(w)}
                                                                            disabled={actionLoading}
                                                                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
                                                                        >
                                                                            Duyệt
                                                                        </button>
                                                                    </>
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
                                        Trang {page + 1} / {totalPages} · {totalElements.toLocaleString()} yêu cầu
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => dispatch(setPage(page - 1))}
                                            disabled={page === 0 || loading}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <span className="text-sm font-semibold text-slate-700">{page + 1}</span>
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

            {/* Modals */}
            <AnimatePresence>
                {selectedItem && (
                    <DetailModal
                        key="detail"
                        withdrawal={selectedItem}
                        onClose={() => setSelectedItem(null)}
                        onApprove={(w) => { setSelectedItem(null); handleApprove(w) }}
                        onReject={(w) => { setSelectedItem(null); setRejectTarget(w) }}
                    />
                )}
                {rejectTarget && (
                    <RejectModal
                        key="reject"
                        withdrawal={rejectTarget}
                        onClose={() => setRejectTarget(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

export default AdminWithdrawalsPage
