import { motion } from 'framer-motion'
import { MapPin, Maximize2, Clock, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { formatWarehousePricePerSquareMeter } from '@/utils/warehousePricing'

const WarehouseCard = ({ warehouse, viewMode = 'grid' }) => {
  const isGrid = viewMode === 'grid'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -8 }}
      className={cn(
        'group relative overflow-hidden border border-slate-200 bg-white transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/60',
        isGrid ? 'flex flex-col rounded-2xl' : 'flex h-64 flex-row rounded-2xl'
      )}
    >
      <Link
        to={`/warehouse/${warehouse.id}`}
        aria-label={`View details for ${warehouse.name}`}
        className="focus-visible:ring-primary absolute inset-0 z-30 cursor-pointer rounded-2xl focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
      />

      {/* Thumbnail */}
      <div
        className={cn(
          'relative overflow-hidden bg-slate-100',
          isGrid ? 'aspect-[4/3]' : 'w-80 shrink-0'
        )}
      >
        <img
          src={
            warehouse.thumbnail ||
            `https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800&sig=${warehouse.id}`
          }
          alt={warehouse.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute top-4 left-4 z-20 flex gap-2">
          {warehouse.isVerified ? (
            <div className="rounded-full bg-emerald-500/90 px-3 py-1 text-[11px] font-bold tracking-wider text-white uppercase shadow-sm backdrop-blur-md">
              Verified
            </div>
          ) : (
            <div className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold tracking-wider text-[#0f084b] uppercase shadow-sm backdrop-blur-md">
              Approved
            </div>
          )}
        </div>
        <div className="animate-in fade-in slide-in-from-bottom-2 absolute bottom-4 left-4 z-20 hidden transition-all group-hover:block">
          <div className="flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-900 shadow-lg backdrop-blur-md">
            <Clock size={14} className="text-primary" /> Contact Owner
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-2 flex items-start justify-between">
          <h3 className="group-hover:text-primary line-clamp-1 text-lg font-bold text-slate-900 transition-colors">
            {warehouse.name}
          </h3>
        </div>

        <div className="mb-4 flex items-center gap-1.5 text-sm text-slate-500">
          <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="line-clamp-1">{warehouse.location}</span>
        </div>

        <div className="mb-6 flex items-center gap-6">
          <div className="flex items-center gap-2 text-slate-600">
            <div className="text-primary group-hover:bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 transition-colors">
              <Maximize2 size={16} />
            </div>
            <span className="text-sm font-semibold">{warehouse.area.toLocaleString()} m²</span>
          </div>
          <div className="h-4 w-px bg-slate-100" />
          <div className="text-sm font-medium text-slate-500">
            {warehouse.type || 'General'} Storage
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-5">
          <div className="relative z-20">
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              {warehouse.rentalPricingType === 'NEGOTIATED' ? 'Rental price' : 'Price / m²'}
            </p>
            <p className="text-primary flex items-baseline gap-1 text-2xl font-black">
              {formatWarehousePricePerSquareMeter(warehouse)}
              <span className="text-sm font-medium text-slate-400">
                {warehouse.rentalPricingType === 'NEGOTIATED' ? '' : '/m²'}
              </span>
            </p>
          </div>
          <div className="relative z-20">
            <span className="bg-primary shadow-primary/20 group-hover:bg-primary/90 inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-medium text-white shadow-lg transition-colors">
              <ArrowRight size={14} />
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default WarehouseCard
