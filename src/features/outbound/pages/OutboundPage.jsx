import { useState, useEffect, useMemo, useCallback } from 'react'
import { FormShell } from '@/form/FormControls'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'
import { ArrowUpRight, Search, Minus, Loader2, Download, Eye, Map as MapIcon, MapPin } from 'lucide-react'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
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

const OutboundPage = () => {
  const dispatch = useDispatch()
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
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [activeTab, setActiveTab] = useState('ALL')

  // Form states
  const [formSkuId, setFormSkuId] = useState('')
  const [formTotalQuantity, setFormTotalQuantity] = useState(1)
  const [formNote, setFormNote] = useState('')
  const [formReceiverName, setFormReceiverName] = useState('')
  const [previewData, setPreviewData] = useState(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  const fetchInitialData = useCallback(async () => {
    try {
      const [whRes, skuRes] = await Promise.all([
        warehouseApi.getMyWarehouses(),
        productApi.getAllSKUs(),
      ])

      // API trả về danh sách kho, có thể ở data.data hoặc data.data.content
      const whData = whRes.data?.data?.content || whRes.data?.data || []
      const whList = whData.map((w) => ({
        id: w.id || w.warehouseId,
        name: w.name || w.warehouseName,
      }))
      setWarehouses(whList)
      if (whList.length > 0) {
        setSelectedWarehouseId(whList[0].id)
      }

      setSkus(Array.isArray(skuRes) ? skuRes : [])
    } catch (error) {
      console.error('Error fetching initial data:', error)
      if (error.response?.data?.errorCode === 'SUBSCRIPTION_REQUIRED') {
        showApiErrorToast(error, 'Subscription required for outbound.')
      } else {
        showApiErrorToast(error, 'Could not load outbound data.')
      }
    }
  }, [])

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
    // Initial server data is intentionally loaded when this screen mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInitialData()
  }, [fetchInitialData])

  useEffect(() => {
    if (selectedWarehouseId) {
      // Refresh server-backed data whenever the active warehouse changes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchReceipts()
    }
  }, [fetchReceipts, selectedWarehouseId])

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
    // Headers
    csvRows.push(['Mã Phiếu', 'Trạng thái', 'Ngày tạo', 'Tên mặt hàng', 'Mã SKU', 'Số lượng'].join(','))
    
    receipt.items.forEach(item => {
      csvRows.push([
        receipt.id.substring(0, 8).toUpperCase(),
        receipt.status,
        new Date(receipt.createdAt).toLocaleDateString('vi-VN'),
        `"${item.skuName || ''}"`,
        item.skuCode || '',
        item.quantity || 0
      ].join(','))
    })

    const csvContent = csvRows.join('\n')
    // Add BOM for UTF-8 Excel compatibility
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
    if (!previewData?.complete) {
      toast.error('Cannot create outbound receipt with shortage.')
      return
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
          // Automatically open detail view so user can review the new pick list
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
          <main className="mx-auto w-full max-w-[1600px] space-y-8 p-6 md:p-8">
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
                    {/* Tabs */}
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

                    {/* Toolbar */}
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

                    {/* Table */}
                    <div className="overflow-x-auto bg-white">
                      {isLoading ? (
                        <div className="flex justify-center p-8">
                          <Loader2 className="animate-spin text-slate-400 h-6 w-6" />
                        </div>
                      ) : (
                        <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-3 w-10 text-center"><input type="checkbox" className="rounded border-slate-300" /></th>
                              <th className="px-4 py-3 border-x border-slate-200">Số dự kiến xuất kho</th>
                              <th className="px-4 py-3 border-r border-slate-200">Tên nơi nhận</th>
                              <th className="px-4 py-3 border-r border-slate-200">Tên người phụ trách</th>
                              <th className="px-4 py-3 border-r border-slate-200">Tên mặt hàng [Thông số]</th>
                              <th className="px-4 py-3 border-r border-slate-200">Ngày giao hàng</th>
                              <th className="px-4 py-3 border-r border-slate-200 text-right">Tổng số lượng dự kiến</th>
                              <th className="px-4 py-3 border-r border-slate-200 text-center">Hiện trạng</th>
                              <th className="px-4 py-3 text-center">In</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredReceipts.length === 0 ? (
                              <tr>
                                <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                                  Không có dữ liệu phiếu xuất.
                                </td>
                              </tr>
                            ) : filteredReceipts.map(r => {
                              const totalQty = (r.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
                              const itemName = r.items?.length > 0 
                                ? `${r.items[0].skuName}${r.items.length > 1 ? ` và ${r.items.length - 1} mục khác` : ''}`
                                : '—'
                              return (
                                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="px-4 py-3 text-center border-r border-slate-100"><input type="checkbox" className="rounded border-slate-300" /></td>
                                  <td className="px-4 py-3 border-r border-slate-100 text-primary font-medium">{r.id.substring(0,8).toUpperCase()}</td>
                                  <td className="px-4 py-3 border-r border-slate-100 text-slate-500">{r.receiverName || '—'}</td>
                                  <td className="px-4 py-3 border-r border-slate-100 text-slate-700">{r.createdByFullName || '—'}</td>
                                  <td className="px-4 py-3 border-r border-slate-100 whitespace-normal min-w-[200px]">{itemName}</td>
                                  <td className="px-4 py-3 border-r border-slate-100">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</td>
                                  <td className="px-4 py-3 border-r border-slate-100 text-right font-semibold text-slate-700">{totalQty}</td>
                                  <td className="px-4 py-3 border-r border-slate-100 text-center">
                                    <div className="flex flex-col gap-1 items-center">
                                      <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full ${
                                        r.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                        r.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                                        r.status === 'IN_PROGRESS' ? 'bg-purple-100 text-purple-700' :
                                        r.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                        'bg-slate-100 text-slate-600'
                                      }`}>
                                        {r.status}
                                      </span>
                                      <div className="flex items-center justify-center gap-2 mt-1">
                                        <button 
                                          onClick={() => { setDetailReceipt(r); setIsDetailModalOpen(true) }}
                                          className="text-primary hover:underline text-xs font-medium"
                                        >
                                          Xem
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
                  <div className="grid grid-cols-2 gap-4">
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

                    <div className="space-y-1.5 col-span-2">
                      <label className="text-sm font-medium text-slate-700">Tên nơi nhận (Receiver Name)</label>
                      <InputField
                        placeholder="Ví dụ: Khách hàng B"
                        value={formReceiverName}
                        onChange={(e) => setFormReceiverName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
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
                      disabled={!formSkuId || !previewData?.complete}
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
