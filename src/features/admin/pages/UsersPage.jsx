import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, Search, Filter, MoreVertical, 
  UserPlus, Mail, Shield, CheckCircle, 
  XCircle, Edit2, Trash2, Eye 
} from 'lucide-react'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import InputField from '@/components/atoms/InputField'
import Avatar from '@/components/atoms/Avatar'

const MOCK_USERS = [
  { id: 1, name: 'Alex Rivera', email: 'alex@logiflow.com', role: 'TENANT', status: 'ACTIVE', joinDate: '2024-03-10' },
  { id: 2, name: 'Sarah Chen', email: 'sarah.c@warehub.io', role: 'OWNER', status: 'ACTIVE', joinDate: '2024-02-25' },
  { id: 3, name: 'Michael Ross', email: 'm.ross@stockspace.com', role: 'ADMIN', status: 'ACTIVE', joinDate: '2023-12-01' },
  { id: 4, name: 'John Doe', email: 'john.doe@gmail.com', role: 'STAFF', status: 'INACTIVE', joinDate: '2024-04-12' },
  { id: 5, name: 'Emily Blunt', email: 'emily@acme.com', role: 'TENANT', status: 'PENDING', joinDate: '2024-05-01' },
  { id: 6, name: 'David Miller', email: 'david@storagepro.com', role: 'OWNER', status: 'ACTIVE', joinDate: '2024-01-15' },
  { id: 7, name: 'Lisa Wang', email: 'lisa.w@stockspace.com', role: 'STAFF', status: 'ACTIVE', joinDate: '2024-03-20' },
]

const UsersPage = () => {
  const [searchTerm, setSearchTerm] = useState('')

  const columns = [
    {
      header: 'User',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar alt={row.name} size="sm" />
          <div className="flex flex-col">
            <span className="font-bold text-slate-900">{row.name}</span>
            <span className="text-xs text-slate-500">{row.email}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Role',
      render: (row) => {
        const variants = {
          ADMIN: 'primary',
          TENANT: 'secondary',
          OWNER: 'indigo',
          STAFF: 'slate'
        }
        return (
          <Badge variant={variants[row.role] || 'slate'} size="sm">
            {row.role}
          </Badge>
        )
      }
    },
    {
      header: 'Status',
      render: (row) => {
        const variants = {
          ACTIVE: 'success',
          INACTIVE: 'danger',
          PENDING: 'warning'
        }
        return (
          <Badge variant={variants[row.status]} size="sm" className="rounded-full">
            {row.status}
          </Badge>
        )
      }
    },
    {
      header: 'Join Date',
      accessor: 'joinDate'
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button className="p-1.5 text-slate-400 hover:text-primary transition-colors rounded-lg hover:bg-primary/5">
            <Edit2 size={16} />
          </button>
          <button className="p-1.5 text-slate-400 hover:text-danger transition-colors rounded-lg hover:bg-danger/5">
            <Trash2 size={16} />
          </button>
          <button className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100">
            <MoreVertical size={16} />
          </button>
        </div>
      )
    }
  ]

  const filteredData = useMemo(() => {
    return MOCK_USERS.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [searchTerm])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage and monitor all platform users and their roles.</p>
        </div>
        <Button className="shrink-0">
          <UserPlus size={18} className="mr-2" /> Add New User
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: '1,240', icon: Users, color: 'bg-primary/10 text-primary' },
          { label: 'Active Now', value: '342', icon: CheckCircle, color: 'bg-success/10 text-success' },
          { label: 'Pending Approval', value: '12', icon: Shield, color: 'bg-warning/10 text-warning' },
          { label: 'Reported', value: '2', icon: XCircle, color: 'bg-danger/10 text-danger' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-4 bg-white rounded-xl border border-slate-200"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
                <p className="text-xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-white rounded-xl border border-slate-200">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" className="w-full md:w-auto h-10">
            <Filter size={16} className="mr-2" /> Filters
          </Button>
          <Button variant="outline" size="sm" className="w-full md:w-auto h-10">
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <DataTable columns={columns} data={filteredData} />
      </motion.div>
    </div>
  )
}

export default UsersPage
