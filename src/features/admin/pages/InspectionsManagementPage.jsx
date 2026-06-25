import React, { useState, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
    fetchInspections,
    assignInspector,
    setPage,
    setStatusFilter,
    clearAssignError,
} from '../../../store/adminInspectionsManagement'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    Clock,
    Loader2,
    User,
    MapPin,
    X,
    AlertCircle,
    CheckCircle2,
    XCircle,
    PlayCircle,
    UserPlus,
    Image as ImageIcon,
    FileText,
} from 'lucide-react'
import { HiBars3 } from 'react-icons/hi2'
import Badge from '../../../components/atoms/Badge'
import Sidebar from '../../../components/SideBar'
import logoDaidien from '../../../assets/logoDaidien.png'

// ─── Enum / Constants từ BE ─────────────────────────────────────────────────
// InspectionStatus: PENDING | IN_PROGRESS | PASSED | FAILED
const STATUS_OPTIONS = ['', 'PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED']

const STATUS_CONFIG = {
    PENDING: { label: 'Chờ phân công', variant: 'warning', icon: Clock },
    IN_PROGRESS: { label: 'Đang kiểm định', variant: 'info', icon: PlayCircle },
    PASSED: { label: 'Đạt', variant: 'success', icon: CheckCircle2 },
    FAILED: { label: 'Không đạt', variant: 'danger', icon: XCircle },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatDate = (dt) => dt ? new Date(dt).toLocaleString('vi-VN', { hour12: false }) : '—'
const shortId = (id) => id ? `#${String(id).slice(0, 8).toUpperCase()}` : '—'

// ─── Assign Inspector Modal ───────────────────────────────────────────────────
const AssignModal = ({ inspection, onClose }) => {
    const dispatch = useDispatch()
    const { assignLoading, assignError } = useSelector((s) => s.adminInspections)

    const [inspectorId, setInspectorId] = useState('')
    const [localError, setLocalError] = useState(null)

    useEffect(() => { dispatch(clearAssignError()) }, [dispatch])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!inspectorId.trim()) { setLocalError('Vui lòng nhập Inspector ID.'); return }
        setLocalError(null)
        const result = await dispatch(assignInspector({ id: inspection.id, inspectorId: inspectorId.trim() }))
        if (assignInspector.fulfilled.match(result)) onClose()
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.18 }} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-5 flex items-start justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Phân công Inspector</h2>
                        <p className="mt-0.5 text-sm text-slate-500">
                            Kho: <span className="font-semibold text-slate-700">{inspection.warehouseName || shortId(inspection.warehouseId)}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
                </div>

                {/* Current inspector */}
                {inspection.inspectorId && (
                    <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm">
                        <p className="text-xs text-blue-500 font-medium mb-1">Inspector hiện tại</p>
                        <p className="font-semibold text-blue-800">{inspection.inspectorName || shortId(inspection.inspectorId)}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                            Inspector ID (UUID) <span className="text-rose-500">*</span>
                        </label>
                        <input
                            value={inspectorId} onChange={(e) => setInspectorId(e.target.value)}
                            placeholder="Nhập UUID của Inspector..."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                        <p className="mt-1 text-xs text-slate-400">UUID của user có role Inspector trong hệ thống</p>
                    </div>

                    {(localError || assignError) && (
                        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{localError || assignError}</p>
                    )}

                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Hủy</button>
                        <button type="submit" disabled={assignLoading}
                            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                            {assignLoading && <Loader2 size={14} className="animate-spin" />}
                            <UserPlus size={14} /> Phân công
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const DetailModal = ({ inspection, onClose, onAssignClick }) => {
    const cfg = STATUS_CONFIG[inspection.status] || {}
    const StatusIcon = cfg.icon || Clock

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.18 }} className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-5 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <ClipboardCheck size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Chi tiết Kiểm định</h2>
                            <p className="text-xs text-slate-400">{shortId(inspection.id)}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
                </div>

                <div className="space-y-3 text-sm">
                    {/* Status */}
                    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <span className="font-medium text-slate-600">Trạng thái</span>
                        <Badge variant={cfg.variant || 'slate'} size="sm" className="rounded-full">
                            <StatusIcon size={12} className="mr-1 inline" />
                            {cfg.label || inspection.status}
                        </Badge>
                    </div>

                    {/* Warehouse */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="mb-1 flex items-center gap-1 text-xs text-slate-400"><MapPin size={11} /> Kho bãi</p>
                        <p className="font-semibold text-slate-800">{inspection.warehouseName || '—'}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{inspection.warehouseAddress || '—'}</p>
                        <p className="font-mono text-[10px] text-slate-400 mt-0.5">{shortId(inspection.warehouseId)}</p>
                    </div>

                    {/* People */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="mb-1 flex items-center gap-1 text-xs text-slate-400"><User size={11} /> Inspector</p>
                            <p className="font-semibold text-slate-800">{inspection.inspectorName || 'Chưa có'}</p>
                            {inspection.inspectorId && <p className="font-mono text-[10px] text-slate-400">{shortId(inspection.inspectorId)}</p>}
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="mb-1 flex items-center gap-1 text-xs text-slate-400"><User size={11} /> Chủ kho</p>
                            <p className="font-semibold text-slate-800">{inspection.ownerName || '—'}</p>
                            {inspection.ownerId && <p className="font-mono text-[10px] text-slate-400">{shortId(inspection.ownerId)}</p>}
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="mb-1 text-xs text-slate-400">Ngày tạo</p>
                            <p className="text-slate-700">{formatDate(inspection.createdAt)}</p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="mb-1 text-xs text-slate-400">Kiểm định lúc</p>
                            <p className="text-slate-700">{formatDate(inspection.inspectedAt)}</p>
                        </div>
                    </div>

                    {/* Notes */}
                    {inspection.notes && (
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="mb-1.5 flex items-center gap-1 text-xs text-slate-400"><FileText size={11} /> Ghi chú</p>
                            <p className="text-slate-700">{inspection.notes}</p>
                        </div>
                    )}

                    {/* Checklist data */}
                    {inspection.checklistData && (
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="mb-1.5 text-xs text-slate-400">Checklist Data</p>
                            <p className="break-all font-mono text-xs text-slate-600">{inspection.checklistData}</p>
                        </div>
                    )}

                    {/* Images */}
                    {inspection.images && inspection.images.length > 0 && (
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="mb-2 flex items-center gap-1 text-xs text-slate-400"><ImageIcon size={11} /> Ảnh ({inspection.images.length})</p>
                            <div className="flex flex-wrap gap-2">
                                {inspection.images.map((url, i) => (
                                    <a key={i} href={url} target="_blank" rel="noreferrer"
                                        className="block h-16 w-16 rounded-lg border border-slate-200 overflow-hidden bg-slate-100">
                                        <img src={url} alt={`img-${i}`} className="h-full w-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-5 flex justify-end gap-3">
                    <button onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Đóng</button>
                    {(inspection.status === 'PENDING' || inspection.status === 'IN_PROGRESS') && (
                        <button onClick={() => { onClose(); onAssignClick(inspection) }}
                            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                            <UserPlus size={15} /> Phân công Inspector
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const InspectionsManagementPage = () => {
    const dispatch = useDispatch()

    const { isSidebarExpanded } = useSelector((s) => s.ui)
    const {
        data: inspections,
        loading,
        error,
        page,
        totalPages,
        totalElements,
        size,
        statusFilter,
        assignLoading,
    } = useSelector((s) => s.adminInspections)

    // Local UI state
    const [searchText, setSearchText] = useState('')
    const [selectedItem, setSelectedItem] = useState(null)   // detail modal
    const [assignTarget, setAssignTarget] = useState(null)   // assign modal

    // Fetch khi page/filter thay đổi
    useEffect(() => {
        dispatch(fetchInspections({ page, size, status: statusFilter }))
    }, [dispatch, page, size, statusFilter])

    // Client-side search
    const filtered = useMemo(() => {
        const q = searchText.toLowerCase().trim()
        if (!q) return inspections
        return inspections.filter((i) =>
            (i.id && i.id.toLowerCase().includes(q)) ||
            (i.warehouseName && i.warehouseName.toLowerCase().includes(q)) ||
            (i.warehouseAddress && i.warehouseAddress.toLowerCase().includes(q)) ||
            (i.inspectorName && i.inspectorName.toLowerCase().includes(q)) ||
            (i.ownerName && i.ownerName.toLowerCase().includes(q))
        )
    }, [inspections, searchText])

    // Summary counts từ trang hiện tại
    const pendingCount = inspections.filter((i) => i.status === 'PENDING').length
    const inProgressCount = inspections.filter((i) => i.status === 'IN_PROGRESS').length
    const passedCount = inspections.filter((i) => i.status === 'PASSED').length
    const failedCount = inspections.filter((i) => i.status === 'FAILED').length

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* TOP HEADER */}
            <header className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center border-b border-slate-200 bg-white px-4">
                <div className="flex items-center gap-4">
                    <button className="rounded-full p-2 text-slate-700 hover:bg-slate-100 active:bg-slate-200"><HiBars3 className="h-6 w-6" /></button>
                    <div className="flex cursor-pointer items-center gap-2">
                        <div className="shrink-0 rounded-lg bg-white p-1.5"><img src={logoDaidien} alt="Logo" className="h-10 w-17" /></div>
                        <span className="font-display text-xl font-bold tracking-tight text-slate-950">StockSpace Admin</span>
                    </div>
                </div>
            </header>

            <div className="flex pt-14">
                <Sidebar currentRole="ADMIN" />

                <div className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'}`}>
                    <main className="mx-auto w-full max-w-400 space-y-6 p-6 md:p-8">
                        {/* Page header */}
                        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">Quản lý Kiểm định</h1>
                                <p className="mt-1 text-sm text-slate-500">
                                    Phân công Inspector và theo dõi tiến trình kiểm định kho bãi.
                                    {totalElements > 0 && <span className="ml-1 font-semibold text-slate-700">({totalElements.toLocaleString()} tổng)</span>}
                                </p>
                            </div>
                        </div>

                        {/* Error banner */}
                        {error && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                <AlertCircle size={14} className="mr-1.5 inline" />{error}
                            </div>
                        )}

                        {/* Summary cards — 4 trạng thái */}
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                            {[
                                { label: 'Chờ phân công', value: pendingCount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                                { label: 'Đang kiểm định', value: inProgressCount, icon: PlayCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
                                { label: 'Đạt', value: passedCount, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                { label: 'Không đạt', value: failedCount, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.bg} ${item.color}`}>
                                        <item.icon size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{item.label}</p>
                                        <p className="text-xl font-bold text-slate-900">{item.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Filters */}
                        <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 md:flex-row">
                            <div className="relative w-full md:w-96">
                                <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" size={16} />
                                <input type="text" placeholder="Tìm theo ID, tên kho, địa chỉ, inspector..."
                                    value={searchText} onChange={(e) => setSearchText(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-4 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Filter size={14} className="text-slate-400" />
                                <select value={statusFilter} onChange={(e) => dispatch(setStatusFilter(e.target.value))}
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none">
                                    {STATUS_OPTIONS.map((s) => (
                                        <option key={s} value={s}>{s ? STATUS_CONFIG[s]?.label || s : 'Tất cả trạng thái'}</option>
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
                                <div className="py-20 text-center text-sm text-slate-400">Không có kết quả phù hợp.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50">
                                                {['ID', 'Kho bãi', 'Địa chỉ', 'Inspector', 'Chủ kho', 'Trạng thái', 'Ngày tạo', ''].map((h) => (
                                                    <th key={h} className="px-5 py-3.5 text-left text-xs font-bold tracking-wide text-slate-500 uppercase">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {filtered.map((item) => {
                                                const cfg = STATUS_CONFIG[item.status] || {}
                                                return (
                                                    <motion.tr key={item.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                                        className="group transition-colors hover:bg-slate-50/60">
                                                        <td className="px-5 py-3.5">
                                                            <span className="font-mono text-xs font-bold text-slate-400" title={item.id}>{shortId(item.id)}</span>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <p className="font-semibold text-slate-800">{item.warehouseName || '—'}</p>
                                                            <p className="font-mono text-[10px] text-slate-400">{shortId(item.warehouseId)}</p>
                                                        </td>
                                                        <td className="max-w-[160px] px-5 py-3.5">
                                                            <p className="truncate text-xs text-slate-500" title={item.warehouseAddress}>{item.warehouseAddress || '—'}</p>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            {item.inspectorId ? (
                                                                <div>
                                                                    <p className="font-medium text-slate-700">{item.inspectorName}</p>
                                                                    <p className="font-mono text-[10px] text-slate-400">{shortId(item.inspectorId)}</p>
                                                                </div>
                                                            ) : (
                                                                <span className="italic text-xs text-slate-400">Chưa phân công</span>
                                                            )}
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <p className="font-medium text-slate-700">{item.ownerName || '—'}</p>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <Badge variant={cfg.variant || 'slate'} size="sm" className="rounded-full">
                                                                {cfg.label || item.status}
                                                            </Badge>
                                                        </td>
                                                        <td className="whitespace-nowrap px-5 py-3.5 text-slate-500 text-xs">
                                                            {formatDate(item.createdAt)}
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                                                <button onClick={() => setSelectedItem(item)}
                                                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                                                                    Chi tiết
                                                                </button>
                                                                {(item.status === 'PENDING' || item.status === 'IN_PROGRESS') && (
                                                                    <button onClick={() => setAssignTarget(item)} disabled={assignLoading}
                                                                        className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                                                                        <UserPlus size={12} /> Phân công
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
                                        Trang {page + 1} / {totalPages} · {totalElements.toLocaleString()} yêu cầu
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => dispatch(setPage(page - 1))} disabled={page === 0 || loading}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                                            <ChevronLeft size={16} />
                                        </button>
                                        <span className="text-sm font-semibold text-slate-700">{page + 1}</span>
                                        <button onClick={() => dispatch(setPage(page + 1))} disabled={page >= totalPages - 1 || loading}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
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
                        inspection={selectedItem}
                        onClose={() => setSelectedItem(null)}
                        onAssignClick={(item) => { setSelectedItem(null); setAssignTarget(item) }}
                    />
                )}
                {assignTarget && (
                    <AssignModal
                        key="assign"
                        inspection={assignTarget}
                        onClose={() => setAssignTarget(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

export default InspectionsManagementPage
