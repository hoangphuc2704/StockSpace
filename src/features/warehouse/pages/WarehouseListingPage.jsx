import { useEffect, useState } from 'react'
import { LayoutGrid, List, Search, Warehouse } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import WarehouseCard from '../components/WarehouseCard'
import WarehouseFilters from '../components/WarehouseFilters'
import warehouseApi from '@/services/warehouse/warehouseApi'
import PublicHeader from '@/components/PublicHeader'
import { parseAmountInput } from '@/utils/currency'

const EMPTY_FILTERS = {
  minRentalPrice: '',
  maxRentalPrice: '',
  minCapacity: '',
  maxCapacity: '',
  districtName: '',
  rentalPricingType: '',
  isVerified: '',
}

const WarehouseSkeleton = () => (
  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white" aria-hidden="true">
    <div className="aspect-[16/9] animate-pulse bg-slate-200" />
    <div className="space-y-4 p-4">
      <div className="h-5 w-3/5 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 border-y border-slate-200 py-3">
        <div className="h-8 animate-pulse rounded bg-slate-100" />
        <div className="h-8 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="h-6 w-2/5 animate-pulse rounded bg-slate-200" />
    </div>
  </div>
)

const normalizeWarehouse = (warehouse) => ({
  id: warehouse.id,
  name: warehouse.name || 'Warehouse',
  location: warehouse.location || warehouse.address || 'Updating address',
  area: Number(warehouse.area ?? warehouse.capacity ?? 0),
  rentalPrice:
    warehouse.price == null && warehouse.rentalPrice == null && warehouse.pricePerMonth == null
      ? null
      : Number(warehouse.price ?? warehouse.rentalPrice ?? warehouse.pricePerMonth),
  rentalPricingType: warehouse.rentalPricingType || 'PER_SQUARE_METER_MONTHLY',
  status: warehouse.status || 'UNKNOWN',
  type: warehouse.warehouseType?.name || warehouse.typeName || warehouse.type || 'General',
  thumbnail: warehouse.thumbnail || warehouse.coverImageUrl || warehouse.imageUrls?.[0] || '',
  description: warehouse.description || '',
  isVerified: warehouse.isVerified ?? warehouse.verified ?? false,
})

const WarehouseListingPage = () => {
  const [viewMode, setViewMode] = useState('grid')
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [warehouses, setWarehouses] = useState([])
  const [error, setError] = useState('')
  const [apiFilters, setApiFilters] = useState(EMPTY_FILTERS)

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        setIsLoading(true)
        setError('')
        const params = {
          page: 0,
          size: 24,
          sortBy: 'createdAt',
          sortDir: 'desc',
          keyword: searchTerm.trim() || undefined,
        }
        const minRentalPrice = parseAmountInput(apiFilters.minRentalPrice)
        const maxRentalPrice = parseAmountInput(apiFilters.maxRentalPrice)
        if (minRentalPrice !== '') params.minRentalPrice = minRentalPrice
        if (maxRentalPrice !== '') params.maxRentalPrice = maxRentalPrice
        if (apiFilters.minCapacity) params.minCapacity = apiFilters.minCapacity
        if (apiFilters.maxCapacity) params.maxCapacity = apiFilters.maxCapacity
        if (apiFilters.districtName?.trim()) params.districtName = apiFilters.districtName.trim()
        if (apiFilters.rentalPricingType) {
          params.rentalPricingType = apiFilters.rentalPricingType
        }
        if (apiFilters.isVerified === 'true') params.isVerified = true

        const response = await warehouseApi.getPublicWarehouses(params)
        const payload = response?.data?.data
        const content = Array.isArray(payload?.content)
          ? payload.content
          : Array.isArray(payload)
            ? payload
            : []
        setWarehouses(content.map(normalizeWarehouse))
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Unable to load warehouses.')
        setWarehouses([])
      } finally {
        setIsLoading(false)
      }
    }

    const timer = setTimeout(fetchWarehouses, 500)
    return () => clearTimeout(timer)
  }, [apiFilters, searchTerm])

  const resetAllFilters = () => {
    setSearchTerm('')
    setApiFilters({ ...EMPTY_FILTERS })
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <PublicHeader />
      <main className="flex-1 pb-12">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault()
                setSearchTerm((current) => current.trim())
              }}
            >
              <label htmlFor="warehouse-search" className="sr-only">
                Search warehouses by name or area
              </label>
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
                <input
                  id="warehouse-search"
                  type="search"
                  placeholder="Search warehouse name, city, or area"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="min-h-13 w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pr-4 pl-12 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <button
                type="submit"
                className="min-h-13 rounded-xl bg-blue-700 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Search
              </button>
            </form>

            <div className="mt-6">
              <p className="text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase">
                Warehouse marketplace
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                Approved warehouses
              </h1>
              <p className="mt-1.5 text-sm text-slate-600">
                Find the right space for your business storage and operations.
              </p>
            </div>
          </div>
        </section>

        <div className="sticky top-[72px] z-40 border-b border-slate-200 bg-slate-50/95 py-3 backdrop-blur sm:top-20">
          <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
            <WarehouseFilters value={apiFilters} onFilterChange={setApiFilters} />
          </div>
        </div>

        <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6">
            <section aria-labelledby="warehouse-results-heading" className="min-w-0">
              <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2
                    id="warehouse-results-heading"
                    className="text-lg font-semibold text-slate-950"
                  >
              Search results
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {isLoading ? 'Loading approved warehouses' : `${warehouses.length} matching warehouses`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-500">Sort: Newest</span>
                  <div
                    className="inline-flex rounded-md border border-slate-300 bg-white p-0.5"
                    aria-label="View mode"
                  >
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      aria-label="Grid view"
                      aria-pressed={viewMode === 'grid'}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${viewMode === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
                    >
                      <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      aria-label="List view"
                      aria-pressed={viewMode === 'list'}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${viewMode === 'list' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
                    >
                      <List className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>

              {error && !isLoading ? (
                <div
                  role="alert"
                  className="mb-5 border-l-2 border-rose-600 bg-rose-50 px-4 py-3 text-sm text-rose-800"
                >
                  {error}
                </div>
              ) : null}

              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3'
                    : 'flex flex-col gap-4'
                }
              >
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, index) => <WarehouseSkeleton key={index} />)
                ) : (
                  <AnimatePresence mode="popLayout">
                    {warehouses.map((warehouse) => (
                      <WarehouseCard key={warehouse.id} warehouse={warehouse} viewMode={viewMode} />
                    ))}
                  </AnimatePresence>
                )}
              </div>

              {!isLoading && !error && warehouses.length === 0 && (
                <div className="flex min-h-72 flex-col items-center justify-center border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                  <Warehouse className="h-7 w-7 text-slate-400" aria-hidden="true" />
                  <h3 className="mt-3 text-base font-semibold text-slate-800">
                    No matching warehouses found
                  </h3>
                  <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                    Try adjusting the filters or searching with different criteria.
                  </p>
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="mt-4 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                  >
                    Reset filters
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

export default WarehouseListingPage
