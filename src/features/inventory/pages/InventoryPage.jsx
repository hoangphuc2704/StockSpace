import { useState, useEffect } from 'react'
import {
  Search,
  Filter,
  Download,
  Upload,
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

const InventoryPage = () => {
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [historyBatchId, setHistoryBatchId] = useState(null)
  const [batchHistory, setBatchHistory] = useState([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)

  const handleViewHistory = async (batchId) => {
    setIsHistoryModalOpen(true)
    setHistoryBatchId(batchId)
    setIsHistoryLoading(true)
    try {
      const res = await stockApi.getStockTransactions(batchId)
      setBatchHistory(res.data?.data?.content || [])
    } catch (err) {
      toast.error('Failed to load batch history')
    } finally {
      setIsHistoryLoading(false)
    }
  }

  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  const { user } = useSelector((state) => state.auth)
  const currentRole = user?.role === 'ROLE_STAFF' ? 'STAFF' : 'TENANT'

  const fetchInventoryData = async () => {
    try {
      setIsLoading(true)
      const [skuRes, catRes] = await Promise.all([
        productApi.getSKUs({ page: 0, size: 50 }),
        productApi.getCategories()
      ])

      const categoryMap = {}
      if (catRes.data?.data) {
        catRes.data.data.forEach((c) => {
          categoryMap[c.id] = c.name
        })
      }

      const skus = skuRes.data?.data?.content || []

      // Fetch stock for each SKU
      const enrichedSkus = await Promise.all(skus.map(async (sku) => {
        let qty = 0
        let status = 'OUT_OF_STOCK'
        let batches = []
        try {
          const stockRes = await stockApi.getStockBySku(sku.id)
          console.log('[DEBUG] stockBySku response for', sku.id, ':', JSON.stringify(stockRes.data, null, 2))
          const stockData = stockRes.data?.data
          // Hỗ trợ các cấu trúc trả về khác nhau từ API
          qty = stockData?.totalQuantity ?? stockData?.totalQty ?? 0
          
          if (Array.isArray(stockData)) {
            batches = stockData
          } else {
            batches = stockData?.locations || stockData?.batches || stockData?.stockBatches || stockData?.content || []
          }
          
          if (!Array.isArray(batches)) batches = []
          // Tính lại qty từ batches nếu totalQuantity không có
          if (!qty && batches.length > 0) {
            qty = batches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0)
          }
          if (qty > 0) status = qty > 10 ? 'IN_STOCK' : 'LOW_STOCK'
        } catch (e) {
          console.error("Error fetching stock for SKU", sku.id)
        }
        return {
          ...sku,
          categoryName: categoryMap[sku.categoryId] || 'Unknown Category',
          qty,
          status,
          batches
        }
      }))

      setProducts(enrichedSkus)
    } catch (error) {
      console.error('Error fetching inventory data:', error)
      toast.error('Failed to load inventory data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInventoryData()
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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-100">
            <Package className="h-5 w-5 text-slate-400" />
          </div>
          <div>
            <p className="font-bold text-slate-900">{row.name}</p>
            <p className="text-xs text-slate-500">{row.skuCode}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Category',
      render: (row) => row.categoryName,
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
          {row.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => handleViewDetails(row)}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  const historyColumns = [
    {
      header: 'Date',
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
    {
      header: 'Type',
      render: (row) => {
        const isPositive = Number(row.quantityChanged) > 0;
        return (
          <Badge variant={isPositive ? 'success' : 'danger'}>
            {isPositive ? 'IN' : 'OUT'}
          </Badge>
        )
      },
    },
    {
      header: 'Quantity',
      render: (row) => {
        const isPositive = Number(row.quantityChanged) > 0;
        return (
          <span className={isPositive ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
            {isPositive ? '+' : ''}{row.quantityChanged}
          </span>
        )
      },
    },
    {
      header: 'Receipt ID',
      render: (row) => <span className="text-sm font-mono text-slate-500">{row.receiptId ? String(row.receiptId).substring(0, 8) : 'N/A'}</span>,
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
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
            }`}
        >
          <main className="mx-auto w-full max-w-[1600px] space-y-8 p-6 md:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                    <Package className="h-6 w-6" />
                  </div>
                  Inventory Overview
                </h1>
                <p className="text-sm text-slate-500">Monitor stock levels and warehouse inventory in real-time.</p>
              </div>

            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-blue-50 p-3 text-blue-600"><Package className="h-6 w-6" /></div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Total Products</p>
                    <p className="text-2xl font-bold text-slate-900">{products.length}</p>
                  </div>
                </div>
              </motion.div>
              <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600"><ArrowUpDown className="h-6 w-6" /></div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">In Stock</p>
                    <p className="text-2xl font-bold text-slate-900">{products.filter(p => p.status === 'IN_STOCK').length}</p>
                  </div>
                </div>
              </motion.div>
              <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-amber-50 p-3 text-amber-600"><FileText className="h-6 w-6" /></div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Low Stock</p>
                    <p className="text-2xl font-bold text-slate-900">{products.filter(p => p.status === 'LOW_STOCK').length}</p>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative max-w-md flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search products by name or SKU..."
                    className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <DataTable columns={columns} data={products} isLoading={isLoading} />

              <Drawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                title="Product Details"
                size="md"
              >
                {selectedProduct && (
                  <div className="space-y-8">
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                        <Package className="h-8 w-8 text-slate-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{selectedProduct.name}</h3>
                        <p className="font-mono text-sm text-slate-500">{selectedProduct.skuCode}</p>
                        <div className="mt-2">
                          <Badge
                            variant={
                              selectedProduct.status === 'IN_STOCK'
                                ? 'success'
                                : selectedProduct.status === 'LOW_STOCK'
                                  ? 'warning'
                                  : 'danger'
                            }
                          >
                            {selectedProduct.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <div>
                        <p className="text-xs font-medium text-slate-500">Category</p>
                        <p className="font-semibold text-slate-900">{selectedProduct.categoryName}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">Current Stock</p>
                        <p className="font-semibold text-slate-900">{selectedProduct.qty} Units</p>
                      </div>
                    </div>

                    {selectedProduct.batches && selectedProduct.batches.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-4">Stock Batches</h4>
                        <div className="space-y-3">
                          {selectedProduct.batches.map(batch => (
                            <div key={batch.batchId} className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
                              <div>
                                <p className="font-medium text-sm text-slate-900">Batch: {batch.batchId ? String(batch.batchId).substring(0, 8) : 'N/A'}...</p>
                                <p className="text-xs text-slate-500">
                                  Location: {batch.warehouseName ? `${batch.warehouseName} / ${batch.rackName} / ${batch.binName}` : 'N/A'}
                                </p>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="font-bold text-slate-900">{batch.quantity} units</span>
                                <Button size="sm" variant="outline" onClick={() => handleViewHistory(batch.batchId)}>History</Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Drawer>

              <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title="Batch Transaction History" size="lg">
                <div className="space-y-4">
                  {isHistoryLoading ? (
                    <div className="py-8 flex justify-center text-slate-400">Loading history...</div>
                  ) : batchHistory.length === 0 ? (
                    <div className="py-8 flex justify-center text-slate-500">No transaction history found for this batch.</div>
                  ) : (
                    <DataTable columns={historyColumns} data={batchHistory} />
                  )}
                  <div className="flex justify-end pt-4">
                    <Button onClick={() => setIsHistoryModalOpen(false)}>Close</Button>
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
