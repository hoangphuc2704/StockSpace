import React, { useState, useEffect } from 'react'
import useEscapeKey from '@/hooks/useEscapeKey'
import TableActionMenu from '@/components/TableActionMenu'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchPackages,
  createPackage,
  updatePackage,
  deletePackage,
  fetchSubscriptions,
  setSubPage,
  clearActionError,
} from '../../../store/adminPackagesSubcription'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package,
  History,
  Plus,
  X,
  Loader2,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Save,
  CalendarDays,
  DollarSign,
  Tag,
} from 'lucide-react'
import { HiBars3 } from 'react-icons/hi2'
import Badge from '../../../components/atoms/Badge'
import Sidebar from '../../../components/SideBar'
import logoDaidien from '../../../assets/logoDaidien.png'
import { parseFeaturesToList } from '../../../utils/formatFeatures'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatDate = (dt) => (dt ? new Date(dt).toLocaleDateString('en-US') : '—')
const formatVND = (amount) => (amount != null ? Number(amount).toLocaleString('en-US') + ' ₫' : '—')
const shortId = (id) => (id ? `#${String(id).slice(0, 8).toUpperCase()}` : '—')

const SUB_STATUS_CONFIG = {
  ACTIVE: { label: 'Active', variant: 'success' },
  EXPIRED: { label: 'Expired', variant: 'slate' },
  CANCELLED: { label: 'Canceled', variant: 'danger' },
}

// ─── Modals ───────────────────────────────────────────────────────────────────
const PackageFormModal = ({ pkg, onClose }) => {
  useEscapeKey(true, onClose)
  const dispatch = useDispatch()
  const { actionLoading, actionError } = useSelector((s) => s.adminPackagesSubcription)
  const isEdit = !!pkg

  const [name, setName] = useState(pkg?.name || '')
  const [features, setFeatures] = useState(pkg?.features || '')
  const [price, setPrice] = useState(pkg?.price || '')
  const [durationDays, setDurationDays] = useState(pkg?.durationDays || '')
  const [maxStaff, setMaxStaff] = useState(pkg?.maxStaff !== undefined ? pkg.maxStaff : 0)
  const [localError, setLocalError] = useState(null)

  useEffect(() => {
    dispatch(clearActionError())
  }, [dispatch])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return setLocalError('Please enter package name')
    if (price === '' || isNaN(price) || Number(price) < 0)
      return setLocalError('Price is not valid')
    if (!durationDays || isNaN(durationDays) || Number(durationDays) < 1)
      return setLocalError('Minimum duration 1 day')
    if (maxStaff === '' || isNaN(maxStaff) || Number(maxStaff) < 0)
      return setLocalError('The employee limit cannot be negative')

    setLocalError(null)

    const payload = {
      name: name.trim(),
      features: features.trim(),
      price: Number(price),
      durationDays: Number(durationDays),
      maxStaff: Number(maxStaff),
    }

    let result
    if (isEdit) {
      result = await dispatch(updatePackage({ id: pkg.id, payload }))
    } else {
      result = await dispatch(createPackage(payload))
    }

    if (updatePackage.fulfilled.match(result) || createPackage.fulfilled.match(result)) {
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
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEdit ? 'Update Service Pack' : 'Add new Service Pack'}
            </h2>
            {isEdit && (
              <p className="mt-0.5 font-mono text-xs text-slate-500">ID: {shortId(pkg.id)}</p>
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
              Package name <span className="text-rose-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="For example: Premium Storage Package..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Price (VND) <span className="text-rose-500">*</span>
              </label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                type="number"
                min="0"
                placeholder="0"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Term (Days) <span className="text-rose-500">*</span>
              </label>
              <input
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                type="number"
                min="1"
                placeholder="For example: 30"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Employee limit (0 = Unlimited) <span className="text-rose-500">*</span>
            </label>
            <input
              value={maxStaff}
              onChange={(e) => setMaxStaff(e.target.value)}
              type="number"
              min="0"
              placeholder="For example: 5"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Features / Benefits
            </label>
            <textarea
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              rows={3}
              placeholder="Description of package benefits..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-relaxed focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none"
            />
          </div>

          {(localError || actionError) && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {localError || actionError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {isEdit ? 'Update' : 'Add package'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

const DeleteConfirmModal = ({ pkg, onClose }) => {
  useEscapeKey(true, onClose)
  const dispatch = useDispatch()
  const { actionLoading, actionError } = useSelector((s) => s.adminPackagesSubcription)

  useEffect(() => {
    dispatch(clearActionError())
  }, [dispatch])

  const handleDelete = async () => {
    const result = await dispatch(deletePackage(pkg.id))
    if (deletePackage.fulfilled.match(result)) onClose()
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
        <h2 className="text-lg font-bold text-slate-900">Delete service pack?</h2>
        <p className="mt-2 text-sm text-slate-500">
          Are you sure you want to stop offering the package <strong>{pkg.name}</strong>? Existing
          subscriptions may not be affected.
        </p>

        {actionError && (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-left text-sm text-rose-600">
            {actionError}
          </p>
        )}

        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={onClose}
            disabled={actionLoading}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={actionLoading}
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}{' '}
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const Packages_SubcriptionsManagementPage = () => {
  const dispatch = useDispatch()
  const { isSidebarExpanded } = useSelector((s) => s.ui)
  const {
    packages,
    packagesLoading,
    packagesError,
    subscriptions,
    subPage,
    subSize,
    subTotalPages,
    subTotalElements,
    subsLoading,
    subsError,
  } = useSelector((s) => s.adminPackagesSubcription)

  const [activeTab, setActiveTab] = useState('packages')
  const [editingPkg, setEditingPkg] = useState(null)
  const [deletingPkg, setDeletingPkg] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    if (activeTab === 'packages') {
      dispatch(fetchPackages())
    } else {
      dispatch(fetchSubscriptions({ page: subPage, size: subSize }))
    }
  }, [dispatch, activeTab, subPage, subSize])

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-4">
          <button className="rounded-full p-2 text-slate-700 hover:bg-slate-100 active:bg-slate-200">
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

      <div className="flex pt-14">
        <Sidebar currentRole="ADMIN" />

        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'}`}
        >
          <main className="mx-auto w-full max-w-5xl space-y-6 p-6 md:p-8">
            {/* Page header */}
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                  <Package className="text-blue-500" size={24} /> Service Plans &amp; Subscriptions
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Manage posting packages and track Tenant's package rental history.
                </p>
              </div>
              {activeTab === 'packages' && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  <Plus size={16} /> Add Service Pack
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
              <button
                onClick={() => setActiveTab('packages')}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === 'packages' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}
              >
                <Package size={16} /> Package List
              </button>
              <button
                onClick={() => setActiveTab('subscriptions')}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === 'subscriptions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}
              >
                <History size={16} /> Registration History
              </button>
            </div>

            {/* Error banner */}
            {(packagesError || subsError) && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <AlertCircle size={14} className="mr-1.5 inline" />
                {packagesError || subsError}
              </div>
            )}

            {/* TAB: PACKAGES */}
            {activeTab === 'packages' && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {packagesLoading ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
                    <Loader2 size={28} className="animate-spin text-blue-400" />
                    <span className="text-sm">Loading service pack...</span>
                  </div>
                ) : packages.length === 0 ? (
                  <div className="py-20 text-center text-sm text-slate-400">
                    There are no service packages yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          {['Package/Feature Name', 'Price', 'Deadline', 'Maximum staff', ''].map(
                            (h) => (
                              <th
                                key={h}
                                className="px-5 py-3.5 text-left text-xs font-bold tracking-wide text-slate-500 uppercase"
                              >
                                {h}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {packages.map((pkg) => (
                          <motion.tr
                            key={pkg.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="group transition-colors hover:bg-slate-50/60"
                          >
                            <td className="px-5 py-4">
                              <p className="font-bold text-slate-800">{pkg.name}</p>
                              <div
                                className="mt-1 max-w-sm text-xs text-slate-500"
                                title={pkg.features}
                              >
                                {pkg.features
                                  ? parseFeaturesToList(pkg.features).map((feat, i) => (
                                      <span key={i} className="block">
                                        • {feat}
                                      </span>
                                    ))
                                  : 'No feature description available'}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-base font-bold whitespace-nowrap text-emerald-700 text-slate-800">
                                <DollarSign size={14} /> {formatVND(pkg.price)}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-flex items-center gap-1 font-medium whitespace-nowrap text-slate-700">
                                <CalendarDays size={14} className="text-slate-400" />{' '}
                                {pkg.durationDays} day
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-flex items-center gap-1 font-medium whitespace-nowrap text-slate-700">
                                {pkg.maxStaff > 0 ? `${pkg.maxStaff} staff` : 'Unlimited'}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <TableActionMenu
                                items={[
                                  { label: 'Edit', icon: Edit3, onClick: () => setEditingPkg(pkg) },
                                  {
                                    label: 'Delete',
                                    icon: Trash2,
                                    onClick: () => setDeletingPkg(pkg),
                                    danger: true,
                                  },
                                ]}
                              />
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: SUBSCRIPTIONS */}
            {activeTab === 'subscriptions' && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {subsLoading ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
                    <Loader2 size={28} className="animate-spin text-blue-400" />
                    <span className="text-sm">Loading history...</span>
                  </div>
                ) : subscriptions.length === 0 ? (
                  <div className="py-20 text-center text-sm text-slate-400">
                    There is no registration history yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          {[
                            'Registration ID / Tenant',
                            'Service package',
                            'Package price',
                            'Start date',
                            'End date',
                            'Status',
                          ].map((h) => (
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
                        {subscriptions.map((sub) => {
                          const statusCfg = SUB_STATUS_CONFIG[sub.status] || {
                            label: sub.status,
                            variant: 'slate',
                          }
                          return (
                            <motion.tr
                              key={sub.id}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="group transition-colors hover:bg-slate-50/60"
                            >
                              <td className="px-5 py-3">
                                <p className="font-mono text-xs font-bold text-slate-500">
                                  {shortId(sub.id)}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-400">
                                  Tenant: {shortId(sub.tenantId)}
                                </p>
                              </td>
                              <td className="px-5 py-3">
                                <p className="flex items-center gap-1.5 font-bold text-slate-800">
                                  <Tag size={12} className="text-blue-500" />
                                  {sub.servicePackage?.name || 'Package has been removed'}
                                </p>
                                {sub.servicePackage?.durationDays && (
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    {sub.servicePackage.durationDays} day
                                  </p>
                                )}
                              </td>
                              <td className="px-5 py-3 font-medium whitespace-nowrap text-slate-700">
                                {sub.servicePackage ? formatVND(sub.servicePackage.price) : '—'}
                              </td>
                              <td className="px-5 py-3 whitespace-nowrap text-slate-600">
                                {formatDate(sub.startDate)}
                              </td>
                              <td className="px-5 py-3 whitespace-nowrap text-slate-600">
                                {formatDate(sub.endDate)}
                              </td>
                              <td className="px-5 py-3 whitespace-nowrap">
                                <Badge
                                  variant={statusCfg.variant}
                                  size="sm"
                                  className="rounded-full"
                                >
                                  {statusCfg.label}
                                </Badge>
                              </td>
                            </motion.tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination for Subscriptions */}
                {subTotalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                    <span className="text-sm text-slate-500">
                      Page {subPage + 1} / {subTotalPages} · {subTotalElements.toLocaleString()}{' '}
                      registrations
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => dispatch(setSubPage(subPage - 1))}
                        disabled={subPage === 0 || subsLoading}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-sm font-semibold text-slate-700">{subPage + 1}</span>
                      <button
                        onClick={() => dispatch(setSubPage(subPage + 1))}
                        disabled={subPage >= subTotalPages - 1 || subsLoading}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreate && <PackageFormModal key="create-pkg" onClose={() => setShowCreate(false)} />}
        {editingPkg && (
          <PackageFormModal key="edit-pkg" pkg={editingPkg} onClose={() => setEditingPkg(null)} />
        )}
        {deletingPkg && (
          <DeleteConfirmModal
            key="delete-pkg"
            pkg={deletingPkg}
            onClose={() => setDeletingPkg(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default Packages_SubcriptionsManagementPage
