import { motion } from 'framer-motion'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import Button from '@/components/atoms/Button'

const HowItWorks = () => {
  const steps = [
    {
      title: 'Find Space',
      description:
        'Search our global network of warehouses and filter by location, size, and specific capabilities.',
    },
    {
      title: 'Book Instantly',
      description:
        'Reserve your space with a few clicks. Our smart contracts handle the leasing and deposit details.',
    },
    {
      title: 'Manage Inventory',
      description:
        'Use our integrated WMS to track stock, manage inbound/outbound shipments, and staff operations.',
    },
    {
      title: 'Scale Up',
      description:
        'Easily expand your storage needs as your business grows without long-term commitments.',
    },
  ]

  return (
    <section className="bg-slate-50 py-24">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <div>
            <h2 className="text-primary mb-2 text-base font-semibold tracking-wider uppercase">
              Process
            </h2>
            <h3 className="mb-6 text-4xl font-bold text-slate-900">
              Simple steps to logistics excellence
            </h3>
            <div className="mt-10 space-y-8">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex gap-4"
                >
                  <div className="bg-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="mb-1 text-lg font-bold text-slate-900">{step.title}</h4>
                    <p className="text-slate-600">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square overflow-hidden rounded-3xl border-8 border-white bg-slate-200 shadow-2xl">
              {/* This would be a dashboard preview image */}
              <div className="from-primary/20 absolute inset-0 flex items-center justify-center bg-gradient-to-br to-blue-500/20 p-12">
                <div className="flex h-full w-full flex-col gap-4 rounded-xl bg-white p-6 shadow-lg">
                  <div className="h-4 w-1/3 rounded bg-slate-100" />
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-20 rounded border border-slate-100 bg-slate-50" />
                    <div className="h-20 rounded border border-slate-100 bg-slate-50" />
                    <div className="h-20 rounded border border-slate-100 bg-slate-50" />
                  </div>
                  <div className="flex flex-1 items-center justify-center rounded border border-slate-100 bg-slate-50 text-slate-300">
                    [ Dashboard Preview Mockup ]
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -right-6 -bottom-6 max-w-[240px] rounded-2xl border border-slate-100 bg-white p-6 shadow-xl">
              <div className="mb-2 flex items-center gap-3">
                <div className="bg-success h-2 w-2 rounded-full" />
                <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                  Live Inventory
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-900">1,240 Units Tracked</p>
              <div className="mt-4 h-1 w-full rounded bg-slate-100">
                <div className="bg-success h-1 w-3/4 rounded" />
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
    <section className="bg-primary relative overflow-hidden py-24">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 h-full w-1/2 translate-x-1/2 -skew-x-12 bg-white/10" />
      </div>
      <div className="relative z-10 container mx-auto px-4 text-center">
        <h2 className="mb-6 text-4xl font-bold text-white md:text-5xl">
          Ready to optimize your supply chain?
        </h2>
        <p className="mx-auto mb-10 max-w-2xl text-xl text-white/80">
          Join thousands of businesses who are scaling their operations with StockSpace's
          intelligent warehouse marketplace.
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Button size="lg" className="text-primary bg-white hover:bg-slate-100">
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
    <footer className="border-t border-white/5 bg-slate-900 py-16 text-slate-400">
      <div className="container mx-auto px-4">
        <div className="mb-12 grid grid-cols-2 gap-12 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2">
            <div className="mb-6 flex items-center gap-2">
              <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg">
                <span className="text-xl font-bold text-white">S</span>
              </div>
              <span className="text-xl font-bold text-white">StockSpace</span>
            </div>
            <p className="mb-6 max-w-xs">
              The world's leading warehouse marketplace and management platform for modern
              logistics.
            </p>
          </div>
          <div>
            <h4 className="mb-6 font-bold text-white">Platform</h4>
            <ul className="space-y-4 text-sm">
              <li>
                <a href="#" className="hover:text-primary">
                  Marketplace
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary">
                  Inventory WMS
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary">
                  Global Search
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary">
                  Staff Management
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-6 font-bold text-white">Company</h4>
            <ul className="space-y-4 text-sm">
              <li>
                <a href="#" className="hover:text-primary">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary">
                  Careers
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary">
                  Newsroom
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary">
                  Contact
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-6 font-bold text-white">Resources</h4>
            <ul className="space-y-4 text-sm">
              <li>
                <a href="#" className="hover:text-primary">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary">
                  API Reference
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-xs md:flex-row">
          <p>© 2026 StockSpace Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white">
              Twitter
            </a>
            <a href="#" className="hover:text-white">
              LinkedIn
            </a>
            <a href="#" className="hover:text-white">
              Github
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export { HowItWorks, CTA, Footer }
