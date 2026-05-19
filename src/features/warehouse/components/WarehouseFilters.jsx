import { Search, MapPin, DollarSign, Maximize, Calendar, ChevronDown } from 'lucide-react'
import InputField from '@/components/atoms/InputField'
import Button from '@/components/atoms/Button'

const WarehouseFilters = ({ onFilterChange }) => {
  return (
    <div className="space-y-10">
      {/* Location */}
      <div className="space-y-4">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
          Location
        </h4>
        <div className="relative">
          <select className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer">
            <option>All Locations</option>
            <option>Ho Chi Minh City</option>
            <option>Ha Noi</option>
            <option>Da Nang</option>
            <option>Binh Duong</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-4">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
          Monthly Price ($)
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
            <input 
              type="number" 
              placeholder="Min" 
              className="w-full pl-7 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
            <input 
              type="number" 
              placeholder="Max" 
              className="w-full pl-7 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>
      </div>

      {/* Area Size */}
      <div className="space-y-4">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
          Area Size (m²)
        </h4>
        <div className="space-y-3">
          {[
            { label: 'Under 1,000 m²', id: 'area-1' },
            { label: '1,000 - 5,000 m²', id: 'area-2' },
            { label: '5,000 - 10,000 m²', id: 'area-3' },
            { label: 'Over 10,000 m²', id: 'area-4' }
          ].map((range) => (
            <label key={range.id} className="flex items-center gap-3 text-sm text-slate-600 cursor-pointer group">
              <div className="relative flex items-center">
                <input 
                  type="checkbox" 
                  id={range.id}
                  className="peer h-5 w-5 appearance-none rounded-lg border-2 border-slate-200 checked:bg-primary checked:border-primary transition-all cursor-pointer" 
                />
                <svg className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity left-0.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="font-medium group-hover:text-primary transition-colors">{range.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Amenities / Features */}
      <div className="space-y-4">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
          Key Features
        </h4>
        <div className="space-y-3">
          {['24/7 Access', 'Security Guard', 'Fire Sprinklers', 'Loading Bays', 'Office Space'].map((feature, idx) => (
            <label key={idx} className="flex items-center gap-3 text-sm text-slate-600 cursor-pointer group">
              <div className="relative flex items-center">
                <input 
                  type="checkbox" 
                  className="peer h-5 w-5 appearance-none rounded-lg border-2 border-slate-200 checked:bg-primary checked:border-primary transition-all cursor-pointer" 
                />
                <svg className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity left-0.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="font-medium group-hover:text-primary transition-colors">{feature}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="pt-6">
        <Button variant="outline" className="w-full border-slate-200 text-slate-600 hover:bg-slate-50 h-11">
          Apply Filters
        </Button>
      </div>
    </div>
  )
}

export default WarehouseFilters
