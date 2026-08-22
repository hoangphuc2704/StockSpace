import React, { useState, useEffect } from 'react'
import { FormShell } from '@/form/FormControls'
import useEscapeKey from '@/hooks/useEscapeKey'
import TableActionMenu from '@/components/TableActionMenu'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  activateUser,
  deactivateUser,
  resetUserPassword,
  setFilters,
  setPage,
  clearError,
} from '../../../store/adminUserSlice'
// Import các action từ uiSlice để đồng bộ đóng mở sidebar toàn hệ thống
import { toggleSidebar, closeMobileSidebar } from '../../../store/uiSlide'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  X,
  Shield,
  Mail,
  Phone,
  AlertCircle,
} from 'lucide-react'
import { HiBars3 } from 'react-icons/hi2'
import DataTable from '../../../components/organisms/DataTable'
import Badge from '../../../components/atoms/Badge'
import Button from '../../../components/atoms/Button'
import Avatar from '../../../components/atoms/Avatar'
import Sidebar from '../../../components/SideBar'
import logoDaidien from '../../../assets/logoDaidien.png'
import { validateUserForm, validateUserPasswordReset } from '@/config/validation'

// ==================== HELPER ====================
const getRoleBadgeVariant = (roleName = '') => {
  if (roleName.includes('ADMIN')) return 'danger'
  if (roleName.includes('OWNER')) return 'primary'
  if (roleName.includes('TENANT')) return 'success'
  if (roleName.includes('INSPECTOR')) return 'warning'
  return 'slate'
}

const formatRoleName = (name = '') =>
  name.replace('ROLE_', '').charAt(0) + name.replace('ROLE_', '').slice(1).toLowerCase()

// ==================== MODAL TẠO / CHỈNH SỬA USER ====================
const UserFormModal = ({ user, onClose, onSave, loading }) => {
  useEscapeKey(true, onClose)
  const isEdit = !!user?.id
  const [form, setForm] = useState({
    email: user?.email || '',
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = validateUserForm(form, isEdit)
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    if (isEdit) {
      onSave({ fullName: form.fullName, phone: form.phone })
    } else {
      onSave({
        email: form.email,
        fullName: form.fullName,
        phone: form.phone,
        password: form.password,
        roleIds: [],
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-900">
            {isEdit ? 'Edit users' : 'Create a new user'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <FormShell onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {!isEdit && (
            <div>
              <label className="mb-1.5 block text-xs font-bold tracking-wider text-slate-500 uppercase">
                Email *
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="user@example.com"
                  className={`focus:ring-primary/20 w-full rounded-lg border py-2 pr-4 pl-9 text-sm focus:ring-2 focus:outline-none ${errors.email ? 'border-red-400' : 'border-slate-200'}`}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-bold tracking-wider text-slate-500 uppercase">
              Full name *
            </label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              placeholder="Nguyen Van A"
              className={`focus:ring-primary/20 w-full rounded-lg border px-4 py-2 text-sm focus:ring-2 focus:outline-none ${errors.fullName ? 'border-red-400' : 'border-slate-200'}`}
            />
            {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold tracking-wider text-slate-500 uppercase">
              Phone number
            </label>
            <div className="relative">
              <Phone
                size={15}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
              />
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="0901234567"
                className="focus:ring-primary/20 w-full rounded-lg border border-slate-200 py-2 pr-4 pl-9 text-sm focus:ring-2 focus:outline-none"
              />
            </div>
          </div>

          {!isEdit && (
            <div>
              <label className="mb-1.5 block text-xs font-bold tracking-wider text-slate-500 uppercase">
                Password *
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Minimum 8 characters, with uppercase letters and numbers"
                className={`focus:ring-primary/20 w-full rounded-lg border px-4 py-2 text-sm focus:ring-2 focus:outline-none ${errors.password ? 'border-red-400' : 'border-slate-200'}`}
              />
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading}>
              {isEdit ? 'Save changes' : 'Create users'}
            </Button>
          </div>
        </FormShell>
      </motion.div>
    </div>
  )
}

// ==================== MODAL ĐẶT LẠI MẬT KHẨU ====================
const ResetPasswordModal = ({ user, onClose, onSave, loading }) => {
  useEscapeKey(true, onClose)
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = validateUserPasswordReset(form)
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    onSave({ newPassword: form.newPassword, confirmPassword: form.confirmPassword })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-900">Reset password</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-4">
          <p className="mb-4 text-sm text-slate-500">
            Reset password for: <strong className="text-slate-800">{user?.fullName}</strong> (
            {user?.email})
          </p>
          <FormShell onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold tracking-wider text-slate-500 uppercase">
                New password *
              </label>
              <input
                type="password"
                value={form.newPassword}
                onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                placeholder="Minimum 8 characters, with uppercase letters and numbers"
                className={`focus:ring-primary/20 w-full rounded-lg border px-4 py-2 text-sm focus:ring-2 focus:outline-none ${errors.newPassword ? 'border-red-400' : 'border-slate-200'}`}
              />
              {errors.newPassword && (
                <p className="mt-1 text-xs text-red-500">{errors.newPassword}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold tracking-wider text-slate-500 uppercase">
                Confirm password *
              </label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                placeholder="Re-enter the password"
                className={`focus:ring-primary/20 w-full rounded-lg border px-4 py-2 text-sm focus:ring-2 focus:outline-none ${errors.confirmPassword ? 'border-red-400' : 'border-slate-200'}`}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" isLoading={loading}>
                Reset password
              </Button>
            </div>
          </FormShell>
        </div>
      </motion.div>
    </div>
  )
}

// ==================== MODAL XÁC NHẬN XÓA ====================
const DeleteConfirmModal = ({ user, onClose, onConfirm, loading }) => {
  useEscapeKey(true, onClose)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="p-6 text-center">
          <div className="bg-danger/10 text-danger mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full">
            <AlertCircle size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Confirm user deletion</h3>
          <p className="mt-2 text-sm text-slate-500">
            You are about to permanently delete your account{' '}
            <strong className="text-slate-800">{user?.fullName}</strong>. This action cannot be
            undone work.
          </p>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              className="bg-danger hover:bg-danger/90 flex-1 border-0 text-black"
              onClick={onConfirm}
              isLoading={loading}
            >
              Delete
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ==================== TRANG CHÍNH ====================
const UserManagementPage = () => {
  const dispatch = useDispatch()
  const {
    data: users,
    loading,
    actionLoading,
    error,
    page,
    totalPages,
    totalElements,
    filters,
  } = useSelector((state) => state.adminUser)

  // ✅ Đã chuyển sang sử dụng Redux Store chung cho Sidebar thay vì tạo useState local
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  const [searchInput, setSearchInput] = useState('')

  // Modals
  const [formModal, setFormModal] = useState(null) // null | 'create' | UserResponse (edit)
  const [resetModal, setResetModal] = useState(null) // null | UserResponse
  const [deleteModal, setDeleteModal] = useState(null) // null | UserResponse

  // Fetch khi filter / page thay đổi
  useEffect(() => {
    dispatch(fetchUsers({ ...filters, page }))
  }, [dispatch, filters, page])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(setFilters({ keyword: searchInput || undefined }))
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput, dispatch])

  const handleFilterStatus = (isActive) => {
    dispatch(setFilters({ isActive }))
  }

  const handleSaveForm = (data) => {
    if (formModal === 'create') {
      dispatch(createUser(data))
        .unwrap()
        .then(() => setFormModal(null))
    } else {
      dispatch(updateUser({ id: formModal.id, data }))
        .unwrap()
        .then(() => setFormModal(null))
    }
  }

  const handleResetPassword = (data) => {
    dispatch(resetUserPassword({ id: resetModal.id, data }))
      .unwrap()
      .then(() => setResetModal(null))
  }

  const handleDeleteConfirm = () => {
    dispatch(deleteUser(deleteModal.id))
      .unwrap()
      .then(() => setDeleteModal(null))
  }

  // ==================== COLUMNS ====================
  const columns = [
    {
      header: 'User',
      render: (row) => (
        <div className="flex items-center gap-3 py-1">
          <Avatar alt={row.fullName} size="sm" />
          <div>
            <p className="font-semibold text-slate-900">{row.fullName || '—'}</p>
            <p className="text-xs text-slate-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Phone number',
      render: (row) => <span className="text-sm text-slate-600">{row.phone || '—'}</span>,
    },
    {
      header: 'Role',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles?.length > 0 ? (
            row.roles.map((r) => (
              <Badge key={r.id} variant={getRoleBadgeVariant(r.name)} size="sm">
                <Shield size={10} className="mr-1 inline" />
                {formatRoleName(r.name)}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-slate-400">No role yet</span>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge
          variant={(row.active !== undefined ? row.active : row.isActive) ? 'success' : 'danger'}
          size="sm"
          className="rounded-full"
        >
          {(row.active !== undefined ? row.active : row.isActive) ? 'Activities' : 'Locked'}
        </Badge>
      ),
    },
    {
      header: 'Creation date',
      render: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-US') : '—'),
    },
    {
      header: 'Actions',
      render: (row) => (
        <TableActionMenu
          items={[
            { label: 'Edit', icon: Edit2, onClick: () => setFormModal(row) },
            (row.active !== undefined ? row.active : row.isActive)
              ? {
                  label: 'Lock account',
                  icon: UserX,
                  onClick: () => dispatch(deactivateUser(row.id)),
                }
              : {
                  label: 'Activate account',
                  icon: UserCheck,
                  onClick: () => dispatch(activateUser(row.id)),
                },
            { label: 'Reset password', icon: KeyRound, onClick: () => setResetModal(row) },
            {
              label: 'Delete user',
              icon: Trash2,
              onClick: () => setDeleteModal(row),
              danger: true,
            },
          ]}
        />
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* TOP HEADER */}
      <header className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-4">
          <button
            // ✅ Đã đổi nút bấm sang kích hoạt Action Redux
            onClick={() => dispatch(toggleSidebar())}
            className="rounded-full p-2 text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200"
          >
            <HiBars3 className="h-6 w-6" />
          </button>
          <div className="flex cursor-pointer items-center gap-2">
            <div className="shrink-0 rounded-lg bg-white p-1.5">
              <a href="/" aria-label="Back to landing page">
                <img src={logoDaidien} alt="Logo" className="h-10 w-17" />
              </a>
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-slate-950">
              StockSpace Admin
            </span>
          </div>
        </div>
      </header>

      {/* MOBILE OVERLAY */}
      <div className="md:hidden">
        {isMobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/30"
            // ✅ Đồng bộ hành vi đóng overlay
            onClick={() => dispatch(closeMobileSidebar())}
          />
        )}
      </div>

      <div className="flex pt-14">
        {/* ✅ Bỏ truyền state local cũ, để Sidebar tự lắng nghe store */}
        <Sidebar currentRole="ADMIN" />

        {/* MAIN CONTENT CONTAINER */}
        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
          }`}
        >
          <main className="mx-auto w-full max-w-400 space-y-6 p-6 md:p-8">
            {/* Page Header */}
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">User management</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Total <span className="font-semibold text-slate-700">{totalElements}</span> users
                  in the system.
                </p>
              </div>
              <Button onClick={() => setFormModal('create')}>
                <Plus size={16} className="mr-2" /> Create users
              </Button>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle size={16} />
                {error}
                <button className="ml-auto" onClick={() => dispatch(clearError())}>
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row">
              <div className="relative w-full md:w-80">
                <Search
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by email, full name, phone number..."
                  className="focus:ring-primary/20 w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-4 pl-9 text-sm transition-all focus:ring-2 focus:outline-none"
                />
              </div>

              <div className="flex w-full items-center gap-2 md:w-auto">
                <button
                  onClick={() => dispatch(setFilters({ isActive: undefined }))}
                  // className={`whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium transition-colors ${filters.isActive === undefined

                  className={`rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors ${
                    filters.isActive === undefined
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => handleFilterStatus(true)}
                  // className={`whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium transition-colors ${filters.isActive === true

                  className={`rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors ${
                    filters.isActive === true
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Activities
                </button>
                <button
                  onClick={() => handleFilterStatus(false)}
                  // className={`whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium transition-colors ${filters.isActive === false

                  className={`rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors ${
                    filters.isActive === false
                      ? 'bg-red-500 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Locked
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-x-auto"
              >
                {loading ? (
                  <div className="flex h-48 items-center justify-center">
                    <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-400">
                    <Users size={32} />
                    <p className="text-sm">There are no users</p>
                  </div>
                ) : (
                  <DataTable columns={columns} data={users} />
                )}
              </motion.div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                  <p className="text-sm text-slate-500">
                    Page {page + 1} / {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={page === 0}
                      onClick={() => dispatch(setPage(page - 1))}
                      className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      disabled={page >= totalPages - 1}
                      onClick={() => dispatch(setPage(page + 1))}
                      className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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

      {/* MODALS */}
      <AnimatePresence>
        {formModal && (
          <UserFormModal
            user={formModal === 'create' ? null : formModal}
            onClose={() => setFormModal(null)}
            onSave={handleSaveForm}
            loading={actionLoading}
          />
        )}
        {resetModal && (
          <ResetPasswordModal
            user={resetModal}
            onClose={() => setResetModal(null)}
            onSave={handleResetPassword}
            loading={actionLoading}
          />
        )}
        {deleteModal && (
          <DeleteConfirmModal
            user={deleteModal}
            onClose={() => setDeleteModal(null)}
            onConfirm={handleDeleteConfirm}
            loading={actionLoading}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default UserManagementPage
