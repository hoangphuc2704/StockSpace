import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { 
  MapPin, Maximize2, Shield, Clock, Users, Star, 
  CheckCircle2, Info, FileText, MessageSquare, 
  ChevronRight, Share2, Heart, Package, Truck,
  ShieldCheck, AlertCircle, Calendar, ArrowLeft
} from 'lucide-react'
import { motion } from 'framer-motion'
import { LandingNavbar } from '@/features/landing/components/Hero'
import { Footer } from '@/features/landing/components/Footer'
import Button from '@/components/atoms/Button'
import Badge from '@/components/atoms/Badge'
import Avatar from '@/components/atoms/Avatar'
import { MOCK_WAREHOUSES } from '../constants/mockData'

const WarehouseDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [isBookmarked, setIsBookmarked] = useState(false)

  // Find warehouse from shared mock data
  const warehouse = useMemo(() => {
    return MOCK_WAREHOUSES.find(w => w.id.toString() === id) || MOCK_WAREHOUSES[0]
  }, [id])

  // Fallback data for fields not in basic mock
  const extendedData = {
    deposit: warehouse.price * 2,
    images: [
      warehouse.thumbnail || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1493946740644-2d8a1f1a6afd?auto=format&fit=crop&q=80&w=600'
    ],
    features: [
      '10m Ceiling Clearance', 'Reinforced Floor (5t/sqm)', 'ESFR Sprinklers', 
      '24/7 Security Cameras', 'Backup Power Supply', '3 Loading Docks'
    ],
    owner: {
      name: 'Nguyen Van A',
      company: 'Saigon Logistics Corp',
      rating: 4.9,
      since: '2022',
      verified: true
    },
    reviews: 128
  }

  if (!warehouse) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Warehouse not found</h2>
          <Button onClick={() => navigate('/warehouses')}>Back to Listings</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <LandingNavbar />
      
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Breadcrumbs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Link to="/warehouses" className="flex items-center gap-1 hover:text-primary transition-colors">
                <ArrowLeft size={14} /> Back to Search
              </Link>
              <span className="text-slate-300">|</span>
              <span className="text-slate-900 font-medium">{warehouse.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-sm font-bold text-slate-600">
                <Share2 size={16} /> Share
              </button>
              <button 
                onClick={() => setIsBookmarked(!isBookmarked)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors text-sm font-bold ${
                  isBookmarked ? 'bg-danger/5 border-danger text-danger' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Heart size={16} fill={isBookmarked ? 'currentColor' : 'none'} /> {isBookmarked ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>

          {/* Gallery */}
          <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-3 h-[500px] mb-10">
             <div className="md:col-span-2 md:row-span-2 rounded-2xl overflow-hidden group cursor-pointer border border-slate-100">
               <img src={extendedData.images[0]} alt="Main" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700" />
             </div>
             <div className="rounded-2xl overflow-hidden group cursor-pointer border border-slate-100">
               <img src={extendedData.images[1]} alt="Interior 1" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700" />
             </div>
             <div className="rounded-2xl overflow-hidden group cursor-pointer border border-slate-100">
               <img src={extendedData.images[2]} alt="Interior 2" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700" />
             </div>
             <div className="rounded-2xl overflow-hidden group cursor-pointer border border-slate-100">
               <img src={extendedData.images[3]} alt="Exterior" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700" />
             </div>
             <div className="relative rounded-2xl overflow-hidden group cursor-pointer border border-slate-100">
               <img src={extendedData.images[4]} alt="Loading" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700" />
               <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity">
                 <span className="text-white font-bold flex items-center gap-2">
                   View All Photos <ChevronRight size={18} />
                 </span>
               </div>
             </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-12">
            <div className="flex-1 space-y-12">
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="success">Verified Listing</Badge>
                  <Badge variant="primary" className="bg-primary/10 text-primary border-none">{warehouse.type}</Badge>
                </div>
                <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">{warehouse.name}</h1>
                <div className="flex items-center gap-6 text-slate-500">
                  <div className="flex items-center gap-1.5 font-medium">
                    <MapPin size={18} className="text-primary" />
                    <span>{warehouse.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-warning bg-warning/5 px-3 py-1 rounded-full">
                    <Star size={16} className="fill-current" />
                    <span>{warehouse.rating} ({extendedData.reviews} reviews)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-10">
                  {[
                    { icon: Maximize2, label: 'Area', value: `${warehouse.area.toLocaleString()} m²` },
                    { icon: Shield, label: 'Security', value: '24/7 Monitoring' },
                    { icon: Clock, label: 'Access', value: 'Anytime' },
                    { icon: Truck, label: 'Loading', value: '3 Docks' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-2">
                      <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-primary border border-slate-100">
                        <item.icon size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{item.label}</p>
                        <p className="text-sm font-bold text-slate-900">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <hr className="border-slate-100" />

              <section>
                 <h3 className="text-xl font-bold text-slate-900 mb-6">Hosted by</h3>
                 <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar alt={extendedData.owner.name} size="lg" className="border-2 border-white shadow-sm" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-lg text-slate-900">{extendedData.owner.name}</p>
                          {extendedData.owner.verified && <CheckCircle2 size={16} className="text-success" />}
                        </div>
                        <p className="text-sm text-slate-500">{extendedData.owner.company} • Member since {extendedData.owner.since}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="bg-white">Contact Owner</Button>
                 </div>
              </section>

              <section className="space-y-6">
                <h3 className="text-xl font-bold text-slate-900">About this space</h3>
                <p className="text-slate-600 leading-relaxed text-lg">
                  Modern storage facility located in the high-tech industrial park. 
                  This warehouse offers advanced temperature control systems and 
                  is ideal for various industrial and commercial needs.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                  {extendedData.features.map(feature => (
                    <div key={feature} className="flex items-center gap-3 text-slate-700 font-medium">
                      <CheckCircle2 size={18} className="text-primary shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <aside className="w-full lg:w-[400px]">
              <div className="sticky top-28 space-y-6">
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl shadow-slate-200/50 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
                  
                  <div className="flex items-end justify-between mb-8 relative z-10">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Rental Price</p>
                      <span className="text-3xl font-black text-primary">${warehouse.price.toLocaleString()}</span>
                      <span className="text-slate-500 font-medium"> / mo</span>
                    </div>
                    <div className="text-right">
                       <div className="flex items-center gap-1 text-warning font-bold">
                         <Star size={14} className="fill-current" />
                         <span>{warehouse.rating}</span>
                       </div>
                       <p className="text-[10px] text-slate-400 uppercase font-bold">{extendedData.reviews} reviews</p>
                    </div>
                  </div>

                  {/* FIXED: Removed children from InputField (input tag) to prevent React crash */}
                  <div className="space-y-4 mb-8 relative z-10">
                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1.5">
                         <label className="text-sm font-medium text-slate-700">Start Date</label>
                         <input type="date" className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm" />
                       </div>
                       <div className="space-y-1.5">
                         <label className="text-sm font-medium text-slate-700">Duration</label>
                         <select className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm bg-white">
                           <option>3 months</option>
                           <option>6 months</option>
                           <option>12 months</option>
                           <option>24 months</option>
                         </select>
                       </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Required Area (m²)</label>
                      <input type="number" defaultValue={warehouse.area} className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm" />
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 mb-8 relative z-10">
                    <div className="flex items-center gap-2 mb-3 text-slate-900 font-bold">
                       <ShieldCheck size={18} className="text-success" />
                       <h4 className="text-sm">Deposit Information</h4>
                    </div>
                    <div className="space-y-2.5 text-sm">
                       <div className="flex justify-between text-slate-600">
                         <span>Monthly Rental</span>
                         <span className="font-semibold">${warehouse.price.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between text-slate-600">
                         <span>Security Deposit (2 mo)</span>
                         <span className="font-semibold">${extendedData.deposit.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between text-slate-600">
                         <span>Service Fee</span>
                         <span className="font-semibold">$99.00</span>
                       </div>
                       <div className="pt-3 border-t border-slate-200 flex justify-between text-slate-900 font-black text-lg">
                         <span>Total to Book</span>
                         <span className="text-primary">${(warehouse.price + extendedData.deposit + 99).toLocaleString()}</span>
                       </div>
                    </div>
                  </div>

                  <Button className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/30 rounded-2xl group">
                    Instant Deposit <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </motion.div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default WarehouseDetailPage
