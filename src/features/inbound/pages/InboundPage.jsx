import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'
import {
  ArrowDownLeft,
  Package,
  Truck,
  Search,
  Plus,
  History,
  BarChart2,
  ShieldCheck,
  FileText,
  Download,
  Loader2,
  PlusCircle,
  Trash2,
  Eye,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import InputField from '@/components/atoms/InputField'
import Modal from '@/components/organisms/Modal'
import TableActionMenu from '@/components/TableActionMenu'
import receiptApi from '@/services/wms/receiptApi'
import stockApi from '@/services/wms/stockApi'
import productApi from '../../../services/wms/productApi'
import warehouseApi from '@/services/warehouse/warehouseApi'
import { toast } from 'react-hot-toast'
import ReceiptDetailModal from '@/features/inventory/components/ReceiptDetailModal'

const movementData = [
  { name: '08:00', value: 20 },
  { name: '10:00', value: 45 },
  { name: '12:00', value: 30 },
  { name: '14:00', value: 65 },
  { name: '16:00', value: 50 },
  { name: '18:00', value: 80 },
]

const InboundPage = () => {
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
  const [layout, setLayout] = useState(null)

  // Selection states
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Form states
  const [formSkuId, setFormSkuId] = useState('')
  const [formTotalQuantity, setFormTotalQuantity] = useState(1)
  const [allocations, setAllocations] = useState({}) // { binId: quantity }
  const [binCapacities, setBinCapacities] = useState({})
  const [formNote, setFormNote] = useState('')

  useEffect(() => {
    const fetchCapacities = async () => {
      if (!selectedWarehouseId || !layout) return
      const binIds = layout.racks?.flatMap((r) => r.bins?.map((b) => b.id)) || []
      const newCapacities = { ...binCapacities }
      let changed = false

      for (const binId of binIds) {
        if (!newCapacities[binId]) {
          try {
            let targetBin = null
            layout.racks?.forEach((r) => {
              const b = r.bins?.find((b) => b.id === binId)
              if (b) targetBin = b
            })
            if (!targetBin) continue

            const stockRes = await stockApi.getStockByBin(selectedWarehouseId, binId)
            const currentStock = stockRes.totalQuantity || 0
            const maxWeight = targetBin.maxWeight ? Number(targetBin.maxWeight) : Infinity
            const maxVolume = targetBin.maxVolume ? Number(targetBin.maxVolume) : Infinity
            const maxCapacity = Math.min(maxWeight, maxVolume)

            newCapacities[binId] = {
              max: maxCapacity === Infinity ? 'Unlimited' : maxCapacity,
              current: currentStock,
              available:
                maxCapacity === Infinity ? 'Unlimited' : Math.max(maxCapacity - currentStock, 0),
            }
            changed = true
          } catch (e) {
            console.error('Error fetching bin capacity', e)
          }
        }
      }
      if (changed) {
        setBinCapacities(newCapacities)
      }
    }
    fetchCapacities()
  }, [selectedWarehouseId, layout])

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (selectedWarehouseId) {
      fetchReceipts()
      fetchLayout()
    }
  }, [selectedWarehouseId])

  const fetchInitialData = async () => {
    try {
      const [whRes, skuRes] = await Promise.all([
        warehouseApi.getMyWarehouses(),
        productApi.getSKUs({ page: 0, size: 50 }),
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

      setSkus(skuRes.data?.data?.content || [])
    } catch (error) {
      console.error('Error fetching initial data:', error)
      if (error.response?.data?.errorCode === 'SUBSCRIPTION_REQUIRED') {
        toast.error('Please purchase a subscription to use the Inbound function!')
      } else {
        toast.error(error.response?.data?.message || 'Failed to load initial data')
      }
    }
  }

  const fetchLayout = async () => {
    try {
      const res =
        currentRole === 'STAFF'
          ? await warehouseApi.getPublicWarehouseLayout(selectedWarehouseId)
          : await warehouseApi.getTenantWarehouseLayout(selectedWarehouseId)
      setLayout(res.data?.data)
    } catch (error) {
      setLayout(null)
      if (error.response?.status !== 404) {
        console.error('Error fetching layout:', error)
      }
    }
  }

  const fetchReceipts = async () => {
    setIsLoading(true)
    try {
      const res = await receiptApi.getReceipts(selectedWarehouseId, {
        type: 'INBOUND',
        page: 0,
        size: 20,
      })
      setReceipts(res.data?.data?.content || [])
    } catch (error) {
      console.error('Error fetching receipts:', error)
      if (error.response?.data?.errorCode === 'SUBSCRIPTION_REQUIRED') {
        // Only show if not already shown by initial data
      } else {
        toast.error(error.response?.data?.message || 'Failed to load receipts')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async () => {
    if (!selectedWarehouseId) return
    setIsExporting(true)
    try {
      const response = await receiptApi.exportReceipts(selectedWarehouseId, 'INBOUND')
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'inbound-receipts.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Export file successfully')
    } catch (error) {
      console.error('Error when exporting file:', error)
      toast.error('Error when exporting file')
    } finally {
      setIsExporting(false)
    }
  }

  const handleCreateReceipt = async (e) => {
    e.preventDefault()
    if (!formSkuId) {
      toast.error('Please select a product')
      return
    }

    // Filter out bins with 0 or empty quantity
    const activeAllocations = Object.entries(allocations).filter(([binId, qty]) => Number(qty) > 0)

    if (activeAllocations.length === 0) {
      toast.error('Please allocate quantity to at least one bin')
      return
    }

    let totalAllocated = 0
    const payloadItems = []

    for (const [binId, qtyStr] of activeAllocations) {
      const qty = Number(qtyStr)
      totalAllocated += qty

      let rackId = null
      layout?.racks?.forEach((r) => {
        if (r.bins?.some((b) => b.id === binId)) rackId = r.id
      })

      const cap = binCapacities[binId]
      if (cap && cap.available !== 'Unlimited' && qty > cap.available) {
        toast.error(
          `Bin exceeds capacity! (Available: ${cap.available}, Allocated: ${qty}). Please adjust.`
        )
        return
      }

      payloadItems.push({
        skuId: formSkuId,
        quantity: qty,
        rackId: rackId,
        binId: binId,
        note: formNote,
      })
    }

    if (totalAllocated !== Number(formTotalQuantity)) {
      toast.error(
        `Total allocated (${totalAllocated}) must equal the total quantity (${formTotalQuantity})`
      )
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        warehouseId: selectedWarehouseId,
        type: 'INBOUND',
        items: payloadItems,
      }
      await receiptApi.createReceipt(payload)
      toast.success('Created successful entry form')
      setIsModalOpen(false)
      fetchReceipts()

      setFormSkuId('')
      setFormTotalQuantity(1)
      setAllocations({})
      setBinCapacities({})
      setFormNote('')
    } catch (error) {
      console.error('Error creating receipt:', error)
      toast.error(error.response?.data?.message || 'Error while creating ticket')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async (e) => {
    e.preventDefault()
    if (!rejectReason.trim()) {
      toast.error('Please enter a reject reason')
      return
    }
    setIsSubmitting(true)
    try {
      await receiptApi.rejectReceipt(rejectingReceiptId, rejectReason)
      toast.success('Rejected receipt successfully')
      setIsRejectModalOpen(false)
      setRejectReason('')
      setRejectingReceiptId(null)
      fetchReceipts()
    } catch (error) {
      console.error('Error rejecting receipt:', error)
      toast.error(error.response?.data?.message || 'Error when rejecting receipt')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApprove = async (id) => {
    try {
      await receiptApi.approveReceipt(id)
      toast.success('Approved input slip successfully')
      fetchReceipts()
    } catch (error) {
      console.error('Error approving receipt:', error)
      toast.error(error.response?.data?.message || 'Error when approving votes')
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
      toast.error(error.response?.data?.message || 'Unable to load full receipt details.')
    } finally {
      setIsDetailLoading(false)
    }
  }

  const columns = [
    ...(currentRole === 'TENANT'
      ? []
      : [{ header: 'Receipt ID', render: (row) => row.id.substring(0, 8) }]),
    {
      header: 'Warehouse',
      render: () => {
        const wh = warehouses.find((w) => w.id === selectedWarehouseId)
        return wh ? wh.name : 'Unknown'
      },
    },
    {
      header: 'Items',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-slate-400" />
          <span className="font-medium text-slate-900">{row.items?.length || 0} items</span>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge
          variant={
            row.status === 'APPROVED' ? 'success' : row.status === 'PENDING' ? 'warning' : 'danger'
          }
        >
          {row.status}
        </Badge>
      ),
    },
    { header: 'Created Date', render: (row) => new Date(row.createdAt).toLocaleString() },
    {
      header: 'Actions',
      render: (row) => (
        <TableActionMenu
          items={[
            { label: 'Details', icon: Eye, onClick: () => handleViewDetail(row) },
            row.status === 'PENDING' &&
              currentRole === 'TENANT' && {
                label: 'Approve',
                onClick: () => handleApprove(row.id),
              },
            row.status === 'PENDING' &&
              currentRole === 'TENANT' && {
                label: 'Reject',
                danger: true,
                onClick: () => {
                  setRejectingReceiptId(row.id)
                  setIsRejectModalOpen(true)
                },
              },
            row.status === 'PENDING' &&
              currentRole !== 'TENANT' && { label: 'Wait for Tenant to approve', disabled: true },
            row.status !== 'PENDING' && {
              label: row.status === 'REJECTED' ? 'Rejected' : 'Approved',
              disabled: true,
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
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
          }`}
        >
          <main className="mx-auto w-full max-w-[1600px] space-y-8 p-6 md:p-8">
            <div className="space-y-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
                    <div className="bg-success/10 text-success rounded-lg p-2">
                      <ArrowDownLeft className="h-6 w-6" />
                    </div>
                    Inbound Operations
                  </h1>
                  <p className="text-sm text-slate-500">
                    Manage incoming shipments and stock replenishment.
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
                    <Plus className="mr-2 h-4 w-4" /> New Inbound
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-6 flex items-center justify-between">
                      <h3 className="font-bold text-slate-900">Recent Inbound Shipments</h3>
                      <div className="flex items-center gap-3">
                        <div className="relative w-64">
                          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <InputField placeholder="Search shipments..." className="h-9 pl-10" />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleExport}
                          disabled={!selectedWarehouseId || isExporting}
                          className="flex items-center gap-2"
                        >
                          {isExporting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          Export CSV
                        </Button>
                      </div>
                    </div>
                    {isLoading ? (
                      <div className="flex justify-center p-8">
                        <Loader2 className="animate-spin text-slate-400" />
                      </div>
                    ) : (
                      <DataTable columns={columns} data={receipts} />
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-6 font-bold text-slate-900">Volume Forecast</h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={movementData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" hide />
                          <YAxis hide />
                          <Tooltip
                            contentStyle={{
                              borderRadius: '12px',
                              border: 'none',
                              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#10b981"
                            strokeWidth={3}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              {/* New Inbound Modal */}
              <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Register New Inbound Shipment"
              >
                <form onSubmit={handleCreateReceipt} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">
                        Select Product (SKU)
                      </label>
                      <select
                        required
                        className="focus:ring-primary w-full rounded-md border border-slate-200 bg-white p-2 text-sm focus:ring-2 focus:outline-none"
                        value={formSkuId}
                        onChange={(e) => setFormSkuId(e.target.value)}
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
                        onChange={(e) => setFormTotalQuantity(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">
                        Allocate into Bins
                      </label>
                      <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                        Total Allocated:{' '}
                        {Object.values(allocations).reduce(
                          (acc, val) => acc + (Number(val) || 0),
                          0
                        )}{' '}
                        / {formTotalQuantity}
                      </span>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
                      {!layout?.racks?.length ? (
                        <div className="py-4 text-center text-sm text-slate-500">
                          No Racks found in this warehouse.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {layout.racks.map((rack) => (
                            <div
                              key={rack.id}
                              className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                            >
                              <h4 className="mb-2 text-sm font-semibold text-slate-800">
                                {rack.name}
                              </h4>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {rack.bins?.map((bin) => {
                                  const cap = binCapacities[bin.id]
                                  return (
                                    <div
                                      key={bin.id}
                                      className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 p-2"
                                    >
                                      <div>
                                        <div className="text-sm font-medium text-slate-700">
                                          {bin.name}
                                        </div>
                                        {cap && (
                                          <div className="text-[10px] text-slate-500">
                                            Avail:{' '}
                                            <span className="font-semibold text-emerald-600">
                                              {cap.available}
                                            </span>{' '}
                                            / Max: {cap.max}
                                          </div>
                                        )}
                                      </div>
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        className="focus:ring-primary w-20 rounded-md border border-slate-200 bg-white p-1 text-center text-sm focus:ring-2 focus:outline-none"
                                        value={allocations[bin.id] || ''}
                                        onChange={(e) => {
                                          setAllocations((prev) => ({
                                            ...prev,
                                            [bin.id]: e.target.value,
                                          }))
                                        }}
                                      />
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
                    <Button type="submit" isLoading={isSubmitting}>
                      Confirm Inbound
                    </Button>
                  </div>
                </form>
              </Modal>

              <Modal
                isOpen={isRejectModalOpen}
                onClose={() => setIsRejectModalOpen(false)}
                title="Reject Receipt"
              >
                <form onSubmit={handleReject} className="space-y-4">
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
                </form>
              </Modal>

              <ReceiptDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                receipt={detailReceipt}
                isLoading={isDetailLoading}
                type="INBOUND"
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default InboundPage
