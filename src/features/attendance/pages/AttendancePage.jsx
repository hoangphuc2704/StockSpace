import { useState } from 'react'
import { 
  Clock, MapPin, Calendar, CheckCircle, 
  XCircle, AlertCircle, ArrowRight, User
} from 'lucide-react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell 
} from 'recharts'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'

// Mock Data
const attendanceHistory = [
  { id: 1, date: '2026-05-12', checkIn: '08:05 AM', checkOut: '--:--', status: 'PRESENT', location: 'Main Gate', note: 'On time' },
  { id: 2, date: '2026-05-11', checkIn: '08:15 AM', checkOut: '05:30 PM', status: 'LATE', location: 'South Gate', note: 'Traffic' },
  { id: 3, date: '2026-05-10', checkIn: '08:00 AM', checkOut: '05:00 PM', status: 'PRESENT', location: 'Main Gate', note: '-' },
  { id: 4, date: '2026-05-09', checkIn: '--:--', checkOut: '--:--', status: 'ABSENT', location: '-', note: 'Medical Leave' },
  { id: 5, date: '2026-05-08', checkIn: '07:55 AM', checkOut: '06:00 PM', status: 'PRESENT', location: 'Main Gate', note: 'Overtime' },
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
      )
    },
    { 
      header: 'Check Out', 
      render: (row) => (
        <div className="flex items-center gap-1.5 font-medium text-slate-400">
          <Clock className="h-3 w-3" />
          {row.checkOut}
        </div>
      )
    },
    { 
      header: 'Status', 
      render: (row) => (
        <Badge variant={row.status === 'PRESENT' ? 'success' : row.status === 'LATE' ? 'warning' : 'danger'}>
          {row.status}
        </Badge>
      )
    },
    { header: 'Location', accessor: 'location' },
    {
      header: 'Actions',
      render: () => <Button size="sm" variant="ghost">View Log</Button>
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance & Time Tracking</h1>
          <p className="text-sm text-slate-500">Track your working hours and manage check-ins.</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-slate-200">
           <div className="text-right px-4">
              <p className="text-sm font-bold text-slate-900">{currentTime}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Tuesday, May 12</p>
           </div>
           <Button 
            className={isCheckedIn ? 'bg-danger hover:bg-danger/90' : 'bg-success hover:bg-success/90'}
            onClick={() => setIsCheckedIn(!isCheckedIn)}
           >
              {isCheckedIn ? 'Check Out' : 'Check In Now'}
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Status & Action */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Work Hours', value: '07h 45m', icon: Clock, trend: '+10%' },
              { label: 'Overtime', value: '01h 20m', icon: AlertCircle, trend: 'stable' },
              { label: 'Days Present', value: '21/24', icon: CheckCircle, trend: '92%' },
            ].map((stat, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <stat.icon className="h-5 w-5 text-primary mb-3" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                <div className="flex items-end justify-between mt-1">
                  <h3 className="text-xl font-bold text-slate-900">{stat.value}</h3>
                  <span className="text-[10px] font-bold text-success">{stat.trend}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900">Attendance History</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Last 30 Days</Button>
                <Button variant="outline" size="sm">Export Report</Button>
              </div>
            </div>
            <DataTable columns={columns} data={attendanceHistory} />
          </div>
        </div>

        {/* Sidebar Analytics */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-6">Monthly Overview</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statsData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              {statsData.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{backgroundColor: s.color}} />
                  <span className="text-xs text-slate-500">{s.name}: <span className="font-bold text-slate-900">{s.value}</span></span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Location Verification</h3>
            <div className="aspect-video rounded-xl bg-slate-100 flex flex-col items-center justify-center text-slate-400 gap-2 border border-slate-200">
               <MapPin className="h-8 w-8 text-primary/40" />
               <p className="text-xs font-medium">Main Warehouse Gate</p>
               <Badge variant="success">Secured Connection</Badge>
            </div>
            <p className="text-[10px] text-slate-400 mt-4 leading-relaxed">
              Your IP: 192.168.1.104. Attendance is locked to your assigned warehouse location.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AttendancePage
