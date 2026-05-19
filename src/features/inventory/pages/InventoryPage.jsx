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
  const [products, setProducts] = useState(MOCK_PRODUCTS)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

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
    { header: 'Category', accessor: 'category' },
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
          {row.status.replace('_', ' ')}
        </Badge>
      )
    },
    { header: 'Last Updated', accessor: 'lastUpdated' },
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

      {/* Stats Quick View */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Items', value: '450', color: 'bg-primary' },
          { label: 'Low Stock', value: '12', color: 'bg-warning' },
          { label: 'Out of Stock', value: '3', color: 'bg-danger' },
          { label: 'Categories', value: '8', color: 'bg-slate-900' },
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
        <div className="space-y-4">
          <InputField label="Product Name" placeholder="e.g. Industrial Motor X1" />
          <div className="grid grid-cols-2 gap-4">
            <InputField label="SKU" placeholder="SKU-000" />
            <InputField label="Category" placeholder="Select category" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Initial Quantity" type="number" defaultValue="0" />
            <InputField label="Min. Stock Level" type="number" defaultValue="5" />
          </div>
          <div className="pt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button>Save Product</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default InventoryPage
