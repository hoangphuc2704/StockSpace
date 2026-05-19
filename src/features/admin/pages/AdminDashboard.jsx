import { 
  Users, Warehouse, DollarSign, Activity,
  ArrowUpRight, ArrowDownRight, MoreHorizontal,
  CheckCircle2, AlertCircle, Clock
} from 'lucide-react'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import StatCard from '@/components/molecules/StatCard'

// Mock Data
const growthData = [
  { name: 'Mon', users: 400, listings: 240 },
  { name: 'Tue', users: 300, listings: 139 },
  { name: 'Wed', users: 200, listings: 980 },
  { name: 'Thu', users: 278, listings: 390 },
  { name: 'Fri', users: 189, listings: 480 },
  { name: 'Sat', users: 239, listings: 380 },
  { name: 'Sun', users: 349, listings: 430 },
]

const AdminDashboard = () => {
  const stats = [
    { title: 'Total Revenue', value: '$128.5k', icon: DollarSign, trend: 'up', trendValue: 12 },
    { title: 'Platform Users', value: '14,280', icon: Users, trend: 'up', trendValue: 5 },
    { title: 'Active Listings', value: '2,450', icon: Warehouse, trend: 'up', trendValue: 8 },
    { title: 'System Load', value: '24%', icon: Activity, trend: 'stable', trendValue: 0 },
  ]

  const pendingApprovals = [
    { id: 'WH-8821', owner: 'Nguyen Van A', type: 'Industrial', location: 'HCM City', date: '2h ago' },
    { id: 'WH-8822', owner: 'Tran Thi B', type: 'Cold Storage', location: 'Ha Noi', date: '5h ago' },
    { id: 'WH-8823', owner: 'Le Van C', type: 'Fulfillment', location: 'Binh Duong', date: '1d ago' },
  ]

  const columns = [
    { 
      header: 'Listing ID', 
      render: (row) => (
        <span className="font-bold text-primary">{row.id}</span>
      )
    },
    { header: 'Owner', accessor: 'owner' },
    { header: 'Type', accessor: 'type' },
    { header: 'Location', accessor: 'location' },
    { header: 'Submitted', accessor: 'date' },
    {
      header: 'Actions',
      render: () => (
        <div className="flex gap-2">
          <Button size="sm" className="h-8 px-3">Approve</Button>
          <Button size="sm" variant="outline" className="h-8 px-3 text-danger border-danger hover:bg-danger/5">Reject</Button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Overview</h1>
          <p className="text-sm text-slate-500">Platform administrator dashboard and analytics.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">System Status: Healthy</Button>
          <Button size="sm">Global Settings</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-8">User & Listing Growth</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip />
                <Area type="monotone" dataKey="users" stroke="#2563eb" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={2} />
                <Area type="monotone" dataKey="listings" stroke="#10b981" fillOpacity={0} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6">Recent Platform Logs</h3>
          <div className="space-y-6">
            {[
              { event: 'New Registration', user: 'LogiFlow Inc.', time: '2 mins ago', icon: CheckCircle2, color: 'text-success' },
              { event: 'Transaction Failed', user: 'John Smith', time: '15 mins ago', icon: AlertCircle, color: 'text-danger' },
              { event: 'Listing Updated', user: 'Saigon Hub', time: '45 mins ago', icon: Clock, color: 'text-primary' },
              { event: 'System Backup', user: 'Automated', time: '1h ago', icon: CheckCircle2, color: 'text-slate-400' },
            ].map((log, i) => (
              <div key={i} className="flex gap-4">
                <div className={`mt-1 ${log.color}`}>
                  <log.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{log.event}</p>
                  <p className="text-xs text-slate-500">{log.user} • {log.time}</p>
                </div>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="w-full mt-8 border-t border-slate-50 pt-4">View Audit Logs</Button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-900">Pending Warehouse Approvals</h3>
          <Button variant="ghost" size="sm">View All Queue</Button>
        </div>
        <DataTable columns={columns} data={pendingApprovals} />
      </div>
    </div>
  )
}

export default AdminDashboard
