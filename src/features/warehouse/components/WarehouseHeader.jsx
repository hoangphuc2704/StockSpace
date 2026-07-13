import { Link } from 'react-router-dom'
import { ArrowLeft, Share2, Heart } from 'lucide-react'

const WarehouseHeader = ({ warehouseName, isBookmarked, onBookmarkToggle }) => {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link to="/warehouses" className="flex items-center gap-1 transition-colors hover:text-primary">
          <ArrowLeft size={14} /> Back to Search
        </Link>
        <span className="text-slate-300">|</span>
        <span className="font-medium text-slate-900">{warehouseName}</span>
      </div>
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50">
          <Share2 size={16} /> Share
        </button>
        <button
          onClick={onBookmarkToggle}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
            isBookmarked
              ? 'border-danger bg-danger/5 text-danger'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Heart size={16} fill={isBookmarked ? 'currentColor' : 'none'} />{' '}
          {isBookmarked ? 'Saved' : 'Save'}
        </button>
      </div>
    </div>
  )
}

export default WarehouseHeader
