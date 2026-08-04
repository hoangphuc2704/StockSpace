import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
    fetchSystemPolicies,
    createSystemPolicy,
    setPage,
    clearActionError,
} from '../../../store/adminSystemPolicysSlice'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Plus,
    X,
    Loader2,
    Shield,
    CheckCircle2,
    Clock,
    FileText,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
} from 'lucide-react'
import { HiBars3 } from 'react-icons/hi2'
import Badge from '../../../components/atoms/Badge'
import Sidebar from '../../../components/SideBar'
import logoDaidien from '../../../assets/logoDaidien.png'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatDate = (dt) => dt ? new Date(dt).toLocaleString('vi-VN', { hour12: false }) : '—'
const shortId = (id) => id ? `#${String(id).slice(0, 8).toUpperCase()}` : '—'

// ─── Create Policy Modal ──────────────────────────────────────────────────────
const CreatePolicyModal = ({ onClose }) => {
    const dispatch = useDispatch()
    const { actionLoading, actionError } = useSelector((s) => s.adminSystemPolicy)
    const [version, setVersion] = useState('')
    const [content, setContent] = useState('')
    const [localError, setLocalError] = useState(null)

    useEffect(() => { dispatch(clearActionError()) }, [dispatch])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!version.trim()) { setLocalError('Vui lòng nhập phiên bản.'); return }
        if (!content.trim()) { setLocalError('Vui lòng nhập nội dung.'); return }
        setLocalError(null)

        const result = await dispatch(createSystemPolicy({ version: version.trim(), content: content.trim() }))
        if (createSystemPolicy.fulfilled.match(result)) onClose()
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.18 }} className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="mb-5 flex items-start justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Thêm Phiên bản Chính sách mới</h2>
                        <p className="mt-0.5 text-sm text-slate-500">Tạo phiên bản chính sách mới. Phiên bản này sẽ tự động trở thành Active.</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Phiên bản <span className="text-rose-500">*</span></label>
                        <input value={version} onChange={(e) => setVersion(e.target.value)} maxLength={50}
                            placeholder="Ví dụ: v1.0.0, 2026-Q1..."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Nội dung Chính sách <span className="text-rose-500">*</span></label>
                        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={12}
                            placeholder="Nhập toàn bộ nội dung điều khoản, chính sách..."
                            className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono leading-relaxed focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" />
                    </div>

                    {(localError || actionError) && (
                        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{localError || actionError}</p>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Hủy</button>
                        <button type="submit" disabled={actionLoading} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                            {actionLoading && <Loader2 size={14} className="animate-spin" />}
                            <Plus size={14} /> Lưu Phiên bản
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const DetailModal = ({ policy, onClose }) => {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.18 }} className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-start justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Shield size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-slate-900">Chi tiết Chính sách</h2>
                                <Badge variant={policy.isActive ? 'success' : 'slate'} size="sm" className="rounded-full">
                                    {policy.isActive ? 'Đang hiệu lực (Active)' : 'Đã cũ (Inactive)'}
                                </Badge>
                            </div>
                            <p className="text-sm font-mono text-slate-500">Phiên bản: {policy.version} | ID: {shortId(policy.id)}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 shrink-0 text-sm">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="mb-1 flex items-center gap-1 text-xs text-slate-400"><Clock size={11} /> Ngày ban hành</p>
                        <p className="font-semibold text-slate-800">{formatDate(policy.createdAt)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="mb-1 flex items-center gap-1 text-xs text-slate-400"><Clock size={11} /> Cập nhật lần cuối</p>
                        <p className="font-semibold text-slate-800">{formatDate(policy.updatedAt)}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="mb-2 flex items-center gap-1 text-xs font-bold text-slate-500 uppercase tracking-wide"><FileText size={12} /> Nội dung</p>
                    <div className="text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed bg-white p-4 rounded-lg border border-slate-200">
                        {policy.content}
                    </div>
                </div>

                <div className="mt-5 flex justify-end shrink-0">
                    <button onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Đóng</button>
                </div>
            </motion.div>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const SystemPolicyPage = () => {
    const dispatch = useDispatch()

    const { isSidebarExpanded } = useSelector((s) => s.ui)
    const {
        data: policies,
        loading,
        error,
        page,
        totalPages,
        totalElements,
        size
    } = useSelector((s) => s.adminSystemPolicy)

    const [showCreate, setShowCreate] = useState(false)
    const [selectedItem, setSelectedItem] = useState(null)

    // Fetch khi page thay đổi
    useEffect(() => {
        dispatch(fetchSystemPolicies({ page, size }))
    }, [dispatch, page, size])

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
                                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                    <Shield className="text-blue-500" size={24} /> Chính sách Hệ thống
                                </h1>
                                <p className="mt-1 text-sm text-slate-500">
                                    Quản lý các phiên bản chính sách, điều khoản và cam kết dành cho người dùng.
                                </p>
                            </div>
                            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm">
                                <Plus size={16} /> Thêm Phiên bản
                            </button>
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
                            ) : policies.length === 0 ? (
                                <div className="py-20 text-center text-sm text-slate-400">Chưa có phiên bản chính sách nào.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50">
                                                {['Phiên bản / ID', 'Trạng thái', 'Ngày ban hành', 'Cập nhật', ''].map((h) => (
                                                    <th key={h} className="px-5 py-3.5 text-left text-xs font-bold tracking-wide text-slate-500 uppercase">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {policies.map((p) => (
                                                <motion.tr key={p.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                                    className="group transition-colors hover:bg-slate-50/60">
                                                    <td className="px-5 py-4">
                                                        <p className="font-bold text-slate-800">{p.version}</p>
                                                        <p className="font-mono text-[10px] text-slate-400 mt-0.5">{shortId(p.id)}</p>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <Badge variant={p.isActive ? 'success' : 'slate'} size="sm" className="rounded-full">
                                                            {p.isActive ? <><CheckCircle2 size={12} className="mr-1 inline" /> Đang hiệu lực</> : 'Đã cũ'}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                                                        {formatDate(p.createdAt)}
                                                    </td>
                                                    <td className="px-5 py-4 text-slate-500 whitespace-nowrap text-xs">
                                                        {formatDate(p.updatedAt)}
                                                    </td>
                                                    <td className="px-5 py-4 text-right">
                                                        <button onClick={() => setSelectedItem(p)}
                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm opacity-0 transition-opacity group-hover:opacity-100">
                                                            <FileText size={14} className="text-slate-400" /> Xem nội dung
                                                        </button>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                                    <span className="text-sm text-slate-500">
                                        Trang {page + 1} / {totalPages} · {totalElements.toLocaleString()} phiên bản
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
                {showCreate && <CreatePolicyModal key="cp" onClose={() => setShowCreate(false)} />}
                {selectedItem && <DetailModal key="dm" policy={selectedItem} onClose={() => setSelectedItem(null)} />}
            </AnimatePresence>
        </div>
    )
}

export default SystemPolicyPage
