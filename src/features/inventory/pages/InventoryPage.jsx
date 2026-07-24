import { useState, useEffect } from 'react'
import { 
  Plus, Search, Filter, Download, Upload, 
  MoreVertical, Edit, Trash2, Eye, 
  ArrowUpDown, Package, FileText
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

// Mock Data
const MOCK_PRODUCTS = [
  { id: 1, name: 'Industrial Motor X1', sku: 'MOT-001', category: 'Machinery', qty: 45, status: 'IN_STOCK', lastUpdated: '2026-05-10 09:30' },
  { id: 2, name: 'Solar Panel 250W', sku: 'SOL-250', category: 'Energy', qty: 12, status: 'LOW_STOCK', lastUpdated: '2026-05-11 14:15' },
  { id: 3, name: 'Li-ion Battery 10Ah', sku: 'BAT-10A', category: 'Electronics', qty: 0, status: 'OUT_OF_STOCK', lastUpdated: '2026-05-12 08:00' },
  { id: 4, name: 'Steel Rail 2m', sku: 'STL-R02', category: 'Construction', qty: 150, status: 'IN_STOCK', lastUpdated: '2026-05-09 11:45' },
  { id: 5, name: 'Hydraulic Pump', sku: 'HYD-P01', category: 'Machinery', qty: 28, status: 'IN_STOCK', lastUpdated: '2026-05-10 16:20' },
  { id: 6, name: 'Copper Wire 100m', sku: 'COP-W10', category: 'Construction', qty: 8, status: 'LOW_STOCK', lastUpdated: '2026-05-12 10:10' },
]

const InventoryPage = () => {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [uoms, setUoms] = useState([])
  
  // Form states
  const [formName, setFormName] = useState('')
  const [formSkuCode, setFormSkuCode] = useState('')
  const [formCategoryId, setFormCategoryId] = useState('')
  const [formUomId, setFormUomId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

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
        productApi.getUOMs()
      ])
      
      setCategories(catRes.data?.data || [])
      setUoms(uomRes.data?.data || [])
      
      const skuList = skuRes.data?.data?.content || []
      
      // Fetch stock summary cho từng SKU (N+1 queries vì BE không có API tổng hợp)
      const productsWithStock = await Promise.all(
        skuList.map(async (sku) => {
          try {
            const stockRes = await stockApi.getStockSummary(sku.id)
            const totalQty = stockRes.data?.data?.totalQuantity || 0
            let status = 'OUT_OF_STOCK'
            if (totalQty > 20) status = 'IN_STOCK'
            else if (totalQty > 0) status = 'LOW_STOCK'
            
            return {
              ...sku,
              qty: totalQty,
              status
            }
          } catch (error) {
            return { ...sku, qty: 0, status: 'OUT_OF_STOCK' }
          }
        })
      )
      
      setProducts(productsWithStock)
    } catch (error) {
      console.error('Error fetching inventory:', error)
      toast.error('Failed to load inventory data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateProduct = async (e) => {
    e.preventDefault()
    if (!formName || !formSkuCode || !formUomId) {
      toast.error('Vui lòng điền đủ Tên sản phẩm, Mã SKU và Đơn vị tính!')
      return
    }

    try {
      setIsSubmitting(true)
      await productApi.createSKU({
        name: formName,
        skuCode: formSkuCode,
        categoryId: formCategoryId || null,
        uomId: formUomId
      })
      toast.success('Thêm sản phẩm thành công!')
      setIsModalOpen(false)
      
      // Reset form
      setFormName('')
      setFormSkuCode('')
      setFormCategoryId('')
      setFormUomId('')
      
      // Reload data
      fetchInventoryData()
    } catch (error) {
      console.error('Error creating product:', error)
      toast.error(error.response?.data?.message || 'Lỗi khi tạo sản phẩm')
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
          <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
            <Package className="h-5 w-5 text-slate-400" />
          </div>
          <div>
            <p className="font-bold text-slate-900">{row.name}</p>
            <p className="text-xs text-slate-500">{row.sku}</p>
          </div>
        </div>
      )
    },
    { 
      header: 'Category', 
      render: (row) => row.categoryName || 'Uncategorized' 
    },
    { 
      header: 'Quantity', 
      render: (row) => (
        <span className="font-medium text-slate-900">{row.qty} Units</span>
      )
    },
    { 
      header: 'Status', 
      render: (row) => (
        <Badge variant={row.status === 'IN_STOCK' ? 'success' : row.status === 'LOW_STOCK' ? 'warning' : 'danger'}>
          {row.status?.replace('_', ' ')}
        </Badge>
      )
    },
    { header: 'UOM', render: (row) => row.uomName || 'N/A' },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button onClick={() => handleViewDetails(row)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500">
            <Eye className="h-4 w-4" />
          </button>
          <button className="p-1.5 rounded hover:bg-slate-100 text-slate-500">
            <Edit className="h-4 w-4" />
          </button>
          <button className="p-1.5 rounded hover:bg-slate-100 text-danger/10 text-danger">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
          <p className="text-sm text-slate-500">Track and manage your warehouse stock in real-time.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <Upload className="h-4 w-4 mr-2" /> Import
          </Button>
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Items', value: products.length, color: 'bg-primary' },
          { label: 'Low Stock', value: products.filter(p => p.status === 'LOW_STOCK').length, color: 'bg-warning' },
          { label: 'Out of Stock', value: products.filter(p => p.status === 'OUT_OF_STOCK').length, color: 'bg-danger' },
          { label: 'Categories', value: new Set(products.map(p => p.categoryId)).size, color: 'bg-slate-900' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4">
            <div className={`h-2 w-2 rounded-full ${stat.color}`} />
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <InputField placeholder="Search by name, SKU, or category..." className="pl-10" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex-1 md:flex-none">
            <Filter className="h-4 w-4 mr-2" /> Filters
          </Button>
          <div className="relative">
            <select className="bg-white border border-slate-200 rounded-md px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none appearance-none pr-10">
              <option>All Categories</option>
              <option>Machinery</option>
              <option>Electronics</option>
            </select>
            <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <DataTable columns={columns} data={products} />
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing <span className="font-bold text-slate-900">1 to 6</span> of 124 products
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>Previous</Button>
            <Button variant="outline" size="sm">Next</Button>
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
            <div className="aspect-video rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 mb-6">
               <Package className="h-12 w-12 text-slate-300" />
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Basic Information</h4>
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
                  <p className="text-sm font-bold text-slate-900">{selectedProduct.category}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Current Stock</p>
                  <p className="text-sm font-bold text-slate-900">{selectedProduct.qty} Units</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Inventory Log</h4>
              <div className="space-y-3">
                {[
                  { event: 'Stock Inbound', qty: '+20', date: '2026-05-10 09:30' },
                  { event: 'Stock Outbound', qty: '-5', date: '2026-05-08 14:20' },
                  { event: 'Initial Entry', qty: '30', date: '2026-05-01 10:00' },
                ].map((log, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{log.event}</p>
                      <p className="text-[10px] text-slate-400">{log.date}</p>
                    </div>
                    <span className={`text-sm font-bold ${log.qty.startsWith('+') ? 'text-success' : 'text-danger'}`}>
                      {log.qty}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 flex gap-3">
              <Button className="flex-1">Edit Product</Button>
              <Button variant="outline" className="flex-1 text-danger border-danger hover:bg-danger/5">Delete</Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Add Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Product"
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
              <label className="text-sm font-medium text-slate-700">Category</label>
              <select 
                className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                value={formCategoryId}
                onChange={(e) => setFormCategoryId(e.target.value)}
              >
                <option value="">-- Chọn danh mục --</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Unit of Measurement (UOM) *</label>
            <select 
              required
              className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              value={formUomId}
              onChange={(e) => setFormUomId(e.target.value)}
            >
              <option value="">-- Chọn Đơn vị --</option>
              {uoms.map(uom => (
                <option key={uom.id} value={uom.id}>{uom.name} ({uom.code})</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">Lưu ý: Số lượng tồn kho ban đầu sẽ là 0. Bạn cần tạo phiếu Inbound để nhập hàng thực tế.</p>
          </div>
          
          <div className="pt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting}>Save Product</Button>
          </div>
        </form>
      </Modal>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default InventoryPage
