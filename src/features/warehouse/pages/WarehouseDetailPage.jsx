import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  MapPin,
  Maximize2,
  Shield,
  Clock,
  Star,
  CheckCircle2,
  ChevronRight,
  Share2,
  Heart,
  Truck,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react'
import { motion } from 'framer-motion'
import Button from '@/components/atoms/Button'
import Badge from '@/components/atoms/Badge'
import Avatar from '@/components/atoms/Avatar'
import warehouseApi from '@/services/warehouse/warehouseApi'

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
  description: warehouse.description || 'Warehouse information is being updated.',
  isVerified: warehouse.isVerified ?? warehouse.verified ?? false,
  imageUrls: warehouse.imageUrls || [],
  ownerName: warehouse.ownerName || 'Warehouse Owner',
})

const buildGallery = (warehouse) => {
  const images = [
    warehouse.thumbnail,
    ...(Array.isArray(warehouse.imageUrls) ? warehouse.imageUrls : []),
  ].filter(Boolean)

  if (images.length === 0) {
    return [
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1493946740644-2d8a1f1a6afd?auto=format&fit=crop&q=80&w=600',
    ]
  }

  while (images.length < 5) {
    images.push(images[images.length - 1])
  }

  return images.slice(0, 5)
}

const WarehouseDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [warehouse, setWarehouse] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchWarehouse = async () => {
      try {
        setIsLoading(true)
        setError('')

        const response = await warehouseApi.getPublicWarehouseById(id)
        const payload = response?.data?.data || response?.data
        const normalized = normalizeWarehouse(payload || {})

        if (!normalized.id || normalized.isVerified !== true) {
          setWarehouse(null)
          setError('Warehouse not found or has not been approved yet.')
          return
        }

        setWarehouse(normalized)
      } catch (err) {
        setWarehouse(null)
        setError(err.response?.data?.message || err.message || 'Unable to load warehouse.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchWarehouse()
  }, [id])

  const gallery = useMemo(() => buildGallery(warehouse || {}), [warehouse])

  const extendedData = useMemo(() => {
    if (!warehouse) return null

    return {
      deposit: warehouse.price * 2,
      images: gallery,
      features: [
        `${warehouse.type} storage`,
        'Admin-approved listing',
        'Flexible warehouse operations',
        '24/7 monitoring support',
        'Loading and inbound handling',
        'Business-ready storage space',
      ],
      owner: {
        name: warehouse.ownerName,
        company: 'StockSpace Partner',
        rating: warehouse.rating,
        since: '2024',
        verified: warehouse.isVerified,
      },
      reviews: Math.max(12, Math.round(warehouse.rating * 20)),
    }
  }, [gallery, warehouse])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold">Loading warehouse...</h2>
          <p className="text-slate-500">Please wait while we fetch the approved listing.</p>
        </div>
      </div>
    )
  }

  if (!warehouse || !extendedData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold">Warehouse not found</h2>
          <p className="mb-6 text-slate-500">{error || 'This warehouse is unavailable right now.'}</p>
          <Button onClick={() => navigate('/warehouses')}>Back to Listings</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="pb-20 pt-24">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Link to="/warehouses" className="flex items-center gap-1 transition-colors hover:text-primary">
                <ArrowLeft size={14} /> Back to Search
              </Link>
              <span className="text-slate-300">|</span>
              <span className="font-medium text-slate-900">{warehouse.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50">
                <Share2 size={16} /> Share
              </button>
              <button
                onClick={() => setIsBookmarked(!isBookmarked)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
                  isBookmarked
                    ? 'border-danger bg-danger/5 text-danger'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Heart size={16} fill={isBookmarked ? 'currentColor' : 'none'} />{' '}
                {isBookmarked ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>

          <div className="mb-10 grid h-[500px] grid-cols-1 gap-3 md:grid-cols-4 md:grid-rows-2">
            <div className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-100 md:col-span-2 md:row-span-2">
              <img
                src={extendedData.images[0]}
                alt="Main"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-100">
              <img
                src={extendedData.images[1]}
                alt="Interior 1"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-100">
              <img
                src={extendedData.images[2]}
                alt="Interior 2"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-100">
              <img
                src={extendedData.images[3]}
                alt="Exterior"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-100">
              <img
                src={extendedData.images[4]}
                alt="Loading"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="flex items-center gap-2 font-bold text-white">
                  View All Photos <ChevronRight size={18} />
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-12 lg:flex-row">
            <div className="flex-1 space-y-12">
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <Badge variant="success">Verified Listing</Badge>
                  <Badge variant="primary" className="border-none bg-primary/10 text-primary">
                    {warehouse.type}
                  </Badge>
                </div>
                <h1 className="mb-4 text-4xl font-black tracking-tight text-slate-900">
                  {warehouse.name}
                </h1>
                <div className="flex items-center gap-6 text-slate-500">
                  <div className="flex items-center gap-1.5 font-medium">
                    <MapPin size={18} className="text-primary" />
                    <span>{warehouse.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-warning/5 px-3 py-1 font-bold text-warning">
                    <Star size={16} className="fill-current" />
                    <span>
                      {warehouse.rating} ({extendedData.reviews} reviews)
                    </span>
                  </div>
                </div>

                <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
                  {[
                    { icon: Maximize2, label: 'Area', value: `${warehouse.area.toLocaleString()} m²` },
                    { icon: Shield, label: 'Security', value: '24/7 Monitoring' },
                    { icon: Clock, label: 'Access', value: 'Anytime' },
                    { icon: Truck, label: 'Loading', value: 'Supported' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-primary">
                        <item.icon size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {item.label}
                        </p>
                        <p className="text-sm font-bold text-slate-900">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <hr className="border-slate-100" />

              <section>
                <h3 className="mb-6 text-xl font-bold text-slate-900">Hosted by</h3>
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-6">
                  <div className="flex items-center gap-4">
                    <Avatar
                      alt={extendedData.owner.name}
                      size="lg"
                      className="border-2 border-white shadow-sm"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-bold text-slate-900">{extendedData.owner.name}</p>
                        {extendedData.owner.verified && (
                          <CheckCircle2 size={16} className="text-success" />
                        )}
                      </div>
                      <p className="text-sm text-slate-500">
                        {extendedData.owner.company} • Member since {extendedData.owner.since}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="bg-white">
                    Contact Owner
                  </Button>
                </div>
              </section>

              <section className="space-y-6">
                <h3 className="text-xl font-bold text-slate-900">About this space</h3>
                <p className="text-lg leading-relaxed text-slate-600">{warehouse.description}</p>

                <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
                  {extendedData.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-3 font-medium text-slate-700">
                      <CheckCircle2 size={18} className="shrink-0 text-primary" />
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
                  className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/50"
                >
                  <div className="absolute -mr-16 -mt-16 h-32 w-32 rounded-full bg-primary/5" />

                  <div className="relative z-10 mb-8 flex items-end justify-between">
                    <div>
                      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                        Rental Price
                      </p>
                      <span className="text-3xl font-black text-primary">
                        ${warehouse.price.toLocaleString()}
                      </span>
                      <span className="font-medium text-slate-500"> / mo</span>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 font-bold text-warning">
                        <Star size={14} className="fill-current" />
                        <span>{warehouse.rating}</span>
                      </div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        {extendedData.reviews} reviews
                      </p>
                    </div>
                  </div>

                  <div className="relative z-10 mb-8 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Start Date</label>
                        <input type="date" className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Duration</label>
                        <select className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
                          <option>3 months</option>
                          <option>6 months</option>
                          <option>12 months</option>
                          <option>24 months</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Required Area (m²)</label>
                      <input
                        type="number"
                        defaultValue={warehouse.area}
                        className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm"
                      />
                    </div>
                  </div>

                  <div className="relative z-10 mb-8 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                    <div className="mb-3 flex items-center gap-2 font-bold text-slate-900">
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
                      <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-black text-slate-900">
                        <span>Total to Book</span>
                        <span className="text-primary">
                          ${(warehouse.price + extendedData.deposit + 99).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button className="group h-14 w-full rounded-2xl text-lg font-bold shadow-xl shadow-primary/30">
                    Instant Deposit
                  </Button>
                </motion.div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  )
}

export default WarehouseDetailPage
