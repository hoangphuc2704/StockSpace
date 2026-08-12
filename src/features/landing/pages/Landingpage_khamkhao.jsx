import { useEffect, useState } from 'react'
import {
  Clock,
  Warehouse,
  Boxes,
  Truck,
  MapPin,
  ArrowUpRight,
  ArrowRight,
  Phone,
  Mail,
  Facebook,
  Youtube,
  Instagram,
} from 'lucide-react'

import { Link } from 'react-router-dom'
import PublicHeader from '../../../components/PublicHeader'
import BackToTop from '../../../components/BackToTop.jsx'
import warehouseApi from '../../../services/warehouse/warehouseApi'

const SERVICES = [
  {
    icon: Clock,
    title: 'Short Term Warehouse Rental',
    desc: "Flexible seasonal storage solution, optimizing short-term usage area customized to the business's goods flow.",
  },
  {
    icon: ProjectManagementIcon,
    title: 'Long-term Warehouse Rental',
    desc: 'Solid warehouse infrastructure system, large area with commitment to safe, long-term stable operation and preferential cost policies.',
  },
  {
    icon: Warehouse,
    title: 'Inventory Management',
    desc: 'Control quantity, locate and closely monitor the packaging status of goods with absolute accuracy thanks to the automation process.',
  },
  {
    icon: Boxes,
    title: 'Import and Export of Goods',
    desc: 'High-speed loading, unloading, detailed classification and order fulfillment services, helping to accelerate operational efficiency throughout the supply chain.',
  },
  {
    icon: Truck,
    title: 'Realtime Inventory Report',
    desc: 'The system updates data streams instantly in real time, supporting administrators in making quick re-import decisions.',
  },
]

function ProjectManagementIcon() {
  return (
    <svg
      className="h-8 w-8 text-[#FF5A1F]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
      />
    </svg>
  )
}

const LandingPageKhamkhao = () => {
  const [approvedWarehouses, setApprovedWarehouses] = useState([])
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(true)

  useEffect(() => {
    const fetchApprovedWarehouses = async () => {
      try {
        setIsLoadingWarehouses(true)
        const response = await warehouseApi.getPublicWarehouses({
          page: 0,
          size: 6,
          status: 'AVAILABLE',
          sortBy: 'createdAt',
          sortDir: 'desc',
        })

        const payload = response?.data?.data
        const content = Array.isArray(payload?.content)
          ? payload.content
          : Array.isArray(payload)
            ? payload
            : []

        const normalized = content.map((item) => ({
          id: item.id,
          name: item.name || 'Warehouse',
          address: item.address || item.location || 'Updating address',
          area: Number(item.area ?? item.capacity ?? 0),
          pricePerMonth: Number(item.pricePerMonth ?? item.price ?? 0),
          type: item.warehouseType?.name || item.typeName || item.type || 'General',
          image: item.coverImageUrl || item.thumbnail || item.imageUrls?.[0] || '',
          isVerified: item.isVerified ?? item.verified ?? false,
        }))

        setApprovedWarehouses(normalized)
      } catch {
        setApprovedWarehouses([])
      } finally {
        setIsLoadingWarehouses(false)
      }
    }

    fetchApprovedWarehouses()
  }, [])

  return (
    <div className="min-h-screen bg-white font-sans text-stone-900 antialiased selection:bg-[#FF5A1F] selection:text-white">
      <PublicHeader />

      {/* --- SERVICES SECTION --- */}
      <section id="services" className="bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto mb-20 max-w-3xl space-y-4 text-center">
            <h2 className="text-5xl font-extrabold tracking-tight text-stone-900 uppercase sm:text-6xl">
              Core services
            </h2>
            <p className="mx-auto max-w-xl text-sm leading-relaxed font-medium text-stone-500">
              Smart space. Lean management. Comprehensive storage system solves the problem to solve
              the problem of post-hire logistics operations for your business.
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <a
                href="#quote"
                className="rounded-md bg-[#FF5A1F] px-6 py-3 text-xs font-bold tracking-wider text-white uppercase hover:bg-[#e04e19]"
              >
                Get a quote now
              </a>
              <a
                href="#learn"
                className="rounded-md border border-stone-300 bg-white px-6 py-3 text-xs font-bold tracking-wider text-stone-800 uppercase hover:bg-stone-50"
              >
                Learn more
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((srv, idx) => {
              const IconComp = srv.icon
              const getGridSpacing = (index) => {
                if (index === 0) return 'lg:mt-0'
                if (index === 1) return 'lg:mt-12'
                if (index === 2) return 'lg:mt-24'
                if (index === 3) return 'lg:-mt-12'
                return 'lg:mt-0'
              }

              return (
                <div
                  key={idx}
                  className={`border border-stone-200 bg-white p-8 text-left transition-all hover:shadow-xl ${getGridSpacing(idx)}`}
                >
                  <div className="mb-6 inline-block rounded-sm bg-stone-50 p-3 text-[#FF5A1F]">
                    <IconComp size={32} strokeWidth={1.2} />
                  </div>
                  <h3 className="mb-3 text-xl font-bold tracking-tight text-stone-950">
                    {srv.title}
                  </h3>
                  <p className="mb-6 text-xs leading-relaxed text-stone-500">{srv.desc}</p>
                  <a
                    href="#details"
                    className="inline-flex items-center gap-2 text-xs font-bold tracking-wider text-stone-950 uppercase hover:text-[#FF5A1F]"
                  >
                    <span className="flex h-4 w-4 items-center justify-center bg-stone-950 text-[10px] text-white">
                      ➔
                    </span>
                    See details
                  </a>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="approved-warehouses" className="bg-[#faf7f4] py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs font-bold tracking-[0.25em] text-[#FF5A1F] uppercase">
                Warehouse has been approved
              </p>
              <h2 className="text-4xl font-extrabold tracking-tight text-stone-900 uppercase sm:text-5xl">
                View admin-approved repositories
              </h2>
              <p className="text-sm leading-relaxed font-medium text-stone-500">
                This list only displays warehouses that have passed verification and approval from
                the system administration.
              </p>
            </div>

            <Link
              to="/warehouses"
              className="inline-flex items-center gap-2 self-start rounded-md border border-stone-300 bg-white px-5 py-3 text-xs font-bold tracking-wider text-stone-900 uppercase transition-all hover:border-[#FF5A1F] hover:text-[#FF5A1F]"
            >
              View all warehouses
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {isLoadingWarehouses
              ? Array.from({ length: 3 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="overflow-hidden rounded-3xl border border-stone-200 bg-white"
                  >
                    <div className="h-56 animate-pulse bg-stone-100" />
                    <div className="space-y-4 p-6">
                      <div className="h-6 w-2/3 animate-pulse rounded bg-stone-100" />
                      <div className="h-4 w-1/2 animate-pulse rounded bg-stone-100" />
                      <div className="h-10 animate-pulse rounded bg-stone-100" />
                    </div>
                  </div>
                ))
              : approvedWarehouses.map((warehouse) => (
                  <Link
                    key={warehouse.id}
                    to={`/warehouse/${warehouse.id}`}
                    className="group block overflow-hidden rounded-3xl border border-stone-200 bg-white transition-all hover:-translate-y-1 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    <div className="relative h-56 overflow-hidden bg-stone-100">
                      {warehouse.image ? (
                        <img
                          src={warehouse.image}
                          alt={warehouse.name}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-stone-400">
                          <Warehouse size={42} />
                        </div>
                      )}
                      {warehouse.isVerified ? (
                        <div className="absolute top-4 left-4 rounded-full bg-emerald-500/90 px-3 py-1 text-[11px] font-bold tracking-wider text-white uppercase">
                          Verified
                        </div>
                      ) : (
                        <div className="absolute top-4 left-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold tracking-wider text-[#0f084b] uppercase">
                          Approved
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 p-6">
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold tracking-tight text-stone-900">
                          {warehouse.name}
                        </h3>
                        <p className="flex items-center gap-2 text-sm text-stone-500">
                          <MapPin size={15} className="text-[#FF5A1F]" />
                          {warehouse.address}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 rounded-2xl bg-stone-50 p-4 text-sm">
                        <div>
                          <p className="text-[11px] font-bold tracking-wider text-stone-400 uppercase">
                            Area
                          </p>
                          <p className="mt-1 font-bold text-stone-900">
                            {warehouse.area.toLocaleString('en-US')} m²
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold tracking-wider text-stone-400 uppercase">
                            Warehouse type
                          </p>
                          <p className="mt-1 font-bold text-stone-900">{warehouse.type}</p>
                        </div>
                      </div>

                      <div className="flex items-end justify-between gap-4 border-t border-stone-100 pt-4">
                        <div>
                          <p className="text-[11px] font-bold tracking-wider text-stone-400 uppercase">
                            Price/month
                          </p>
                          <p className="mt-1 text-xl font-extrabold text-[#FF5A1F]">
                            {warehouse.pricePerMonth.toLocaleString('en-US')} d
                          </p>
                        </div>

                        <span className="inline-flex items-center gap-2 rounded-md bg-stone-900 px-4 py-2.5 text-xs font-bold tracking-wider text-white uppercase transition-all group-hover:bg-[#FF5A1F]">
                          See details
                          <ArrowRight size={14} />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
          </div>

          {!isLoadingWarehouses && approvedWarehouses.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center text-sm text-stone-500">
              There are currently no warehouses available for rent.
            </div>
          ) : null}
        </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section className="relative overflow-hidden bg-[#F4F4F4] py-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-12 lg:px-8">
          <div className="z-10 space-y-6 text-left lg:col-span-7">
            <h2 className="text-4xl leading-tight font-extrabold tracking-tight text-stone-900 uppercase sm:text-5xl">
              Ready for a breakthrough?
              <br />
              Optimize warehouse operations today.
            </h2>
            <p className="max-w-xl text-xs leading-relaxed font-medium text-stone-500">
              High standard site handover combined with implementation of a digital asset management
              system instant. We don't just rent space, we accompany the growth your chief.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <a
                href="#cta-quote"
                className="rounded-md bg-[#FF5A1F] px-6 py-3 text-xs font-bold tracking-wider text-white uppercase hover:bg-[#e04e19]"
              >
                Ask for advice
              </a>
              <a
                href="#services"
                className="rounded-md border border-stone-300 bg-transparent px-6 py-3 text-xs font-bold tracking-wider text-stone-800 uppercase hover:bg-stone-100"
              >
                See all services
              </a>
            </div>
          </div>

          <div className="relative flex h-64 w-full items-center justify-center overflow-hidden lg:col-span-5 lg:h-96">
            <div className="absolute inset-0 bg-[#FF5A1F]/10 opacity-90 mix-blend-multiply" />
            <svg
              className="h-full w-full stroke-[1] text-[#FF5A1F]/40"
              viewBox="0 0 100 100"
              fill="none"
            >
              <path
                d="M0,10 L100,90 M0,90 L100,10 M10,0 L10,100 M90,0 L90,100 M0,50 L100,50"
                stroke="currentColor"
              />
              <path d="M30,0 L30,100 M70,0 L70,100" stroke="currentColor" strokeDasharray="2,2" />
            </svg>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-[#121212] pt-16 pb-12 text-left text-stone-400">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 border-b border-stone-800 pb-16 sm:grid-cols-2 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-4">
              <div className="flex items-center gap-2 text-white">
                <span className="text-xl font-black tracking-wider uppercase">
                  <span className="text-white">Stock</span>{' '}
                  <span className="text-[#FF5A1F]">Space</span>
                </span>
              </div>
              <p className="max-w-sm text-xs leading-relaxed text-stone-500">
                Storage infrastructure solution that integrates a smart digital system, completely
                solving the problem The problem of storing and controlling inventory data after
                signing a lease contract.
              </p>
              <div className="flex gap-3 pt-2">
                {[Facebook, Youtube, Instagram].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-900 text-white transition-colors hover:bg-[#FF5A1F]"
                  >
                    <Icon size={14} />
                  </a>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2">
              <h4 className="mb-4 text-xs font-bold tracking-wider text-white uppercase">Menu</h4>
              <ul className="space-y-2.5 text-xs">
                {['Home page', 'About us', 'Warehouse service', 'Price list'].map((link) => (
                  <li key={link}>
                    <a href="#" className="transition-colors hover:text-white">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-2">
              <h4 className="mb-4 text-xs font-bold tracking-wider text-white uppercase">
                Support
              </h4>
              <ul className="space-y-2.5 text-xs">
                {[
                  'Terms of use',
                  'Privacy policy',
                  '24/7 help',
                  'API Documentation',
                  'Operating procedures',
                ].map((link) => (
                  <li key={link}>
                    <a href="#" className="transition-colors hover:text-white">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4 lg:col-span-4">
              <h4 className="mb-4 text-xs font-bold tracking-wider text-white uppercase">
                Contact
              </h4>
              <div className="flex items-center gap-4 border border-stone-800 bg-[#1a1a1a] p-4 transition-all hover:border-stone-700">
                <div className="text-[#FF5A1F]">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-stone-500 uppercase">Care hotline</p>
                  <p className="text-xs font-bold text-white">123456789</p>
                </div>
              </div>
              <div className="flex items-center gap-4 border border-stone-800 bg-[#1a1a1a] p-4 transition-all hover:border-stone-700">
                <div className="text-[#FF5A1F]">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-stone-500 uppercase">Email box</p>
                  <p className="text-xs font-bold text-white">cuongbui10704@gmail.com</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between pt-8 text-[11px] text-stone-600 sm:flex-row">
            <p>© {new Date().getFullYear()} StockSpace. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <BackToTop />
    </div>
  )
}

export default LandingPageKhamkhao
