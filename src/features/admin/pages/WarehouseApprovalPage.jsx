import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Warehouse, ShieldCheck, MapPin, 
  Maximize, DollarSign, Clock, 
  CheckCircle, XCircle, Eye,
  Search, Filter, ChevronRight
} from 'lucide-react'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import Avatar from '@/components/atoms/Avatar'

const MOCK_LISTINGS = [
  { 
    id: 'W-001', 
    name: 'Main Logistics Hub', 
    owner: 'Sarah Chen', 
    location: 'District 7, HCMC', 
    size: '1,200 m²', 
    price: '$15,000/mo',
    status: 'PENDING',
    type: 'Cold Storage',
    submittedAt: '2024-05-12'
  },
  { 
    id: 'W-002', 
    name: 'Industrial Park A', 
    owner: 'David Miller', 
    location: 'Binh Duong Province', 
    size: '5,000 m²', 
    price: '$45,000/mo',
    status: 'PENDING',
    type: 'General Warehouse',
    submittedAt: '2024-05-11'
  },
  { 
    id: 'W-003', 
    name: 'Dockside Terminal', 
    owner: 'Robert King', 
    location: 'Cat Lai Port', 
    size: '3,500 m²', 
    price: '$28,000/mo',
    status: 'PENDING',
    type: 'Bonded Warehouse',
    submittedAt: '2024-05-10'
  },
]

const WarehouseApprovalPage = () => {
  const [searchTerm, setSearchTerm] = useState('')

  const columns = [
    {
      header: 'Warehouse Details',
      render: (row) => (
        <div className="flex items-center gap-4 py-2">
          <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
            <Warehouse size={24} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900">{row.name}</span>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <MapPin size={12} /> {row.location}
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Owner',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar alt={row.owner} size="sm" />
          <span className="text-sm font-medium text-slate-700">{row.owner}</span>
        </div>
      )
    },
    {
      header: 'Specs',
      render: (row) => (
        <div className="flex flex-col gap-1 text-xs">
          <span className="flex items-center gap-1 font-medium text-slate-700">
            <Maximize size={12} /> {row.size}
          </span>
          <span className="text-slate-500">{row.type}</span>
        </div>
      )
    },
    {
      header: 'Price',
      render: (row) => (
        <span className="font-bold text-primary">{row.price}</span>
      )
    },
    {
      header: 'Submitted',
      accessor: 'submittedAt'
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 px-3">
            <Eye size={16} className="mr-2" /> Details
          </Button>
          <button className="h-9 w-9 flex items-center justify-center text-success hover:bg-success/10 rounded-lg transition-colors border border-slate-200">
            <CheckCircle size={18} />
          </button>
          <button className="h-9 w-9 flex items-center justify-center text-danger hover:bg-danger/10 rounded-lg transition-colors border border-slate-200">
            <XCircle size={18} />
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Warehouse Approvals</h1>
          <p className="text-slate-500 text-sm mt-1">Review and approve new warehouse listings before they go live.</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="flex -space-x-2">
             {[1,2,3,4].map(i => (
               <Avatar key={i} size="sm" className="border-2 border-white" />
             ))}
           </div>
           <span className="text-xs font-medium text-slate-500 underline">4 reviewers active</span>
        </div>
      </div>

      {/* Hero Alert */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-4">
        <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
          <ShieldCheck size={24} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900">3 Pending Verifications</h4>
          <p className="text-sm text-slate-600 mt-1">
            New listings require physical inspection or document verification before approval. 
            Automated verification has flagged 1 listing for manual review.
          </p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Filter by name, owner or city..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Badge variant="primary" className="whitespace-nowrap cursor-pointer">Pending (3)</Badge>
          <Badge variant="slate" className="whitespace-nowrap cursor-pointer">Under Review (5)</Badge>
          <Badge variant="slate" className="whitespace-nowrap cursor-pointer">Rejected (12)</Badge>
        </div>
      </div>

      {/* Table Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <DataTable columns={columns} data={MOCK_LISTINGS} />
      </motion.div>
    </div>
  )
}

export default WarehouseApprovalPage
