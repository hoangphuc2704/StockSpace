import { useState } from 'react'
import { Filter, Maximize2 } from 'lucide-react'

const EMPTY_FILTERS = {
  minRentalPrice: '',
  maxRentalPrice: '',
  minCapacity: '',
}

const WarehouseFilters = ({ onFilterChange }) => {
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFilters((previous) => ({ ...previous, [name]: value }))
  }

  const handleApply = () => onFilterChange(filters)

  const handleClear = () => {
    setFilters(EMPTY_FILTERS)
    onFilterChange(EMPTY_FILTERS)
  }

  return (
    <div className="space-y-5">
      <section aria-labelledby="price-filter-heading">
        <h3 id="price-filter-heading" className="text-sm font-semibold text-slate-800">
          Giá thuê
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="min-w-0">
            <span className="sr-only">Giá tối thiểu</span>
            <input
              type="number"
              name="minRentalPrice"
              value={filters.minRentalPrice}
              onChange={handleChange}
              placeholder="Từ (VNĐ)"
              className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="min-w-0">
            <span className="sr-only">Giá tối đa</span>
            <input
              type="number"
              name="maxRentalPrice"
              value={filters.maxRentalPrice}
              onChange={handleChange}
              placeholder="Đến (VNĐ)"
              className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>
      </section>

      <section className="border-t border-slate-200 pt-5" aria-labelledby="capacity-filter-heading">
        <h3 id="capacity-filter-heading" className="text-sm font-semibold text-slate-800">
          Diện tích tối thiểu
        </h3>
        <label className="relative mt-3 block">
          <span className="sr-only">Diện tích tối thiểu theo mét vuông</span>
          <Maximize2
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="number"
            name="minCapacity"
            value={filters.minCapacity}
            onChange={handleChange}
            placeholder="Ví dụ: 1.000 m²"
            className="min-h-10 w-full rounded-md border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </section>

      <div className="space-y-2 border-t border-slate-200 pt-5">
        <button
          type="button"
          onClick={handleApply}
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-blue-700 px-3 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          Áp dụng bộ lọc
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="min-h-9 w-full rounded-md px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
        >
          Xóa bộ lọc
        </button>
      </div>
    </div>
  )
}

export default WarehouseFilters
