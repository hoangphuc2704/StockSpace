import { useState } from 'react'
import {
  Clock,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  User,
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
} from 'recharts'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import TableActionMenu from '@/components/TableActionMenu'

// Mock Data
const attendanceHistory = [
  {
    id: 1,
    date: '2026-05-12',
    checkIn: '08:05 AM',
    checkOut: '--:--',
    status: 'PRESENT',
    location: 'Main Gate',
    note: 'On time',
  },
  {
    id: 2,
    date: '2026-05-11',
    checkIn: '08:15 AM',
    checkOut: '05:30 PM',
    status: 'LATE',
    location: 'South Gate',
    note: 'Traffic',
  },
  {
    id: 3,
    date: '2026-05-10',
    checkIn: '08:00 AM',
    checkOut: '05:00 PM',
    status: 'PRESENT',
    location: 'Main Gate',
    note: '-',
  },
  {
    id: 4,
    date: '2026-05-09',
    checkIn: '--:--',
    checkOut: '--:--',
    status: 'ABSENT',
    location: '-',
    note: 'Medical Leave',
  },
  {
    id: 5,
    date: '2026-05-08',
    checkIn: '07:55 AM',
    checkOut: '06:00 PM',
    status: 'PRESENT',
    location: 'Main Gate',
    note: 'Overtime',
  },
]

const statsData = [
  { name: 'On Time', value: 18, color: '#2563eb' },
  { name: 'Late', value: 4, color: '#f59e0b' },
  { name: 'Absent', value: 2, color: '#ef4444' },
  { name: 'Leave', value: 1, color: '#94a3b8' },
]

const AttendancePage = () => {
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString())

  // Update time every second
  useState(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000)
    return () => clearInterval(timer)
  }, [])

  const columns = [
    { header: 'Date', accessor: 'date' },
    {
      header: 'Check In',
      render: (row) => (
        <div className="flex items-center gap-1.5 font-medium text-slate-900">
          <Clock className="h-3 w-3 text-slate-400" />
          {row.checkIn}
        </div>
      ),
    },
    {
      header: 'Check Out',
      render: (row) => (
        <div className="flex items-center gap-1.5 font-medium text-slate-400">
          <Clock className="h-3 w-3" />
          {row.checkOut}
        </div>
      ),
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge
          variant={
            row.status === 'PRESENT' ? 'success' : row.status === 'LATE' ? 'warning' : 'danger'
          }
        >
          {row.status}
        </Badge>
      ),
    },
    { header: 'Location', accessor: 'location' },
    {
      header: 'Actions',
      render: () => <TableActionMenu items={[{ label: 'View Log' }]} />,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance & Time Tracking</h1>
          <p className="text-sm text-slate-500">Track your working hours and manage check-ins.</p>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-2">
          <div className="px-4 text-right">
            <p className="text-sm font-bold text-slate-900">{currentTime}</p>
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
              Tuesday, May 12
            </p>
          </div>
          <Button
            className={
              isCheckedIn ? 'bg-danger hover:bg-danger/90' : 'bg-success hover:bg-success/90'
            }
            onClick={() => setIsCheckedIn(!isCheckedIn)}
          >
            {isCheckedIn ? 'Check Out' : 'Check In Now'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Status & Action */}
        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { label: 'Work Hours', value: '07h 45m', icon: Clock, trend: '+10%' },
              { label: 'Overtime', value: '01h 20m', icon: AlertCircle, trend: 'stable' },
              { label: 'Days Present', value: '21/24', icon: CheckCircle, trend: '92%' },
            ].map((stat, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <stat.icon className="text-primary mb-3 h-5 w-5" />
                <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">
                  {stat.label}
                </p>
                <div className="mt-1 flex items-end justify-between">
                  <h3 className="text-xl font-bold text-slate-900">{stat.value}</h3>
                  <span className="text-success text-[10px] font-bold">{stat.trend}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Attendance History</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Last 30 Days
                </Button>
                <Button variant="outline" size="sm">
                  Export Report
                </Button>
              </div>
            </div>
            <DataTable columns={columns} data={attendanceHistory} />
          </div>
        </div>

        {/* Sidebar Analytics */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-6 font-bold text-slate-900">Monthly Overview</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statsData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              {statsData.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-xs text-slate-500">
                    {s.name}: <span className="font-bold text-slate-900">{s.value}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 font-bold text-slate-900">Location Verification</h3>
            <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-400">
              <MapPin className="text-primary/40 h-8 w-8" />
              <p className="text-xs font-medium">Main Warehouse Gate</p>
              <Badge variant="success">Secured Connection</Badge>
            </div>
            <p className="mt-4 text-[10px] leading-relaxed text-slate-400">
              Your IP: 192.168.1.104. Attendance is locked to your assigned warehouse location.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AttendancePage
