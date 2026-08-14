import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'
import {
  ArrowUpRight, Package, Truck, Search,
  Minus, History, PieChart, ShieldAlert,
  FileText, Share2, Loader2, Download, PlusCircle, Trash2
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import InputField from '@/components/atoms/InputField'
import Modal from '@/components/organisms/Modal'
import receiptApi from '@/services/wms/receiptApi'
import stockApi from '@/services/wms/stockApi'
import productApi from '@/services/wms/productApi'
import warehouseApi from '@/services/warehouse/warehouseApi'
import { toast } from 'react-hot-toast'

const shipmentData = [
  { name: 'Mon', value: 12 },
  { name: 'Tue', value: 19 },
  { name: 'Wed', value: 15 },
  { name: 'Thu', value: 22 },
  { name: 'Fri', value: 30 },
]

const OutboundPage = () => {
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  const { user } = useSelector((state) => state.auth)
  const currentRole = user?.role === 'ROLE_STAFF' ? 'STAFF' : 'TENANT'

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectingReceiptId, setRejectingReceiptId] = useState(null)

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
  const [skuLocations, setSkuLocations] = useState([])
  const [formNote, setFormNote] = useState('')

  useEffect(() => {
    const fetchLocations = async () => {
      if (!formSkuId || !selectedWarehouseId || !layout) {
        setSkuLocations([]);
        return;
      }
      try {
        const res = await stockApi.getStockBySku(formSkuId);
        const locations = res.data?.data?.locations || [];
        
        // Match Rack/Bin names with Layout to get IDs
        const matchedLocations = locations
          .filter(loc => loc.warehouseId === selectedWarehouseId)
          .map(loc => {
            const rack = layout.racks?.find(r => r.name === loc.rackName);
            const bin = rack?.bins?.find(b => b.name === loc.binName);
            return {
              ...loc,
              rackId: rack?.id,
              binId: bin?.id
            };
          })
          .filter(loc => loc.rackId && loc.binId);
          
        setSkuLocations(matchedLocations);
        
        // Reset allocations if previous selected bins are no longer valid
        setAllocations({});
      } catch (error) {
        console.error("Failed to fetch SKU stock locations", error);
        setSkuLocations([]);
      }
    };
    fetchLocations();
  }, [formSkuId, selectedWarehouseId, layout]);

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
        productApi.getSKUs({ page: 0, size: 50 })
      ])

      // API trả về danh sách kho, có thể ở data.data hoặc data.data.content
      const whData = whRes.data?.data?.content || whRes.data?.data || []
      const whList = whData.map(w => ({ id: w.id || w.warehouseId, name: w.name || w.warehouseName }))
      setWarehouses(whList)
      if (whList.length > 0) {
        setSelectedWarehouseId(whList[0].id)
      }

      setSkus(skuRes.data?.data?.content || [])
    } catch (error) {
      console.error('Error fetching initial data:', error)
      if (error.response?.data?.errorCode === 'SUBSCRIPTION_REQUIRED') {
        toast.error("Please purchase a subscription to use the Outbound function!")
      } else {
        toast.error(error.response?.data?.message || 'Failed to load initial data')
      }
    }
  }

  const fetchLayout = async () => {
    try {
      const res = currentRole === 'STAFF'
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
      const res = await receiptApi.getReceipts(selectedWarehouseId, { type: 'OUTBOUND', page: 0, size: 20 })
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
      const response = await receiptApi.exportReceipts(selectedWarehouseId, 'OUTBOUND')
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'outbound-receipts.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success("Export file successfully")
    } catch (error) {
      console.error("Error when exporting file:", error)
      toast.error("Error when exporting file")
    } finally {
      setIsExporting(false)
    }
  }

      const handleCreateReceipt = async (e) => {
    e.preventDefault()
    if (!formSkuId) {
      toast.error("Please select a product")
      return
    }

    const activeAllocations = Object.entries(allocations).filter(([binId, qty]) => Number(qty) > 0);

    if (activeAllocations.length === 0) {
      toast.error("Please allocate quantity to at least one bin")
      return
    }

    let totalAllocated = 0;
    const payloadItems = [];

    for (const [binId, qtyStr] of activeAllocations) {
      const qty = Number(qtyStr);
      
      const loc = skuLocations.find(l => l.binId === binId);
      if (!loc) {
        toast.error(`Bin ${binId.substring(0,6)} does not contain this SKU.`);
        return;
      }
      if (qty > loc.quantity) {
        toast.error(`Bin ${loc.binName} doesn't have enough stock! (Current: ${loc.quantity}, Taken: ${qty}).`)
        return
      }
      
      totalAllocated += qty;
      payloadItems.push({
        skuId: formSkuId,
        quantity: qty,
        rackId: loc.rackId,
        binId: loc.binId,
        note: formNote
      });
    }
    
    if (totalAllocated !== Number(formTotalQuantity)) {
      toast.error(`Total allocated (${totalAllocated}) must equal the total quantity (${formTotalQuantity})`);
      return;
    }

    setIsSubmitting(true)
    try {
      const payload = {
        warehouseId: selectedWarehouseId,
        type: 'OUTBOUND',
        items: payloadItems
      }
      await receiptApi.createReceipt(payload)
      toast.success("Created export ticket successfully")
      setIsModalOpen(false)
      fetchReceipts()

      setFormSkuId('')
      setFormTotalQuantity(1)
      setAllocations({})
      setFormNote('')
      setSkuLocations([])
    } catch (error) {
      console.error('Error creating receipt:', error)
      toast.error(error.response?.data?.message || "Error while creating ticket")
    } finally {
      setIsSubmitting(false)
    }
  }


  const handleReject = async (e) => {
    e.preventDefault()
    if (!rejectReason.trim()) {
      toast.error("Please enter a reject reason")
      return
    }
    setIsSubmitting(true)
    try {
      await receiptApi.rejectReceipt(rejectingReceiptId, rejectReason)
      toast.success("Rejected receipt successfully")
      setIsRejectModalOpen(false)
      setRejectReason('')
      setRejectingReceiptId(null)
      fetchReceipts()
    } catch (error) {
      console.error('Error rejecting receipt:', error)
      toast.error(error.response?.data?.message || "Error when rejecting receipt")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApprove = async (id) => {
    try {
      await receiptApi.approveReceipt(id)
      toast.success("Export slip approved successfully")
      fetchReceipts()
    } catch (error) {
      console.error('Error approving receipt:', error)
      toast.error(error.response?.data?.message || "Error when approving votes")
    }
  }

  const columns = [
    { header: 'Receipt ID', render: (row) => row.id.substring(0, 8) },
    {
      header: 'Warehouse',
      render: () => {
        const wh = warehouses.find(w => w.id === selectedWarehouseId)
        return wh ? wh.name : 'Unknown'
      }
    },
    {
      header: 'Items',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-slate-400" />
          <span className="font-medium text-slate-900">{row.items?.length || 0} items</span>
        </div>
      )
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'APPROVED' ? 'success' : row.status === 'PENDING' ? 'warning' : 'danger'}>
          {row.status}
        </Badge>
      )
    },
    { header: 'Created Date', render: (row) => new Date(row.createdAt).toLocaleString() },
    {
      header: 'Actions',
      render: (row) => (
        row.status === 'PENDING' ? (
            currentRole === 'TENANT' ? (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleApprove(row.id)}>
                  Approve
                </Button>
                <Button size="sm" variant="danger" onClick={() => { setRejectingReceiptId(row.id); setIsRejectModalOpen(true); }}>
                  Reject
                </Button>
              </div>
            ) : (
            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500 italic border border-slate-200">
              Wait for Tenant to approve
            </span>
          )
        ) : (
            <Button size="sm" variant="ghost" disabled>
              {row.status === 'REJECTED' ? 'Rejected' : 'Approved'}
            </Button>
          )
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
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
            }`}
        >
          <main className="mx-auto w-full max-w-[1600px] space-y-8 p-6 md:p-8">
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <ArrowUpRight className="h-6 w-6" />
                    </div>
                    Outbound Operations
                  </h1>
                  <p className="text-sm text-slate-500">Coordinate outgoing shipments and order fulfillment.</p>
                </div>
                <div className="flex gap-2 items-center">
                  <select
                    className="rounded-md border border-slate-200 p-2 text-sm"
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  >
                    <option value="">-- Select Warehouse --</option>
                    {warehouses.map(wh => (
                      <option key={wh.id} value={wh.id}>{wh.name}</option>
                    ))}
                  </select>
                  <Button size="sm" onClick={() => setIsModalOpen(true)} disabled={!selectedWarehouseId}>
                    <Minus className="h-4 w-4 mr-2" /> New Shipment
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-slate-900">Recent Outbound Shipments</h3>
                      <div className="flex items-center gap-3">
                        <div className="relative w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <InputField placeholder="Search orders..." className="pl-10 h-9" />
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleExport} 
                          disabled={!selectedWarehouseId || isExporting}
                          className="flex items-center gap-2"
                        >
                          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                          Export CSV
                        </Button>
                      </div>
                    </div>
                    {isLoading ? (
                      <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-400" /></div>
                    ) : (
                      <DataTable columns={columns} data={receipts} />
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-6">Fulfillment Distribution</h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={shipmentData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <YAxis hide />
                          <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
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
                                                <form onSubmit={handleCreateReceipt} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Select Product (SKU)</label>
                      <select
                        required
                        className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        value={formSkuId}
                        onChange={(e) => setFormSkuId(e.target.value)}
                      >
                        <option value="">-- Select product --</option>
                        {skus.map(sku => (
                          <option key={sku.id} value={sku.id}>[{sku.skuCode}] {sku.name}</option>
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
                      <label className="text-sm font-medium text-slate-700">Pick from Bins</label>
                      <span className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded text-slate-600">
                        Total Picked: {Object.values(allocations).reduce((acc, val) => acc + (Number(val) || 0), 0)} / {formTotalQuantity}
                      </span>
                    </div>
                    
                    {!formSkuId ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                        Please select an SKU first to see available locations.
                      </div>
                    ) : skuLocations.length === 0 ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">
                        This SKU is currently not in stock at this warehouse.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 max-h-[400px] overflow-y-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {skuLocations.map(loc => (
                            <div key={loc.binId} className="flex flex-col gap-2 p-3 bg-white rounded-lg border border-slate-200 shadow-sm relative">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="text-xs font-medium text-slate-500">{loc.rackName}</div>
                                  <div className="text-sm font-bold text-slate-800">{loc.binName}</div>
                                </div>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  className="w-20 rounded-md border border-slate-200 bg-slate-50 p-1 text-sm text-center focus:ring-2 focus:ring-primary focus:outline-none"
                                  value={allocations[loc.binId] || ''}
                                  onChange={(e) => {
                                    setAllocations(prev => ({ ...prev, [loc.binId]: e.target.value }));
                                  }}
                                />
                              </div>
                              <div className="text-xs text-slate-500">
                                Current Stock: <span className="font-semibold text-emerald-600">{loc.quantity}</span>
                              </div>
                            </div>
                          ))}
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

                  <div className="pt-6 flex justify-end gap-3 border-t border-slate-200">
                    <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button type="submit" isLoading={isSubmitting} disabled={!formSkuId || skuLocations.length === 0}>Confirm Outbound</Button>
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
                      <label className="text-sm font-medium text-slate-700">Reason for rejection *</label>
                      <InputField
                        placeholder="Enter reason..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        required
                      />
                    </div>
                    <div className="pt-6 flex justify-end gap-3 border-t border-slate-200">
                      <Button type="button" variant="outline" onClick={() => setIsRejectModalOpen(false)}>Cancel</Button>
                      <Button type="submit" variant="danger" isLoading={isSubmitting}>Confirm Reject</Button>
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

export default OutboundPage
