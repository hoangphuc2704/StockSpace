import { useState, useEffect } from 'react'
import {
  Plus,
  Package,
  Edit,
  Trash2,
  Loader2,
  Eye,
  X,
  Tag,
  Ruler,
  Hash,
  Save,
  Copy,
  Info,
  Grid3X3,
} from 'lucide-react'
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

const priceSpecificationKeys = {
  retailBefore: 'retailPriceBeforeTax',
  retailAfter: 'retailPriceAfterTax',
  boxBefore: 'boxPriceBeforeTax',
  boxAfter: 'boxPriceAfterTax',
  wholesaleBefore: 'wholesalePriceBeforeTax',
  wholesaleAfter: 'wholesalePriceAfterTax',
}
const reservedSpecificationKeys = new Set([
  'barcode',
  'purchasePrice',
  'vatRate',
  ...Object.values(priceSpecificationKeys),
])
const emptyPrices = () => ({
  retailBefore: '0',
  retailAfter: '0',
  boxBefore: '0',
  boxAfter: '0',
  wholesaleBefore: '0',
  wholesaleAfter: '0',
})

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
  const [activeFormTab, setActiveFormTab] = useState('basic')
  const [formBarcode, setFormBarcode] = useState('')
  const [formPurchasePrice, setFormPurchasePrice] = useState('0')
  const [formVatRate, setFormVatRate] = useState('KCT')
  const [formUnitWeightKg, setFormUnitWeightKg] = useState('')
  const [formUnitVolumeM3, setFormUnitVolumeM3] = useState('')
  const [formPrices, setFormPrices] = useState(emptyPrices)

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
      toast.error('Failed to load data')
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
    setActiveFormTab('basic')
    setFormBarcode('')
    setFormPurchasePrice('0')
    setFormVatRate('KCT')
    setFormUnitWeightKg('')
    setFormUnitVolumeM3('')
    setFormPrices(emptyPrices())
    setIsModalOpen(true)
  }

  const handleOpenEdit = (product) => {
    setIsEditing(true)
    setEditingProductId(product.id)
    setFormName(product.name)
    setFormSkuCode(product.skuCode)
    setFormCategoryId(product.categoryId)
    setFormUomId(product.uomId)
    setActiveFormTab('basic')
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
    setFormBarcode(String(specifications.barcode || ''))
    setFormPurchasePrice(String(specifications.purchasePrice ?? '0'))
    setFormVatRate(String(specifications.vatRate || 'KCT'))
    setFormUnitWeightKg(String(product.unitWeightKg ?? ''))
    setFormUnitVolumeM3(String(product.unitVolumeM3 ?? ''))
    setFormPrices(
      Object.fromEntries(
        Object.entries(priceSpecificationKeys).map(([field, key]) => [
          field,
          String(specifications[key] ?? '0'),
        ])
      )
    )
    setFormSpecs(
      Object.entries(specifications)
        .filter(([key]) => !reservedSpecificationKeys.has(key))
        .map(([key, value]) => ({ key, value }))
    )
    setIsModalOpen(true)
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
      setDetailData({ ...raw, specsObj: specs })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load SKU detail')
      setIsDetailOpen(false)
    } finally {
      setIsDetailLoading(false)
    }
  }

  const handleDelete = (id) => {
    confirmDialog({
      title: 'Delete SKU',
      message: 'Are you sure you want to delete this SKU? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await productApi.deleteSKU(id)
          toast.success('SKU deleted successfully')
          fetchData()
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to delete SKU')
        }
      },
    })
  }

  const handleSubmit = async (e, action = 'close') => {
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
        'Vui lòng nhập đầy đủ thông tin, trọng lượng và thể tích trên mỗi đơn vị phải lớn hơn 0.'
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
    if (formBarcode.trim()) specsObj.barcode = formBarcode.trim()
    specsObj.purchasePrice = Number(formPurchasePrice) || 0
    specsObj.vatRate = formVatRate
    Object.entries(priceSpecificationKeys).forEach(([field, key]) => {
      specsObj[key] = Number(formPrices[field]) || 0
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
      await fetchData()
      if (action === 'duplicate') {
        setIsEditing(false)
        setEditingProductId(null)
        setFormSkuCode('')
        toast.success('Đã lưu. Hãy nhập mã SKU mới cho bản nhân bản.')
      } else if (action === 'new') {
        toast.success('Đã lưu SKU. Bạn có thể tiếp tục thêm hàng hóa mới.')
        handleOpenCreate()
      } else {
        toast.success(isEditing ? 'Đã cập nhật SKU thành công.' : 'Đã tạo SKU thành công.')
        setIsModalOpen(false)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed')
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
      render: (row) => (
        <TableActionMenu
          label={`Actions for ${row.name}`}
          items={[
            { label: 'View details', icon: Eye, onClick: () => handleViewDetail(row.id) },
            { label: 'Edit', icon: Edit, onClick: () => handleOpenEdit(row) },
            {
              label: 'Delete',
              icon: Trash2,
              danger: true,
              onClick: () => handleDelete(row.id),
            },
          ]}
        />
      ),
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
              title={`Hàng hóa / ${isEditing ? 'Chỉnh sửa' : 'Thêm mới'}`}
              className="max-h-[94vh] max-w-5xl overflow-y-auto rounded-lg"
            >
              <form onSubmit={handleSubmit} className="-m-6 bg-slate-50">
                <div className="flex gap-8 border-b border-slate-200 bg-white px-7">
                  {[
                    ['basic', 'Thông tin cơ bản'],
                    ['additional', 'Thông tin bổ sung'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setActiveFormTab(value)}
                      className={`border-b-2 px-1 py-4 text-sm font-semibold ${
                        activeFormTab === value
                          ? 'border-blue-600 text-blue-700'
                          : 'border-transparent text-slate-500'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="min-h-125 space-y-6 p-7">
                  {activeFormTab === 'basic' ? (
                    <>
                      <h4 className="text-sm font-bold tracking-wide text-slate-700">THÔNG TIN</h4>
                      <div className="max-w-3xl space-y-4">
                        <label className="grid gap-2 sm:grid-cols-[190px_1fr] sm:items-center">
                          <span className="text-sm font-medium text-slate-700">Tên hàng hóa *</span>
                          <InputField
                            placeholder="Ví dụ: Son môi Cỏ Mềm"
                            value={formName}
                            onChange={(event) => setFormName(event.target.value)}
                            required
                          />
                        </label>

                        <label className="grid gap-2 sm:grid-cols-[190px_1fr] sm:items-center">
                          <span className="text-sm font-medium text-slate-700">
                            Nhóm hàng hóa *
                          </span>
                          <div className="flex gap-2">
                            <select
                              className="focus:border-primary w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
                              value={formCategoryId}
                              onChange={(event) => setFormCategoryId(event.target.value)}
                              required
                            >
                              <option value="">Chọn nhóm hàng hóa</option>
                              {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              title="Thêm nhóm hàng hóa"
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-blue-600"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </label>

                        <label className="grid gap-2 sm:grid-cols-[190px_1fr] sm:items-center">
                          <span className="text-sm font-medium text-slate-700">Mã SKU *</span>
                          <input
                            className="w-full rounded-md border border-red-500 bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-400"
                            placeholder="SMCM01"
                            value={formSkuCode}
                            onChange={(event) => setFormSkuCode(event.target.value)}
                            required
                          />
                        </label>

                        <label className="grid gap-2 sm:grid-cols-[190px_1fr] sm:items-center">
                          <span className="text-sm font-medium text-slate-700">Mã vạch</span>
                          <input
                            className="w-full rounded-md border border-red-500 bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-400"
                            placeholder="Hệ thống tự sinh khi bỏ trống"
                            value={formBarcode}
                            onChange={(event) => setFormBarcode(event.target.value)}
                          />
                        </label>

                        <label className="grid gap-2 sm:grid-cols-[190px_1fr] sm:items-center">
                          <span className="flex items-center gap-1 text-sm font-medium text-slate-700">
                            Giá mua <Info className="h-3.5 w-3.5 text-slate-400" />
                          </span>
                          <input
                            type="number"
                            min="0"
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-right text-sm outline-none"
                            value={formPurchasePrice}
                            onChange={(event) => setFormPurchasePrice(event.target.value)}
                          />
                        </label>

                        <label className="grid gap-2 sm:grid-cols-[190px_1fr] sm:items-center">
                          <span className="text-sm font-medium text-slate-700">
                            Thuế suất GTGT (%)
                          </span>
                          <select
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
                            value={formVatRate}
                            onChange={(event) => setFormVatRate(event.target.value)}
                          >
                            <option value="KCT">KCT</option>
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="8">8%</option>
                            <option value="10">10%</option>
                          </select>
                        </label>
                      </div>

                      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
                        <table className="w-full min-w-160 text-sm">
                          <thead className="bg-slate-100 text-slate-600">
                            <tr>
                              <th className="px-4 py-3 text-left">Loại giá</th>
                              <th className="px-4 py-3 text-right">Trước thuế</th>
                              <th className="px-4 py-3 text-right">Sau thuế</th>
                              <th className="w-12 px-4 py-3" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {[
                              ['retail', 'Giá lẻ'],
                              ['box', 'Giá thùng'],
                              ['wholesale', 'Giá sỉ'],
                            ].map(([key, label], index) => (
                              <tr key={key}>
                                <td className="px-4 py-3 font-semibold text-slate-700">{label}</td>
                                {['Before', 'After'].map((suffix) => {
                                  const field = `${key}${suffix}`
                                  return (
                                    <td key={field} className="px-4 py-2">
                                      <input
                                        type="number"
                                        min="0"
                                        className="w-full bg-transparent text-right outline-none"
                                        value={formPrices[field]}
                                        onChange={(event) =>
                                          setFormPrices((current) => ({
                                            ...current,
                                            [field]: event.target.value,
                                          }))
                                        }
                                      />
                                    </td>
                                  )
                                })}
                                <td className="px-4 py-2 text-center text-slate-400">
                                  {index === 0 && <Grid3X3 className="inline h-4 w-4" />}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <>
                      <h4 className="text-sm font-bold tracking-wide text-slate-700">
                        THÔNG TIN BỔ SUNG
                      </h4>
                      <label className="block max-w-3xl space-y-1.5">
                        <span className="text-sm font-medium text-slate-700">Đơn vị tính *</span>
                        <select
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
                          value={formUomId}
                          onChange={(event) => setFormUomId(event.target.value)}
                          required
                        >
                          <option value="">Chọn đơn vị tính</option>
                          {uoms.map((uom) => (
                            <option key={uom.id} value={uom.id}>
                              {uom.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
                        <label className="block space-y-1.5">
                          <span className="text-sm font-medium text-slate-700">
                            Trọng lượng mỗi đơn vị (kg) *
                          </span>
                          <input
                            type="number"
                            min="0.000001"
                            step="0.000001"
                            required
                            value={formUnitWeightKg}
                            onChange={(event) => setFormUnitWeightKg(event.target.value)}
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
                            placeholder="Ví dụ: 0.25"
                          />
                        </label>
                        <label className="block space-y-1.5">
                          <span className="text-sm font-medium text-slate-700">
                            Thể tích mỗi đơn vị (m³) *
                          </span>
                          <input
                            type="number"
                            min="0.000001"
                            step="0.000001"
                            required
                            value={formUnitVolumeM3}
                            onChange={(event) => setFormUnitVolumeM3(event.target.value)}
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
                            placeholder="Ví dụ: 0.0015"
                          />
                        </label>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700">Thuộc tính</span>
                          <button
                            type="button"
                            onClick={() =>
                              setFormSpecs((current) => [...current, { key: '', value: '' }])
                            }
                            className="text-sm font-semibold text-blue-600"
                          >
                            + Thêm thuộc tính
                          </button>
                        </div>
                        {formSpecs.map((spec, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              placeholder="Tên thuộc tính"
                              className="flex-1 rounded-md border border-slate-300 bg-white p-2 text-sm"
                              value={spec.key}
                              onChange={(event) => {
                                const nextSpecs = [...formSpecs]
                                nextSpecs[index] = { ...nextSpecs[index], key: event.target.value }
                                setFormSpecs(nextSpecs)
                              }}
                            />
                            <input
                              placeholder="Giá trị"
                              className="flex-1 rounded-md border border-slate-300 bg-white p-2 text-sm"
                              value={spec.value}
                              onChange={(event) => {
                                const nextSpecs = [...formSpecs]
                                nextSpecs[index] = {
                                  ...nextSpecs[index],
                                  value: event.target.value,
                                }
                                setFormSpecs(nextSpecs)
                              }}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setFormSpecs((current) => current.filter((_, i) => i !== index))
                              }
                              className="p-2 text-slate-400 hover:text-red-500"
                              aria-label="Xóa thuộc tính"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        {!formSpecs.length && (
                          <p className="text-sm text-slate-400">Chưa có thuộc tính bổ sung.</p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-white px-7 py-4">
                  <Button type="submit" isLoading={isSubmitting}>
                    <Save className="mr-2 h-4 w-4" /> Lưu
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={(event) => handleSubmit(event, 'duplicate')}
                    className="border-slate-300 text-slate-700"
                  >
                    <Copy className="mr-2 h-4 w-4" /> Lưu và nhân bản
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={(event) => handleSubmit(event, 'new')}
                    className="border-slate-300 text-slate-700"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Lưu và thêm mới
                  </Button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-2 text-sm font-medium text-slate-600"
                  >
                    × Hủy bỏ
                  </button>
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
