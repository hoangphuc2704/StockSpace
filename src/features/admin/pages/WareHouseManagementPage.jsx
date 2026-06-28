import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
    fetchWarehouses,
    verifyWarehouse,
    rejectWarehouse,
    setPage,
    setKeyword,
    setStatusFilter,
    setIsVerifiedFilter,
    clearActionError,
} from '../../../store/adminWarehouseManagement'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    Warehouse,
    CheckCircle2,
    XCircle,
    Clock,
    BadgeCheck,
    X,
    Loader2,
    MapPin,
    User,
    Phone,
    DollarSign,
    Ruler,
    Tag,
    AlertCircle,
    Image as ImageIcon,
    ShieldCheck,
    ShieldX,
} from 'lucide-react'
import { HiBars3 } from 'react-icons/hi2'
import Badge from '../../../components/atoms/Badge'
import Sidebar from '../../../components/SideBar'
import logoDaidien from '../../../assets/logoDaidien.png'

// ─── Enum / Constants từ BE ───────────────────────────────────────────────────
// WarehouseStatus: AVAILABLE | RENTED | PENDING_APPROVAL | INACTIVE
const STATUS_OPTIONS = ['', 'PENDING_APPROVAL', 'AVAILABLE', 'RENTED', 'INACTIVE']

const STATUS_CONFIG = {
    AVAILABLE: { label: 'Sẵn sàng', variant: 'success', icon: CheckCircle2 },
    RENTED: { label: 'Đang thuê', variant: 'info', icon: Warehouse },
    PENDING_APPROVAL: { label: 'Chờ duyệt', variant: 'warning', icon: Clock },
    INACTIVE: { label: 'Không hoạt động', variant: 'danger', icon: XCircle },
}

const VERIFIED_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'true', label: 'Đã xác minh' },
    { value: 'false', label: 'Chưa xác minh' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatVND = (amount) =>
    amount != null ? Number(amount).toLocaleString('vi-VN') + ' ₫' : '—'

const formatDate = (dt) =>
    dt ? new Date(dt).toLocaleString('vi-VN', { hour12: false }) : '—'

const shortId = (id) => (id ? `#${String(id).slice(0, 8).toUpperCase()}` : '—')

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const DetailModal = ({ warehouse, onClose, onVerify, onReject }) => {
    const { actionLoading } = useSelector((s) => s.adminWarehouseManage)
    const cfg = STATUS_CONFIG[warehouse.status] || {}
    const StatusIcon = cfg.icon || Clock

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
                className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="mb-5 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Warehouse size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">{warehouse.name || '—'}</h2>
                            <p className="text-xs text-slate-400 font-mono">{shortId(warehouse.id)}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <X size={18} />
                    </button>
                </div>

                {/* Cover image */}
                {warehouse.coverImageUrl && (
                    <div className="mb-4 h-44 w-full overflow-hidden rounded-xl border border-slate-100">
                        <img src={warehouse.coverImageUrl} alt="cover" className="h-full w-full object-cover" />
                    </div>
                )}

                <div className="space-y-3 text-sm">
                    {/* Status + verified */}
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <span className="font-medium text-slate-600 mr-auto">Trạng thái</span>
                        <Badge variant={cfg.variant || 'slate'} size="sm" className="rounded-full">
                            <StatusIcon size={12} className="mr-1 inline" />
                            {cfg.label || warehouse.status}
                        </Badge>
                        <Badge variant={warehouse.isVerified ? 'success' : 'warning'} size="sm" className="rounded-full">
                            {warehouse.isVerified ? (
                                <><BadgeCheck size={12} className="mr-1 inline" />Đã xác minh</>
                            ) : (
                                <><Clock size={12} className="mr-1 inline" />Chưa xác minh</>
                            )}
                        </Badge>
                    </div>

                    {/* Basic info */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="mb-1 flex items-center gap-1 text-xs text-slate-400"><Tag size={11} /> Loại kho</p>
                            <p className="font-semibold text-slate-800">{warehouse.typeName || '—'}</p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="mb-1 flex items-center gap-1 text-xs text-slate-400"><Ruler size={11} /> Diện tích</p>
                            <p className="font-semibold text-slate-800">{warehouse.capacity != null ? `${warehouse.capacity} m²` : '—'}</p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="mb-1 flex items-center gap-1 text-xs text-slate-400"><DollarSign size={11} /> Giá/tháng</p>
                            <p className="font-bold text-slate-900">{formatVND(warehouse.pricePerMonth)}</p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="mb-1 text-xs text-slate-400">Ngày đăng</p>
                            <p className="text-slate-700">{formatDate(warehouse.createdAt)}</p>
                        </div>
                    </div>

                    {/* Address */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="mb-1 flex items-center gap-1 text-xs text-slate-400"><MapPin size={11} /> Địa chỉ</p>
                        <p className="text-slate-800">{warehouse.address || '—'}</p>
                    </div>

                    {/* Description */}
                    {warehouse.description && (
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="mb-1 text-xs text-slate-400">Mô tả</p>
                            <p className="text-slate-700 whitespace-pre-line">{warehouse.description}</p>
                        </div>
                    )}

                    {/* Owner */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="mb-2 flex items-center gap-1 text-xs text-slate-400"><User size={11} /> Chủ kho</p>
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                                <User size={15} />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-800">{warehouse.ownerName || '—'}</p>
                                <p className="flex items-center gap-1 text-xs text-slate-500">
                                    <Phone size={10} /> {warehouse.ownerPhone || '—'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Policy */}
                    {warehouse.policyVersion && (
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="mb-1 text-xs text-slate-400">Phiên bản chính sách</p>
                            <p className="font-mono text-xs text-slate-600">{warehouse.policyVersion}</p>
                        </div>
                    )}

                    {/* Images */}
                    {warehouse.imageUrls && warehouse.imageUrls.length > 1 && (
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="mb-2 flex items-center gap-1 text-xs text-slate-400">
                                <ImageIcon size={11} /> Ảnh ({warehouse.imageUrls.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {warehouse.imageUrls.map((url, i) => (
                                    <a key={i} href={url} target="_blank" rel="noreferrer"
                                        className="block h-16 w-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                                        <img src={url} alt={`img-${i}`} className="h-full w-full object-cover"
                                            onError={(e) => { e.target.style.display = 'none' }} />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="mt-5 flex justify-end gap-3">
                    <button onClick={onClose}
                        className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                        Đóng
                    </button>
                    {warehouse.status === 'PENDING_APPROVAL' && (
                        <>
                            <button onClick={() => { onClose(); onReject(warehouse) }}
                                disabled={actionLoading}
                                className="flex items-center gap-2 rounded-xl border border-rose-200 px-5 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60">
                                <ShieldX size={15} /> Từ chối
                            </button>
                            <button onClick={() => { onClose(); onVerify(warehouse) }}
                                disabled={actionLoading}
                                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                                {actionLoading ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                                Duyệt kho
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const WareHouseManagementPage = () => {
    const dispatch = useDispatch()

    const { isSidebarExpanded } = useSelector((s) => s.ui)
    const {
        data: warehouses,
        loading,
        error,
        page,
        totalPages,
        totalElements,
        size,
        keyword,
        statusFilter,
        isVerifiedFilter,
        actionLoading,
        actionError,
    } = useSelector((s) => s.adminWarehouseManage)

    // Local UI
    const [searchInput, setSearchInput] = useState(keyword || '')
    const [selectedItem, setSelectedItem] = useState(null)

    // Fetch khi filters/page thay đổi
    useEffect(() => {
        dispatch(fetchWarehouses({
            page,
            size,
            keyword: keyword || undefined,
            status: statusFilter || undefined,
            isVerified: isVerifiedFilter !== '' ? isVerifiedFilter === 'true' : undefined,
        }))
    }, [dispatch, page, size, keyword, statusFilter, isVerifiedFilter])

    // Debounce keyword search (500ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            dispatch(setKeyword(searchInput))
        }, 500)
        return () => clearTimeout(timer)
    }, [searchInput, dispatch])

    const handleVerify = useCallback(async (w) => {
        await dispatch(verifyWarehouse(w.id))
    }, [dispatch])

    const handleReject = useCallback(async (w) => {
        await dispatch(rejectWarehouse(w.id))
    }, [dispatch])

    // Summary counts từ trang hiện tại
    const pendingCount = warehouses.filter((w) => w.status === 'PENDING_APPROVAL').length
    const availableCount = warehouses.filter((w) => w.status === 'AVAILABLE').length
    const verifiedCount = warehouses.filter((w) => w.isVerified).length

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* TOP HEADER */}
            <header className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center border-b border-slate-200 bg-white px-4">
                <div className="flex items-center gap-4">
                    <button className="rounded-full p-2 text-slate-700 hover:bg-slate-100 active:bg-slate-200">
                        <HiBars3 className="h-6 w-6" />
                    </button>
                    <div className="flex cursor-pointer items-center gap-2">
                        <div className="shrink-0 rounded-lg bg-white p-1.5">
                            <img src={logoDaidien} alt="Logo" className="h-10 w-17" />
                        </div>
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
                                <h1 className="text-2xl font-bold text-slate-900">Quản lý Kho bãi</h1>
                                <p className="mt-1 text-sm text-slate-500">
                                    Duyệt, từ chối và theo dõi trạng thái kho bãi.
                                    {totalElements > 0 && (
                                        <span className="ml-1 font-semibold text-slate-700">({totalElements.toLocaleString()} tổng)</span>
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

                        {/* Summary cards */}
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                            {[
                                { label: 'Tổng kho', value: totalElements, icon: Warehouse, color: 'text-slate-600', bg: 'bg-slate-100' },
                                { label: 'Chờ duyệt', value: pendingCount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                                { label: 'Sẵn sàng', value: availableCount, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                { label: 'Đã xác minh', value: verifiedCount, icon: BadgeCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
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
                        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
                            {/* Keyword search */}
                            <div className="relative min-w-[220px] flex-1">
                                <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Tìm tên kho, địa chỉ..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-4 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                                />
                            </div>

                            {/* Status filter */}
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

                            {/* Verified filter */}
                            <select
                                value={isVerifiedFilter}
                                onChange={(e) => dispatch(setIsVerifiedFilter(e.target.value))}
                                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none"
                            >
                                {VERIFIED_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Table */}
                        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
                                    <Loader2 size={28} className="animate-spin text-blue-400" />
                                    <span className="text-sm">Đang tải dữ liệu...</span>
                                </div>
                            ) : warehouses.length === 0 ? (
                                <div className="py-20 text-center text-sm text-slate-400">Không có kho nào phù hợp.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50">
                                                {['', 'Tên kho', 'Địa chỉ', 'Loại / Giá', 'Chủ kho', 'Trạng thái', 'Xác minh', 'Ngày đăng', ''].map((h) => (
                                                    <th key={h} className="px-4 py-3.5 text-left text-xs font-bold tracking-wide text-slate-500 uppercase whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {warehouses.map((w) => {
                                                const cfg = STATUS_CONFIG[w.status] || {}
                                                return (
                                                    <motion.tr
                                                        key={w.id}
                                                        initial={{ opacity: 0, y: 4 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="group transition-colors hover:bg-slate-50/60"
                                                    >
                                                        {/* Cover image */}
                                                        <td className="px-4 py-3.5">
                                                            <div className="h-10 w-14 overflow-hidden rounded-lg border border-slate-100 bg-slate-100">
                                                                {w.coverImageUrl ? (
                                                                    <img src={w.coverImageUrl} alt={w.name}
                                                                        className="h-full w-full object-cover"
                                                                        onError={(e) => { e.target.style.display = 'none' }} />
                                                                ) : (
                                                                    <div className="flex h-full w-full items-center justify-center text-slate-300">
                                                                        <ImageIcon size={16} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3.5">
                                                            <p className="font-semibold text-slate-800 max-w-[140px] truncate" title={w.name}>{w.name || '—'}</p>
                                                            <p className="font-mono text-[10px] text-slate-400">{shortId(w.id)}</p>
                                                        </td>
                                                        <td className="max-w-[150px] px-4 py-3.5">
                                                            <p className="truncate text-xs text-slate-500" title={w.address}>{w.address || '—'}</p>
                                                        </td>
                                                        <td className="px-4 py-3.5">
                                                            <p className="text-xs text-slate-500">{w.typeName || '—'}</p>
                                                            <p className="font-bold text-slate-800">{formatVND(w.pricePerMonth)}<span className="text-xs font-normal text-slate-400">/tháng</span></p>
                                                        </td>
                                                        <td className="px-4 py-3.5">
                                                            <p className="font-medium text-slate-700">{w.ownerName || '—'}</p>
                                                            <p className="text-xs text-slate-400">{w.ownerPhone || '—'}</p>
                                                        </td>
                                                        <td className="px-4 py-3.5">
                                                            <Badge variant={cfg.variant || 'slate'} size="sm" className="rounded-full whitespace-nowrap">
                                                                {cfg.label || w.status}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-3.5">
                                                            {w.isVerified ? (
                                                                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                                                                    <BadgeCheck size={14} /> Đã xác minh
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-1 text-xs font-semibold text-amber-500">
                                                                    <Clock size={13} /> Chưa xác minh
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500">
                                                            {formatDate(w.createdAt)}
                                                        </td>
                                                        <td className="px-4 py-3.5">
                                                            <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                                                                <button
                                                                    onClick={() => setSelectedItem(w)}
                                                                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                                                                    Chi tiết
                                                                </button>
                                                                {w.status === 'PENDING_APPROVAL' && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => handleReject(w)}
                                                                            disabled={actionLoading}
                                                                            className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50">
                                                                            Từ chối
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleVerify(w)}
                                                                            disabled={actionLoading}
                                                                            className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                                                                            {actionLoading ? <Loader2 size={12} className="animate-spin" /> : 'Duyệt'}
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
                                        Trang {page + 1} / {totalPages} · {totalElements.toLocaleString()} kho
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => dispatch(setPage(page - 1))}
                                            disabled={page === 0 || loading}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                                            <ChevronLeft size={16} />
                                        </button>
                                        <span className="text-sm font-semibold text-slate-700">{page + 1}</span>
                                        <button
                                            onClick={() => dispatch(setPage(page + 1))}
                                            disabled={page >= totalPages - 1 || loading}
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

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedItem && (
                    <DetailModal
                        key="detail"
                        warehouse={selectedItem}
                        onClose={() => setSelectedItem(null)}
                        onVerify={(w) => { setSelectedItem(null); handleVerify(w) }}
                        onReject={(w) => { setSelectedItem(null); handleReject(w) }}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

export default WareHouseManagementPage
