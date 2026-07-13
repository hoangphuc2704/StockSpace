import { MapPin, Maximize2, Shield, Clock, Star, CheckCircle2, Truck } from 'lucide-react'
import Badge from '@/components/atoms/Badge'
import Avatar from '@/components/atoms/Avatar'
import Button from '@/components/atoms/Button'

const WarehouseInfo = ({ warehouse, extendedData }) => {
  return (
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
  )
}

export default WarehouseInfo
