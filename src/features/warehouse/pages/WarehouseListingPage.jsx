import { useState, useEffect, useMemo } from 'react'
import {
  LayoutGrid,
  List,
  ChevronDown,
  Search,
  Warehouse as WarehouseIcon,
  ThermometerSnowflake,
  Shield,
  Zap,
  Box,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import WarehouseCard from '../components/WarehouseCard'
import WarehouseFilters from '../components/WarehouseFilters'
import Button from '@/components/atoms/Button'
import warehouseApi from '@/services/warehouse/warehouseApi'
import PublicHeader from '@/components/PublicHeader'

const DEFAULT_CATEGORIES = [
  { id: 'all', label: 'All Spaces', icon: WarehouseIcon },
]

const WarehouseSkeleton = () => (
  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white animate-pulse">
    <div className="aspect-[4/3] bg-slate-100" />
    <div className="space-y-4 p-6">
      <div className="flex justify-between">
        <div className="h-6 w-2/3 rounded-lg bg-slate-100" />
        <div className="h-6 w-10 rounded-lg bg-slate-100" />
      </div>
      <div className="h-4 w-1/2 rounded-lg bg-slate-100" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-10 rounded-xl bg-slate-50" />
        <div className="h-10 rounded-xl bg-slate-50" />
      </div>
      <div className="flex items-center justify-between border-t border-slate-50 pt-4">
        <div className="h-8 w-24 rounded-lg bg-slate-100" />
        <div className="h-10 w-32 rounded-xl bg-primary/10" />
      </div>
    </div>
  </div>
)

const normalizeWarehouse = (warehouse) => ({
  id: warehouse.id,
  name: warehouse.name || 'Warehouse',
  location: warehouse.address || warehouse.location || 'Updating address',
  area: Number(warehouse.area ?? warehouse.capacity ?? 0),
  price: Number(warehouse.pricePerMonth ?? warehouse.price ?? 0),
  status: warehouse.status || 'UNKNOWN',
  rating: Number(warehouse.rating ?? 4.8),
  type: warehouse.warehouseType?.name || warehouse.typeName || warehouse.type || 'General',
  thumbnail: warehouse.coverImageUrl || warehouse.thumbnail || warehouse.imageUrls?.[0] || '',
  description: warehouse.description || '',
  isVerified: warehouse.isVerified ?? warehouse.verified ?? false,
})

const isVisibleWarehouse = (warehouse) => true

const matchesCategory = (warehouse, category) => {
  if (category === 'all') return true

  const type = (warehouse.type || '').toLowerCase()
  if (category === 'cold') return type.includes('cold')
  if (category === 'fulfillment') return type.includes('fulfillment')
  if (category === 'high-security') return type.includes('security')
  if (category === 'last-mile') return type.includes('last mile') || type.includes('last-mile')

  return true
}

const WarehouseListingPage = () => {
  const [viewMode, setViewMode] = useState('grid')
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [warehouses, setWarehouses] = useState([])
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [error, setError] = useState('')
  const [apiFilters, setApiFilters] = useState({
    minPrice: '',
    maxPrice: '',
    minCapacity: '',
  })

  // Fetch categories (Warehouse Types)
  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const response = await warehouseApi.getWarehouseTypesByOwner()
        if (response?.data?.success && Array.isArray(response.data.data)) {
          const fetchedCategories = response.data.data.map((type) => ({
            id: type.name.toLowerCase(),
            label: type.name,
            icon: Box // default icon for dynamic types
          }))
          setCategories([...DEFAULT_CATEGORIES, ...fetchedCategories])
        }
      } catch (err) {
        console.error('Failed to load warehouse types', err)
      }
    }
    fetchTypes()
  }, [])

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        setIsLoading(true)
        setError('')

        const params = {
          page: 0,
          size: 24,
          status: 'AVAILABLE',
          sortBy: 'createdAt',
          sortDir: 'desc',
          keyword: searchTerm.trim() || undefined,
        }

        if (apiFilters.minPrice) params.minPrice = apiFilters.minPrice
        if (apiFilters.maxPrice) params.maxPrice = apiFilters.maxPrice
        if (apiFilters.minCapacity) params.minCapacity = apiFilters.minCapacity

        const response = await warehouseApi.getPublicWarehouses(params)

        const payload = response?.data?.data
        const content = Array.isArray(payload?.content)
          ? payload.content
          : Array.isArray(payload)
            ? payload
            : []

        const normalized = content.map(normalizeWarehouse).filter(isVisibleWarehouse)
        setWarehouses(normalized)
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Unable to load warehouses.')
        setWarehouses([])
      } finally {
        setIsLoading(false)
      }
    }

    // Debounce the API call slightly if searching by keyword
    const timer = setTimeout(() => {
      fetchWarehouses()
    }, 500)

    return () => clearTimeout(timer)
  }, [apiFilters, searchTerm])

  const filteredWarehouses = useMemo(() => {
    return warehouses.filter((warehouse) => {
      return matchesCategory(warehouse, activeCategory)
    })
  }, [activeCategory, warehouses])

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PublicHeader />
      <main className="pb-20 flex-1 pt-4">
        <div className="sticky top-20 z-40 border-b border-slate-100 bg-white/90 backdrop-blur-md">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col items-center gap-6 lg:flex-row">
              <div className="flex flex-1 items-center gap-8 overflow-x-auto pb-1 no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`group relative flex min-w-max flex-col items-center gap-2 pb-2 transition-all ${activeCategory === cat.id
                        ? 'text-primary'
                        : 'text-slate-500 hover:text-slate-900'
                      }`}
                  >
                    <cat.icon size={24} strokeWidth={activeCategory === cat.id ? 2.5 : 2} />
                    <span
                      className={`text-xs font-bold tracking-tight ${activeCategory === cat.id
                          ? 'opacity-100'
                          : 'opacity-70 group-hover:opacity-100'
                        }`}
                    >
                      {cat.label}
                    </span>
                    {activeCategory === cat.id && (
                      <motion.div
                        layoutId="cat-active"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex w-full items-center gap-3 lg:w-auto">
                <div className="relative flex-1 lg:w-80">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="Search by city or hub name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="hidden items-center rounded-2xl border border-slate-200 bg-white p-1 sm:flex">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`rounded-xl p-1.5 transition-all ${viewMode === 'grid'
                        ? 'bg-slate-900 text-white shadow-lg'
                        : 'text-slate-400 hover:text-slate-600'
                      }`}
                  >
                    <LayoutGrid size={20} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`rounded-xl p-1.5 transition-all ${viewMode === 'list'
                        ? 'bg-slate-900 text-white shadow-lg'
                        : 'text-slate-400 hover:text-slate-600'
                      }`}
                  >
                    <List size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto mt-10 px-4">
          <div className="flex flex-col gap-10 lg:flex-row">
            <aside className="hidden w-72 shrink-0 lg:block">
              <div className="sticky top-52">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-900">Filters</h3>
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      setActiveCategory('all')
                      setApiFilters({ minPrice: '', maxPrice: '', minCapacity: '' })
                    }}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Clear all
                  </button>
                </div>
                <WarehouseFilters onFilterChange={setApiFilters} />
              </div>
            </aside>

            <div className="flex-1">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">
                    Approved Warehouses
                  </h2>
                  {/* <p className="mt-1 text-sm font-medium text-slate-500">
                    Found{' '}
                    <span className="font-bold text-slate-900">{filteredWarehouses.length}</span>{' '}
                    warehouses approved by admin
                  </p> */}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Sort by:
                  </span>
                  <button className="flex items-center gap-1 text-sm font-bold text-slate-900 transition-colors hover:text-primary">
                    Newest <ChevronDown size={14} />
                  </button>
                </div>
              </div>

              {error && !isLoading ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3'
                    : 'flex flex-col gap-6'
                }
              >
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

              {!isLoading && !error && filteredWarehouses.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                    <Search size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">No approved warehouses found</h3>
                  <p className="mx-auto mt-2 max-w-sm text-slate-500">
                    Try adjusting your filters or come back after more warehouse listings are approved.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => {
                      setSearchTerm('')
                      setActiveCategory('all')
                    }}
                  >
                    Reset All Filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default WarehouseListingPage
