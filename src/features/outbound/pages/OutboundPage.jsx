import { useState } from 'react'
import { 
  ArrowUpRight, Package, Truck, Search, 
  Minus, History, PieChart, ShieldAlert,
  FileText, Share2
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

const shipmentData = [
  { name: 'Mon', value: 12 },
  { name: 'Tue', value: 19 },
  { name: 'Wed', value: 15 },
  { name: 'Thu', value: 22 },
  { name: 'Fri', value: 30 },
]

const OutboundPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const recentOutbound = [
    { id: 'OUT-4401', product: 'Industrial Motor X1', qty: 12, customer: 'TechBuild Ltd.', status: 'SHIPPED', date: '2026-05-12 14:00' },
    { id: 'OUT-4402', product: 'Solar Panel 250W', qty: 5, customer: 'SolarCity Project', status: 'PACKING', date: '2026-05-12 15:30' },
    { id: 'OUT-4403', product: 'Steel Rail 2m', qty: 50, customer: 'RailWay VN', status: 'PENDING', date: '2026-05-12 16:45' },
    { id: 'OUT-4404', product: 'Li-ion Battery 10Ah', qty: 20, customer: 'EV Solutions', status: 'SHIPPED', date: '2026-05-11 11:20' },
  ]

  const columns = [
    { header: 'Order ID', accessor: 'id' },
    { 
      header: 'Product', 
      render: (row) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-slate-400" />
          <span className="font-medium text-slate-900">{row.product}</span>
        </div>
      )
    },
    { header: 'Quantity', accessor: 'qty' },
    { header: 'Customer', accessor: 'customer' },
    { 
      header: 'Status', 
      render: (row) => (
        <Badge variant={row.status === 'SHIPPED' ? 'success' : row.status === 'PACKING' ? 'primary' : 'warning'}>
          {row.status}
        </Badge>
      )
    },
    { header: 'Time', accessor: 'date' },
    {
      header: 'Actions',
      render: () => <Button size="sm" variant="ghost">Track</Button>
    }
  ]

  return (
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <History className="h-4 w-4 mr-2" /> History
          </Button>
          <Button size="sm" onClick={() => setIsModalOpen(true)}>
            <Minus className="h-4 w-4 mr-2" /> New Shipment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Orders Shipped', value: '84', icon: Truck, trend: '+8% growth' },
              { label: 'Pending Fulfillment', value: '12 Orders', icon: Package, trend: '4 urgent' },
              { label: 'Average Prep Time', value: '45 mins', icon: PieChart, trend: '-5m faster' },
            ].map((stat, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <stat.icon className="h-5 w-5 text-primary" />
                  <span className="text-[10px] font-bold text-success uppercase">{stat.trend}</span>
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                <h3 className="text-xl font-bold text-slate-900 mt-1">{stat.value}</h3>
              </div>
            ))}
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900">Recent Outbound Shipments</h3>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <InputField placeholder="Search orders..." className="pl-10 h-9" />
              </div>
            </div>
            <DataTable columns={columns} data={recentOutbound} />
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
            <div className="mt-4 p-4 rounded-xl bg-danger/5 border border-danger/10">
              <p className="text-xs text-danger font-bold flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" /> Pending Pickup
              </p>
              <p className="text-xs text-slate-600 mt-1">
                3 orders are ready but haven't been picked up by the courier yet.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
               <button className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 hover:border-primary hover:bg-primary/5 transition-all group">
                  <FileText className="h-6 w-6 text-slate-400 group-hover:text-primary mb-2" />
                  <span className="text-[10px] font-bold text-slate-500 group-hover:text-primary uppercase">Print Labels</span>
               </button>
               <button className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 hover:border-primary hover:bg-primary/5 transition-all group">
                  <Share2 className="h-6 w-6 text-slate-400 group-hover:text-primary mb-2" />
                  <span className="text-[10px] font-bold text-slate-500 group-hover:text-primary uppercase">Notify Client</span>
               </button>
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
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Product" placeholder="Select stock item..." />
            <InputField label="Available" value="450 Units" disabled />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Quantity to Ship" type="number" />
            <InputField label="Priority" defaultValue="Standard" />
          </div>
          <InputField label="Customer / Recipient" placeholder="Enter customer details" />
          <InputField label="Shipping Address" placeholder="Full delivery address" />
          <div className="pt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="bg-primary">Create Order</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default OutboundPage
