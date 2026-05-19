import { useState } from 'react'
import { 
  Users, UserPlus, Search, Filter, 
  Calendar, Briefcase, Mail, Phone,
  MoreHorizontal, Shield, Clock, MapPin
} from 'lucide-react'
import { motion } from 'framer-motion'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import InputField from '@/components/atoms/InputField'
import Modal from '@/components/organisms/Modal'

// Mock Data
const MOCK_EMPLOYEES = [
  { id: 1, name: 'John Doe', role: 'WH_MANAGER', department: 'Operations', status: 'ACTIVE', email: 'john@stockspace.com', joined: '2024-01-15' },
  { id: 2, name: 'Sarah Smith', role: 'INVENTORY_CLERK', department: 'Inventory', status: 'ACTIVE', email: 'sarah@stockspace.com', joined: '2024-02-10' },
  { id: 3, name: 'Mike Johnson', role: 'STAFF', department: 'Logistics', status: 'ON_LEAVE', email: 'mike@stockspace.com', joined: '2024-03-05' },
  { id: 4, name: 'Emily Brown', role: 'STAFF', department: 'Operations', status: 'ACTIVE', email: 'emily@stockspace.com', joined: '2023-11-20' },
  { id: 5, name: 'David Wilson', role: 'SECURITY', department: 'Safety', status: 'ACTIVE', email: 'david@stockspace.com', joined: '2024-01-02' },
]

const HRManagementPage = () => {
  const [employees, setEmployees] = useState(MOCK_EMPLOYEES)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const columns = [
    {
      header: 'Employee',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {row.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <p className="font-bold text-slate-900">{row.name}</p>
            <p className="text-xs text-slate-500">{row.email}</p>
          </div>
        </div>
      )
    },
    { 
      header: 'Role', 
      render: (row) => (
        <div className="flex items-center gap-2">
          <Shield className="h-3 w-3 text-slate-400" />
          <span className="text-sm text-slate-600 font-medium">{row.role.replace('_', ' ')}</span>
        </div>
      )
    },
    { header: 'Department', accessor: 'department' },
    { 
      header: 'Status', 
      render: (row) => (
        <Badge variant={row.status === 'ACTIVE' ? 'success' : 'warning'}>
          {row.status}
        </Badge>
      )
    },
    { header: 'Joined Date', accessor: 'joined' },
    {
      header: 'Actions',
      render: () => (
        <button className="p-1.5 rounded hover:bg-slate-100 text-slate-400">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">HR Management</h1>
          <p className="text-sm text-slate-500">Manage your warehouse workforce and roles.</p>
        </div>
        <Button size="sm" onClick={() => setIsModalOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" /> Add Employee
        </Button>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Staff', value: '42', icon: Users, color: 'text-primary' },
          { label: 'On Duty', value: '38', icon: Clock, color: 'text-success' },
          { label: 'Pending Requests', value: '5', icon: Calendar, color: 'text-warning' },
          { label: 'Open Positions', value: '3', icon: Briefcase, color: 'text-purple-500' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg bg-slate-50 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">+4%</span>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee List Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <InputField placeholder="Search employees..." className="pl-10" />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button variant="outline" className="flex-1 sm:flex-none">
                <Filter className="h-4 w-4 mr-2" /> Filters
              </Button>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <DataTable columns={columns} data={employees} />
          </div>
        </div>

        {/* Work Schedule/Attendance Preview */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-6">Staff Distribution</h3>
            <div className="space-y-4">
              {[
                { label: 'Morning Shift', value: 18, total: 42, color: 'bg-primary' },
                { label: 'Afternoon Shift', value: 14, total: 42, color: 'bg-blue-400' },
                { label: 'Night Shift', value: 10, total: 42, color: 'bg-slate-900' },
              ].map((shift, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-600">{shift.label}</span>
                    <span className="font-bold text-slate-900">{shift.value}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${shift.color}`} 
                      style={{ width: `${(shift.value / shift.total) * 100}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Quick Profile View</h3>
            <div className="text-center py-6">
              <div className="h-20 w-20 rounded-full bg-slate-100 mx-auto mb-4 flex items-center justify-center text-slate-300">
                <Users className="h-10 w-10" />
              </div>
              <p className="text-slate-400 text-sm">Select an employee to view quick details</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Employee Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register New Employee"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <InputField label="First Name" placeholder="John" />
            <InputField label="Last Name" placeholder="Doe" />
          </div>
          <InputField label="Email Address" type="email" placeholder="john@company.com" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Role</label>
              <select className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none">
                <option>STAFF</option>
                <option>WH_MANAGER</option>
                <option>INVENTORY_CLERK</option>
                <option>SECURITY</option>
              </select>
            </div>
            <InputField label="Join Date" type="date" />
          </div>
          <div className="pt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button>Register Employee</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default HRManagementPage
