import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  CreditCard, DollarSign, Download, 
  Search, Filter, ArrowUpRight, 
  ArrowDownRight, MoreVertical, Calendar
} from 'lucide-react'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'

const MOCK_TRANSACTIONS = [
  { id: 'TX-8921', type: 'Deposit', amount: '+$5,000.00', status: 'COMPLETED', method: 'Bank Transfer', date: '2024-05-12 14:30' },
  { id: 'TX-8922', type: 'Rental Payment', amount: '-$2,400.00', status: 'COMPLETED', method: 'Wallet', date: '2024-05-12 11:15' },
  { id: 'TX-8923', type: 'Service Fee', amount: '+$120.00', status: 'PENDING', method: 'Stripe', date: '2024-05-11 16:45' },
  { id: 'TX-8924', type: 'Refund', amount: '+$450.00', status: 'COMPLETED', method: 'Wallet', date: '2024-05-10 09:20' },
  { id: 'TX-8925', type: 'Deposit', amount: '+$1,200.00', status: 'FAILED', method: 'PayPal', date: '2024-05-10 08:00' },
  { id: 'TX-8926', type: 'Payout', amount: '-$3,500.00', status: 'COMPLETED', method: 'Bank Transfer', date: '2024-05-09 15:30' },
]

const TransactionsPage = () => {
  const columns = [
    {
      header: 'Transaction ID',
      render: (row) => <span className="font-mono text-xs font-bold text-slate-500">{row.id}</span>
    },
    {
      header: 'Type',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.amount.startsWith('+') ? (
            <div className="h-7 w-7 rounded-full bg-success/10 text-success flex items-center justify-center">
              <ArrowDownRight size={14} />
            </div>
          ) : (
            <div className="h-7 w-7 rounded-full bg-danger/10 text-danger flex items-center justify-center">
              <ArrowUpRight size={14} />
            </div>
          )}
          <span className="text-sm font-medium text-slate-700">{row.type}</span>
        </div>
      )
    },
    {
      header: 'Amount',
      render: (row) => (
        <span className={`font-bold ${row.amount.startsWith('+') ? 'text-success' : 'text-slate-900'}`}>
          {row.amount}
        </span>
      )
    },
    {
      header: 'Status',
      render: (row) => {
        const variants = {
          COMPLETED: 'success',
          PENDING: 'warning',
          FAILED: 'danger'
        }
        return (
          <Badge variant={variants[row.status]} size="sm" className="rounded-full">
            {row.status}
          </Badge>
        )
      }
    },
    {
      header: 'Method',
      accessor: 'method'
    },
    {
      header: 'Date & Time',
      accessor: 'date'
    },
    {
      header: 'Actions',
      render: () => (
        <button className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
          <MoreVertical size={18} />
        </button>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
          <p className="text-slate-500 text-sm mt-1">Full history of platform transactions and financial activities.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Calendar size={16} className="mr-2" /> This Week
          </Button>
          <Button>
            <Download size={16} className="mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Volume', value: '$45,280.00', icon: CreditCard, color: 'text-primary' },
          { label: 'Net Revenue', value: '$8,120.45', icon: DollarSign, color: 'text-success' },
          { label: 'Pending Payouts', value: '$12,400.00', icon: Calendar, color: 'text-warning' },
        ].map((item, i) => (
          <div key={i} className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center ${item.color}`}>
              <item.icon size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{item.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters Section */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-white rounded-xl border border-slate-200">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search by Transaction ID or Type..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" className="h-10">
            <Filter size={16} className="mr-2" /> Type: All
          </Button>
          <Button variant="outline" size="sm" className="h-10">
            Status: All
          </Button>
        </div>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <DataTable columns={columns} data={MOCK_TRANSACTIONS} />
      </motion.div>
    </div>
  )
}

export default TransactionsPage
