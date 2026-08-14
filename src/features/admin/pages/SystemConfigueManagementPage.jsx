import React, { useState, useEffect } from 'react'
import useEscapeKey from '@/hooks/useEscapeKey'
import TableActionMenu from '@/components/TableActionMenu'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchSystemConfigs,
  updateSystemConfig,
  clearActionError,
} from '../../../store/adminSystemConfigueManagement'
import { fetchPackages } from '../../../store/adminPackagesSubcription'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings,
  X,
  Loader2,
  Edit3,
  CheckCircle2,
  Clock,
  AlertCircle,
  Hash,
  Save,
} from 'lucide-react'
import { HiBars3 } from 'react-icons/hi2'
import Badge from '../../../components/atoms/Badge'
import Sidebar from '../../../components/SideBar'
import logoDaidien from '../../../assets/logoDaidien.png'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatDate = (dt) => (dt ? new Date(dt).toLocaleString('en-US', { hour12: false }) : '—')

const CONFIG_KEY_LABELS = {
  deposit_percentage: 'Warehouse rental deposit rate (%)',
  contract_expiry_days: 'Contract signing deadline (Day)',
  inspection_fee: 'Inspection request fee (VND)',
  warehouse_publish_package_id: 'Warehouse registration fee',
}

const formatConfigValue = (key, val, packages = []) => {
  if (!val) return '—'
  if (key === 'inspection_fee') return Number(val).toLocaleString('en-US') + ' ₫'
  if (key === 'deposit_percentage') return val + '%'
  if (key === 'contract_expiry_days') return val + 'day'
  if (key === 'warehouse_publish_package_id') {
    const pkg = packages.find((p) => p.id === val)
    if (pkg) return `${pkg.name} - ${Number(pkg.price).toLocaleString('en-US')} ₫`
  }
  return val
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
const EditConfigModal = ({ configItem, packages, onClose }) => {
  useEscapeKey(true, onClose)
  const dispatch = useDispatch()
  const { actionLoading, actionError } = useSelector((s) => s.adminSystemConfig)
  const [configValue, setConfigValue] = useState(configItem.configValue || '')
  const [description, setDescription] = useState(configItem.description || '')
  const [localError, setLocalError] = useState(null)

  useEffect(() => {
    dispatch(clearActionError())
  }, [dispatch])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!configValue.trim()) {
      setLocalError('Please enter a value.')
      return
    }
    setLocalError(null)

    const result = await dispatch(
      updateSystemConfig({
        key: configItem.configKey,
        configValue: configValue.trim(),
        description: description.trim(),
      })
    )
    if (updateSystemConfig.fulfilled.match(result)) onClose()
  }

  const title = CONFIG_KEY_LABELS[configItem.configKey] || configItem.configKey

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
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
            <h2 className="text-lg font-bold text-slate-900">Update Configuration</h2>
            <p className="mt-0.5 inline-block rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500">
              {configItem.configKey}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm">
            <p className="mb-1 text-xs font-medium text-blue-500">Setup: {title}</p>
            <p className="text-xs text-slate-600">{configItem.description}</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Configuration value <span className="text-rose-500">*</span>
            </label>
            {configItem.configKey === 'warehouse_publish_package_id' ? (
              <select
                value={configValue}
                onChange={(e) => setConfigValue(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none"
              >
                <option value="">-- Select Service Package --</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - {Number(p.price).toLocaleString('en-US')} ₫
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={configValue}
                onChange={(e) => setConfigValue(e.target.value)}
                placeholder="Enter new configuration values..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none"
              />
            )}
            <p className="mt-1 text-xs text-slate-400">
              {configItem.configKey === 'deposit_percentage' && 'For example: 10 (represents 10%)'}
              {configItem.configKey === 'inspection_fee' && 'Enter the amount in VND (no commas)'}
              {configItem.configKey === 'warehouse_publish_package_id' &&
                'Select the default warehouse posting package'}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Detailed description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Notes on this configuration..."
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
              Update
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const SystemConfigueManagementPage = () => {
  const dispatch = useDispatch()
  const { isSidebarExpanded } = useSelector((s) => s.ui)
  const { data: configs, loading, error } = useSelector((s) => s.adminSystemConfig)
  const { packages } = useSelector((s) => s.adminPackagesSubcription)

  const [selectedItem, setSelectedItem] = useState(null)

  useEffect(() => {
    dispatch(fetchSystemConfigs())
    dispatch(fetchPackages())
  }, [dispatch])

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
          <main className="mx-auto w-full max-w-400 space-y-6 p-6 md:p-8">
            {/* Page header */}
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                  <Settings className="text-blue-500" size={24} /> Configuration &amp; Fee Schedule
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Set up shared variables across the system (fees, deadlines...).
                </p>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <AlertCircle size={14} className="mr-1.5 inline" />
                {error}
              </div>
            )}

            {/* Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
                  <Loader2 size={28} className="animate-spin text-blue-400" />
                  <span className="text-sm">Loading configuration...</span>
                </div>
              ) : configs.length === 0 ? (
                <div className="py-20 text-center text-sm text-slate-400">
                  There are no configurations yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        {['Configuration Name / Key', 'Value', 'Description', 'Update', ''].map(
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
                      {configs.map((cfg) => {
                        const title = CONFIG_KEY_LABELS[cfg.configKey] || cfg.configKey
                        return (
                          <motion.tr
                            key={cfg.configKey}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="group transition-colors hover:bg-slate-50/60"
                          >
                            <td className="px-5 py-4">
                              <p className="font-bold text-slate-800">{title}</p>
                              <p className="mt-0.5 inline-block rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] text-slate-400">
                                {cfg.configKey}
                              </p>
                            </td>
                            <td className="px-5 py-4">
                              <span className="rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-base font-bold whitespace-nowrap text-slate-800">
                                {formatConfigValue(cfg.configKey, cfg.configValue, packages)}
                              </span>
                            </td>
                            <td className="max-w-sm px-5 py-4 text-slate-600">
                              <p className="line-clamp-2" title={cfg.description}>
                                {cfg.description || 'No description available'}
                              </p>
                            </td>
                            <td className="px-5 py-4 text-xs whitespace-nowrap text-slate-500">
                              {formatDate(cfg.updatedAt)}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <TableActionMenu
                                items={[
                                  {
                                    label: 'Edit',
                                    icon: Edit3,
                                    onClick: () => setSelectedItem(cfg),
                                  },
                                ]}
                              />
                            </td>
                          </motion.tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedItem && (
          <EditConfigModal
            key="edit-modal"
            configItem={selectedItem}
            packages={packages}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default SystemConfigueManagementPage
