import { Link } from 'react-router-dom'
import { ArrowLeft, Share2, Heart } from 'lucide-react'

const WarehouseHeader = ({ warehouseName }) => {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link
          to="/warehouses"
          className="hover:text-primary flex items-center gap-1 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Search
        </Link>
        <span className="text-slate-300">|</span>
        <span className="font-medium text-slate-900">{warehouseName}</span>
      </div>
    </div>
  )
}

export default WarehouseHeader
