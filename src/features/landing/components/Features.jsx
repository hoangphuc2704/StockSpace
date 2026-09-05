import { Database, Globe, Layers, LayoutDashboard, Shield, Zap } from 'lucide-react'

const features = [
  {
    title: 'Warehouse marketplace',
    description: 'Discover approved warehouse capacity with consistent listing information.',
    icon: Globe,
  },
  {
    title: 'Operational WMS',
    description: 'Coordinate inventory, warehouse locations, and daily operating tasks.',
    icon: LayoutDashboard,
  },
  {
    title: 'Billing visibility',
    description: 'Keep rental and service-related financial activity in one workspace.',
    icon: Zap,
  },
  {
    title: 'Controlled access',
    description: 'Use role-based access to keep warehouse operations accountable.',
    icon: Shield,
  },
  {
    title: 'Inventory records',
    description: 'Maintain clear records for stock levels and movement history.',
    icon: Database,
  },
  {
    title: 'Scalable workflows',
    description: 'Support teams as warehouse operations grow in scope and complexity.',
    icon: Layers,
  },
]

const Features = () => (
  <section id="features" className="border-y border-slate-200 bg-white py-10 lg:py-14">
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase">
            Platform capabilities
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            Built for practical warehouse operations
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-600">
          Core tools for finding, renting, and managing warehouse operations without unnecessary
          complexity.
        </p>
      </div>
      <div className="grid gap-px border border-slate-200 bg-slate-200 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon
          return (
            <article key={feature.title} className="bg-white p-5">
              <Icon className="h-5 w-5 text-blue-700" aria-hidden="true" />
              <h3 className="mt-4 text-base font-semibold text-slate-950">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
            </article>
          )
        })}
      </div>
    </div>
  </section>
)

const Stats = () => (
  <section className="border-y border-slate-700 bg-slate-900 py-8 text-white">
    <div className="mx-auto grid max-w-[1400px] gap-px px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
      {[
        ['Kho đã phê duyệt', 'Dữ liệu niêm yết rõ ràng để doanh nghiệp đánh giá.'],
        ['Hợp đồng số', 'Theo dõi thỏa thuận thuê trong cùng hệ thống.'],
        ['Quy trình kho', 'Ghi nhận các tác vụ vận hành theo vai trò.'],
        ['Quyền truy cập', 'Phân quyền theo vai trò trong hoạt động kho.'],
      ].map(([title, description]) => (
        <div key={title} className="border border-slate-700 px-4 py-4">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-sm leading-5 text-slate-300">{description}</p>
        </div>
      ))}
    </div>
  </section>
)

export { Features, Stats }
