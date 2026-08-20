import { useCallback, useState, useEffect } from 'react'
import { Search, Filter, Download, Upload, Eye, ArrowUpDown, Package, FileText } from 'lucide-react'
import { motion } from 'framer-motion'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import TableActionMenu from '@/components/TableActionMenu'
import InputField from '@/components/atoms/InputField'
import Drawer from '@/components/organisms/Drawer'
import Modal from '@/components/organisms/Modal'
import Header from '@/components/HeaderDashboard'
import Sidebar from '@/components/SideBar'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import productApi from '../../../services/wms/productApi'
import stockApi from '../../../services/wms/stockApi'
import warehouseApi from '../../../services/warehouse/warehouseApi'
import { toast } from 'react-hot-toast'
import { showApiErrorToast } from '@/config/apiError'

const InventoryPage = () => {
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailsLoading, setIsDetailsLoading] = useState(false)
  const [warehouses, setWarehouses] = useState([])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')
  const [accessError, setAccessError] = useState('')

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
      showApiErrorToast(err, 'Could not load batch history.')
    } finally {
      setIsHistoryLoading(false)
    }
  }

  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  const { user } = useSelector((state) => state.auth)
  const currentRole = user?.role === 'ROLE_STAFF' ? 'STAFF' : 'TENANT'

  const loadWarehouses = useCallback(async () => {
    try {
      const res = await warehouseApi.getMyWarehouses()
      const payload = res.data?.data || []
      const list = Array.isArray(payload) ? payload : payload?.content || []
      setWarehouses(list)
      setSelectedWarehouseId((current) =>
        list.some((warehouse) => String(warehouse.id) === String(current))
          ? current
          : list[0]?.id || ''
      )
      if (!list.length) setIsLoading(false)
      return list
    } catch (error) {
      console.error('Error loading warehouses:', error)
      showApiErrorToast(error, 'Could not load warehouses.')
      setIsLoading(false)
      return null
    }
  }, [])

  const fetchInventoryOverview = useCallback(async () => {
    if (!selectedWarehouseId) return
    try {
      setIsLoading(true)
      setAccessError('')
      const res = await stockApi.getStockOverview(selectedWarehouseId, { page: 0, size: 50 })
      const content = res.data?.data?.content || []
      
      const enrichedSkus = content.map((item) => {
        const qty = item.totalQuantity || 0
        let status = 'OUT_OF_STOCK'
        if (qty > 0) status = qty > 10 ? 'IN_STOCK' : 'LOW_STOCK'

        return {
          ...item,
          qty,
          status,
          name: item.skuName, // Map backend skuName to UI name
        }
      })
      
      setProducts(enrichedSkus)
    } catch (error) {
      console.error('Error fetching stock overview:', error)
      if (error.response?.status === 403) {
        setProducts([])
        setAccessError(
          'This rental contract has expired or access to the selected warehouse was revoked.'
        )
      } else {
        showApiErrorToast(error, 'Could not load inventory.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [selectedWarehouseId])

  useEffect(() => {
    loadWarehouses()
  }, [loadWarehouses])

  useEffect(() => {
    fetchInventoryOverview()
  }, [fetchInventoryOverview])

  // The expiry scheduler changes the active warehouse/stock scope on the BE.
  // Re-fetch both resources when the realtime RENTAL event arrives.
  useEffect(() => {
    const handleRentalNotification = async (event) => {
      if (String(event.detail?.type || '').toUpperCase() !== 'RENTAL') return

      const previousWarehouseId = selectedWarehouseId
      const list = await loadWarehouses()
      fetchInventoryOverview()
      if (
        previousWarehouseId &&
        Array.isArray(list) &&
        !list.some((warehouse) => String(warehouse.id) === String(previousWarehouseId))
      ) {
        setAccessError('This rental contract has expired or access to the selected warehouse was revoked.')
      }
    }

    window.addEventListener('new_notification', handleRentalNotification)
    return () => window.removeEventListener('new_notification', handleRentalNotification)
  }, [fetchInventoryOverview, loadWarehouses, selectedWarehouseId])

  const handleViewDetails = async (product) => {
    setSelectedProduct(product)
    setIsDrawerOpen(true)
    setIsDetailsLoading(true)

    try {
      const stockRes = await stockApi.getStockBySku(product.skuId)
      const stockData = stockRes.data?.data
      
      let batches = []
      if (Array.isArray(stockData)) {
        batches = stockData
      } else {
        batches = stockData?.locations || stockData?.batches || stockData?.stockBatches || stockData?.content || []
      }
      
      // Lọc các batches theo warehouse đang chọn
      batches = batches.filter(b => b.warehouseId === selectedWarehouseId)
      
      setSelectedProduct(prev => ({ ...prev, batches }))
    } catch (err) {
      console.error('Error loading stock batches', err)
      if (err.response?.status === 403) {
        setAccessError(
          'This rental contract has expired or access to the selected warehouse was revoked.'
        )
      } else {
        showApiErrorToast(error, 'Could not load stock batches.')
      }
    } finally {
      setIsDetailsLoading(false)
    }
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
        <TableActionMenu
          items={[
            {
              label: 'View details',
              icon: Eye,
              onClick: () => handleViewDetails(row),
            },
          ]}
        />
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
        const isPositive = Number(row.quantityChanged) > 0
        return (
          <Badge variant={isPositive ? 'success' : 'danger'}>{isPositive ? 'IN' : 'OUT'}</Badge>
        )
      },
    },
    {
      header: 'Quantity',
      render: (row) => {
        const isPositive = Number(row.quantityChanged) > 0
        return (
          <span
            className={isPositive ? 'font-medium text-emerald-600' : 'font-medium text-red-600'}
          >
            {isPositive ? '+' : ''}
            {row.quantityChanged}
          </span>
        )
      },
    },
    ...(currentRole === 'TENANT' || currentRole === 'STAFF'
      ? []
      : [
          {
            header: 'Receipt ID',
            render: (row) => (
              <span className="font-mono text-sm text-slate-500">
                {row.receiptId ? String(row.receiptId).substring(0, 8) : 'N/A'}
              </span>
            ),
          },
        ]),
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
          <main className="mx-auto w-full max-w-400 space-y-8 p-6 md:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
                  <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600">
                    <Package className="h-6 w-6" />
                  </div>
                  Inventory Overview
                </h1>
                <p className="text-sm text-slate-500">
                  Monitor stock levels and warehouse inventory in real-time.
                </p>
              </div>
            </div>

            {accessError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                {accessError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <motion.div
                whileHover={{ y: -2 }}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Total Products</p>
                    <p className="text-2xl font-bold text-slate-900">{products.length}</p>
                  </div>
                </div>
              </motion.div>
              <motion.div
                whileHover={{ y: -2 }}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                    <ArrowUpDown className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">In Stock</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {products.filter((p) => p.status === 'IN_STOCK').length}
                    </p>
                  </div>
                </div>
              </motion.div>
              <motion.div
                whileHover={{ y: -2 }}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Low Stock</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {products.filter((p) => p.status === 'LOW_STOCK').length}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative max-w-md flex-1">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search products by name or SKU..."
                    className="focus:border-primary focus:ring-primary w-full rounded-lg border border-slate-200 py-2 pr-4 pl-10 text-sm focus:ring-1 focus:outline-none"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <label htmlFor="warehouse-select" className="text-sm font-medium text-slate-700">
                    Warehouse:
                  </label>
                  <select
                    id="warehouse-select"
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name}
                      </option>
                    ))}
                  </select>
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
                        <p className="font-mono text-sm text-slate-500">
                          {selectedProduct.skuCode}
                        </p>
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
                        <p className="font-semibold text-slate-900">
                          {selectedProduct.categoryName}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">Current Stock</p>
                        <p className="font-semibold text-slate-900">{selectedProduct.qty} Units</p>
                      </div>
                    </div>

                    {selectedProduct.batches && selectedProduct.batches.length > 0 && (
                      <div>
                        <h4 className="mb-4 font-semibold text-slate-900">Stock Batches</h4>
                        <div className="space-y-3">
                          {selectedProduct.batches.map((batch) => (
                            <div
                              key={batch.batchId}
                              className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                            >
                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {currentRole === 'STAFF'
                                    ? `Batch: ${batch.batchId ? String(batch.batchId).substring(0, 8) : 'N/A'}...`
                                    : 'Stock batch'}
                                </p>
                                <p className="text-xs text-slate-500">
                                  Location:{' '}
                                  {batch.warehouseName
                                    ? `${batch.warehouseName} / ${batch.rackName} / ${batch.binName}`
                                    : 'N/A'}
                                </p>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="font-bold text-slate-900">
                                  {batch.quantity} units
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewHistory(batch.batchId)}
                                >
                                  History
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Drawer>

              <Modal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                title="Batch Transaction History"
                size="lg"
              >
                <div className="space-y-4">
                  {isHistoryLoading ? (
                    <div className="flex justify-center py-8 text-slate-400">
                      Loading history...
                    </div>
                  ) : batchHistory.length === 0 ? (
                    <div className="flex justify-center py-8 text-slate-500">
                      No transaction history found for this batch.
                    </div>
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
