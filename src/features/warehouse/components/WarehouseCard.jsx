import { motion } from 'framer-motion'
import { ArrowRight, MapPin, Maximize2, Warehouse } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { formatWarehousePricePerSquareMeter } from '@/utils/warehousePricing'

const WarehouseCard = ({ warehouse, viewMode = 'grid' }) => {
  const isGrid = viewMode === 'grid'
  const priceLabel = warehouse.rentalPricingType === 'NEGOTIATED' ? 'Giá thuê' : 'Giá / m²'

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className={cn(
        'group relative overflow-hidden rounded-lg border border-slate-200 bg-white transition-colors hover:border-slate-300 hover:shadow-sm',
        isGrid ? 'flex flex-col' : 'flex flex-col md:min-h-58 md:flex-row'
      )}
    >
      <Link
        to={`/warehouse/${warehouse.id}`}
        aria-label={`Xem chi tiết ${warehouse.name}`}
        className="absolute inset-0 z-10 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none focus-visible:ring-inset"
      />

      <div
        className={cn(
          'relative shrink-0 overflow-hidden border-b border-slate-200 bg-slate-100 md:border-b-0',
          isGrid ? 'aspect-[16/9]' : 'aspect-[16/9] md:aspect-auto md:w-72 md:border-r'
        )}
      >
        {warehouse.thumbnail ? (
          <img
            src={warehouse.thumbnail}
            alt={warehouse.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <Warehouse className="h-8 w-8" aria-hidden="true" />
          </div>
        )}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 border border-emerald-200 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-800">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
          {warehouse.isVerified ? 'Đã xác minh' : 'Chưa xác minh'}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div>
          <h3 className="truncate text-base font-semibold text-slate-950 transition-colors group-hover:text-blue-800">
            {warehouse.name}
          </h3>
          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-slate-600">
            <MapPin className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="truncate">{warehouse.location}</span>
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 border-y border-slate-200 py-3 text-sm">
          <div className="border-r border-slate-200 pr-3">
            <p className="text-[11px] font-medium text-slate-500">Diện tích</p>
            <p className="mt-1 flex items-center gap-1.5 font-semibold text-slate-900 tabular-nums">
              <Maximize2 className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              {warehouse.area.toLocaleString('vi-VN')} m²
            </p>
          </div>
          <div className="min-w-0 pl-3">
            <p className="text-[11px] font-medium text-slate-500">Loại kho</p>
            <p className="mt-1 truncate font-semibold text-slate-900">{warehouse.type}</p>
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500">{priceLabel}</p>
            <p className="mt-1 truncate text-lg font-semibold text-slate-950 tabular-nums">
              {formatWarehousePricePerSquareMeter(warehouse, 'Thương lượng')}
              {warehouse.rentalPricingType !== 'NEGOTIATED' && (
                <span className="ml-1 text-xs font-medium text-slate-500">/ m²</span>
              )}
            </p>
          </div>
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition-colors group-hover:border-blue-700 group-hover:bg-blue-700 group-hover:text-white">
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
      </div>
    </motion.article>
  )
}

export default WarehouseCard
