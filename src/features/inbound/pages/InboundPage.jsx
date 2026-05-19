import { useState } from 'react'
import { 
  ArrowDownLeft, Package, Truck, Search, 
  Plus, History, BarChart2, ShieldCheck,
  FileText, Download
} from 'lucide-react'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import InputField from '@/components/atoms/InputField'
import Modal from '@/components/organisms/Modal'

const movementData = [
  { name: '08:00', value: 20 },
  { name: '10:00', value: 45 },
  { name: '12:00', value: 30 },
  { name: '14:00', value: 65 },
  { name: '16:00', value: 50 },
  { name: '18:00', value: 80 },
]

const InboundPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const recentInbound = [
    { id: 'INB-9201', product: 'Industrial Motor X1', qty: 50, supplier: 'Global Parts Co.', status: 'COMPLETED', date: '2026-05-12 09:45' },
    { id: 'INB-9202', product: 'Li-ion Battery 10Ah', qty: 200, supplier: 'EnergyTech Ltd.', status: 'PROCESSING', date: '2026-05-12 10:30' },
    { id: 'INB-9203', product: 'Copper Wire 100m', qty: 15, supplier: 'Binh Duong Steel', status: 'PENDING', date: '2026-05-12 11:15' },
    { id: 'INB-9204', product: 'Solar Panel 250W', qty: 40, supplier: 'GreenSource Inc.', status: 'COMPLETED', date: '2026-05-11 15:20' },
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
    { header: 'Supplier', accessor: 'supplier' },
    { 
      header: 'Status', 
      render: (row) => (
        <Badge variant={row.status === 'COMPLETED' ? 'success' : row.status === 'PROCESSING' ? 'primary' : 'warning'}>
          {row.status}
        </Badge>
      )
    },
    { header: 'Date', accessor: 'date' },
    {
      header: 'Actions',
      render: () => <Button size="sm" variant="ghost">Receipt</Button>
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10 text-success">
              <ArrowDownLeft className="h-6 w-6" />
            </div>
            Inbound Operations
          </h1>
          <p className="text-sm text-slate-500">Manage incoming shipments and stock replenishment.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <History className="h-4 w-4 mr-2" /> History
          </Button>
          <Button size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Inbound
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Today Received', value: '1,240', icon: Package, trend: '+15%' },
              { label: 'Pending Arrival', value: '4 Shipments', icon: Truck, trend: '2 today' },
              { label: 'Dock Utilization', value: '75%', icon: BarChart2, trend: 'Optimal' },
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
              <h3 className="font-bold text-slate-900">Recent Inbound Shipments</h3>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <InputField placeholder="Search shipments..." className="pl-10 h-9" />
              </div>
            </div>
            <DataTable columns={columns} data={recentInbound} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-6">Volume Forecast</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={movementData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  />
                  <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-4 rounded-xl bg-success/5 border border-success/10">
              <p className="text-xs text-success font-bold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Capacity Alert
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Dock 4 will be at 90% capacity between 14:00 - 16:00.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Quick Documentation</h3>
            <div className="space-y-3">
              {[
                { name: 'Manifest_9201.pdf', size: '1.2 MB' },
                { name: 'Packing_List_9202.xlsx', size: '450 KB' },
              ].map((doc, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">{doc.name}</p>
                      <p className="text-[10px] text-slate-400">{doc.size}</p>
                    </div>
                  </div>
                  <Download className="h-4 w-4 text-slate-400" />
                </div>
              ))}
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
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Product Name" placeholder="Search product..." />
            <InputField label="SKU / ID" placeholder="AUTO-DETECTED" disabled />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Expected Quantity" type="number" />
            <InputField label="Unit of Measure" value="UNITS" disabled />
          </div>
          <InputField label="Supplier / Source" placeholder="Enter supplier name" />
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Expected Date" type="date" />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Dock Assignment</label>
              <select className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none">
                <option>Dock 1 - Main</option>
                <option>Dock 2 - Heavy</option>
                <option>Dock 3 - Cold</option>
              </select>
            </div>
          </div>
          <div className="pt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button>Confirm Inbound</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default InboundPage
