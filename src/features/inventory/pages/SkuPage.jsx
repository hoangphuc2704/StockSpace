import { useState, useEffect } from 'react'
import { Plus, Package, Edit, Trash2, Loader2, Eye, X, Tag, Ruler, Hash } from 'lucide-react'
import TableActionMenu from '@/components/TableActionMenu'
import DataTable from '@/components/organisms/DataTable'
import Button from '@/components/atoms/Button'
import InputField from '@/components/atoms/InputField'
import Modal from '@/components/organisms/Modal'
import Header from '@/components/HeaderDashboard'
import Sidebar from '@/components/SideBar'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import productApi from '../../../services/wms/productApi'
import { toast } from 'react-hot-toast'
import { useConfirmDialog } from '@/components/ConfirmDialogProvider'
import { showApiErrorToast } from '@/config/apiError'
import { required } from '@/config/validation'

const LEGACY_SPECIFICATION_KEYS = new Set([
  'barcode',
  'purchaseprice',
  'vatrate',
  'retailpricebeforetax',
  'retailpriceaftertax',
  'boxpricebeforetax',
  'boxpriceaftertax',
  'wholesalebeforetax',
  'wholesalepricebeforetax',
  'wholesaleaftertax',
  'wholesalepriceaftertax',
])

const removeLegacySpecifications = (specifications) =>
  Object.fromEntries(
    Object.entries(specifications || {}).filter(
      ([key]) => !LEGACY_SPECIFICATION_KEYS.has(String(key).replace(/[A-Z]/g, (char) => char.toLowerCase()))
    )
  )

const SkuPage = () => {
  const confirmDialog = useConfirmDialog()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [uoms, setUoms] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingProductId, setEditingProductId] = useState(null)

  const [formName, setFormName] = useState('')
  const [formSkuCode, setFormSkuCode] = useState('')
  const [formCategoryId, setFormCategoryId] = useState('')
  const [formUomId, setFormUomId] = useState('')
  const [formSpecs, setFormSpecs] = useState([]) // [{key: '', value: ''}]
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formUnitWeightKg, setFormUnitWeightKg] = useState('')
  const [formUnitVolumeM3, setFormUnitVolumeM3] = useState('')
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)

  // Detail modal states
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailData, setDetailData] = useState(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  const { user } = useSelector((state) => state.auth)
  const currentRole = user?.role === 'ROLE_STAFF' ? 'STAFF' : 'TENANT'

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [skuRes, catRes, uomRes] = await Promise.all([
        productApi.getSKUs({ page: 0, size: 50 }),
        productApi.getCategories(),
        productApi.getUOMs(),
      ])

      const categoryMap = {}
      if (catRes.data?.data) {
        catRes.data.data.forEach((c) => {
          categoryMap[c.id] = c.name
        })
      }

      const enrichedSkus = (skuRes.data?.data?.content || []).map((sku) => ({
        ...sku,
        categoryName: categoryMap[sku.categoryId] || 'Unknown Category',
      }))

      setProducts(enrichedSkus)
      setCategories(catRes.data?.data || [])

      // Safely extract UOMs array from response
      let uomsList = []
      if (Array.isArray(uomRes.data)) {
        uomsList = uomRes.data
      } else if (Array.isArray(uomRes.data?.data)) {
        uomsList = uomRes.data.data
      } else if (Array.isArray(uomRes.data?.data?.content)) {
        uomsList = uomRes.data.data.content
      }
      setUoms(uomsList)
    } catch (error) {
      console.error('Error fetching data:', error)
      showApiErrorToast(error, 'Could not load SKU data.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Load the server-backed catalog when the screen mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [])

  const handleOpenCreate = () => {
    setIsEditing(false)
    setEditingProductId(null)
    setFormName('')
    setFormSkuCode('')
    setFormCategoryId('')
    setFormUomId('')
    setFormSpecs([])
    setFormUnitWeightKg('')
    setFormUnitVolumeM3('')
    setIsCategoryFormOpen(false)
    setNewCategoryName('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (product) => {
    setIsEditing(true)
    setEditingProductId(product.id)
    setFormName(product.name)
    setFormSkuCode(product.skuCode)
    setFormCategoryId(product.categoryId)
    setFormUomId(product.uomId)
    let parsedSpecs
    try {
      parsedSpecs =
        typeof (product.specifications ?? product.specs) === 'string'
          ? JSON.parse(product.specifications ?? product.specs)
          : product.specifications || product.specs || {}
    } catch {
      parsedSpecs = {}
    }

    const specifications =
      parsedSpecs && typeof parsedSpecs === 'object' && !Array.isArray(parsedSpecs)
        ? parsedSpecs
        : {}
    setFormUnitWeightKg(String(product.unitWeightKg ?? ''))
    setFormUnitVolumeM3(String(product.unitVolumeM3 ?? ''))
    setIsCategoryFormOpen(false)
    setNewCategoryName('')
    setFormSpecs(
      Object.entries(removeLegacySpecifications(specifications)).map(([key, value]) => ({
        key,
        value,
      }))
    )
    setIsModalOpen(true)
  }

  const handleCreateCategory = async (event) => {
    event.preventDefault()
    event.stopPropagation()
    const categoryName = newCategoryName.trim()
    const categoryNameError = required(categoryName, 'Category name')
    if (categoryNameError) {
      toast.error(categoryNameError)
      return
    }

    try {
      setIsCreatingCategory(true)
      const createResponse = await productApi.createCategory({ name: categoryName })
      const createdCategory = createResponse.data?.data ?? createResponse.data
      const categoriesResponse = await productApi.getCategories()
      const nextCategories = categoriesResponse.data?.data || []
      const selectedCategory =
        (createdCategory?.id && nextCategories.find((item) => item.id === createdCategory.id)) ||
        nextCategories.find(
          (item) => item.name?.trim().toLowerCase() === categoryName.toLowerCase()
        )

      setCategories(nextCategories)
      if (selectedCategory?.id) setFormCategoryId(selectedCategory.id)
      setNewCategoryName('')
      setIsCategoryFormOpen(false)
      toast.success('Category created.')
    } catch (error) {
      showApiErrorToast(error, 'Could not create category.')
    } finally {
      setIsCreatingCategory(false)
    }
  }

  const handleViewDetail = async (id) => {
    setIsDetailOpen(true)
    setDetailData(null)
    setIsDetailLoading(true)
    try {
      const res = await productApi.getSKUDetail(id)
      const raw = res.data?.data ?? res.data
      // Normalize specs
      let specs = raw?.specifications || raw?.specs || {}
      if (typeof specs === 'string') {
        try {
          specs = JSON.parse(specs)
        } catch {
          specs = {}
        }
      }
      if (Array.isArray(specs)) {
        const obj = {}
        specs.forEach((s) => {
          if (s.key) obj[s.key] = s.value
        })
        specs = obj
      }
      setDetailData({ ...raw, specsObj: removeLegacySpecifications(specs) })
    } catch (error) {
      showApiErrorToast(error, 'Could not load SKU details.')
      setIsDetailOpen(false)
    } finally {
      setIsDetailLoading(false)
    }
  }

  const handleDelete = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Delete SKU',
      message: 'Are you sure you want to delete this SKU? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
    })
    if (!confirmed) return

    try {
      await productApi.deleteSKU(id)
      toast.success('SKU deleted.')
      fetchData()
    } catch (error) {
      showApiErrorToast(error, 'Could not delete SKU.')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (
      !formName.trim() ||
      !formSkuCode.trim() ||
      !formCategoryId ||
      !formUomId ||
      Number(formUnitWeightKg) <= 0 ||
      Number(formUnitVolumeM3) <= 0
    ) {
      toast.error(
        'Enter all fields. Weight and volume must be greater than 0.'
      )
      return
    }
    setIsSubmitting(true)

    const specsObj = {}
    formSpecs.forEach((s) => {
      if (s.key && s.value) {
        specsObj[s.key] = s.value
      }
    })
    const payload = {
      name: formName,
      skuCode: formSkuCode,
      categoryId: formCategoryId,
      uomId: formUomId,
      unitWeightKg: Number(formUnitWeightKg).toFixed(6),
      unitVolumeM3: Number(formUnitVolumeM3).toFixed(6),
      specifications: specsObj,
    }

    try {
      if (isEditing) {
        await productApi.updateSKU(editingProductId, payload)
      } else {
        await productApi.createSKU(payload)
      }
      toast.success(isEditing ? 'SKU updated.' : 'SKU created.')
      setIsModalOpen(false)
      await fetchData()
    } catch (error) {
      showApiErrorToast(error, 'Could not save SKU.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns = [
    {
      header: 'Mã SKU',
      render: (row) => <span className="font-mono font-bold text-slate-900">{row.skuCode}</span>,
    },
    {
      header: 'Category',
      render: (row) => row.categoryName,
    },
    {
      header: 'Actions',
      render: (row) => {
        const canManageSku = Boolean(row.tenantId)
        return (
          <TableActionMenu
            label={`Actions for ${row.name}`}
            items={[
              { label: 'View details', icon: Eye, onClick: () => handleViewDetail(row.id) },
              canManageSku && { label: 'Edit', icon: Edit, onClick: () => handleOpenEdit(row) },
              canManageSku && {
                label: 'Delete',
                icon: Trash2,
                danger: true,
                onClick: () => handleDelete(row.id),
              },
            ]}
          />
        )
      },
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header />
      <div className="md:hidden">
        {isMobileOpen && (
          <button
            className="fixed inset-0 z-40 bg-slate-900/30"
            onClick={() => dispatch(closeMobileSidebar())}
          />
        )}
      </div>

      <div className="flex pt-14">
        <Sidebar currentRole={currentRole} />

        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'}`}
        >
          <main className="mx-auto w-full max-w-400 space-y-8 p-6 md:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
                  <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                    <Package className="h-6 w-6" />
                  </div>
                  SKU Management
                </h1>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleOpenCreate} className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" /> Add SKU
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : (
                <DataTable columns={columns} data={products} />
              )}
            </div>

            <Modal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              title={isEditing ? 'Edit SKU' : 'Add New SKU'}
              size="lg"
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Product Name *</label>
                    <InputField
                      placeholder="Product Name"
                      value={formName}
                      onChange={(event) => setFormName(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">SKU Code *</label>
                    <InputField
                      placeholder="SKU-000"
                      value={formSkuCode}
                      onChange={(event) => setFormSkuCode(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Category *</label>
                    <div className="flex gap-2">
                      <select
                        className="focus:ring-primary w-full rounded-md border border-slate-200 bg-white p-2 text-sm focus:ring-2 focus:outline-none"
                        value={formCategoryId}
                        onChange={(event) => setFormCategoryId(event.target.value)}
                        required
                      >
                        <option value="">-- Select category --</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        title="Create a new category"
                        aria-label="Create a new category"
                        onClick={() => setIsCategoryFormOpen((current) => !current)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-blue-600 transition-colors hover:bg-blue-50"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {isCategoryFormOpen && (
                      <div className="space-y-2 rounded-lg border border-blue-100 bg-blue-50 p-3">
                        <InputField
                          autoFocus
                          placeholder="New category name"
                          value={newCategoryName}
                          onChange={(event) => setNewCategoryName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') handleCreateCategory(event)
                          }}
                          required
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isCreatingCategory}
                            onClick={() => {
                              setIsCategoryFormOpen(false)
                              setNewCategoryName('')
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            isLoading={isCreatingCategory}
                            onClick={handleCreateCategory}
                          >
                            Create Category
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Unit of Measure *</label>
                    <select
                      className="focus:ring-primary w-full rounded-md border border-slate-200 bg-white p-2 text-sm focus:ring-2 focus:outline-none"
                      value={formUomId}
                      onChange={(event) => setFormUomId(event.target.value)}
                      required
                    >
                      <option value="">-- Select UOM --</option>
                      {uoms.map((uom) => (
                        <option key={uom.id} value={uom.id}>
                          {uom.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Unit weight (kg) *</label>
                    <input
                      type="number"
                      min="0.000001"
                      step="0.000001"
                      value={formUnitWeightKg}
                      onChange={(event) => setFormUnitWeightKg(event.target.value)}
                      className="focus:ring-primary w-full rounded-md border border-slate-200 bg-white p-2 text-sm focus:ring-2 focus:outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Unit volume (m³) *</label>
                    <input
                      type="number"
                      min="0.000001"
                      step="0.000001"
                      value={formUnitVolumeM3}
                      onChange={(event) => setFormUnitVolumeM3(event.target.value)}
                      className="focus:ring-primary w-full rounded-md border border-slate-200 bg-white p-2 text-sm focus:ring-2 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">Specifications</label>
                    <button
                      type="button"
                      onClick={() => setFormSpecs([...formSpecs, { key: '', value: '' }])}
                      className="text-primary text-xs font-medium hover:underline"
                    >
                      + Add Specs
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formSpecs.map((spec, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          placeholder="Key (e.g. Color)"
                          className="flex-1 rounded-md border border-slate-200 p-2 text-sm"
                          value={spec.key}
                          onChange={(event) => {
                            const nextSpecs = [...formSpecs]
                            nextSpecs[index] = { ...nextSpecs[index], key: event.target.value }
                            setFormSpecs(nextSpecs)
                          }}
                        />
                        <input
                          placeholder="Value (e.g. Red)"
                          className="flex-1 rounded-md border border-slate-200 p-2 text-sm"
                          value={spec.value}
                          onChange={(event) => {
                            const nextSpecs = [...formSpecs]
                            nextSpecs[index] = { ...nextSpecs[index], value: event.target.value }
                            setFormSpecs(nextSpecs)
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setFormSpecs(formSpecs.filter((_, i) => i !== index))}
                          className="p-2 text-slate-400 hover:text-red-500"
                          aria-label="Remove specification"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {formSpecs.length === 0 && (
                      <p className="text-xs text-slate-500 italic">No specifications added.</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-6">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={isSubmitting}>
                    {isEditing ? 'Save Changes' : 'Create SKU'}
                  </Button>
                </div>
              </form>
            </Modal>

            {/* SKU Detail Modal */}
            {isDetailOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
                onClick={() => setIsDetailOpen(false)}
              >
                <div
                  className="animate-in fade-in zoom-in-95 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                        <Package className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900">SKU Detail</h2>
                        {detailData && (
                          <p className="font-mono text-xs text-slate-400">{detailData.skuCode}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setIsDetailOpen(false)}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="p-6">
                    {isDetailLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      </div>
                    ) : detailData ? (
                      <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-400 uppercase">
                              <Package className="h-3 w-3" /> Product Name
                            </p>
                            <p className="text-sm font-bold text-slate-800">
                              {detailData.name || '—'}
                            </p>
                          </div>
                          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-400 uppercase">
                              <Hash className="h-3 w-3" /> SKU Code
                            </p>
                            <p className="font-mono text-sm font-bold text-slate-800">
                              {detailData.skuCode || '—'}
                            </p>
                          </div>
                          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-400 uppercase">
                              <Tag className="h-3 w-3" /> Category
                            </p>
                            <p className="text-sm font-semibold text-slate-800">
                              {categories.find((c) => c.id === detailData.categoryId)?.name ||
                                detailData.categoryName ||
                                '—'}
                            </p>
                          </div>
                          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-400 uppercase">
                              <Ruler className="h-3 w-3" /> Unit of Measure
                            </p>
                            <p className="text-sm font-semibold text-slate-800">
                              {uoms.find((u) => u.id === detailData.uomId)?.name ||
                                detailData.uomName ||
                                '—'}
                            </p>
                          </div>
                          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="mb-1 text-[11px] font-semibold text-slate-400 uppercase">
                              Unit weight
                            </p>
                            <p className="text-sm font-semibold text-slate-800">
                              {detailData.unitWeightKg != null
                                ? `${Number(detailData.unitWeightKg).toLocaleString('en-US')} kg`
                                : '—'}
                            </p>
                          </div>
                          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="mb-1 text-[11px] font-semibold text-slate-400 uppercase">
                              Unit volume
                            </p>
                            <p className="text-sm font-semibold text-slate-800">
                              {detailData.unitVolumeM3 != null
                                ? `${Number(detailData.unitVolumeM3).toLocaleString('en-US')} m³`
                                : '—'}
                            </p>
                          </div>
                        </div>

                        {/* Specs */}
                        <div>
                          <p className="mb-2 text-xs font-bold text-slate-500 uppercase">
                            Specifications
                          </p>
                          {detailData.specsObj && Object.keys(detailData.specsObj).length > 0 ? (
                            <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                              {Object.entries(detailData.specsObj).map(([key, value]) => (
                                <div
                                  key={key}
                                  className="flex items-center justify-between px-4 py-2.5"
                                >
                                  <span className="text-xs font-semibold text-slate-500">
                                    {key}
                                  </span>
                                  <span className="text-xs font-bold text-slate-800">
                                    {String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">No specifications.</p>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Footer */}
                  <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
                    <button
                      onClick={() => {
                        setIsDetailOpen(false)
                        if (detailData) handleOpenEdit(detailData)
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      <Edit className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => setIsDetailOpen(false)}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

export default SkuPage
