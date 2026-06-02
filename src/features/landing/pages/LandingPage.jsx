import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  MapPin,
  ChevronRight,
  SlidersHorizontal,
  Warehouse,
  ThermometerSnowflake,
  Shield,
  Box,
  Zap,
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
        <section className="relative overflow-hidden pt-20 pb-32">
          <div className="bg-primary/5 absolute top-0 right-0 -mt-96 -mr-96 h-[800px] w-[800px] rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-72 -ml-72 h-[600px] w-[600px] rounded-full bg-orange-500/5 blur-3xl" />

          <div className="relative z-10 container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mx-auto max-w-4xl"
            >
              <h1 className="mb-6 text-5xl leading-tight font-black tracking-tight text-slate-900 md:text-7xl">
                Modern Storage for <span className="text-primary">Modern Business.</span>
              </h1>
              <p className="mx-auto mb-12 max-w-2xl text-lg font-medium text-slate-500 md:text-xl">
                Find and book high-quality warehouse space instantly. From fulfillment centers to
                cold storage, find your next hub here.
              </p>

              {/* Search Bar */}
              <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 rounded-3xl border border-slate-100 bg-white p-2 shadow-2xl shadow-slate-200 md:flex-row">
                <div className="flex w-full flex-1 items-center gap-3 border-r border-slate-100 px-6 py-4">
                  <MapPin className="text-primary" size={20} />
                  <div className="flex-1 text-left">
                    <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                      Location
                    </p>
                    <input
                      type="text"
                      placeholder="Where do you need space?"
                      className="w-full font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex w-full flex-1 items-center gap-3 px-6 py-4">
                  <SlidersHorizontal className="text-primary" size={20} />
                  <div className="flex-1 text-left">
                    <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                      Type
                    </p>
                    <select className="w-full cursor-pointer appearance-none bg-transparent font-bold text-slate-900 focus:outline-none">
                      <option>All Space Types</option>
                      <option>Cold Storage</option>
                      <option>Fulfillment</option>
                    </select>
                  </div>
                </div>
                <Button className="shadow-primary/30 h-14 w-full rounded-[22px] px-10 text-lg font-bold shadow-xl md:h-16 md:w-auto">
                  <Search size={20} className="mr-2" /> Search Hubs
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Category Section */}
        <section className="sticky top-20 z-40 border-b border-slate-50 bg-white shadow-sm shadow-slate-100/50">
          <div className="container mx-auto flex h-24 items-center justify-between px-4">
            <div className="no-scrollbar flex items-center gap-10 overflow-x-auto py-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    'group relative flex min-w-max flex-col items-center gap-2 pb-2 transition-all',
                    activeCategory === cat.id
                      ? 'text-primary'
                      : 'text-slate-400 hover:text-slate-600'
                  )}
                >
                  <cat.icon size={24} strokeWidth={activeCategory === cat.id ? 2.5 : 2} />
                  <span className="text-xs font-bold tracking-tight">{cat.label}</span>
                  {activeCategory === cat.id && (
                    <motion.div
                      layoutId="active-cat"
                      className="bg-primary absolute right-0 bottom-0 left-0 h-0.5 rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>

            <Link to="/warehouses">
              <Button
                variant="outline"
                size="sm"
                className="hidden rounded-xl border-slate-200 lg:flex"
              >
                Explore All <ChevronRight size={16} className="ml-1" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Featured Listings */}
        <section className="bg-slate-50/30 py-20">
          <div className="container mx-auto px-4">
            <div className="mb-10 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-tight text-slate-900">
                  Featured Warehouses
                </h2>
                <p className="mt-1 font-medium text-slate-500">
                  Discover top-rated storage hubs across the region.
                </p>
              </div>
              <Link
                to="/warehouses"
                className="text-primary group flex items-center gap-1 font-bold transition-all hover:gap-2"
              >
                View all spaces <ChevronRight size={18} />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {MOCK_WAREHOUSES.slice(0, 6).map((warehouse) => (
                <WarehouseCard key={warehouse.id} warehouse={warehouse} />
              ))}
            </div>

            <div className="mt-20 text-center">
              <Link to="/warehouses">
                <Button
                  variant="outline"
                  className="h-14 rounded-2xl border-slate-200 px-12 font-bold text-slate-900 shadow-xl shadow-slate-200/50 transition-all hover:bg-slate-900 hover:text-white"
                >
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
