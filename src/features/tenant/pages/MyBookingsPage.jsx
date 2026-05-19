import { motion } from 'framer-motion'
import { 
  Warehouse, MapPin, Calendar, 
  Clock, ArrowRight, Package, 
  ChevronRight, ExternalLink, ShieldCheck
} from 'lucide-react'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import { Link } from 'react-router-dom'

const MOCK_BOOKINGS = [
  {
    id: 'BK-1234',
    name: 'Industrial Park A - Unit 42',
    owner: 'David Miller',
    location: 'Binh Duong Province, VN',
    status: 'ACTIVE',
    price: '$2,400/mo',
    startDate: '2024-01-15',
    endDate: '2024-12-15',
    size: '500 m²',
    type: 'General Warehouse',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'BK-5678',
    name: 'Cold Storage Cat Lai',
    owner: 'Sarah Chen',
    location: 'District 2, HCMC',
    status: 'PENDING',
    price: '$1,200/mo',
    startDate: '2024-06-01',
    endDate: '2024-09-01',
    size: '150 m²',
    type: 'Cold Storage',
    image: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&q=80&w=800'
  }
]

const MyBookingsPage = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Bookings</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your active rentals and track pending requests.</p>
        </div>
        <Link to="/warehouses">
          <Button>
            Browse New Warehouses <ArrowRight size={18} className="ml-2" />
          </Button>
        </Link>
      </div>

      {/* Grid of Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {MOCK_BOOKINGS.map((booking, idx) => (
          <motion.div
            key={booking.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="relative h-48 overflow-hidden">
               <img 
                 src={booking.image} 
                 alt={booking.name} 
                 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
               />
               <div className="absolute top-4 left-4">
                 <Badge variant={booking.status === 'ACTIVE' ? 'success' : 'warning'} className="shadow-lg backdrop-blur-md bg-white/90">
                   {booking.status}
                 </Badge>
               </div>
               <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                 <h3 className="text-white font-bold text-lg">{booking.name}</h3>
                 <p className="text-white/80 text-xs flex items-center gap-1">
                   <MapPin size={12} /> {booking.location}
                 </p>
               </div>
            </div>

            <div className="p-6 space-y-4">
               <div className="grid grid-cols-2 gap-4 text-sm">
                 <div className="space-y-1">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Duration</p>
                   <p className="text-slate-700 flex items-center gap-2">
                     <Calendar size={14} className="text-slate-400" />
                     {booking.startDate} to {booking.endDate}
                   </p>
                 </div>
                 <div className="space-y-1 text-right">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Monthly Rent</p>
                   <p className="text-primary font-bold text-lg">{booking.price}</p>
                 </div>
               </div>

               <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                      <Warehouse size={16} />
                    </div>
                    <span className="text-xs font-medium text-slate-600">{booking.size} • {booking.type}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <Link to="/tenant/inventory">
                      <Button variant="outline" size="sm" className="h-9">
                        <Package size={16} className="mr-2" /> Inventory
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" className="h-9 px-3">
                      <ExternalLink size={16} />
                    </Button>
                 </div>
               </div>
            </div>
          </motion.div>
        ))}

        {/* Empty State / Add New Call to Action */}
        <div className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-12 text-center group hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer">
           <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:bg-primary/10 transition-all mb-4">
             <Warehouse size={32} />
           </div>
           <h3 className="font-bold text-slate-900">Need more space?</h3>
           <p className="text-sm text-slate-500 mt-2 mb-6">Find and book your next warehouse in minutes.</p>
           <Button variant="outline" className="group-hover:bg-primary group-hover:text-white transition-all">
             Start Searching
           </Button>
        </div>
      </div>

      {/* Helpful Banner */}
      <div className="bg-slate-900 rounded-2xl p-8 text-white flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center text-primary shrink-0">
          <ShieldCheck size={32} />
        </div>
        <div className="flex-1 text-center md:text-left z-10">
          <h3 className="text-xl font-bold">Secure Rental Protection</h3>
          <p className="text-slate-400 mt-1 max-w-lg">
            All StockSpace bookings are protected by our rental guarantee. 
            We handle the contracts and security deposits so you can focus on your business.
          </p>
        </div>
        <Button variant="outline" className="border-white/20 text-white hover:bg-white hover:text-slate-900 z-10">
          View Legal Terms
        </Button>
      </div>
    </div>
  )
}

export default MyBookingsPage
