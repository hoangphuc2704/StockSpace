import { useState } from 'react'
import { Maximize, Filter } from 'lucide-react'
import Button from '@/components/atoms/Button'

const WarehouseFilters = ({ onFilterChange }) => {
  const [filters, setFilters] = useState({
    minRentalPrice: '',
    maxRentalPrice: '',
    minCapacity: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const handleApply = () => {
    onFilterChange(filters)
  }

  const handleClear = () => {
    const emptyFilters = {
        minRentalPrice: '',
        maxRentalPrice: '',
      minCapacity: '',
    }
    setFilters(emptyFilters)
    onFilterChange(emptyFilters)
  }

  return (
    <div className="space-y-8">
      {/* Price Range */}
      <div className="space-y-4">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
          Price per m² (VNĐ)
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₫</span>
            <input 
              type="number"
              name="minRentalPrice"
              value={filters.minRentalPrice}
              onChange={handleChange}
              placeholder="Min" 
              className="w-full pl-7 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₫</span>
            <input 
              type="number" 
              name="maxRentalPrice"
              value={filters.maxRentalPrice}
              onChange={handleChange}
              placeholder="Max" 
              className="w-full pl-7 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>
      </div>

      {/* Area Size */}
      <div className="space-y-4">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
          Min Capacity (m²)
        </h4>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"><Maximize size={14} /></span>
          <input 
            type="number"
            name="minCapacity"
            value={filters.minCapacity}
            onChange={handleChange}
            placeholder="e.g. 1000" 
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </div>

      <div className="pt-6 space-y-3">
        <Button onClick={handleApply} className="w-full h-11 flex items-center justify-center gap-2">
          <Filter size={16} /> Apply Filters
        </Button>
        <Button onClick={handleClear} variant="outline" className="w-full border-slate-200 text-slate-600 hover:bg-slate-50 h-11">
          Clear Filters
        </Button>
      </div>
    </div>
  )
}

export default WarehouseFilters
