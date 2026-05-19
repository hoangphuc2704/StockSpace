import { motion } from 'framer-motion'
import { MapPin, Maximize2, Star, Clock, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import { cn } from '@/utils/cn'

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
        'group relative bg-white border border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/60',
        isGrid ? 'rounded-2xl flex flex-col' : 'rounded-2xl flex flex-row h-64'
      )}
    >
      <Link to={`/warehouse/${warehouse.id}`} className="absolute inset-0 z-10" />
      
      {/* Thumbnail */}
      <div className={cn('relative bg-slate-100 overflow-hidden', isGrid ? 'aspect-[4/3]' : 'w-80 shrink-0')}>
        <img
          src={warehouse.thumbnail || `https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800&sig=${warehouse.id}`}
          alt={warehouse.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute top-4 left-4 z-20">
          <Badge variant={warehouse.status === 'AVAILABLE' ? 'success' : 'warning'} className="backdrop-blur-md bg-white/90 border-none shadow-sm">
            {warehouse.status}
          </Badge>
        </div>
        <div className="absolute bottom-4 left-4 z-20 hidden group-hover:block transition-all animate-in fade-in slide-in-from-bottom-2">
           <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold text-slate-900 flex items-center gap-1.5 shadow-lg">
             <Clock size={14} className="text-primary" /> Instant Booking
           </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-slate-900 text-lg group-hover:text-primary transition-colors line-clamp-1">{warehouse.name}</h3>
          <div className="flex items-center gap-1 text-sm font-bold text-warning bg-warning/5 px-2 py-0.5 rounded-lg">
            <Star className="h-3.5 w-3.5 fill-current" />
            <span>{warehouse.rating}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-slate-500 text-sm mb-4">
          <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="line-clamp-1">{warehouse.location}</span>
        </div>

        <div className="flex items-center gap-6 mb-6">
          <div className="flex items-center gap-2 text-slate-600">
            <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
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
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Monthly Price</p>
            <p className="text-2xl font-black text-primary flex items-baseline gap-1">
              ${warehouse.price.toLocaleString()}
              <span className="text-sm text-slate-400 font-medium">/mo</span>
            </p>
          </div>
          <div className="relative z-20">
            <Button size="sm" className="rounded-xl px-5 h-10 shadow-lg shadow-primary/20">
              Details <ArrowRight size={14} className="ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default WarehouseCard
