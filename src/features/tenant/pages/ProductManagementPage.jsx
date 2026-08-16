import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  Loader2,
  PackageSearch,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import Header from '@/components/HeaderDashboard'
import Sidebar from '@/components/SideBar'
import productApi from '@/services/wms/productApi'
import { closeMobileSidebar } from '@/store/uiSlide'

const apiData = (response) => response?.data?.data ?? response?.data ?? null
const emptySku = {
  id: null,
  skuCode: '',
  name: '',
  categoryId: '',
  uomId: '',
  unitWeightKg: '',
  unitVolumeM3: '',
  specifications: '{}',
}

const parseJsonObject = (value, fieldName) => {
  try {
    const parsed = value.trim() ? JSON.parse(value) : {}
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      throw new Error()
    }
    return parsed
  } catch {
    throw new Error(`${fieldName} must be a valid JSON object, for example {"color":"blue"}.`)
  }
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function ProductManagementPage() {
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  const [categories, setCategories] = useState([])
  const [skus, setSkus] = useState([])
  const [uoms, setUoms] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFormOpen, setCategoryFormOpen] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [categoryAttributes, setCategoryAttributes] = useState('{}')
  const [skuForm, setSkuForm] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [categoryResponse, skuResponse, uomResponse] = await Promise.all([
        productApi.getCategories(),
        productApi.getSKUs({ page, size: 10 }),
        productApi.getUOMs(),
      ])
      const categoryData = apiData(categoryResponse)
      const skuData = apiData(skuResponse)
      const uomData = apiData(uomResponse)
      setCategories(Array.isArray(categoryData) ? categoryData : [])
      setSkus(Array.isArray(skuData?.content) ? skuData.content : [])
      setTotalPages(skuData?.totalPages ?? 0)
      setTotalElements(skuData?.totalElements ?? 0)
      setUoms(Array.isArray(uomData?.content) ? uomData.content : [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load products.')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    // Loading the selected page is the external synchronization performed by this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [loadData])

  const filteredCategories = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return keyword
      ? categories.filter((category) => category.name?.toLowerCase().includes(keyword))
      : categories
  }, [categories, search])

  const filteredSkus = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return keyword
      ? skus.filter(
          (sku) =>
            sku.skuCode?.toLowerCase().includes(keyword) ||
            sku.name?.toLowerCase().includes(keyword) ||
            sku.categoryName?.toLowerCase().includes(keyword)
        )
      : skus
  }, [search, skus])

  const createCategory = async (event) => {
    event.preventDefault()
    try {
      setSaving(true)
      await productApi.createCategory({
        name: categoryName.trim(),
        defaultAttributes: parseJsonObject(categoryAttributes, 'Default attributes'),
      })
      toast.success('Category created.')
      setCategoryFormOpen(false)
      setCategoryName('')
      setCategoryAttributes('{}')
      await loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Could not create category.')
    } finally {
      setSaving(false)
    }
  }

  const saveSku = async (event) => {
    event.preventDefault()
    try {
      setSaving(true)
      const payload = {
        categoryId: skuForm.categoryId || null,
        name: skuForm.name.trim(),
        uomId: skuForm.uomId,
        unitWeightKg: Number(skuForm.unitWeightKg).toFixed(6),
        unitVolumeM3: Number(skuForm.unitVolumeM3).toFixed(6),
        specifications: parseJsonObject(skuForm.specifications, 'Specifications'),
      }
      if (skuForm.id) await productApi.updateSKU(skuForm.id, payload)
      else await productApi.createSKU({ ...payload, skuCode: skuForm.skuCode.trim() })
      toast.success(skuForm.id ? 'SKU updated.' : 'SKU created.')
      setSkuForm(null)
      await loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Could not save SKU.')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      setSaving(true)
      if (deleteTarget.type === 'category') await productApi.deleteCategory(deleteTarget.item.id)
      else await productApi.deleteSKU(deleteTarget.item.id)
      toast.success(
        `${deleteTarget.type === 'category' ? 'Category' : 'SKU'} deleted.`
      )
      setDeleteTarget(null)
      await loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete item.')
    } finally {
      setSaving(false)
    }
  }

  const openEditSku = (sku) =>
    setSkuForm({
      id: sku.id,
      skuCode: sku.skuCode || '',
      name: sku.name || '',
      categoryId: sku.categoryId || '',
      uomId: sku.uomId || '',
      unitWeightKg: sku.unitWeightKg ?? '',
      unitVolumeM3: sku.unitVolumeM3 ?? '',
      specifications: JSON.stringify(sku.specifications || {}, null, 2),
    })

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      {isMobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => dispatch(closeMobileSidebar())}
          className="fixed inset-0 z-30 bg-slate-900/30 md:hidden"
        />
      )}
      <Sidebar currentRole="TENANT" />
      <main className={`pt-20 transition-all ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'}`}>
        <div className="mx-auto max-w-7xl space-y-6 px-4 pb-10 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-blue-600">
                <PackageSearch className="h-6 w-6" />
                <span className="text-xs font-bold tracking-wider uppercase">Product catalog</span>
              </div>
              <h1 className="mt-1 text-3xl font-bold">Categories &amp; SKU</h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage product categories and the SKU catalog used for inbound and outbound orders.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCategoryFormOpen(true)}
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-50"
              >
                <Tag className="mr-2 h-4 w-4" /> Add category
              </button>
              <button
                type="button"
                onClick={() => setSkuForm({ ...emptySku })}
                className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                <Plus className="mr-2 h-4 w-4" /> Add SKU
              </button>
            </div>
          </div>

          <div className="relative max-w-lg">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search category, SKU code or product name..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm outline-none focus:border-blue-500"
            />
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[0.8fr_1.6fr]">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="font-bold">Categories ({categories.length})</h2>
                  <p className="mt-1 text-xs text-slate-500">System categories are read-only.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                      <tr>
                        <th className="px-5 py-3">Name</th>
                        <th className="px-5 py-3">Type</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCategories.map((category) => (
                        <tr key={category.id}>
                          <td className="px-5 py-3 font-semibold">{category.name}</td>
                          <td className="px-5 py-3">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${category.tenantId ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}
                            >
                              {category.tenantId ? 'Custom' : 'System'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            {category.tenantId && (
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({ type: 'category', item: category })
                                }
                                className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                                aria-label={`Delete ${category.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="font-bold">SKU ({totalElements})</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Only your custom SKUs can be edited or deleted.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-180 text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                      <tr>
                        <th className="px-5 py-3">SKU code</th>
                        <th className="px-5 py-3">Product</th>
                        <th className="px-5 py-3">Category</th>
                        <th className="px-5 py-3">Unit</th>
                        <th className="px-5 py-3">Type</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSkus.map((sku) => (
                        <tr key={sku.id}>
                          <td className="px-5 py-3 font-mono text-xs font-bold text-blue-700">
                            {sku.skuCode}
                          </td>
                          <td className="px-5 py-3 font-semibold">{sku.name}</td>
                          <td className="px-5 py-3 text-slate-600">{sku.categoryName || '—'}</td>
                          <td className="px-5 py-3 text-slate-600">
                            {sku.uomCode || sku.uomName || '—'}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${sku.tenantId ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}
                            >
                              {sku.tenantId ? 'Custom' : 'System'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            {sku.tenantId && (
                              <div className="inline-flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditSku(sku)}
                                  className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                                  aria-label={`Edit ${sku.name}`}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget({ type: 'sku', item: sku })}
                                  className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                                  aria-label={`Delete ${sku.name}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-sm text-slate-500">
                    <span>
                      Page {page + 1} / {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={page === 0}
                        onClick={() => setPage((value) => value - 1)}
                        className="rounded-lg border p-2 disabled:opacity-40"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage((value) => value + 1)}
                        className="rounded-lg border p-2 disabled:opacity-40"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>

      {categoryFormOpen && (
        <Modal title="Add category" onClose={() => setCategoryFormOpen(false)}>
          <form onSubmit={createCategory} className="space-y-4 p-5">
            <label className="block text-sm font-semibold">
              Category name
              <input
                required
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
              />
            </label>
            <label className="block text-sm font-semibold">
              Default attributes (JSON)
              <textarea
                rows={5}
                value={categoryAttributes}
                onChange={(event) => setCategoryAttributes(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm outline-none focus:border-blue-500"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCategoryFormOpen(false)}
                className="rounded-xl border px-4 py-2"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </form>
        </Modal>
      )}

      {skuForm && (
        <Modal title={skuForm.id ? 'Edit SKU' : 'Add SKU'} onClose={() => setSkuForm(null)}>
          <form onSubmit={saveSku} className="grid gap-4 p-5 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              SKU code
              <input
                required
                disabled={Boolean(skuForm.id)}
                value={skuForm.skuCode}
                onChange={(event) =>
                  setSkuForm((current) => ({ ...current, skuCode: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 disabled:bg-slate-100"
              />
            </label>
            <label className="block text-sm font-semibold">
              Product name
              <input
                required
                value={skuForm.name}
                onChange={(event) =>
                  setSkuForm((current) => ({ ...current, name: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
              />
            </label>
            <label className="block text-sm font-semibold">
              Category
              <select
                value={skuForm.categoryId}
                onChange={(event) =>
                  setSkuForm((current) => ({ ...current, categoryId: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Unit of measure
              <select
                required
                value={skuForm.uomId}
                onChange={(event) =>
                  setSkuForm((current) => ({ ...current, uomId: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"
              >
                <option value="">Select unit</option>
                {uoms.map((uom) => (
                  <option key={uom.id} value={uom.id}>
                    {uom.name} ({uom.code})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Unit weight (kg)
              <input
                type="number"
                min="0.000001"
                step="0.000001"
                required
                value={skuForm.unitWeightKg}
                onChange={(event) =>
                  setSkuForm((current) => ({ ...current, unitWeightKg: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
              />
            </label>
            <label className="block text-sm font-semibold">
              Unit volume (m³)
              <input
                type="number"
                min="0.000001"
                step="0.000001"
                required
                value={skuForm.unitVolumeM3}
                onChange={(event) =>
                  setSkuForm((current) => ({ ...current, unitVolumeM3: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
              />
            </label>
            <label className="block text-sm font-semibold sm:col-span-2">
              Specifications (JSON)
              <textarea
                rows={6}
                value={skuForm.specifications}
                onChange={(event) =>
                  setSkuForm((current) => ({ ...current, specifications: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm"
              />
            </label>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button
                type="button"
                onClick={() => setSkuForm(null)}
                className="rounded-xl border px-4 py-2"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save SKU'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title={`Delete ${deleteTarget.type}`} onClose={() => setDeleteTarget(null)}>
          <div className="p-5">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete <strong>{deleteTarget.item.name}</strong>? Categories
              linked to active SKUs and SKUs linked to stock cannot be deleted.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={confirmDelete}
                className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
