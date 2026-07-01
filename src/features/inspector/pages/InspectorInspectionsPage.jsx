import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
    fetchAssignedInspections,
    submitReport,
    setPage,
    clearActionError,
} from '../../../store/inspectorManagement'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ClipboardCheck,
    Loader2,
    CheckCircle2,
    XCircle,
    Clock,
    X,
    FileText,
    ChevronLeft,
    ChevronRight,
    MapPin,
    AlertCircle,
    User,
    Save,
} from 'lucide-react'
import { HiBars3 } from 'react-icons/hi2'
import Badge from '../../../components/atoms/Badge'
import Sidebar from '../../../components/SideBar'
import logoDaidien from '../../../assets/logoDaidien.png'

const formatDate = (dt) => dt ? new Date(dt).toLocaleDateString('vi-VN') : '—'
const shortId = (id) => id ? `#${String(id).slice(0, 8).toUpperCase()}` : '—'

const STATUS_CONFIG = {
    PENDING: { label: 'Chờ xử lý', variant: 'warning' },
    IN_PROGRESS: { label: 'Đang kiểm định', variant: 'info' },
    PASSED: { label: 'Đạt yêu cầu', variant: 'success' },
    FAILED: { label: 'Không đạt', variant: 'danger' },
}

// ─── Submit Report Modal ──────────────────────────────────────────────────────
const SubmitReportModal = ({ inspection, onClose }) => {
    const dispatch = useDispatch()
    const { actionLoading, actionError } = useSelector((s) => s.inspectorManagement)
    const [status, setStatus] = useState('PASSED')
    const [notes, setNotes] = useState('')
    const [localError, setLocalError] = useState(null)

    // Checklist đơn giản
    const [checklist, setChecklist] = useState({
        fireSafety: true,
        electrical: true,
        structure: true,
        cleanliness: true,
    })

    useEffect(() => { dispatch(clearActionError()) }, [dispatch])

    const handleToggleChecklist = (key) => {
        setChecklist((prev) => ({ ...prev, [key]: !prev[key] }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLocalError(null)

        if (!notes.trim()) return setLocalError('Vui lòng nhập nhận xét/ghi chú chi tiết.')

        const payload = {
            status,
            notes: notes.trim(),
            checklistData: checklist,
            images: [], // Có thể bổ sung mảng URL hình ảnh nếu tích hợp upload
        }

        const result = await dispatch(submitReport({ id: inspection.id, payload }))
        if (submitReport.fulfilled.match(result)) {
            onClose()
        }
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.18 }} className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                
                <div className="mb-5 flex items-start justify-between border-b border-slate-100 pb-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Nộp Báo Cáo Kiểm Định</h2>
                        <p className="mt-1 text-sm text-slate-500">Kho: <span className="font-semibold text-slate-700">{inspection.warehouseName}</span></p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Kết luận chung */}
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Kết luận kiểm định <span className="text-rose-500">*</span></label>
                        <div className="grid grid-cols-2 gap-3">
                            <button type="button" onClick={() => setStatus('PASSED')}
                                className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-bold transition-all ${status === 'PASSED' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-white text-slate-500 hover:border-emerald-200'}`}>
                                <CheckCircle2 size={18} /> Đạt Yêu Cầu (PASSED)
                            </button>
                            <button type="button" onClick={() => setStatus('FAILED')}
                                className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-bold transition-all ${status === 'FAILED' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-100 bg-white text-slate-500 hover:border-rose-200'}`}>
                                <XCircle size={18} /> Không Đạt (FAILED)
                            </button>
                        </div>
                    </div>

                    {/* Hạng mục Checklist */}
                    <div className="rounded-xl border border-slate-200 p-4">
                        <label className="mb-3 block text-sm font-semibold text-slate-700">Hạng mục đánh giá (Checklist)</label>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { key: 'fireSafety', label: 'An toàn PCCC' },
                                { key: 'electrical', label: 'Hệ thống điện' },
                                { key: 'structure', label: 'Kết cấu chịu lực' },
                                { key: 'cleanliness', label: 'Vệ sinh & Môi trường' },
                            ].map((item) => (
                                <label key={item.key} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                                    <input type="checkbox" checked={checklist[item.key]} onChange={() => handleToggleChecklist(item.key)}
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                    {item.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Ghi chú chi tiết <span className="text-rose-500">*</span></label>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
                            placeholder="Nhập nhận xét chi tiết, lý do đạt/không đạt..."
                            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-relaxed focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" />
                    </div>

                    {(localError || actionError) && (
                        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 flex items-center gap-1.5"><AlertCircle size={14} /> {localError || actionError}</p>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Hủy</button>
                        <button type="submit" disabled={actionLoading} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                            {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Nộp Báo Cáo
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    )
}


// ─── Main Page ────────────────────────────────────────────────────────────────
const InspectorInspectionsPage = () => {
    const dispatch = useDispatch()
    const { isSidebarExpanded } = useSelector((s) => s.ui)
    const {
        inspections, loading, error,
        page, size, totalPages, totalElements
    } = useSelector((s) => s.inspectorManagement)

    const [selectedInspection, setSelectedInspection] = useState(null)

    useEffect(() => {
        dispatch(fetchAssignedInspections({ page, size }))
    }, [dispatch, page, size])

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* TOP HEADER */}
            <header className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center border-b border-slate-200 bg-white px-4">
                <div className="flex items-center gap-4">
                    <button className="rounded-full p-2 text-slate-700 hover:bg-slate-100 active:bg-slate-200"><HiBars3 className="h-6 w-6" /></button>
                    <div className="flex cursor-pointer items-center gap-2">
                        <div className="shrink-0 rounded-lg bg-white p-1.5"><img src={logoDaidien} alt="Logo" className="h-10 w-17" /></div>
                        <span className="font-display text-xl font-bold tracking-tight text-slate-950">StockSpace Inspector</span>
                    </div>
                </div>
            </header>

            <div className="flex pt-14">
                <Sidebar currentRole="INSPECTOR" />

                <div className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'}`}>
                    <main className="mx-auto w-full max-w-6xl space-y-6 p-6 md:p-8">
                        {/* Page header */}
                        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                    <ClipboardCheck className="text-blue-500" size={24} /> Kiểm định Kho bãi
                                </h1>
                                <p className="mt-1 text-sm text-slate-500">
                                    Danh sách các yêu cầu kiểm định kho được phân công cho bạn.
                                </p>
                            </div>
                        </div>

                        {/* Error banner */}
                        {error && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                <AlertCircle size={14} className="mr-1.5 inline" />{error}
                            </div>
                        )}

                        {/* Table */}
                        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
                                    <Loader2 size={28} className="animate-spin text-blue-400" />
                                    <span className="text-sm">Đang tải dữ liệu...</span>
                                </div>
                            ) : inspections.length === 0 ? (
                                <div className="py-20 text-center text-sm text-slate-400">Bạn chưa được phân công kiểm định kho nào.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50">
                                                {['Mã Kiểm định', 'Thông tin Kho bãi', 'Chủ kho', 'Trạng thái', 'Ngày yêu cầu', ''].map((h) => (
                                                    <th key={h} className="px-5 py-3.5 text-left text-xs font-bold tracking-wide text-slate-500 uppercase">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {inspections.map((insp) => {
                                                const statusCfg = STATUS_CONFIG[insp.status] || { label: insp.status, variant: 'slate' }
                                                const canSubmit = insp.status === 'PENDING' || insp.status === 'IN_PROGRESS'
                                                
                                                return (
                                                    <motion.tr key={insp.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                                        className="group transition-colors hover:bg-slate-50/60">
                                                        <td className="px-5 py-4">
                                                            <p className="font-mono text-sm font-bold text-slate-700">{shortId(insp.id)}</p>
                                                        </td>
                                                        <td className="px-5 py-4 max-w-xs">
                                                            <p className="font-bold text-slate-800 line-clamp-1" title={insp.warehouseName}>{insp.warehouseName}</p>
                                                            <p className="text-xs text-slate-500 mt-1 flex items-start gap-1 line-clamp-1" title={insp.warehouseAddress}>
                                                                <MapPin size={12} className="shrink-0 mt-0.5"/> {insp.warehouseAddress || 'Không có địa chỉ'}
                                                            </p>
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <p className="font-medium text-slate-800 flex items-center gap-1.5"><User size={14} className="text-slate-400"/> {insp.ownerName || '—'}</p>
                                                        </td>
                                                        <td className="px-5 py-4 whitespace-nowrap">
                                                            <Badge variant={statusCfg.variant} size="sm" className="rounded-full">
                                                                {statusCfg.label}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                                                            <div className="flex items-center gap-1.5"><Clock size={14} className="text-slate-400"/> {formatDate(insp.createdAt)}</div>
                                                        </td>
                                                        <td className="px-5 py-4 text-right">
                                                            {canSubmit ? (
                                                                <button onClick={() => setSelectedInspection(insp)}
                                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-colors shadow-sm">
                                                                    <FileText size={14} /> Nộp Báo Cáo
                                                                </button>
                                                            ) : (
                                                                <span className="text-xs text-slate-400 font-medium">Đã hoàn tất</span>
                                                            )}
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
                {selectedInspection && <SubmitReportModal key="submit-report" inspection={selectedInspection} onClose={() => setSelectedInspection(null)} />}
            </AnimatePresence>
        </div>
    )
}

export default InspectorInspectionsPage
