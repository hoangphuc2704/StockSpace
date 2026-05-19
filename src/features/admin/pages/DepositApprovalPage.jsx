import { motion } from 'framer-motion'
import { 
  CreditCard, CheckCircle, XCircle, 
  ExternalLink, User, DollarSign, 
  Clock, AlertCircle, FileText
} from 'lucide-react'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import Avatar from '@/components/atoms/Avatar'

const MOCK_DEPOSITS = [
  { id: 'DEP-101', user: 'Alex Rivera', amount: '$5,000.00', method: 'Bank Transfer', proof: 'receipt_01.jpg', status: 'PENDING', date: '2024-05-12 10:20' },
  { id: 'DEP-102', user: 'Sarah Chen', amount: '$2,500.00', method: 'Bank Transfer', proof: 'receipt_02.jpg', status: 'PENDING', date: '2024-05-12 09:15' },
  { id: 'DEP-103', user: 'Emily Blunt', amount: '$1,000.00', method: 'Manual Deposit', proof: 'manual_01.jpg', status: 'PENDING', date: '2024-05-11 16:40' },
]

const DepositApprovalPage = () => {
  const columns = [
    {
      header: 'Request Info',
      render: (row) => (
        <div className="flex items-center gap-3 py-2">
          <Avatar alt={row.user} size="sm" />
          <div className="flex flex-col">
            <span className="font-bold text-slate-900">{row.user}</span>
            <span className="text-xs text-slate-500">{row.id}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Amount',
      render: (row) => <span className="font-bold text-slate-900">{row.amount}</span>
    },
    {
      header: 'Method',
      render: (row) => (
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <CreditCard size={14} /> {row.method}
        </div>
      )
    },
    {
      header: 'Proof',
      render: (row) => (
        <button className="flex items-center gap-1 text-primary hover:underline text-xs font-bold">
          <FileText size={14} /> View Receipt
        </button>
      )
    },
    {
      header: 'Submitted',
      render: (row) => (
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Clock size={12} /> {row.date}
        </div>
      )
    },
    {
      header: 'Actions',
      render: () => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs bg-success/5 border-success/20 text-success hover:bg-success hover:text-white transition-all">
            <CheckCircle size={14} className="mr-1" /> Approve
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs bg-danger/5 border-danger/20 text-danger hover:bg-danger hover:text-white transition-all">
            <XCircle size={14} className="mr-1" /> Reject
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Deposit Approvals</h1>
          <p className="text-slate-500 text-sm mt-1">Verify bank transfer receipts and approve wallet top-ups.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs font-medium text-slate-500">Real-time update active</span>
        </div>
      </div>

      {/* Warning Alert */}
      <div className="p-4 bg-warning/5 border border-warning/20 rounded-xl flex gap-3 items-center">
        <AlertCircle className="text-warning shrink-0" size={20} />
        <p className="text-sm text-slate-700">
          <span className="font-bold">Security Check:</span> Always verify the transaction ID on your bank statement before approving a deposit.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: 'Pending Deposits', value: '3', color: 'text-warning' },
          { label: 'Total Pending Volume', value: '$8,500.00', color: 'text-slate-900' },
          { label: 'Avg. Response Time', value: '14 mins', color: 'text-primary' },
        ].map((stat, i) => (
          <div key={i} className="p-4 bg-white rounded-xl border border-slate-200">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <DataTable columns={columns} data={MOCK_DEPOSITS} />
      </motion.div>
    </div>
  )
}

export default DepositApprovalPage
