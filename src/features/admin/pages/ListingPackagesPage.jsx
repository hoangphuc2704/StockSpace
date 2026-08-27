import { useEffect, useState } from 'react'
import { CalendarDays, CheckCircle2, Edit3, Loader2, Menu, Plus, Save, Trash2, X } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'react-hot-toast'
import Sidebar from '@/components/SideBar'
import Button from '@/components/atoms/Button'
import logoDaidien from '@/assets/logoDaidien.png'
import listingApi from '@/services/listingApi'
import { toggleSidebar, closeMobileSidebar } from '@/store/uiSlide'
import { showApiErrorToast } from '@/config/apiError'

const DURATIONS = [10, 15, 30]

const formatVND = (value) =>
  value == null ? '—' : `${Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} ₫`

const emptyForm = { name: '', durationDays: 10, price: '' }
const isPackageActive = (pkg) => Boolean(pkg?.isActive ?? pkg?.active)

const PackageFormModal = ({ packageToEdit, onClose, onSaved }) => {
  const [form, setForm] = useState(
    packageToEdit
      ? {
          name: packageToEdit.name || '',
          durationDays: packageToEdit.durationDays || 10,
          price: packageToEdit.price ?? '',
        }
      : emptyForm
  )
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    const name = form.name.trim()
    const durationDays = Number(form.durationDays)
    const price = Number(form.price)

    if (!name) return setError('Package name is required.')
    if (!DURATIONS.includes(durationDays)) return setError('Duration must be 10, 15 or 30 days.')
    if (!Number.isFinite(price) || price < 0) return setError('Price must be zero or greater.')

    try {
      setIsSaving(true)
      const payload = { name, durationDays, price }
      if (packageToEdit) {
        await listingApi.updateAdminPackage(packageToEdit.id, payload)
      } else {
        await listingApi.createAdminPackage(payload)
      }
      toast.success(packageToEdit ? 'Listing package updated.' : 'Listing package created.')
      onSaved()
      onClose()
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Could not save listing package.')
      showApiErrorToast(apiError, 'Could not save listing package.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-blue-600 uppercase">Warehouse visibility</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">{packageToEdit ? 'Edit listing package' : 'New listing package'}</h2>
            <p className="mt-1 text-sm text-slate-500">Separate from tenant service subscriptions.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Package name</label>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={150} placeholder="Featured warehouse" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Duration</label>
              <select value={form.durationDays} onChange={(event) => setForm({ ...form, durationDays: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:outline-none">
                {DURATIONS.map((duration) => <option key={duration} value={duration}>{duration} days</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Price (VND)</label>
              <input type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="50000" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:outline-none" />
            </div>
          </div>
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" isLoading={isSaving}><Save className="mr-2 h-4 w-4" /> Save package</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

const ListingPackagesPage = () => {
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  const [packages, setPackages] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingPackage, setEditingPackage] = useState(null)
  const [isCreating, setIsCreating] = useState(false)

  const loadPackages = async () => {
    try {
      setIsLoading(true)
      const response = await listingApi.getAdminPackages()
      const payload = response?.data?.data || response?.data
      setPackages(Array.isArray(payload) ? payload : [])
    } catch (error) {
      showApiErrorToast(error, 'Could not load listing packages.')
      setPackages([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => loadPackages(), 0)
    return () => window.clearTimeout(timer)
  }, [])

  const togglePackage = async (pkg) => {
    try {
      if (isPackageActive(pkg)) await listingApi.deactivateAdminPackage(pkg.id)
      else await listingApi.activateAdminPackage(pkg.id)
      toast.success(isPackageActive(pkg) ? 'Listing package deactivated.' : 'Listing package activated.')
      loadPackages()
    } catch (error) {
      showApiErrorToast(error, 'Could not update package status.')
    }
  }

  const deletePackage = async (pkg) => {
    if (!window.confirm(`Delete “${pkg.name}”?`)) return
    try {
      await listingApi.deleteAdminPackage(pkg.id)
      toast.success('Listing package deleted.')
      loadPackages()
    } catch (error) {
      showApiErrorToast(error, 'Could not delete listing package.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center gap-4 border-b border-slate-200 bg-white px-4">
        <button type="button" onClick={() => dispatch(toggleSidebar())} className="rounded-full p-2 text-slate-700 hover:bg-slate-100"><Menu className="h-6 w-6" /></button>
        <div className="flex items-center gap-2">
          <img src={logoDaidien} alt="StockSpace" className="h-10 w-16 object-contain" />
          <span className="font-display text-xl font-bold tracking-tight text-slate-950">StockSpace Admin</span>
        </div>
      </header>
      <div className="md:hidden">
        {isMobileOpen && <div className="fixed inset-0 z-40 bg-slate-900/30" onClick={() => dispatch(closeMobileSidebar())} />}
      </div>
      <div className="flex pt-14">
        <Sidebar currentRole="ADMIN" />
        <main className={`min-w-0 flex-1 p-6 transition-all md:p-8 ${isSidebarExpanded ? 'md:pl-68' : 'md:pl-26'}`}>
          <div className="mx-auto max-w-312.5 space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold tracking-[0.18em] text-blue-600 uppercase">Catalog</p>
                <h1 className="mt-2 text-2xl font-bold text-slate-900">Listing packages</h1>
                <p className="mt-1 max-w-2xl text-sm text-slate-500">Manage the visibility packages owners can purchase to publish or renew a warehouse listing.</p>
              </div>
              <Button onClick={() => setIsCreating(true)} className="self-start rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="mr-2 h-4 w-4" /> New package</Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Total packages</p><p className="mt-2 text-3xl font-black text-slate-900">{packages.length}</p></div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><p className="text-xs font-bold tracking-widest text-emerald-600 uppercase">Active</p><p className="mt-2 text-3xl font-black text-emerald-700">{packages.filter(isPackageActive).length}</p></div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5"><p className="text-xs font-bold tracking-widest text-blue-600 uppercase">Allowed terms</p><p className="mt-2 text-lg font-black text-blue-700">10 / 15 / 30 days</p></div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold tracking-wider text-slate-400 uppercase"><tr><th className="px-6 py-4">Package</th><th className="px-6 py-4">Duration</th><th className="px-6 py-4">Price</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? <tr><td colSpan={5} className="px-6 py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" /></td></tr> : packages.length === 0 ? <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No listing packages found.</td></tr> : packages.map((pkg) => { const active = isPackageActive(pkg); return <tr key={pkg.id} className="hover:bg-slate-50/70"><td className="px-6 py-4"><p className="font-bold text-slate-900">{pkg.name}</p><p className="mt-1 font-mono text-xs text-slate-400">{String(pkg.id).slice(0, 8)}</p></td><td className="px-6 py-4"><span className="inline-flex items-center gap-1.5 font-semibold text-slate-700"><CalendarDays className="h-4 w-4 text-blue-600" /> {pkg.durationDays} days</span></td><td className="px-6 py-4 font-bold text-slate-900">{formatVND(pkg.price)}</td><td className="px-6 py-4"><span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{active && <CheckCircle2 className="h-3.5 w-3.5" />}{active ? 'Active' : 'Inactive'}</span></td><td className="px-6 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingPackage(pkg)} className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700" title="Edit"><Edit3 className="h-4 w-4" /></button><button type="button" onClick={() => togglePackage(pkg)} className={`rounded-lg px-3 py-2 text-xs font-bold ${active ? 'text-amber-700 hover:bg-amber-50' : 'text-emerald-700 hover:bg-emerald-50'}`}>{active ? 'Deactivate' : 'Activate'}</button><button type="button" onClick={() => deletePackage(pkg)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700" title="Delete"><Trash2 className="h-4 w-4" /></button></div></td></tr> })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
      {(isCreating || editingPackage) && <PackageFormModal packageToEdit={editingPackage} onClose={() => { setIsCreating(false); setEditingPackage(null) }} onSaved={loadPackages} />}
    </div>
  )
}

export default ListingPackagesPage
