import { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  ArrowUpDown,
  Package,
  FileText,
} from 'lucide-react'
import { motion } from 'framer-motion'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import InputField from '@/components/atoms/InputField'
import Drawer from '@/components/organisms/Drawer'
import Modal from '@/components/organisms/Modal'
import Header from '@/components/HeaderDashboard'
import Sidebar from '@/components/SideBar'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import productApi from '../../../services/wms/productApi'
import stockApi from '../../../services/wms/stockApi'
import { toast } from 'react-hot-toast'
import { useConfirmDialog } from '@/components/ConfirmDialogProvider'

// Mock Data
const MOCK_PRODUCTS = [
  {
    id: 1,
    name: 'Industrial Motor X1',
    sku: 'MOT-001',
    category: 'Machinery',
    qty: 45,
    status: 'IN_STOCK',
    lastUpdated: '2026-05-10 09:30',
  },
  {
    id: 2,
    name: 'Solar Panel 250W',
    sku: 'SOL-250',
    category: 'Energy',
    qty: 12,
    status: 'LOW_STOCK',
    lastUpdated: '2026-05-11 14:15',
  },
  {
    id: 3,
    name: 'Li-ion Battery 10Ah',
    sku: 'BAT-10A',
    category: 'Electronics',
    qty: 0,
    status: 'OUT_OF_STOCK',
    lastUpdated: '2026-05-12 08:00',
  },
  {
    id: 4,
    name: 'Steel Rail 2m',
    sku: 'STL-R02',
    category: 'Construction',
    qty: 150,
    status: 'IN_STOCK',
    lastUpdated: '2026-05-09 11:45',
  },
  {
    id: 5,
    name: 'Hydraulic Pump',
    sku: 'HYD-P01',
    category: 'Machinery',
    qty: 28,
    status: 'IN_STOCK',
    lastUpdated: '2026-05-10 16:20',
  },
  {
    id: 6,
    name: 'Copper Wire 100m',
    sku: 'COP-W10',
    category: 'Construction',
    qty: 8,
    status: 'LOW_STOCK',
    lastUpdated: '2026-05-12 10:10',
  },
]

const InventoryPage = () => {
  const confirmDialog = useConfirmDialog()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [uoms, setUoms] = useState([])

  // Form states
  const [formName, setFormName] = useState('')
  const [formSkuCode, setFormSkuCode] = useState('')
  const [formCategoryId, setFormCategoryId] = useState('')
  const [formUomId, setFormUomId] = useState('')
  const [formSpecs, setFormSpecs] = useState([]) // [{key: '', value: ''}]
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingProductId, setEditingProductId] = useState(null)

  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)

  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  const { user } = useSelector((state) => state.auth)
  const currentRole = user?.role === 'ROLE_STAFF' ? 'STAFF' : 'TENANT'

  useEffect(() => {
    fetchInventoryData()
  }, [])

  const fetchInventoryData = async () => {
    try {
      setIsLoading(true)
      const [skuRes, catRes, uomRes] = await Promise.all([
        productApi.getSKUs({ page: 0, size: 50 }),
        productApi.getCategories(),
        productApi.getUOMs(),
      ])

      setCategories(catRes.data?.data || [])

      // Handle uomRes which is now a PagedResponse from BE
      const uomData = uomRes.data?.data
      setUoms(uomData?.content || (Array.isArray(uomData) ? uomData : []))

      const skuList = skuRes.data?.data?.content || []

      // Fetch stock summary cho từng SKU (N+1 queries vì BE không có API tổng hợp)
      const productsWithStock = await Promise.all(
        skuList.map(async (sku) => {
          try {
            const stockRes = await stockApi.getStockSummary(sku.id)
            const totalQty = stockRes.data?.data?.totalQuantity || 0
            const locations = stockRes.data?.data?.locations || []
            let status = 'OUT_OF_STOCK'
            if (totalQty > 20) status = 'IN_STOCK'
            else if (totalQty > 0) status = 'LOW_STOCK'

            return {
              ...sku,
              qty: totalQty,
              locations,
              status,
            }
          } catch (error) {
            return { ...sku, qty: 0, locations: [], status: 'OUT_OF_STOCK' }
          }
        })
      )

      setProducts(productsWithStock)
    } catch (error) {
      console.error('Error fetching inventory:', error)
      if (error.response?.data?.errorCode === 'SUBSCRIPTION_REQUIRED') {
        toast.error('Please purchase a subscription to use the Warehouse Management function!')
      } else {
        toast.error(error.response?.data?.message || 'Failed to load inventory data')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCategory = async (e) => {
    e.preventDefault()
    if (!newCategoryName || !newCategoryName.trim()) return

    try {
      setIsCreatingCategory(true)
      const res = await productApi.createCategory({ name: newCategoryName.trim() })
      toast.success('Added category successfully')

      const catRes = await productApi.getCategories()
      setCategories(catRes.data?.data || [])

      if (res.data?.data?.id) {
        setFormCategoryId(res.data.data.id)
      }
      setIsCategoryModalOpen(false)
      setNewCategoryName('')
    } catch (error) {
      console.error('Error creating category:', error)
      toast.error('Error creating category')
    } finally {
      setIsCreatingCategory(false)
    }
  }

  const handleAddSpec = () => setFormSpecs([...formSpecs, { key: '', value: '' }])
  const handleUpdateSpec = (index, field, val) => {
    const newSpecs = [...formSpecs]
    newSpecs[index][field] = val
    setFormSpecs(newSpecs)
  }
  const handleRemoveSpec = (index) => {
    const newSpecs = [...formSpecs]
    newSpecs.splice(index, 1)
    setFormSpecs(newSpecs)
  }

  const handleDeleteCategory = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Delete category',
      message: 'Are you sure you want to delete this category?',
      confirmText: 'Delete category',
      danger: true,
    })
    if (!confirmed) return
    try {
      await productApi.deleteCategory(id)
      toast.success('Directory deletion successful!')
      const catRes = await productApi.getCategories()
      setCategories(catRes.data?.data || [])
    } catch (error) {
      console.error('Error deleting category:', error)
      toast.error(error.response?.data?.message || 'Error while deleting category')
    }
  }

  const handleEditProductClick = (product) => {
    setIsEditing(true)
    setEditingProductId(product.id)
    setFormName(product.name)
    setFormSkuCode(product.skuCode || product.sku) // sku from productsWithStock mapping
    setFormCategoryId(product.categoryId || '')
    setFormUomId(product.uomId || '')

    if (product.specifications) {
      const specArray = Object.keys(product.specifications).map((key) => ({
        key,
        value: product.specifications[key],
      }))
      setFormSpecs(specArray)
    } else {
      setFormSpecs([])
    }

    setIsDrawerOpen(false)
    setIsModalOpen(true)
  }

  const handleDeleteProduct = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Delete product',
      message: 'Are you sure you want to delete this product?',
      confirmText: 'Delete product',
      danger: true,
    })
    if (!confirmed) return
    try {
      await productApi.deleteSKU(id)
      toast.success('Product deletion successful!')
      setIsDrawerOpen(false)
      fetchInventoryData()
    } catch (error) {
      console.error('Error deleting product:', error)
      toast.error('Error while deleting product')
    }
  }

  const handleCreateProduct = async (e) => {
    e.preventDefault()
    if (!formName || !formSkuCode || !formUomId) {
      toast.error('Please fill in Product Name, SKU Code and Unit!')
      return
    }

    try {
      setIsSubmitting(true)

      const specsObject = formSpecs.reduce((acc, curr) => {
        if (curr.key.trim() && curr.value.trim()) {
          acc[curr.key.trim()] = curr.value.trim()
        }
        return acc
      }, {})

      const payload = {
        name: formName,
        skuCode: formSkuCode,
        categoryId: formCategoryId || null,
        uomId: formUomId,
        specifications: Object.keys(specsObject).length > 0 ? specsObject : null,
      }

      if (isEditing) {
        await productApi.updateSKU(editingProductId, payload)
        toast.success('Product update successful!')
      } else {
        await productApi.createSKU(payload)
        toast.success('Added product successfully!')
      }

      setIsModalOpen(false)

      // Reset form
      setFormName('')
      setFormSkuCode('')
      setFormCategoryId('')
      setFormUomId('')
      setFormSpecs([])
      setIsEditing(false)
      setEditingProductId(null)

      // Reload data
      fetchInventoryData()
    } catch (error) {
      console.error('Error saving product:', error)
      toast.error(error.response?.data?.message || 'Error while saving product')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleViewDetails = (product) => {
    setSelectedProduct(product)
    setIsDrawerOpen(true)
  }

  const columns = [
    {
      header: 'Product',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-100">
            <Package className="h-5 w-5 text-slate-400" />
          </div>
          <div>
            <p className="font-bold text-slate-900">{row.name}</p>
            <p className="text-xs text-slate-500">{row.sku}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Category',
      render: (row) => row.categoryName || 'Uncategorized',
    },
    {
      header: 'Quantity',
      render: (row) => <span className="font-medium text-slate-900">{row.qty} Units</span>,
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge
          variant={
            row.status === 'IN_STOCK'
              ? 'success'
              : row.status === 'LOW_STOCK'
                ? 'warning'
                : 'danger'
          }
        >
          {row.status?.replace('_', ' ')}
        </Badge>
      ),
    },
    { header: 'UOM', render: (row) => row.uomName || 'N/A' },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewDetails(row)}
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleEditProductClick(row)}
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeleteProduct(row.id)}
            className="text-danger/10 text-danger rounded p-1.5 hover:bg-slate-100"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
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
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
          }`}
        >
          <main className="mx-auto w-full max-w-[1600px] space-y-8 p-6 md:p-8">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
                  <p className="text-sm text-slate-500">
                    Track and manage your warehouse stock in real-time.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="hidden sm:flex">
                    <Upload className="mr-2 h-4 w-4" /> Import
                  </Button>
                  <Button variant="outline" size="sm" className="hidden sm:flex">
                    <Download className="mr-2 h-4 w-4" /> Export
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setIsEditing(false)
                      setEditingProductId(null)
                      setFormName('')
                      setFormSkuCode('')
                      setFormCategoryId('')
                      setFormUomId('')
                      setFormSpecs([])
                      setIsModalOpen(true)
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Product
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                {[
                  { label: 'Total Items', value: products.length, color: 'bg-primary' },
                  {
                    label: 'Low Stock',
                    value: products.filter((p) => p.status === 'LOW_STOCK').length,
                    color: 'bg-warning',
                  },
                  {
                    label: 'Out of Stock',
                    value: products.filter((p) => p.status === 'OUT_OF_STOCK').length,
                    color: 'bg-danger',
                  },
                  {
                    label: 'Categories',
                    value: new Set(products.map((p) => p.categoryId)).size,
                    color: 'bg-slate-900',
                  },
                ].map((stat, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className={`h-2 w-2 rounded-full ${stat.color}`} />
                    <div>
                      <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                        {stat.label}
                      </p>
                      <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <InputField placeholder="Search by name, SKU, or category..." className="pl-10" />
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="flex-1 md:flex-none">
                    <Filter className="mr-2 h-4 w-4" /> Filters
                  </Button>
                  <div className="relative">
                    <select className="focus:ring-primary appearance-none rounded-md border border-slate-200 bg-white px-4 py-2 pr-10 text-sm font-medium focus:ring-2 focus:outline-none">
                      <option>All Categories</option>
                      <option>Machinery</option>
                      <option>Electronics</option>
                    </select>
                    <ArrowUpDown className="pointer-events-none absolute top-1/2 right-3 h-3 w-3 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <DataTable columns={columns} data={products} />
                <div className="flex items-center justify-between border-t border-slate-100 p-4">
                  <p className="text-sm text-slate-500">
                    Showing <span className="font-bold text-slate-900">1 to 6</span> of 124 products
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm">
                      Next
                    </Button>
                  </div>
                </div>
              </div>

              {/* Product Detail Drawer */}
              <Drawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                title="Product Details"
              >
                {selectedProduct && (
                  <div className="space-y-8">
                    <div className="mb-6 flex aspect-video items-center justify-center rounded-xl border border-slate-200 bg-slate-100">
                      <Package className="h-12 w-12 text-slate-300" />
                    </div>

                    <div>
                      <h4 className="mb-2 text-xs font-bold tracking-widest text-slate-500 uppercase">
                        Basic Information
                      </h4>
                      <div className="grid grid-cols-2 gap-y-4">
                        <div>
                          <p className="text-xs text-slate-400">Name</p>
                          <p className="text-sm font-bold text-slate-900">{selectedProduct.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">SKU</p>
                          <p className="text-sm font-bold text-slate-900">{selectedProduct.sku}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Category</p>
                          <p className="text-sm font-bold text-slate-900">
                            {selectedProduct.category}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Current Stock</p>
                          <p className="text-sm font-bold text-slate-900">
                            {selectedProduct.qty} Units
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-2 text-xs font-bold tracking-widest text-slate-500 uppercase">
                        Stock Locations
                      </h4>
                      <div className="space-y-3">
                        {selectedProduct.locations && selectedProduct.locations.length > 0 ? (
                          selectedProduct.locations.map((loc, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3"
                            >
                              <div>
                                <p className="text-sm font-bold text-slate-900">
                                  Zone {loc.zoneName} - Rack {loc.rackName}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  Bin: {loc.binName} | Batch ID: {loc.batchId?.substring(0, 8)}...
                                </p>
                              </div>
                              <span className="text-success text-sm font-bold">
                                +{loc.quantity} {selectedProduct.uomName}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center text-sm text-slate-400">
                            This product is not in stock yet.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-6">
                      <Button
                        onClick={() => handleEditProductClick(selectedProduct)}
                        className="flex-1"
                      >
                        Edit Product
                      </Button>
                      <Button
                        onClick={() => handleDeleteProduct(selectedProduct.id)}
                        variant="outline"
                        className="text-danger border-danger hover:bg-danger/5 flex-1"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </Drawer>

              {/* Add Product Modal */}
              <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isEditing ? 'Product Updates' : 'Add New Product'}
              >
                <form onSubmit={handleCreateProduct} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Product Name *</label>
                    <InputField
                      placeholder="e.g. Industrial Motor X1"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">SKU Code *</label>
                      <InputField
                        placeholder="SKU-000"
                        value={formSkuCode}
                        onChange={(e) => setFormSkuCode(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-700">Category</label>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setIsCategoryManagerOpen(true)}
                            className="hover:text-primary text-xs text-slate-500 hover:underline"
                          >
                            Management
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsCategoryModalOpen(true)}
                            className="text-primary flex items-center gap-1 text-xs hover:underline"
                          >
                            <Plus className="h-3 w-3" /> Add new
                          </button>
                        </div>
                      </div>
                      <select
                        className="focus:ring-primary w-full rounded-md border border-slate-200 bg-white p-2 text-sm focus:ring-2 focus:outline-none"
                        value={formCategoryId}
                        onChange={(e) => setFormCategoryId(e.target.value)}
                      >
                        <option value="">-- Select category --</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      Unit of Measurement (UOM) *
                    </label>
                    <select
                      required
                      className="focus:ring-primary w-full rounded-md border border-slate-200 bg-white p-2 text-sm focus:ring-2 focus:outline-none"
                      value={formUomId}
                      onChange={(e) => setFormUomId(e.target.value)}
                    >
                      <option value="">-- Select Unit --</option>
                      {uoms.map((uom) => (
                        <option key={uom.id} value={uom.id}>
                          {uom.name} ({uom.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 border-t border-slate-100 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">
                        Specifications (Optional)
                      </label>
                      <button
                        type="button"
                        onClick={handleAddSpec}
                        className="text-primary flex items-center gap-1 text-xs hover:underline"
                      >
                        <Plus className="h-3 w-3" /> Add properties
                      </button>
                    </div>
                    {formSpecs.length > 0 && (
                      <div className="space-y-2">
                        {formSpecs.map((spec, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Name (eg Color)"
                              className="focus:ring-primary flex-1 rounded-md border border-slate-200 p-2 text-sm focus:ring-2 focus:outline-none"
                              value={spec.key}
                              onChange={(e) => handleUpdateSpec(idx, 'key', e.target.value)}
                            />
                            <input
                              type="text"
                              placeholder="Value (eg: Red)"
                              className="focus:ring-primary flex-1 rounded-md border border-slate-200 p-2 text-sm focus:ring-2 focus:outline-none"
                              value={spec.value}
                              onChange={(e) => handleUpdateSpec(idx, 'value', e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveSpec(idx)}
                              className="hover:text-danger rounded-md p-2 text-slate-400 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                      Note: The initial inventory quantity will be 0. You need to create an Inbound
                      ticket to physically import goods.
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-6">
                    <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" isLoading={isSubmitting}>
                      {isEditing ? 'Save Changes' : 'Save Product'}
                    </Button>
                  </div>
                </form>
              </Modal>

              {/* Add Category Modal */}
              <Modal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                title="Add New Category"
              >
                <form onSubmit={handleCreateCategory} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Category name *</label>
                    <InputField
                      placeholder="e.g. Household appliances"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCategoryModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" isLoading={isCreatingCategory}>
                      Save
                    </Button>
                  </div>
                </form>
              </Modal>

              {/* Category Manager Modal */}
              <Modal
                isOpen={isCategoryManagerOpen}
                onClose={() => setIsCategoryManagerOpen(false)}
                title="Category Management"
              >
                <div className="space-y-4">
                  {categories.length === 0 ? (
                    <p className="py-4 text-center text-sm text-slate-500">
                      There are no categories yet.
                    </p>
                  ) : (
                    <div className="max-h-[300px] overflow-hidden overflow-y-auto rounded-lg border border-slate-200">
                      <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 border-b border-slate-200 bg-slate-50">
                          <tr>
                            <th className="px-4 py-2 font-medium text-slate-700">Category Name</th>
                            <th className="px-4 py-2 text-right font-medium text-slate-700">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {categories.map((cat) => (
                            <tr key={cat.id} className="hover:bg-slate-50">
                              <td className="px-4 py-2 text-slate-900">{cat.name}</td>
                              <td className="px-4 py-2 text-right">
                                <button
                                  onClick={() => handleDeleteCategory(cat.id)}
                                  className="hover:text-danger hover:bg-danger/10 rounded p-1.5 text-slate-400"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="flex justify-end pt-4">
                    <Button onClick={() => setIsCategoryManagerOpen(false)}>Close</Button>
                  </div>
                </div>
              </Modal>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default InventoryPage
