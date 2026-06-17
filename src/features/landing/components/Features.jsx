import { motion } from 'framer-motion'
import { Shield, Zap, LayoutDashboard, Database, Globe, Layers } from 'lucide-react'

const features = [
  {
    title: 'Smart Marketplace',
    description:
      'Find and book premium warehouse spaces with transparent pricing and flexible terms.',
    icon: Globe,
    color: 'text-blue-500',
  },
  {
    title: 'Real-time WMS',
    description:
      'Advanced Warehouse Management System with inventory tracking and staff coordination.',
    icon: LayoutDashboard,
    color: 'text-primary',
  },
  {
    title: 'Automated Billing',
    description:
      'Seamless payment processing and automated billing for long-term rentals and services.',
    icon: Zap,
    color: 'text-yellow-500',
  },
  {
    title: 'Secure Operations',
    description:
      'Enterprise-grade security with role-based access control and detailed activity logs.',
    icon: Shield,
    color: 'text-success',
  },
  {
    title: 'Inventory Analytics',
    description:
      'Data-driven insights into your stock levels, turnover rates, and operational efficiency.',
    icon: Database,
    color: 'text-purple-500',
  },
  {
    title: 'Scalable Infrastructure',
    description:
      'Designed to grow with your business, from small startups to large enterprise logistics.',
    icon: Layers,
    color: 'text-pink-500',
  },
]

const Features = () => {
  return (
    <section id="features" className="bg-white py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="text-primary mb-2 text-base font-semibold tracking-wider uppercase">
            Features
          </h2>
          <h3 className="mb-4 text-4xl font-bold text-slate-900">
            Everything you need to manage logistics
          </h3>
          <p className="text-lg text-slate-600">
            StockSpace provides a comprehensive suite of tools for both warehouse owners and
            tenants.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group rounded-2xl border border-slate-100 bg-slate-50/50 p-8 transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/50"
            >
              <div
                className={`mb-6 inline-flex rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200 ${feature.color}`}
              >
                <feature.icon className="h-6 w-6" />
              </div>
              <h4 className="mb-3 text-xl font-bold text-slate-900">{feature.title}</h4>
              <p className="leading-relaxed text-slate-600">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

const Stats = () => {
  return (
    <section className="bg-slate-900 py-20 text-white">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {[
            { label: 'Warehouses', value: '1,200+' },
            { label: 'Storage Space', value: '5M+ sqft' },
            { label: 'Active Tenants', value: '8,500+' },
            { label: 'Monthly Orders', value: '450k+' },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-primary mb-2 text-4xl font-bold md:text-5xl">{stat.value}</div>
              <div className="text-sm font-medium tracking-widest text-slate-400 uppercase">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export { Features, Stats }
