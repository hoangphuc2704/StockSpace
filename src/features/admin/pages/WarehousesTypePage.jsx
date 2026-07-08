import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchWarehouseTypes,
  createWarehouseType,
  updateWarehouseType,
  deleteWarehouseType,
  setPage,
  clearActionError,
} from '../../../store/adminWarehouseType'
// ─── ĐỒNG BỘ ĐƯỜNG DẪN IMPORT ACTION TỪ UISLICE CỦA BẠN ───────────────────────
import { toggleSidebar, closeMobileSidebar } from '../../../store/uiSlide'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Layers,
  Plus,
  X,
  Loader2,
  Edit3,
  Trash2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Save,
  Search,
} from 'lucide-react'
import { HiBars3 } from 'react-icons/hi2'
import Sidebar from '../../../components/SideBar'
import logoDaidien from '../../../assets/logoDaidien.png'

const shortId = (id) => (id ? `#${String(id).slice(0, 8).toUpperCase()}` : '—')

// ─── Modal Thêm / Sửa ────────────────────────────────────────────────────────
const WarehouseTypeFormModal = ({ item, onClose }) => {
  const dispatch = useDispatch()
  const { actionLoading, actionError } = useSelector((s) => s.adminWarehouseType)
  const isEdit = !!item

  const [name, setName] = useState(item?.name || '')
  const [description, setDescription] = useState(item?.description || '')
  const [localError, setLocalError] = useState(null)

  useEffect(() => {
    dispatch(clearActionError())
  }, [dispatch])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return setLocalError('Vui lòng nhập tên loại kho.')

    setLocalError(null)

    const payload = {
      name: name.trim(),
      description: description.trim(),
    }

    let result
    if (isEdit) {
      result = await dispatch(updateWarehouseType({ id: item.id, payload }))
    } else {
      result = await dispatch(createWarehouseType(payload))
    }

    if (
      updateWarehouseType.fulfilled.match(result) ||
      createWarehouseType.fulfilled.match(result)
    ) {
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
        transition={{ duration: 0.18 }}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEdit ? 'Cập nhật Loại Kho' : 'Thêm Loại Kho Mới'}
            </h2>
            {isEdit && (
              <p className="mt-0.5 font-mono text-xs text-slate-500">ID: {shortId(item.id)}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Tên Loại Kho <span className="text-rose-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="Ví dụ: Kho mát, Kho lạnh, Kho ngoài trời..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Mô tả chi tiết
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Mô tả đặc điểm của loại kho này..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-relaxed focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none"
            />
          </div>

          {(localError || actionError) && (
            <p className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
              <AlertCircle size={14} /> {localError || actionError}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isEdit ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ─── Modal Xóa ───────────────────────────────────────────────────────────────
const DeleteConfirmModal = ({ item, onClose }) => {
  const dispatch = useDispatch()
  const { actionLoading, actionError } = useSelector((s) => s.adminWarehouseType)

  useEffect(() => {
    dispatch(clearActionError())
  }, [dispatch])

  const handleDelete = async () => {
    const result = await dispatch(deleteWarehouseType(item.id))
    if (deleteWarehouseType.fulfilled.match(result)) onClose()
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
        transition={{ duration: 0.18 }}
        className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <AlertCircle size={24} />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Xóa loại kho này?</h2>
        <p className="mt-2 text-sm text-slate-500">
          Bạn có chắc chắn muốn xóa loại kho <strong className="text-slate-800">{item.name}</strong>{' '}
          không? Hành động này không thể hoàn tác.
        </p>

        {actionError && (
          <p className="mt-4 flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-left text-sm text-rose-600">
            <AlertCircle size={14} /> {actionError}
          </p>
        )}

        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={onClose}
            disabled={actionLoading}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            onClick={handleDelete}
            disabled={actionLoading}
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}{' '}
            Xóa
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const WarehousesTypePage = () => {
  const dispatch = useDispatch()

  // ✅ ĐỒNG BỘ TRẠNG THÁI SIDEBAR (LẤY THÊM isMobileOpen GIỐNG ADMINDASHBOARD)
  const { isSidebarExpanded, isMobileOpen } = useSelector((s) => s.ui)
  const { data, loading, error, page, size, totalPages, totalElements } = useSelector(
    (s) => s.adminWarehouseType
  )

  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [editingItem, setEditingItem] = useState(null)
  const [deletingItem, setDeletingItem] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword)
      dispatch(setPage(0)) // Reset page when searching
    }, 500)
    return () => clearTimeout(timer)
  }, [keyword, dispatch])

  useEffect(() => {
    dispatch(fetchWarehouseTypes({ keyword: debouncedKeyword, page, size }))
  }, [dispatch, debouncedKeyword, page, size])

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* TOP HEADER */}
      <header className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-4">
          {/* ✅ GẮN ACTION TOGGLE SIDEBAR KHI NHẤN NÚT BARS */}
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="rounded-full p-2 text-slate-700 hover:bg-slate-100 active:bg-slate-200"
          >
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

        {/* ✅ BACKDROP OVERLAY TRÊN MOBILE: BẤM RA NGOÀI TỰ ĐỘNG ĐÓNG SIDEBAR */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm md:hidden"
            onClick={() => dispatch(closeMobileSidebar())}
          />
        )}

        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'}`}
        >
          <main className="mx-auto w-full max-w-5xl space-y-6 p-6 md:p-8">
            {/* Page header */}
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                  <Layers className="text-blue-500" size={24} /> Phân Loại Kho
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Quản lý danh mục các loại hình kho bãi mà hệ thống hỗ trợ.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search
                    className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="w-full min-w-[240px] rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-9 text-sm shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-white shadow-sm hover:bg-blue-700"
                >
                  <Plus size={16} /> Thêm Loại Kho
                </button>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <AlertCircle size={16} className="text-rose-600" /> {error}
              </div>
            )}

            {/* Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
                  <Loader2 size={28} className="animate-spin text-blue-400" />
                  <span className="text-sm font-medium">Đang tải dữ liệu...</span>
                </div>
              ) : data.length === 0 ? (
                <div className="py-20 text-center text-sm text-slate-400">
                  Không tìm thấy loại kho nào trong hệ thống.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        {['Tên Loại Kho / ID', 'Mô tả', ''].map((h) => (
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
                      {data.map((item) => (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="group transition-colors hover:bg-slate-50/60"
                        >
                          <td className="w-1/4 px-5 py-4">
                            <p className="text-base font-bold text-slate-800">{item.name}</p>
                            <p className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                              {shortId(item.id)}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="max-w-2xl leading-relaxed text-slate-600">
                              {item.description || (
                                <span className="text-slate-400 italic">Không có mô tả</span>
                              )}
                            </p>
                          </td>
                          <td className="w-32 px-5 py-4 text-right">
                            <div className="inline-flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                              <button
                                onClick={() => setEditingItem(item)}
                                className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50"
                                title="Chỉnh sửa"
                              >
                                <Edit3 size={18} />
                              </button>
                              <button
                                onClick={() => setDeletingItem(item)}
                                className="rounded-lg p-2 text-rose-600 transition-colors hover:bg-rose-50"
                                title="Xóa"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
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
                  <span className="text-sm font-medium text-slate-500">
                    Trang {page + 1} / {totalPages} · Tổng cộng {totalElements.toLocaleString()} mục
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => dispatch(setPage(page - 1))}
                      disabled={page === 0 || loading}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="px-2 text-sm font-bold text-slate-700">{page + 1}</span>
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
        {showCreate && <WarehouseTypeFormModal key="create" onClose={() => setShowCreate(false)} />}
        {editingItem && (
          <WarehouseTypeFormModal
            key="edit"
            item={editingItem}
            onClose={() => setEditingItem(null)}
          />
        )}
        {deletingItem && (
          <DeleteConfirmModal
            key="delete"
            item={deletingItem}
            onClose={() => setDeletingItem(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default WarehousesTypePage
