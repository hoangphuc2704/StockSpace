import { motion } from 'framer-motion'
import { 
  BarChart3, TrendingUp, Users, 
  Warehouse, DollarSign, Calendar, 
  ArrowUpRight, ArrowDownRight, Download
} from 'lucide-react'
import { 
  LineChart, Line, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar,
  PieChart, Pie, Cell
} from 'recharts'
import Button from '@/components/atoms/Button'

const REVENUE_DATA = [
  { name: 'Jan', revenue: 4500, growth: 2400 },
  { name: 'Feb', revenue: 5200, growth: 1398 },
  { name: 'Mar', revenue: 4800, growth: 9800 },
  { name: 'Apr', revenue: 6100, growth: 3908 },
  { name: 'May', revenue: 5900, growth: 4800 },
  { name: 'Jun', revenue: 7200, growth: 3800 },
]

const USER_DISTRIBUTION = [
  { name: 'Tenants', value: 400 },
  { name: 'Owners', value: 300 },
  { name: 'Staff', value: 300 },
]

const COLORS = ['#3b82f6', '#8b5cf6', '#64748b']

const AnalyticsPage = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time overview of platform growth, revenue and usage metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Calendar size={16} className="mr-2" /> Last 30 Days
          </Button>
          <Button>
            <Download size={16} className="mr-2" /> Export Report
          </Button>
        </div>
      </div>

      {/* High-level Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Annual Revenue', value: '$128.5k', trend: '+12.5%', icon: DollarSign, color: 'text-success' },
          { label: 'Active Users', value: '14,280', trend: '+8.2%', icon: Users, color: 'text-primary' },
          { label: 'Warehouse Listings', value: '2,450', trend: '+15.1%', icon: Warehouse, color: 'text-indigo' },
          { label: 'Average Growth', value: '24.2%', trend: '-2.4%', icon: TrendingUp, color: 'text-danger' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500">
                <stat.icon size={20} />
              </div>
              <div className={`flex items-center text-xs font-bold ${stat.trend.startsWith('+') ? 'text-success' : 'text-danger'}`}>
                {stat.trend.startsWith('+') ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
                {stat.trend}
              </div>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Area Chart */}
        <div className="lg:col-span-2 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-900">Revenue Performance</h3>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Current Month</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-200" /> Projected</span>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_DATA}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Distribution Pie Chart */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-8">User Demographics</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={USER_DISTRIBUTION}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {USER_DISTRIBUTION.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 space-y-3">
            {USER_DISTRIBUTION.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Growth Bar Chart */}
        <div className="lg:col-span-3 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
           <h3 className="font-bold text-slate-900 mb-8">Platform Activity Trends</h3>
           <div className="h-72 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={REVENUE_DATA}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                 <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                 <Tooltip cursor={{fill: '#f8fafc'}} />
                 <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsPage
