import { useState, useEffect, useMemo } from 'react'
import { 
  LayoutGrid, List, ChevronDown, SlidersHorizontal, 
  Search, MapPin, Warehouse as WarehouseIcon, 
  ThermometerSnowflake, Shield, Zap, Box
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import WarehouseCard from '../components/WarehouseCard'
import WarehouseFilters from '../components/WarehouseFilters'
import { LandingNavbar } from '@/features/landing/components/Hero'
import { Footer } from '@/features/landing/components/Footer'
import Button from '@/components/atoms/Button'
import Badge from '@/components/atoms/Badge'

import { MOCK_WAREHOUSES } from '../constants/mockData'

const CATEGORIES = [
  { id: 'all', label: 'All Spaces', icon: WarehouseIcon },
  { id: 'cold', label: 'Cold Storage', icon: ThermometerSnowflake },
  { id: 'fulfillment', label: 'Fulfillment', icon: Box },
  { id: 'high-security', label: 'High Security', icon: Shield },
  { id: 'last-mile', label: 'Last Mile', icon: Zap },
]

const WarehouseSkeleton = () => (
  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden animate-pulse">
    <div className="aspect-[4/3] bg-slate-100" />
    <div className="p-6 space-y-4">
      <div className="flex justify-between">
        <div className="h-6 w-2/3 bg-slate-100 rounded-lg" />
        <div className="h-6 w-10 bg-slate-100 rounded-lg" />
      </div>
      <div className="h-4 w-1/2 bg-slate-100 rounded-lg" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-10 bg-slate-50 rounded-xl" />
        <div className="h-10 bg-slate-50 rounded-xl" />
      </div>
      <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
        <div className="h-8 w-24 bg-slate-100 rounded-lg" />
        <div className="h-10 w-32 bg-primary/10 rounded-xl" />
      </div>
    </div>
  </div>
)

const WarehouseListingPage = () => {
  const [viewMode, setViewMode] = useState('grid')
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200)
    return () => clearTimeout(timer)
  }, [])

  const filteredWarehouses = useMemo(() => {
    return MOCK_WAREHOUSES.filter(w => 
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.location.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [searchTerm])

  return (
    <div className="min-h-screen bg-white">
      <LandingNavbar />
      
      <main className="pt-24 pb-20">
        {/* Marketplace Filter Bar */}
        <div className="border-b border-slate-100 sticky top-20 bg-white z-40 backdrop-blur-md bg-white/90">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col lg:flex-row items-center gap-6">
              {/* Category Icons (Airbnb style) */}
              <div className="flex-1 flex items-center gap-8 overflow-x-auto no-scrollbar pb-1">
                {CATEGORIES.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex flex-col items-center gap-2 min-w-max transition-all relative pb-2 group ${
                      activeCategory === cat.id ? 'text-primary' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <cat.icon size={24} strokeWidth={activeCategory === cat.id ? 2.5 : 2} />
                    <span className={`text-xs font-bold tracking-tight ${activeCategory === cat.id ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
                      {cat.label}
                    </span>
                    {activeCategory === cat.id && (
                      <motion.div layoutId="cat-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                  </button>
                ))}
              </div>

              {/* Quick Search & Sort */}
              <div className="flex items-center gap-3 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text"
                    placeholder="Search by city or hub name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  />
                </div>
                <div className="flex items-center rounded-2xl border border-slate-200 p-1 bg-white hidden sm:flex">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <LayoutGrid size={20} />
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <List size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 mt-10">
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Detailed Filters (Sidebar) */}
            <aside className="hidden lg:block w-72 shrink-0">
               <div className="sticky top-44">
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="font-black text-slate-900 text-xl">Filters</h3>
                    <button className="text-xs font-bold text-primary hover:underline">Clear all</button>
                 </div>
                 <WarehouseFilters />
               </div>
            </aside>

            {/* Results Grid */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Available Spaces</h2>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    Found <span className="text-slate-900 font-bold">{filteredWarehouses.length}</span> warehouses in Vietnam
                  </p>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sort by:</span>
                   <button className="flex items-center gap-1 text-sm font-bold text-slate-900 hover:text-primary transition-colors">
                     Recommended <ChevronDown size={14} />
                   </button>
                </div>
              </div>

              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-8' : 'flex flex-col gap-6'}>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => <WarehouseSkeleton key={i} />)
                ) : (
                  <AnimatePresence mode="popLayout">
                    {filteredWarehouses.map((warehouse) => (
                      <WarehouseCard key={warehouse.id} warehouse={warehouse} viewMode={viewMode} />
                    ))}
                  </AnimatePresence>
                )}
              </div>

              {!isLoading && filteredWarehouses.length === 0 && (
                <div className="py-20 text-center flex flex-col items-center justify-center">
                   <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-4">
                     <Search size={32} />
                   </div>
                   <h3 className="text-xl font-bold text-slate-900">No warehouses found</h3>
                   <p className="text-slate-500 max-w-sm mx-auto mt-2">
                     Try adjusting your filters or search terms to find what you're looking for.
                   </p>
                   <Button variant="outline" className="mt-6" onClick={() => {setSearchTerm(''); setActiveCategory('all');}}>
                     Reset All Filters
                   </Button>
                </div>
              )}

              {/* Pagination */}
              {!isLoading && filteredWarehouses.length > 0 && (
                <div className="mt-16 flex items-center justify-center gap-2">
                  <Button variant="outline" className="rounded-xl px-6">Load More</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default WarehouseListingPage
