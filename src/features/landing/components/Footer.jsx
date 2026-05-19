import { motion } from 'framer-motion'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import Button from '@/components/atoms/Button'

const HowItWorks = () => {
  const steps = [
    {
      title: 'Find Space',
      description: 'Search our global network of warehouses and filter by location, size, and specific capabilities.',
    },
    {
      title: 'Book Instantly',
      description: 'Reserve your space with a few clicks. Our smart contracts handle the leasing and deposit details.',
    },
    {
      title: 'Manage Inventory',
      description: 'Use our integrated WMS to track stock, manage inbound/outbound shipments, and staff operations.',
    },
    {
      title: 'Scale Up',
      description: 'Easily expand your storage needs as your business grows without long-term commitments.',
    },
  ]

  return (
    <section className="py-24 bg-slate-50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-base font-semibold text-primary mb-2 uppercase tracking-wider">Process</h2>
            <h3 className="text-4xl font-bold text-slate-900 mb-6">Simple steps to logistics excellence</h3>
            <div className="space-y-8 mt-10">
              {steps.map((step, index) => (
                <motion.div 
                  key={index} 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex gap-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900 mb-1">{step.title}</h4>
                    <p className="text-slate-600">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square rounded-3xl bg-slate-200 overflow-hidden shadow-2xl border-8 border-white">
              {/* This would be a dashboard preview image */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center p-12">
                 <div className="w-full h-full rounded-xl bg-white shadow-lg p-6 flex flex-col gap-4">
                    <div className="h-4 w-1/3 bg-slate-100 rounded" />
                    <div className="grid grid-cols-3 gap-4">
                       <div className="h-20 bg-slate-50 rounded border border-slate-100" />
                       <div className="h-20 bg-slate-50 rounded border border-slate-100" />
                       <div className="h-20 bg-slate-50 rounded border border-slate-100" />
                    </div>
                    <div className="flex-1 bg-slate-50 rounded border border-slate-100 flex items-center justify-center text-slate-300">
                       [ Dashboard Preview Mockup ]
                    </div>
                 </div>
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 p-6 rounded-2xl bg-white shadow-xl border border-slate-100 max-w-[240px]">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-2 w-2 rounded-full bg-success" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Inventory</span>
              </div>
              <p className="text-sm font-semibold text-slate-900">1,240 Units Tracked</p>
              <div className="mt-4 h-1 w-full bg-slate-100 rounded">
                <div className="h-1 w-3/4 bg-success rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const CTA = () => {
  return (
    <section className="py-24 bg-primary relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-white/10 -skew-x-12 translate-x-1/2" />
      </div>
      <div className="container relative z-10 mx-auto px-4 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Ready to optimize your supply chain?</h2>
        <p className="text-xl text-white/80 max-w-2xl mx-auto mb-10">
          Join thousands of businesses who are scaling their operations with StockSpace's intelligent warehouse marketplace.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-white text-primary hover:bg-slate-100">
            Get Started Now
          </Button>
          <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
            Contact Sales
          </Button>
        </div>
      </div>
    </section>
  )
}

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 py-16 border-t border-white/5">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <span className="text-xl font-bold text-white">StockSpace</span>
            </div>
            <p className="max-w-xs mb-6">
              The world's leading warehouse marketplace and management platform for modern logistics.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Platform</h4>
            <ul className="space-y-4 text-sm">
              <li><a href="#" className="hover:text-primary">Marketplace</a></li>
              <li><a href="#" className="hover:text-primary">Inventory WMS</a></li>
              <li><a href="#" className="hover:text-primary">Global Search</a></li>
              <li><a href="#" className="hover:text-primary">Staff Management</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Company</h4>
            <ul className="space-y-4 text-sm">
              <li><a href="#" className="hover:text-primary">About Us</a></li>
              <li><a href="#" className="hover:text-primary">Careers</a></li>
              <li><a href="#" className="hover:text-primary">Newsroom</a></li>
              <li><a href="#" className="hover:text-primary">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Resources</h4>
            <ul className="space-y-4 text-sm">
              <li><a href="#" className="hover:text-primary">Documentation</a></li>
              <li><a href="#" className="hover:text-primary">API Reference</a></li>
              <li><a href="#" className="hover:text-primary">Help Center</a></li>
              <li><a href="#" className="hover:text-primary">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <p>© 2026 StockSpace Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white">Twitter</a>
            <a href="#" className="hover:text-white">LinkedIn</a>
            <a href="#" className="hover:text-white">Github</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export { HowItWorks, CTA, Footer }
