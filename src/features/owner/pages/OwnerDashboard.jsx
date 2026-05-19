import { useState } from 'react'
import { 
  Warehouse, FileCheck, DollarSign, PieChart,
  Check, X, Eye, ArrowUpRight, Clock, MapPin
} from 'lucide-react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell,
  PieChart as RePieChart, Pie
} from 'recharts'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import StatCard from '@/components/molecules/StatCard'

// Mock Data
const revenueData = [
  { name: 'Jan', value: 4500 },
  { name: 'Feb', value: 5200 },
  { name: 'Mar', value: 4800 },
  { name: 'Apr', value: 6100 },
  { name: 'May', value: 5900 },
]

const occupancyData = [
  { name: 'Occupied', value: 75, color: '#2563eb' },
  { name: 'Vacant', value: 25, color: '#e2e8f0' },
]

const OwnerDashboard = () => {
  const stats = [
    { title: 'My Warehouses', value: '12', icon: Warehouse, trend: 'stable', trendValue: 0 },
    { title: 'Monthly Revenue', value: '$24,500', icon: DollarSign, trend: 'up', trendValue: 8 },
    { title: 'Avg. Occupancy', value: '82%', icon: PieChart, trend: 'up', trendValue: 3 },
    { title: 'Pending Requests', value: '5', icon: FileCheck, trend: 'down', trendValue: 2 },
  ]

  const rentalRequests = [
    { id: 'REQ-001', tenant: 'TechBuild Ltd.', warehouse: 'Saigon Hub A', area: '1,500 sqft', status: 'PENDING', date: '2026-05-12' },
    { id: 'REQ-002', tenant: 'GreenSource Inc.', warehouse: 'Tan Binh Cold', area: '500 sqft', status: 'PENDING', date: '2026-05-12' },
    { id: 'REQ-003', tenant: 'LogiFlow Co.', warehouse: 'Saigon Hub B', area: '3,000 sqft', status: 'APPROVED', date: '2026-05-10' },
  ]

  const columns = [
    { 
      header: 'Tenant', 
      render: (row) => (
        <div>
          <p className="font-bold text-slate-900">{row.tenant}</p>
          <p className="text-[10px] text-slate-400">{row.id}</p>
        </div>
      )
    },
    { header: 'Warehouse', accessor: 'warehouse' },
    { header: 'Area Req.', accessor: 'area' },
    { 
      header: 'Status', 
      render: (row) => (
        <Badge variant={row.status === 'APPROVED' ? 'success' : 'warning'}>
          {row.status}
        </Badge>
      )
    },
    { header: 'Date', accessor: 'date' },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.status === 'PENDING' ? (
            <>
              <button className="p-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors">
                <Check className="h-4 w-4" />
              </button>
              <button className="p-1.5 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button className="p-1.5 rounded-lg bg-slate-100 text-slate-500">
              <Eye className="h-4 w-4" />
            </button>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Owner Dashboard</h1>
          <p className="text-sm text-slate-500">Overview of your warehouse portfolio and rental activities.</p>
        </div>
        <Button size="sm">
          <Warehouse className="h-4 w-4 mr-2" /> List New Warehouse
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-900">Revenue Performance</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">This Year</span>
              <ArrowUpRight className="h-4 w-4 text-success" />
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-8">Portfolio Occupancy</h3>
          <div className="h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={occupancyData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {occupancyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-2xl font-bold text-slate-900">75%</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Occupied</p>
            </div>
          </div>
          <div className="space-y-3 mt-4">
            {occupancyData.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{backgroundColor: item.color}} />
                  <span className="text-xs text-slate-600 font-medium">{item.name}</span>
                </div>
                <span className="text-xs font-bold text-slate-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900">Recent Rental Requests</h3>
            <Button variant="ghost" size="sm">Manage All</Button>
          </div>
          <DataTable columns={columns} data={rentalRequests} />
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
           <h3 className="font-bold text-slate-900 mb-6">Pending Inspections</h3>
           <div className="space-y-4">
              {[
                { warehouse: 'Saigon Hub A', date: 'May 15, 2026', type: 'Safety' },
                { warehouse: 'Tan Binh Cold', date: 'May 18, 2026', type: 'Sanitary' },
              ].map((insp, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-primary">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{insp.warehouse}</p>
                    <p className="text-xs text-slate-500">{insp.type} Inspection • {insp.date}</p>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full mt-4">View All Schedule</Button>
           </div>
        </div>
      </div>
    </div>
  )
}

export default OwnerDashboard
