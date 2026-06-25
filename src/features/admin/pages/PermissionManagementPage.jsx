import React, { useState, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
    fetchPermissions,
    fetchRoles,
    createPermission,
    createRole,
    updateRole,
    deleteRole,
    assignPermissionToRole,
    removePermissionFromRole,
    clearActionError,
} from '../../../store/adminPermissionManagement'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Shield,
    ShieldCheck,
    Plus,
    Pencil,
    Trash2,
    X,
    Loader2,
    Search,
    Key,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react'
import { HiBars3 } from 'react-icons/hi2'
import Sidebar from '../../../components/SideBar'
import logoDaidien from '../../../assets/logoDaidien.png'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const shortId = (id) => (id ? `#${String(id).slice(0, 6).toUpperCase()}` : '—')

// ─── Create Permission Modal ──────────────────────────────────────────────────
const CreatePermissionModal = ({ onClose }) => {
    const dispatch = useDispatch()
    const { actionLoading, actionError } = useSelector((s) => s.adminPermission)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [localError, setLocalError] = useState(null)

    useEffect(() => { dispatch(clearActionError()) }, [dispatch])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!name.trim()) { setLocalError('Tên Permission không được để trống.'); return }
        setLocalError(null)
        const result = await dispatch(createPermission({ name: name.trim(), description: description.trim() }))
        if (createPermission.fulfilled.match(result)) onClose()
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.18 }} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-5 flex items-start justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Tạo Permission mới</h2>
                        <p className="mt-0.5 text-sm text-slate-500">Thêm quyền hạn vào hệ thống</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tên Permission <span className="text-rose-500">*</span></label>
                        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100}
                            placeholder="Ví dụ: WAREHOUSE_MANAGE, USER_VIEW..."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Mô tả</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={255} rows={2}
                            placeholder="Mô tả ngắn về quyền hạn này..."
                            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" />
                    </div>
                    {(localError || actionError) && (
                        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{localError || actionError}</p>
                    )}
                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Hủy</button>
                        <button type="submit" disabled={actionLoading} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                            {actionLoading && <Loader2 size={14} className="animate-spin" />}Tạo Permission
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    )
}

// ─── Create/Edit Role Modal ───────────────────────────────────────────────────
const RoleModal = ({ role, onClose }) => {
    const dispatch = useDispatch()
    const { actionLoading, actionError } = useSelector((s) => s.adminPermission)
    const isEdit = !!role
    const [name, setName] = useState(role?.name || '')
    const [description, setDescription] = useState(role?.description || '')
    const [localError, setLocalError] = useState(null)

    useEffect(() => { dispatch(clearActionError()) }, [dispatch])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!name.trim()) { setLocalError('Tên Role không được để trống.'); return }
        setLocalError(null)
        const action = isEdit
            ? dispatch(updateRole({ id: role.id, name: name.trim(), description: description.trim() }))
            : dispatch(createRole({ name: name.trim(), description: description.trim() }))
        const result = await action
        if ((isEdit ? updateRole : createRole).fulfilled.match(result)) onClose()
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.18 }} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-5 flex items-start justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">{isEdit ? 'Chỉnh sửa Role' : 'Tạo Role mới'}</h2>
                        <p className="mt-0.5 text-sm text-slate-500">{isEdit ? `Sửa vai trò ${shortId(role.id)}` : 'Thêm vai trò mới vào hệ thống'}</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tên Role <span className="text-rose-500">*</span></label>
                        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100}
                            placeholder="Ví dụ: ADMIN, TENANT, OWNER..."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Mô tả</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={255} rows={2}
                            placeholder="Mô tả ngắn về vai trò này..."
                            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" />
                    </div>
                    {(localError || actionError) && (
                        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{localError || actionError}</p>
                    )}
                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Hủy</button>
                        <button type="submit" disabled={actionLoading} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                            {actionLoading && <Loader2 size={14} className="animate-spin" />}
                            {isEdit ? 'Cập nhật' : 'Tạo Role'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    )
}

// ─── Assign Permission to Role Modal ──────────────────────────────────────────
const AssignPermModal = ({ role, allPermissions, onClose }) => {
    const dispatch = useDispatch()
    const { actionLoading, actionError } = useSelector((s) => s.adminPermission)
    const [selectedPermId, setSelectedPermId] = useState('')

    // Permissions chưa gán vào role này
    const assignedIds = new Set((role.permissions || []).map((p) => p.id))
    const available = allPermissions.filter((p) => !assignedIds.has(p.id))

    useEffect(() => { dispatch(clearActionError()) }, [dispatch])

    const handleAssign = async (e) => {
        e.preventDefault()
        if (!selectedPermId) return
        const result = await dispatch(assignPermissionToRole({ roleId: role.id, permissionId: selectedPermId }))
        if (assignPermissionToRole.fulfilled.match(result)) onClose()
    }

    const handleRemove = async (permId) => {
        await dispatch(removePermissionFromRole({ roleId: role.id, permId }))
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.18 }} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-5 flex items-start justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Quản lý Permissions của Role</h2>
                        <p className="mt-0.5 text-sm text-slate-500 font-semibold">{role.name}</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
                </div>

                {/* Current permissions */}
                <div className="mb-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Permissions hiện tại ({(role.permissions || []).length})</p>
                    {(role.permissions || []).length === 0 ? (
                        <p className="text-sm text-slate-400 italic">Chưa có permission nào.</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {(role.permissions || []).map((p) => (
                                <span key={p.id} className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                    <Key size={11} />
                                    {p.name}
                                    <button
                                        onClick={() => handleRemove(p.id)}
                                        disabled={actionLoading}
                                        className="ml-0.5 rounded-full p-0.5 text-blue-400 hover:bg-blue-100 hover:text-blue-700 disabled:opacity-40"
                                    >
                                        <X size={10} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Assign new */}
                <form onSubmit={handleAssign} className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Thêm Permission</p>
                    <div className="flex gap-2">
                        <select
                            value={selectedPermId}
                            onChange={(e) => setSelectedPermId(e.target.value)}
                            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:outline-none"
                        >
                            <option value="">-- Chọn permission --</option>
                            {available.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}{p.description ? ` — ${p.description}` : ''}</option>
                            ))}
                        </select>
                        <button type="submit" disabled={!selectedPermId || actionLoading}
                            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                            {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            Thêm
                        </button>
                    </div>
                    {actionError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{actionError}</p>}
                </form>

                <div className="mt-5 flex justify-end">
                    <button onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Đóng</button>
                </div>
            </motion.div>
        </div>
    )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
const DeleteRoleModal = ({ role, onClose }) => {
    const dispatch = useDispatch()
    const { actionLoading, actionError } = useSelector((s) => s.adminPermission)

    useEffect(() => { dispatch(clearActionError()) }, [dispatch])

    const handleDelete = async () => {
        const result = await dispatch(deleteRole(role.id))
        if (deleteRole.fulfilled.match(result)) onClose()
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.18 }} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                    <Trash2 size={22} />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Xóa Role</h2>
                <p className="mt-2 text-sm text-slate-600">
                    Bạn có chắc muốn xóa role <strong>{role.name}</strong>?<br />
                    Thao tác này không thể hoàn tác.
                </p>
                {actionError && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{actionError}</p>}
                <div className="mt-5 flex justify-end gap-3">
                    <button onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Hủy</button>
                    <button onClick={handleDelete} disabled={actionLoading}
                        className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
                        {actionLoading && <Loader2 size={14} className="animate-spin" />}Xóa
                    </button>
                </div>
            </motion.div>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const PermissionManagementPage = () => {
    const dispatch = useDispatch()

    const { isSidebarExpanded } = useSelector((s) => s.ui)
    const {
        permissions,
        permLoading,
        permError,
        roles,
        roleLoading,
        roleError,
        actionError,
    } = useSelector((s) => s.adminPermission)

    // Fetch on mount
    useEffect(() => {
        dispatch(fetchPermissions())
        dispatch(fetchRoles())
    }, [dispatch])

    // Local UI state
    const [permSearch, setPermSearch] = useState('')
    const [roleSearch, setRoleSearch] = useState('')
    const [showCreatePerm, setShowCreatePerm] = useState(false)
    const [roleModal, setRoleModal] = useState(null)       // null | {mode:'create'|'edit', role?}
    const [assignModal, setAssignModal] = useState(null)   // null | role
    const [deleteModal, setDeleteModal] = useState(null)   // null | role

    // Filtered lists
    const filteredPerms = useMemo(() => {
        const q = permSearch.toLowerCase().trim()
        if (!q) return permissions
        return permissions.filter((p) =>
            p.name.toLowerCase().includes(q) ||
            (p.description && p.description.toLowerCase().includes(q))
        )
    }, [permissions, permSearch])

    const filteredRoles = useMemo(() => {
        const q = roleSearch.toLowerCase().trim()
        if (!q) return roles
        return roles.filter((r) =>
            r.name.toLowerCase().includes(q) ||
            (r.description && r.description.toLowerCase().includes(q))
        )
    }, [roles, roleSearch])

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
                    <main className="mx-auto w-full max-w-400 space-y-8 p-6 md:p-8">
                        {/* Page header */}
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Quản lý Phân quyền</h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Quản lý Permissions và Roles trong hệ thống.
                            </p>
                        </div>

                        {/* Global error */}
                        {(permError || roleError || actionError) && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                <AlertCircle size={14} className="mr-1.5 inline" />
                                {permError || roleError || actionError}
                            </div>
                        )}

                        {/* Summary cards */}
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                    <Key size={24} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Tổng Permissions</p>
                                    <p className="mt-0.5 text-2xl font-bold text-slate-900">{permissions.length}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                                    <Shield size={24} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Tổng Roles</p>
                                    <p className="mt-0.5 text-2xl font-bold text-slate-900">{roles.length}</p>
                                </div>
                            </div>
                        </div>

                        {/* ─── PERMISSIONS SECTION ─── */}
                        <section>
                            <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Key size={18} className="text-blue-500" /> Permissions</h2>
                                    <p className="text-sm text-slate-500">Quyền hạn nguyên tử của hệ thống</p>
                                </div>
                                <button
                                    onClick={() => setShowCreatePerm(true)}
                                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                                >
                                    <Plus size={16} /> Tạo Permission
                                </button>
                            </div>

                            {/* Search */}
                            <div className="relative mb-3 w-full sm:w-72">
                                <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" size={15} />
                                <input type="text" placeholder="Tìm permission..." value={permSearch} onChange={(e) => setPermSearch(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-4 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                            </div>

                            {/* Permissions grid */}
                            {permLoading ? (
                                <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
                                    <Loader2 size={22} className="animate-spin text-blue-400" />
                                    <span className="text-sm">Đang tải...</span>
                                </div>
                            ) : filteredPerms.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
                                    Không có permission nào.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {filteredPerms.map((p) => (
                                        <motion.div key={p.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                                        <Key size={15} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{p.name}</p>
                                                        <p className="font-mono text-[10px] text-slate-400">{shortId(p.id)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            {p.description && (
                                                <p className="mt-2 text-xs text-slate-500 leading-relaxed">{p.description}</p>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* ─── ROLES SECTION ─── */}
                        <section>
                            <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Shield size={18} className="text-violet-500" /> Roles</h2>
                                    <p className="text-sm text-slate-500">Vai trò tập hợp nhiều Permissions</p>
                                </div>
                                <button
                                    onClick={() => setRoleModal({ mode: 'create' })}
                                    className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                                >
                                    <Plus size={16} /> Tạo Role
                                </button>
                            </div>

                            {/* Search */}
                            <div className="relative mb-3 w-full sm:w-72">
                                <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" size={15} />
                                <input type="text" placeholder="Tìm role..." value={roleSearch} onChange={(e) => setRoleSearch(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-4 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200" />
                            </div>

                            {/* Roles table */}
                            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                                {roleLoading ? (
                                    <div className="flex items-center justify-center gap-2 py-14 text-slate-400">
                                        <Loader2 size={22} className="animate-spin text-violet-400" />
                                        <span className="text-sm">Đang tải...</span>
                                    </div>
                                ) : filteredRoles.length === 0 ? (
                                    <div className="py-14 text-center text-sm text-slate-400">Không có role nào.</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-100 bg-slate-50">
                                                    {['ID', 'Tên Role', 'Mô tả', 'Permissions', ''].map((h) => (
                                                        <th key={h} className="px-5 py-3.5 text-left text-xs font-bold tracking-wide text-slate-500 uppercase">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {filteredRoles.map((r) => (
                                                    <motion.tr key={r.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                                        className="group transition-colors hover:bg-slate-50/60">
                                                        <td className="px-5 py-3.5">
                                                            <span className="font-mono text-xs font-bold text-slate-400" title={r.id}>{shortId(r.id)}</span>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                                                                    <ShieldCheck size={13} />
                                                                </div>
                                                                <span className="font-semibold text-slate-800">{r.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="max-w-[200px] px-5 py-3.5">
                                                            <p className="truncate text-slate-500 text-xs" title={r.description}>{r.description || '—'}</p>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex flex-wrap gap-1">
                                                                {(r.permissions || []).length === 0 ? (
                                                                    <span className="text-xs text-slate-400 italic">Chưa có</span>
                                                                ) : (r.permissions || []).slice(0, 3).map((p) => (
                                                                    <span key={p.id} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{p.name}</span>
                                                                ))}
                                                                {(r.permissions || []).length > 3 && (
                                                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                                                        +{(r.permissions || []).length - 3}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                                                                <button onClick={() => setAssignModal(r)}
                                                                    className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100"
                                                                    title="Quản lý permissions">
                                                                    <Key size={13} />
                                                                </button>
                                                                <button onClick={() => setRoleModal({ mode: 'edit', role: r })}
                                                                    className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
                                                                    title="Sửa role">
                                                                    <Pencil size={13} />
                                                                </button>
                                                                <button onClick={() => setDeleteModal(r)}
                                                                    className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100"
                                                                    title="Xóa role">
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </section>
                    </main>
                </div>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showCreatePerm && <CreatePermissionModal key="cp" onClose={() => setShowCreatePerm(false)} />}
                {roleModal && (
                    <RoleModal
                        key="rm"
                        role={roleModal.mode === 'edit' ? roleModal.role : null}
                        onClose={() => setRoleModal(null)}
                    />
                )}
                {assignModal && (
                    <AssignPermModal
                        key="ap"
                        role={assignModal}
                        allPermissions={permissions}
                        onClose={() => setAssignModal(null)}
                    />
                )}
                {deleteModal && (
                    <DeleteRoleModal
                        key="dr"
                        role={deleteModal}
                        onClose={() => setDeleteModal(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

export default PermissionManagementPage
