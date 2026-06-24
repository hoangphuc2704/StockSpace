import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '../../../store/uiSlide' // ✅ Đã sửa chính tả thành uiSlice
import {
  Warehouse,
  FileCheck,
  DollarSign,
  PieChart,
  Check,
  X,
  Eye,
  ArrowUpRight,
  Clock,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart as RePieChart,
  Pie,
} from 'recharts'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import StatCard from '@/components/molecules/StatCard'

// Import Sidebar và Header
import Sidebar from '../../../components/SideBar'
import Header from '../../../components/HeaderDashboard'

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
  const dispatch = useDispatch()

  // Lấy dữ liệu Sidebar đồng bộ từ Redux Store chung
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)

  const stats = [
    { title: 'My Warehouses', value: '12', icon: Warehouse, trend: 'stable', trendValue: 0 },
    { title: 'Monthly Revenue', value: '$24,500', icon: DollarSign, trend: 'up', trendValue: 8 },
    { title: 'Avg. Occupancy', value: '82%', icon: PieChart, trend: 'up', trendValue: 3 },
    { title: 'Pending Requests', value: '5', icon: FileCheck, trend: 'down', trendValue: 2 },
  ]

  const rentalRequests = [
    {
      id: 'REQ-001',
      tenant: 'TechBuild Ltd.',
      warehouse: 'Saigon Hub A',
      area: '1,500 sqft',
      status: 'PENDING',
      date: '2026-05-12',
    },
    {
      id: 'REQ-002',
      tenant: 'GreenSource Inc.',
      warehouse: 'Tan Binh Cold',
      area: '500 sqft',
      status: 'PENDING',
      date: '2026-05-12',
    },
    {
      id: 'REQ-003',
      tenant: 'LogiFlow Co.',
      warehouse: 'Saigon Hub B',
      area: '3,000 sqft',
      status: 'APPROVED',
      date: '2026-05-10',
    },
  ]

  const columns = [
    {
      header: 'Tenant',
      render: (row) => (
        <div>
          <p className="font-bold text-slate-900">{row.tenant}</p>
          <p className="text-[10px] text-slate-400">{row.id}</p>
        </div>
      ),
    },
    { header: 'Warehouse', accessor: 'warehouse' },
    { header: 'Area Req.', accessor: 'area' },
    {
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'APPROVED' ? 'success' : 'warning'}>{row.status}</Badge>
      ),
    },
    { header: 'Date', accessor: 'date' },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.status === 'PENDING' ? (
            <>
              <button className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 transition-colors hover:bg-emerald-100">
                <Check className="h-4 w-4" />
              </button>
              <button className="rounded-lg bg-rose-50 p-1.5 text-rose-600 transition-colors hover:bg-rose-100">
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button className="rounded-lg bg-slate-100 p-1.5 text-slate-500 transition-colors hover:bg-slate-200">
              <Eye className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header gọn gàng, tự điều phối hành vi */}
      <Header />

      {/* MOBILE OVERLAY */}
      <div className="md:hidden">
        {isMobileOpen && (
          <button
            className="fixed inset-0 z-40 bg-slate-900/30"
            onClick={() => dispatch(closeMobileSidebar())}
          />
        )}
      </div>

      <div className="flex pt-14">
        <Sidebar currentRole="OWNER" />

        {/* CONTAINER CHÍNH - Tự động co giãn theo Redux State */}
        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-[72px]'
          }`}
        >
          <main className="mx-auto w-full max-w-[1600px] space-y-6 p-6 md:p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Owner Dashboard</h1>
                <p className="text-sm text-slate-500">
                  Overview of your warehouse portfolio and rental activities.
                </p>
              </div>
              <Button size="sm">
                <Warehouse className="mr-2 h-4 w-4" /> List New Warehouse
              </Button>
            </div>

            {/* Thẻ thống kê */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, idx) => (
                <StatCard key={idx} {...stat} />
              ))}
            </div>

            {/* Biểu đồ */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Revenue Performance</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">This Year</span>
                    <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                      />
                      <Tooltip cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-8 font-bold text-slate-900">Portfolio Occupancy</h3>
                <div className="relative h-64">
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
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-2xl font-bold text-slate-900">75%</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Occupied</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {occupancyData.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs font-medium text-slate-600">{item.name}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-900">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bảng dữ liệu */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Recent Rental Requests</h3>
                  <Button variant="ghost" size="sm">
                    Manage All
                  </Button>
                </div>
                <DataTable columns={columns} data={rentalRequests} />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-6 font-bold text-slate-900">Pending Inspections</h3>
                <div className="space-y-4">
                  {[
                    { warehouse: 'Saigon Hub A', date: 'May 15, 2026', type: 'Safety' },
                    { warehouse: 'Tan Binh Cold', date: 'May 18, 2026', type: 'Sanitary' },
                  ].map((insp, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-blue-600">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{insp.warehouse}</p>
                        <p className="text-xs text-slate-500">
                          {insp.type} Inspection • {insp.date}
                        </p>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="mt-4 w-full">
                    View All Schedule
                  </Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default OwnerDashboard
