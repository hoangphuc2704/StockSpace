import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Search, MapPin, ChevronRight, 
  SlidersHorizontal, Warehouse, 
  ThermometerSnowflake, Shield, Box, Zap
} from 'lucide-react'
import { Link } from 'react-router-dom'

// Shared Components & Utils
import { cn } from '@/utils/cn'
import Button from '@/components/atoms/Button'
import { LandingNavbar } from '../components/Hero'
import { Footer } from '../components/Footer'

// Feature Components & Constants
import WarehouseCard from '@/features/warehouse/components/WarehouseCard'
import { MOCK_WAREHOUSES } from '@/features/warehouse/constants/mockData'

const CATEGORIES = [
  { id: 'all', label: 'All Spaces', icon: Warehouse },
  { id: 'cold', label: 'Cold Storage', icon: ThermometerSnowflake },
  { id: 'fulfillment', label: 'Fulfillment', icon: Box },
  { id: 'security', label: 'High Security', icon: Shield },
  { id: 'last-mile', label: 'Last Mile', icon: Zap },
]

const LandingPage = () => {
  const [activeCategory, setActiveCategory] = useState('all')

  return (
    <div className="min-h-screen bg-white">
      <LandingNavbar />

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 overflow-hidden">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -mr-96 -mt-96" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-3xl -ml-72 -mb-72" />
          
          <div className="container mx-auto px-4 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-4xl mx-auto"
            >
              <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
                Modern Storage for <span className="text-primary">Modern Business.</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-500 mb-12 max-w-2xl mx-auto font-medium">
                Find and book high-quality warehouse space instantly. From fulfillment centers to cold storage, find your next hub here.
              </p>

              {/* Search Bar */}
              <div className="max-w-3xl mx-auto bg-white p-2 rounded-3xl shadow-2xl shadow-slate-200 border border-slate-100 flex flex-col md:flex-row items-center gap-2">
                <div className="flex-1 flex items-center gap-3 px-6 py-4 border-r border-slate-100 w-full">
                  <MapPin className="text-primary" size={20} />
                  <div className="text-left flex-1">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Location</p>
                    <input 
                      type="text" 
                      placeholder="Where do you need space?" 
                      className="w-full text-slate-900 font-bold focus:outline-none placeholder:text-slate-300"
                    />
                  </div>
                </div>
                <div className="flex-1 flex items-center gap-3 px-6 py-4 w-full">
                  <SlidersHorizontal className="text-primary" size={20} />
                  <div className="text-left flex-1">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Type</p>
                    <select className="w-full text-slate-900 font-bold focus:outline-none bg-transparent appearance-none cursor-pointer">
                      <option>All Space Types</option>
                      <option>Cold Storage</option>
                      <option>Fulfillment</option>
                    </select>
                  </div>
                </div>
                <Button className="w-full md:w-auto h-14 md:h-16 px-10 rounded-[22px] text-lg font-bold shadow-xl shadow-primary/30">
                  <Search size={20} className="mr-2" /> Search Hubs
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Category Section */}
        <section className="bg-white sticky top-20 z-40 border-b border-slate-50 shadow-sm shadow-slate-100/50">
          <div className="container mx-auto px-4 h-24 flex items-center justify-between">
            <div className="flex items-center gap-10 overflow-x-auto no-scrollbar py-2">
              {CATEGORIES.map((cat) => (
                <button 
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 min-w-max transition-all relative pb-2 group",
                    activeCategory === cat.id ? "text-primary" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <cat.icon size={24} strokeWidth={activeCategory === cat.id ? 2.5 : 2} />
                  <span className="text-xs font-bold tracking-tight">{cat.label}</span>
                  {activeCategory === cat.id && (
                    <motion.div layoutId="active-cat" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>
            
            <Link to="/warehouses">
               <Button variant="outline" size="sm" className="hidden lg:flex rounded-xl border-slate-200">
                 Explore All <ChevronRight size={16} className="ml-1" />
               </Button>
            </Link>
          </div>
        </section>

        {/* Featured Listings */}
        <section className="py-20 bg-slate-50/30">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Featured Warehouses</h2>
                <p className="text-slate-500 font-medium mt-1">Discover top-rated storage hubs across the region.</p>
              </div>
              <Link to="/warehouses" className="text-primary font-bold flex items-center gap-1 group hover:gap-2 transition-all">
                View all spaces <ChevronRight size={18} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {MOCK_WAREHOUSES.slice(0, 6).map((warehouse) => (
                <WarehouseCard key={warehouse.id} warehouse={warehouse} />
              ))}
            </div>

            <div className="mt-20 text-center">
              <Link to="/warehouses">
                <Button variant="outline" className="h-14 px-12 rounded-2xl border-slate-200 text-slate-900 font-bold hover:bg-slate-900 hover:text-white transition-all shadow-xl shadow-slate-200/50">
                  Explore More Warehouses
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default LandingPage
