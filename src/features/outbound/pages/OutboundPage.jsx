import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'
import { 
  ArrowUpRight, Package, Truck, Search, 
  Minus, History, PieChart, ShieldAlert,
  FileText, Share2, Loader2
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
import receiptApi from '../../../services/wms/receiptApi'
import contractApi from '@/services/contractApi'
import productApi from '../../../services/wms/productApi'
import layoutApi from '../../../services/layoutApi'
import { toast } from 'react-hot-toast'

const shipmentData = [
  { name: 'Mon', value: 12 },
  { name: 'Tue', value: 19 },
  { name: 'Wed', value: 15 },
  { name: 'Thu', value: 22 },
  { name: 'Fri', value: 30 },
]

const OutboundPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Data states
  const [receipts, setReceipts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [skus, setSkus] = useState([])
  const [layout, setLayout] = useState(null)
  
  // Selection states
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [formSkuId, setFormSkuId] = useState('')
  const [formQuantity, setFormQuantity] = useState(1)
  const [formZoneId, setFormZoneId] = useState('')
  const [formRackId, setFormRackId] = useState('')
  const [formBinId, setFormBinId] = useState('')
  const [formNote, setFormNote] = useState('')

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
      const [contractRes, skuRes] = await Promise.all([
        contractApi.getMyContracts({ page: 0, size: 50 }),
        productApi.getSKUs({ page: 0, size: 50 })
      ])
      
      const activeContracts = contractRes.data?.data?.content?.filter(c => c.status === 'ACTIVE') || []
      const allWhList = activeContracts.map(c => ({ id: c.warehouseId, name: c.warehouseName }))
      const whList = Array.from(new Map(allWhList.map(item => [item.id, item])).values())
      setWarehouses(whList)
      if (whList.length > 0) {
        setSelectedWarehouseId(whList[0].id)
      }
      
      setSkus(skuRes.data?.data?.content || [])
    } catch (error) {
      console.error('Error fetching initial data:', error)
      toast.error('Failed to load initial data')
    }
  }

  const fetchLayout = async () => {
    try {
      const res = await layoutApi.getTenantWarehouseLayout(selectedWarehouseId)
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
      toast.error('Failed to load receipts')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateReceipt = async (e) => {
    e.preventDefault()
    if (!formSkuId || !formZoneId || !formRackId || !formBinId) {
      toast.error('Vui lòng chọn đầy đủ sản phẩm và vị trí lấy hàng')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        warehouseId: selectedWarehouseId,
        type: 'OUTBOUND',
        items: [
          {
            skuId: formSkuId,
            quantity: Number(formQuantity),
            zoneId: formZoneId,
            rackId: formRackId,
            binId: formBinId,
            note: formNote
          }
        ]
      }
      await receiptApi.createReceipt(payload)
      toast.success('Tạo phiếu xuất thành công')
      setIsModalOpen(false)
      fetchReceipts()
      
      // Reset form
      setFormSkuId('')
      setFormQuantity(1)
      setFormZoneId('')
      setFormRackId('')
      setFormBinId('')
      setFormNote('')
    } catch (error) {
      console.error('Error creating receipt:', error)
      toast.error(error.response?.data?.message || 'Lỗi khi tạo phiếu')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApprove = async (id) => {
    try {
      await receiptApi.approveReceipt(id)
      toast.success('Duyệt phiếu xuất thành công')
      fetchReceipts()
    } catch (error) {
      console.error('Error approving receipt:', error)
      toast.error(error.response?.data?.message || 'Lỗi khi duyệt phiếu')
    }
  }

  const columns = [
    { header: 'Receipt ID', render: (row) => row.id.substring(0,8) },
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
          <Button size="sm" onClick={() => handleApprove(row.id)}>
            Approve
          </Button>
        ) : (
          <Button size="sm" variant="ghost" disabled>
            Approved
          </Button>
        )
      )
    }
  ]

  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  const { user } = useSelector((state) => state.auth)
  const currentRole = user?.role === 'ROLE_STAFF' ? 'STAFF' : 'TENANT'

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
            <option value="">-- Chọn Kho --</option>
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
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <InputField placeholder="Search orders..." className="pl-10 h-9" />
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
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
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
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Select Product (SKU)</label>
            <select 
              required
              className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              value={formSkuId}
              onChange={(e) => setFormSkuId(e.target.value)}
            >
              <option value="">-- Chọn sản phẩm --</option>
              {skus.map(sku => (
                <option key={sku.id} value={sku.id}>[{sku.skuCode}] {sku.productCategory?.name}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Quantity to Ship</label>
            <InputField 
              type="number" 
              min="1" 
              required 
              value={formQuantity}
              onChange={(e) => setFormQuantity(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Select Zone (Picking)</label>
            <select 
              required
              className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm"
              value={formZoneId}
              onChange={(e) => {
                setFormZoneId(e.target.value)
                setFormRackId('')
                setFormBinId('')
              }}
            >
              <option value="">-- Chọn Zone --</option>
              {layout?.zones?.map(z => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>

          {formZoneId && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Select Rack</label>
              <select 
                required
                className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm"
                value={formRackId}
                onChange={(e) => {
                  setFormRackId(e.target.value)
                  setFormBinId('')
                }}
              >
                <option value="">-- Chọn Rack --</option>
                {layout?.zones?.find(z => z.id === formZoneId)?.racks?.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          )}

          {formRackId && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Select Bin</label>
              <select 
                required
                className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm"
                value={formBinId}
                onChange={(e) => setFormBinId(e.target.value)}
              >
                <option value="">-- Chọn Bin --</option>
                {layout?.zones?.find(z => z.id === formZoneId)?.racks?.find(r => r.id === formRackId)?.bins?.map(b => (
                  <option key={b.id} value={b.id}>{b.name} {b.isActive ? '' : '(Inactive)'}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Note / Customer</label>
            <InputField 
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="Ghi chú người nhận..."
            />
          </div>

          <div className="pt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting} className="bg-primary">Create Order</Button>
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
