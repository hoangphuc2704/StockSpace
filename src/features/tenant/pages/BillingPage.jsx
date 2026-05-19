import { motion } from 'framer-motion'
import { 
  Wallet, Plus, ArrowUpRight, 
  ArrowDownRight, Download, 
  FileText, CreditCard, Clock,
  ChevronRight, AlertCircle
} from 'lucide-react'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'

const MOCK_TRANSACTIONS = [
  { id: 'INV-4421', desc: 'Monthly Rent - Industrial Park A', amount: '-$2,400.00', date: '2024-05-01', status: 'PAID' },
  { id: 'TX-1092', desc: 'Wallet Top-up', amount: '+$5,000.00', date: '2024-04-28', status: 'COMPLETED' },
  { id: 'INV-4402', desc: 'Extra Storage Service Fee', amount: '-$120.00', date: '2024-04-15', status: 'PAID' },
  { id: 'INV-4398', desc: 'Monthly Rent - Industrial Park A', amount: '-$2,400.00', date: '2024-04-01', status: 'PAID' },
]

const BillingPage = () => {
  const columns = [
    {
      header: 'Description',
      render: (row) => (
        <div className="flex items-center gap-3 py-1">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${row.amount.startsWith('+') ? 'bg-success/10 text-success' : 'bg-slate-100 text-slate-500'}`}>
            {row.amount.startsWith('+') ? <ArrowDownRight size={16} /> : <FileText size={16} />}
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-slate-900">{row.desc}</span>
            <span className="text-xs text-slate-500">{row.id}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Date',
      accessor: 'date'
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
      render: (row) => (
        <Badge variant={row.status === 'PAID' || row.status === 'COMPLETED' ? 'success' : 'warning'} size="sm">
          {row.status}
        </Badge>
      )
    },
    {
      header: 'Actions',
      render: () => (
        <button className="text-slate-400 hover:text-primary transition-colors p-1">
          <Download size={18} />
        </button>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing & Payments</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your wallet, invoices, and payment history.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Wallet Balance Card */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 bg-slate-900 rounded-3xl text-white relative overflow-hidden shadow-xl"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-primary">
                  <Wallet size={20} />
                </div>
                <Badge variant="primary" className="bg-primary/20 text-primary border-none">Active Wallet</Badge>
              </div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Available Balance</p>
              <p className="text-4xl font-bold mt-2">$2,480.50</p>
              
              <div className="mt-8 flex gap-3">
                <Button className="flex-1">
                  <Plus size={18} className="mr-2" /> Top Up
                </Button>
                <Button variant="outline" className="flex-1 border-white/20 text-white hover:bg-white/10">
                  Settings
                </Button>
              </div>
            </div>
          </motion.div>

          <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-start gap-3">
             <AlertCircle size={20} className="text-primary shrink-0" />
             <p className="text-xs text-slate-600 leading-relaxed">
               Next rental payment of <span className="font-bold">$2,400.00</span> is due on <span className="font-bold">June 1st, 2024</span>. 
               Ensure your wallet has sufficient funds for automatic renewal.
             </p>
          </div>
        </div>

        {/* Payment History / Invoices */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Recent Transactions</h3>
              <Button variant="outline" size="sm">View All</Button>
            </div>
            <div className="p-0">
               <DataTable columns={columns} data={MOCK_TRANSACTIONS} className="border-none rounded-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 bg-white rounded-2xl border border-slate-200 flex items-center justify-between group cursor-pointer hover:border-primary transition-colors">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 group-hover:text-primary transition-colors">
                  <CreditCard size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Payment Methods</p>
                  <p className="text-xs text-slate-500">Manage bank accounts & cards</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-300 group-hover:text-primary transition-colors" />
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 flex items-center justify-between group cursor-pointer hover:border-primary transition-colors">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 group-hover:text-primary transition-colors">
                  <Download size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Tax Reports</p>
                  <p className="text-xs text-slate-500">Download annual statements</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-300 group-hover:text-primary transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BillingPage
