import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FormShell } from '@/form/FormControls'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'
import { ArrowUpRight, Search, Minus, Loader2, Download, Eye, Map as MapIcon, MapPin } from 'lucide-react'
import DataTable from '@/components/organisms/DataTable'
import Button from '@/components/atoms/Button'
import InputField from '@/components/atoms/InputField'
import Modal from '@/components/organisms/Modal'
import TableActionMenu from '@/components/TableActionMenu'
import receiptApi from '@/services/wms/receiptApi'
import stockApi from '@/services/wms/stockApi'
import productApi from '@/services/wms/productApi'
import warehouseApi from '@/services/warehouse/warehouseApi'
import { toast } from 'react-hot-toast'
import ReceiptDetailModal from '@/features/inventory/components/ReceiptDetailModal'
import { showApiErrorToast } from '@/config/apiError'
import { positiveInteger, required } from '@/config/validation'
import useActiveWarehouseContext from '@/hooks/useActiveWarehouseContext'

const formatOutboundDate = (dateString) => {
  if (!dateString) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

const OutboundPage = () => {
  const dispatch = useDispatch()
  const [searchParams] = useSearchParams()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  const { user } = useSelector((state) => state.auth)
  const currentRole = user?.role === 'ROLE_STAFF' ? 'STAFF' : 'TENANT'

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectingReceiptId, setRejectingReceiptId] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [detailReceipt, setDetailReceipt] = useState(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  // Data states
  const [receipts, setReceipts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [skus, setSkus] = useState([])

  // Selection states
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')
  useActiveWarehouseContext(selectedWarehouseId)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [activeTab, setActiveTab] = useState('ALL')

  // Form states
  const [outboundMethod, setOutboundMethod] = useState('AUTO') // 'AUTO' | 'MANUAL'
  const [formSkuId, setFormSkuId] = useState('')
  const [formTotalQuantity, setFormTotalQuantity] = useState(1)
  const [formNote, setFormNote] = useState('')
  const [formReceiverName, setFormReceiverName] = useState('')
  
  // Manual Outbound states
  const [availableLocations, setAvailableLocations] = useState([])
  const [selectedLocationStr, setSelectedLocationStr] = useState('')
  const [isLocationsLoading, setIsLocationsLoading] = useState(false)

  // Auto Outbound states
  const [previewData, setPreviewData] = useState(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  const fetchInitialData = useCallback(async () => {
    try {
      const [whRes, skuRes] = await Promise.all([
        warehouseApi.getMyWarehouses(),
        productApi.getAllSKUs(),
      ])

      const whData = whRes.data?.data?.content || whRes.data?.data || []
      const whList = whData.map((w) => ({
        id: w.id || w.warehouseId,
        name: w.name || w.warehouseName,
      }))
      setWarehouses(whList)
      const requestedWarehouseId = searchParams.get('warehouseId')
      const requestedWarehouse = whList.find(
        (warehouse) => String(warehouse.id) === String(requestedWarehouseId)
      )
      if (whList.length > 0) setSelectedWarehouseId(requestedWarehouse?.id || whList[0].id)

      setSkus(Array.isArray(skuRes) ? skuRes : [])
    } catch (error) {
      console.error('Error fetching initial data:', error)
      if (error.response?.data?.errorCode === 'SUBSCRIPTION_REQUIRED') {
        showApiErrorToast(error, 'Subscription required for outbound.')
      } else {
        showApiErrorToast(error, 'Could not load outbound data.')
      }
    }
  }, [searchParams])

  const fetchReceipts = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await receiptApi.getReceipts(selectedWarehouseId, {
        type: 'OUTBOUND',
        page: 0,
        size: 20,
      })
      setReceipts(res.data?.data?.content || [])
    } catch (error) {
      console.error('Error fetching receipts:', error)
      if (error.response?.data?.errorCode === 'SUBSCRIPTION_REQUIRED') {
        // Only show if not already shown by initial data
      } else {
        showApiErrorToast(error, 'Could not load receipts.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [selectedWarehouseId])

  useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData])

  useEffect(() => {
    if (selectedWarehouseId) {
      fetchReceipts()
    }
  }, [fetchReceipts, selectedWarehouseId])

  // Fetch locations for Manual method when SKU changes
  useEffect(() => {
    if (outboundMethod === 'MANUAL' && formSkuId && selectedWarehouseId) {
      const fetchLocations = async () => {
        setIsLocationsLoading(true)
        setAvailableLocations([])
        setSelectedLocationStr('')
        try {
          const res = await stockApi.getStockBySku(formSkuId)
          const data = res.data?.data || {}
          if (data.locations) {
            // Filter locations for the selected warehouse
            const locsInWarehouse = data.locations.filter(loc => loc.warehouseId === selectedWarehouseId)
            
            // Group by rackId + binId to get total quantity per bin (BE doesn't send rackId/binId directly in StockSummaryResponse, but we need it. 
            // Wait, looking at StockLocationDto, it only has rackName and binName. But StockBatchResponse has rackId and binId.
            // Let's use getStock API to fetch batches if getStockBySku lacks IDs.)
            
            // To be safe, let's fetch all stock batches for this warehouse and filter by SKU.
            const batchesRes = await stockApi.getStock(selectedWarehouseId, { page: 0, size: 500 })
            const batches = batchesRes.data?.data?.content || []
            const skuBatches = batches.filter(b => b.skuId === formSkuId && b.quantity > 0)
            
            // Group by binId
            const grouped = skuBatches.reduce((acc, curr) => {
              const key = `${curr.rackId}_${curr.binId}`
              if (!acc[key]) {
                acc[key] = {
                  rackId: curr.rackId,
                  rackName: curr.rackName,
                  binId: curr.binId,
                  binName: curr.binName,
                  quantity: 0
                }
              }
              acc[key].quantity += curr.quantity
              return acc
            }, {})
            
            setAvailableLocations(Object.values(grouped))
          }
        } catch (error) {
          showApiErrorToast(error, 'Could not load locations for SKU.')
        } finally {
          setIsLocationsLoading(false)
        }
      }
      fetchLocations()
    } else {
      setAvailableLocations([])
      setSelectedLocationStr('')
    }
  }, [outboundMethod, formSkuId, selectedWarehouseId])

  const handleExport = async () => {
    if (!selectedWarehouseId) return
    setIsExporting(true)
    try {
      const response = await receiptApi.exportReceipts(selectedWarehouseId, 'OUTBOUND')
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'outbound-receipts.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('File exported.')
    } catch (error) {
      console.error('Error when exporting file:', error)
      showApiErrorToast(error, 'Export failed.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportSingleReceipt = (receipt) => {
    if (!receipt || !receipt.items) {
      toast.error('Không có dữ liệu chi tiết để xuất.')
      return
    }
    const csvRows = []
    csvRows.push(['Mã Phiếu', 'Trạng thái', 'Ngày xuất hàng', 'Người phụ trách', 'Tên nơi nhận', 'Tên mặt hàng', 'Mã SKU', 'Số lượng'].join(','))
    
    receipt.items.forEach(item => {
      csvRows.push([
        receipt.id.substring(0, 8).toUpperCase(),
        receipt.status,
        new Date(receipt.createdAt).toLocaleDateString('vi-VN'),
        `"${receipt.createdByFullName || ''}"`,
        `"${receipt.receiverName || ''}"`,
        `"${item.skuName || ''}"`,
        item.skuCode || '',
        item.quantity || 0
      ].join(','))
    })

    const csvContent = csvRows.join('\n')
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `phieu-xuat-${receipt.id.substring(0,8)}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    toast.success('Đã xuất file chi tiết phiếu xuất.')
  }

  const handlePreview = async () => {
    const skuError = required(formSkuId, 'Product')
    if (skuError) {
      toast.error('Select a product.')
      return
    }
    const requestedQuantity = Number(formTotalQuantity)
    const quantityError = positiveInteger(requestedQuantity)
    if (quantityError) {
      toast.error(quantityError)
      return
    }

    setIsPreviewLoading(true)
    setPreviewData(null)
    try {
      const payload = {
        warehouseId: selectedWarehouseId,
        items: [
          {
            skuId: formSkuId,
            quantity: requestedQuantity,
          },
        ],
      }
      const response = await receiptApi.getPickListSuggestions(payload)
      setPreviewData(response.data?.data || response.data)
      toast.success('Preview generated successfully.')
    } catch (error) {
      showApiErrorToast(error, 'Could not generate preview.')
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const handleCreateReceipt = async (e) => {
    e.preventDefault()
    
    if (outboundMethod === 'AUTO' && !previewData?.complete) {
      toast.error('Cannot create outbound receipt with shortage.')
      return
    }
    
    let rackId = null
    let binId = null
    
    if (outboundMethod === 'MANUAL') {
      if (!selectedLocationStr) {
        toast.error('Please select a location.')
        return
      }
      const loc = JSON.parse(selectedLocationStr)
      if (Number(formTotalQuantity) > loc.quantity) {
        toast.error(`Quantity exceeds available stock in this location (Max: ${loc.quantity}).`)
        return
      }
      rackId = loc.rackId
      binId = loc.binId
    }

    setIsSubmitting(true)
    try {
      const payload = {
        warehouseId: selectedWarehouseId,
        type: 'OUTBOUND',
        receiverName: formReceiverName,
        items: [
          {
            skuId: formSkuId,
            quantity: Number(formTotalQuantity),
            note: formNote,
            ...(rackId && binId && { rackId, binId })
          },
        ],
      }
      await receiptApi.createReceipt(payload)
      toast.success('Outbound receipt created.')
      setIsModalOpen(false)
      fetchReceipts()

      setFormSkuId('')
      setFormTotalQuantity(1)
      setFormNote('')
      setFormReceiverName('')
      setPreviewData(null)
      setSelectedLocationStr('')
    } catch (error) {
      console.error('Error creating receipt:', error)
      showApiErrorToast(error, 'Could not create receipt.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async (e) => {
    e.preventDefault()
    if (required(rejectReason, 'Rejection reason')) {
      toast.error('Enter a rejection reason.')
      return
    }
    setIsSubmitting(true)
    try {
      await receiptApi.rejectReceipt(rejectingReceiptId, rejectReason)
      toast.success('Receipt rejected.')
      setIsRejectModalOpen(false)
      setRejectReason('')
      setRejectingReceiptId(null)
      fetchReceipts()
    } catch (error) {
      console.error('Error rejecting receipt:', error)
      showApiErrorToast(error, 'Could not reject receipt.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApprove = async (id) => {
    try {
      await receiptApi.approveReceipt(id)
      toast.success('Outbound receipt approved.')
      fetchReceipts()
    } catch (error) {
      if (
        error.response?.data?.errorCode === 'OUTBOUND_PICK_LIST_STALE' ||
        error.response?.data?.code === 'OUTBOUND_PICK_LIST_STALE'
      ) {
        toast.error('Pick list has become stale. Replanning to find new stock...')
        try {
          await receiptApi.replanPickList(id)
          toast.success('Pick list replanned. Please review the new picking order.')
          fetchReceipts()
          const res = await receiptApi.getReceiptDetail(id)
          setDetailReceipt(res?.data?.data ?? res?.data)
          setIsDetailModalOpen(true)
        } catch (replanError) {
          showApiErrorToast(replanError, 'Replan failed. Please try again.')
          fetchReceipts()
        }
      } else {
        console.error('Error approving receipt:', error)
        showApiErrorToast(error, 'Could not approve receipt.')
      }
    }
  }

  const handleViewDetail = async (receipt) => {
    setIsDetailModalOpen(true)
    setDetailReceipt(null)
    setIsDetailLoading(true)
    try {
      const response = await receiptApi.getReceiptDetail(receipt.id)
      setDetailReceipt(response?.data?.data ?? response?.data ?? receipt)
    } catch (error) {
      setDetailReceipt(receipt)
      showApiErrorToast(error, 'Could not load receipt details.')
    } finally {
      setIsDetailLoading(false)
    }
  }

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      if (activeTab === 'ALL') return true
      if (activeTab === 'PENDING' && r.status === 'PENDING') return true
      if (activeTab === 'APPROVED' && r.status === 'APPROVED') return true
      if (activeTab === 'IN_PROGRESS' && r.status === 'IN_PROGRESS') return true
      if (activeTab === 'COMPLETED' && r.status === 'COMPLETED') return true
      return false
    })
  }, [receipts, activeTab])

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
          <main className="mx-auto w-full max-w-[1600px] space-y-8 p-4 sm:p-6 md:p-8">
            <div className="space-y-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
                    <div className="bg-primary/10 text-primary rounded-lg p-2">
                      <ArrowUpRight className="h-6 w-6" />
                    </div>
                    Outbound Operations
                  </h1>
                  <p className="text-sm text-slate-500">
                    Coordinate outgoing shipments and order fulfillment.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="rounded-md border border-slate-200 p-2 text-sm"
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  >
                    <option value="">-- Select Warehouse --</option>
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    onClick={() => setIsModalOpen(true)}
                    disabled={!selectedWarehouseId}
                  >
                    <Minus className="mr-2 h-4 w-4" /> New
                  </Button>
                </div>
              </div>

              <div>
                <div className="space-y-6">
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center gap-6 border-b border-slate-200 bg-slate-50 px-4 pt-2">
                      {[
                        { id: 'ALL', label: 'Tất cả' },
                        { id: 'PENDING', label: 'Chờ duyệt' },
                        { id: 'APPROVED', label: 'Đã xác nhận' },
                        { id: 'IN_PROGRESS', label: 'Đang xử lý' },
                        { id: 'COMPLETED', label: 'Đã hoàn tất' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`relative pb-3 text-sm font-medium transition-colors ${
                            activeTab === tab.id ? 'text-primary' : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {tab.label}
                          {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 h-0.5 w-full bg-primary rounded-t-md" />
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-white">
                      <div className="flex items-center gap-3">
                        <div className="relative w-72">
                          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <InputField placeholder="Tìm kiếm phiếu xuất..." className="h-9 pl-9" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleExport}
                          disabled={!selectedWarehouseId || isExporting}
                          className="flex items-center gap-2 h-9"
                        >
                          {isExporting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          Xuất Excel
                        </Button>
                      </div>
                    </div>

                    <div className="overflow-x-auto bg-white">
                      {isLoading ? (
                        <div className="flex justify-center p-8">
                          <Loader2 className="animate-spin text-slate-400 h-6 w-6" />
                        </div>
                      ) : (
                        <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                            <tr>
                              <th className="border-x border-slate-200 px-4 py-3">Mã Phiếu</th>
                              <th className="border-r border-slate-200 px-4 py-3">Trạng thái</th>
                              <th className="border-r border-slate-200 px-4 py-3">Phương thức</th>
                              <th className="border-r border-slate-200 px-4 py-3">Ngày xuất hàng</th>
                              <th className="border-r border-slate-200 px-4 py-3">Nơi nhận</th>
                              <th className="border-r border-slate-200 px-4 py-3">Người phụ trách</th>
                              <th className="border-r border-slate-200 px-4 py-3">Mặt hàng</th>
                              <th className="border-r border-slate-200 px-4 py-3 text-right">Tổng SL</th>
                              <th className="border-r border-slate-200 px-4 py-3 text-center">Hành động</th>
                              <th className="px-4 py-3 text-center">Xuất</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredReceipts.length === 0 && (
                              <tr>
                                <td colSpan="10" className="px-4 py-8 text-center text-slate-500">
                                  Không tìm thấy phiếu xuất kho.
                                </td>
                              </tr>
                            )}
                            {filteredReceipts.map((r) => {
                              const totalItems = r.items?.length || 0
                              const totalQty = r.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
                              const itemNames = r.items?.map((item) => item.skuName || item.skuCode).filter(Boolean) || []
                              const itemSummary = itemNames.length > 1
                                ? `${itemNames[0]} +${itemNames.length - 1}`
                                : itemNames[0] || '—'
                              
                              return (
                                <tr key={r.id} className="transition-colors hover:bg-slate-50/80">
                                  <td className="border-r border-slate-100 px-4 py-3 font-medium text-primary">
                                    {r.id.substring(0, 8).toUpperCase()}
                                  </td>
                                  <td className="border-r border-slate-100 px-4 py-3 text-center">
                                    <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full ${r.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                        r.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                                          r.status === 'IN_PROGRESS' ? 'bg-purple-100 text-purple-700' :
                                            r.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                              r.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                'bg-slate-100 text-slate-600'
                                    }`}>
                                      {r.status}
                                    </span>
                                  </td>
                                  <td className="border-r border-slate-100 px-4 py-3">
                                    <span className="text-slate-500">OUTBOUND</span>
                                  </td>
                                  <td className="border-r border-slate-100 px-4 py-3 text-slate-600">
                                    {formatOutboundDate(r.createdAt)}
                                  </td>
                                  <td className="max-w-52 border-r border-slate-100 px-4 py-3">
                                    <span
                                      className="block max-w-52 truncate font-medium text-slate-700"
                                      title={r.receiverName || 'Chưa cập nhật nơi nhận'}
                                    >
                                      {r.receiverName || '—'}
                                    </span>
                                  </td>
                                  <td className="max-w-52 border-r border-slate-100 px-4 py-3">
                                    <span
                                      className="block max-w-52 truncate font-medium text-slate-700"
                                      title={r.createdByFullName || 'Chưa cập nhật người phụ trách'}
                                    >
                                      {r.createdByFullName || '—'}
                                    </span>
                                  </td>
                                  <td className="max-w-60 border-r border-slate-100 px-4 py-3 whitespace-normal">
                                    <span className="block max-w-60 truncate font-medium text-slate-800" title={itemNames.join(', ')}>
                                      {itemSummary}
                                    </span>
                                    <span className="mt-0.5 block text-xs text-slate-400">
                                      {totalItems} mặt hàng
                                    </span>
                                  </td>
                                  <td className="border-r border-slate-100 px-4 py-3 text-right font-semibold text-slate-700">
                                    {totalQty}
                                  </td>
                                  <td className="border-r border-slate-100 px-4 py-3 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <div className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1">
                                        <button
                                          onClick={() => handleViewDetail(r)}
                                          className="flex items-center gap-1 text-xs font-medium text-slate-600 transition-colors hover:text-primary"
                                        >
                                          <Eye className="h-3.5 w-3.5" /> Chi tiết
                                        </button>
                                        {r.status === 'PENDING' && currentRole === 'TENANT' && (
                                          <>
                                            <span className="text-slate-300">|</span>
                                            <button
                                              onClick={() => handleApprove(r.id)}
                                              className="text-emerald-600 hover:underline text-xs font-medium"
                                            >
                                              Duyệt
                                            </button>
                                            <span className="text-slate-300">|</span>
                                            <button
                                              onClick={() => {
                                                setRejectingReceiptId(r.id)
                                                setIsRejectModalOpen(true)
                                              }}
                                              className="text-red-600 hover:underline text-xs font-medium"
                                            >
                                              Từ chối
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <button
                                      onClick={() => handleExportSingleReceipt(r)}
                                      className="text-slate-400 hover:text-slate-600 transition-colors p-1" 
                                      title="In/Xuất phiếu"
                                    >
                                      <Download className="h-4 w-4 mx-auto" />
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* New Outbound Modal */}
              <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Create New Outbound Shipment"
              >
                <FormShell onSubmit={handleCreateReceipt} className="space-y-4">
                  <div className="space-y-2 border-b border-slate-200 pb-4">
                    <label className="text-sm font-medium text-slate-700">Phương thức xuất kho</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="outboundMethod" 
                          className="accent-brand-600"
                          checked={outboundMethod === 'AUTO'}
                          onChange={() => setOutboundMethod('AUTO')}
                        />
                        <span className="text-sm text-slate-700">Tự động lấy hàng (FIFO)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="outboundMethod" 
                          className="accent-brand-600"
                          checked={outboundMethod === 'MANUAL'}
                          onChange={() => {
                            setOutboundMethod('MANUAL')
                            setPreviewData(null)
                          }}
                        />
                        <span className="text-sm text-slate-700">Thủ công (Chọn vị trí cụ thể)</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">
                        Select Product (SKU)
                      </label>
                      <select
                        required
                        className="focus:ring-primary w-full rounded-md border border-slate-200 bg-white p-2 text-sm focus:ring-2 focus:outline-none"
                        value={formSkuId}
                        onChange={(e) => {
                          setFormSkuId(e.target.value)
                          setPreviewData(null)
                          setSelectedLocationStr('')
                        }}
                      >
                        <option value="">-- Select product --</option>
                        {skus.map((sku) => (
                          <option key={sku.id} value={sku.id}>
                            [{sku.skuCode}] {sku.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Total Quantity</label>
                      <InputField
                        type="number"
                        min="1"
                        required
                        value={formTotalQuantity}
                        onChange={(e) => {
                          const value = e.target.value
                          setFormTotalQuantity(value)
                          setPreviewData(null)
                        }}
                      />
                    </div>

                    {outboundMethod === 'MANUAL' && (
                      <div className="space-y-1.5 col-span-2">
                        <label className="text-sm font-medium text-slate-700">
                          Location (Rack & Bin) {isLocationsLoading && <Loader2 className="inline h-3 w-3 animate-spin text-slate-400" />}
                        </label>
                        <select
                          required
                          className="focus:ring-primary w-full rounded-md border border-slate-200 bg-white p-2 text-sm focus:ring-2 focus:outline-none"
                          value={selectedLocationStr}
                          onChange={(e) => setSelectedLocationStr(e.target.value)}
                          disabled={!formSkuId || isLocationsLoading}
                        >
                          <option value="">-- Select location --</option>
                          {availableLocations.map((loc) => (
                            <option key={`${loc.rackId}_${loc.binId}`} value={JSON.stringify(loc)}>
                              Kệ {loc.rackName} — Ô {loc.binName} (Tồn: {loc.quantity})
                            </option>
                          ))}
                        </select>
                        {availableLocations.length === 0 && formSkuId && !isLocationsLoading && (
                          <p className="text-xs text-red-500">Sản phẩm này hiện không có tồn kho trong kho được chọn.</p>
                        )}
                      </div>
                    )}

                    <div className="space-y-1.5 col-span-2">
                      <label className="text-sm font-medium text-slate-700">Tên nơi nhận (Receiver Name)</label>
                      <InputField
                        placeholder="Ví dụ: Khách hàng B"
                        value={formReceiverName}
                        onChange={(e) => setFormReceiverName(e.target.value)}
                      />
                    </div>
                  </div>

                  {outboundMethod === 'AUTO' && (
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <MapIcon className="h-4 w-4 text-emerald-600" /> Lộ trình lấy hàng đề xuất (FIFO)
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handlePreview}
                          isLoading={isPreviewLoading}
                          disabled={!formSkuId || !formTotalQuantity}
                        >
                          Xem trước lộ trình
                        </Button>
                      </div>

                      {!previewData ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                          Nhấn "Xem trước lộ trình" để hệ thống tính toán tuyến đường lấy hàng tối ưu.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {!previewData.complete && (
                            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                              <strong>Phát hiện thiếu hàng!</strong> Hệ thống đang thiếu{' '}
                              {previewData.items?.[0]?.shortageQuantity} sản phẩm so với yêu cầu. Bạn không thể tạo phiếu xuất này.
                            </div>
                          )}
                          <div className="max-h-[350px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-5">
                            <div className="relative border-l-2 border-emerald-200 ml-3 space-y-6">
                              {previewData.stops?.map((stop, index) => (
                                <div
                                  key={index}
                                  className="relative pl-6"
                                >
                                  <div className="absolute -left-[17px] top-0 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 border-4 border-white text-sm font-bold text-emerald-600 shadow-sm">
                                    {stop.sequence}
                                  </div>
                                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
                                      <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-rose-500" />
                                        <span className="text-sm font-bold text-slate-800">
                                          Kệ {stop.rackCode} — Ô {stop.binCode}
                                        </span>
                                      </div>
                                      <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                                        Tầng {stop.shelfLevel}
                                      </span>
                                    </div>
                                    
                                    <div className="overflow-x-auto rounded-lg border border-slate-100">
                                      <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 text-xs text-slate-500">
                                          <tr>
                                            <th className="px-3 py-2 font-medium">Sản phẩm (SKU)</th>
                                            <th className="px-3 py-2 font-medium">Ngày nhập</th>
                                            <th className="px-3 py-2 text-right font-medium">Cần lấy</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {stop.lines?.map((line, lIndex) => (
                                            <tr key={lIndex}>
                                              <td className="px-3 py-2 font-mono font-medium text-slate-800">{line.skuCode}</td>
                                              <td className="px-3 py-2 text-slate-500">
                                                {line.arrivalDate ? new Date(line.arrivalDate).toLocaleDateString('vi-VN') : '—'}
                                              </td>
                                              <td className="px-3 py-2 text-right font-bold text-emerald-700">
                                                {line.quantity}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Note (Optional)</label>
                    <InputField
                      value={formNote}
                      onChange={(e) => setFormNote(e.target.value)}
                      placeholder="Enter notes..."
                    />
                  </div>

                  <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
                    <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      isLoading={isSubmitting}
                      disabled={!formSkuId || (outboundMethod === 'AUTO' && !previewData?.complete)}
                    >
                      Confirm Outbound
                    </Button>
                  </div>
                </FormShell>
              </Modal>

              <Modal
                isOpen={isRejectModalOpen}
                onClose={() => setIsRejectModalOpen(false)}
                title="Reject Receipt"
              >
                <FormShell onSubmit={handleReject} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      Reason for rejection *
                    </label>
                    <InputField
                      placeholder="Enter reason..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsRejectModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="danger" isLoading={isSubmitting}>
                      Confirm Reject
                    </Button>
                  </div>
                </FormShell>
              </Modal>

              <ReceiptDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                receipt={detailReceipt}
                isLoading={isDetailLoading}
                type="OUTBOUND"
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default OutboundPage
