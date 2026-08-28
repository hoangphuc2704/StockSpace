import { useState } from 'react'
import { Maximize, Filter } from 'lucide-react'
import Button from '@/components/atoms/Button'

const WarehouseFilters = ({ onFilterChange }) => {
  const [filters, setFilters] = useState({
    minRentalPrice: '',
    maxRentalPrice: '',
    minRentalPrice: '',
    maxRentalPrice: '',
    minCapacity: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  const handleApply = () => {
    onFilterChange(filters)
  }

  const handleClear = () => {
    const emptyFilters = {
      minRentalPrice: '',
      maxRentalPrice: '',
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
        <h4 className="flex items-center gap-2 text-xs font-black tracking-[0.2em] text-slate-400 uppercase">
          Price per m² (VNĐ)
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-xs text-slate-400">
              ₫
            </span>
            <input
              type="number"
              name="minRentalPrice"
              value={filters.minRentalPrice}
              onChange={handleChange}
              placeholder="Min"
              className="focus:ring-primary/20 focus:border-primary w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-3 pl-7 text-sm transition-all focus:ring-2 focus:outline-none"
            />
          </div>
          <div className="relative">
            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-xs text-slate-400">
              ₫
            </span>
            <input
              type="number"
              name="maxRentalPrice"
              value={filters.maxRentalPrice}
              onChange={handleChange}
              placeholder="Max"
              className="focus:ring-primary/20 focus:border-primary w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-3 pl-7 text-sm transition-all focus:ring-2 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Area Size */}
      <div className="space-y-4">
        <h4 className="flex items-center gap-2 text-xs font-black tracking-[0.2em] text-slate-400 uppercase">
          Min Capacity (m²)
        </h4>
        <div className="relative">
          <span className="absolute top-1/2 left-3 -translate-y-1/2 text-xs text-slate-400">
            <Maximize size={14} />
          </span>
          <input
            type="number"
            name="minCapacity"
            value={filters.minCapacity}
            onChange={handleChange}
            placeholder="e.g. 1000"
            className="focus:ring-primary/20 focus:border-primary w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-3 pl-9 text-sm transition-all focus:ring-2 focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-3 pt-6">
        <Button
          onClick={handleApply}
          className="flex h-11 w-full items-center justify-center gap-2"
        >
          <Filter size={16} /> Apply Filters
        </Button>
        <Button
          onClick={handleClear}
          variant="outline"
          className="h-11 w-full border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          Clear Filters
        </Button>
      </div>
    </div>
  )
}

export default WarehouseFilters
