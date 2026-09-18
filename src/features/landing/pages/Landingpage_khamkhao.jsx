import { useEffect, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  FileText,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Warehouse,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import PublicHeader from '../../../components/PublicHeader'
import BackToTop from '../../../components/BackToTop.jsx'
import warehouseApi from '../../../services/warehouse/warehouseApi'
import PublicFooter from '../../../components/PublicFooter'
import warehouseInterior from '@/assets/image.png'
import { formatWarehousePricePerSquareMeter } from '@/utils/warehousePricing'
import { useLanguage } from '@/i18n/LanguageContext'

const JOURNEY = [
  {
    step: '01',
    titleKey: 'Find a warehouse',
    descKey: 'Explore approved warehouses matching your storage needs.',
  },
  {
    step: '02',
    titleKey: 'Rent warehouse',
    descKey: 'Review warehouse information and complete the lease process in the system.',
  },
  {
    step: '03',
    titleKey: 'Manage contracts',
    descKey: 'Track rental agreements and important lease milestones.',
  },
  {
    step: '04',
    titleKey: 'Operations',
    descKey: 'Manage goods and warehouse activities based on assigned roles.',
  },
]

const WMS_CAPABILITIES = [
  { icon: Boxes, titleKey: 'Inventory', descKey: 'Track SKUs and storage locations.' },
  { icon: Warehouse, titleKey: 'Warehouse layout', descKey: 'Work with zones, racks, and bins.' },
  { icon: PackageCheck, titleKey: 'Inbound & Outbound', descKey: 'Manage goods flow based on assigned tasks.' },
  {
    icon: ClipboardList,
    titleKey: 'Contracts',
    descKey: 'Track lease records within the same platform.',
  },
]

const HIGHLIGHTS = [
  {
    titleKey: 'Verified listings',
    descKey: 'Warehouse information is reviewed and verified before display.',
  },
  {
    titleKey: 'Transparent information',
    descKey: 'Area, warehouse type, location, and rental price are clearly presented.',
  },
  {
    titleKey: 'Centralized management',
    descKey: 'Track contracts and manage warehouse operations on the same platform.',
  },
]

const formatWarehouseStatus = (status, t) => {
  if (status === 'AVAILABLE') return t ? t('Available') : 'Available'
  if (status === 'PENDING_APPROVAL') return t ? t('Pending approval') : 'Pending approval'
  if (status === 'INACTIVE') return t ? t('Inactive') : 'Inactive'
  return t ? t('Updating') : 'Updating'
}

const formatWarehousePricingType = (pricingType, t) => {
  if (pricingType === 'FIXED_MONTHLY') return t ? t('Monthly') : 'Monthly'
  if (pricingType === 'NEGOTIATED') return t ? t('Negotiated') : 'Negotiated'
  return t ? t('Per m² / month') : 'Per m² / month'
}

const formatWarehouseType = (type, language, t) => {
  if (!type) return language === 'vi' ? 'Kho thường' : 'Standard warehouse'
  const viToEn = {
    'Kho thường': 'Standard warehouse',
    'Kho lạnh': 'Cold storage',
    'Kho ngoại quan': 'Bonded warehouse',
    'Kho mát': 'Cool storage',
    'Kho ngoài trời': 'Outdoor storage',
  }
  if (language === 'en' && viToEn[type]) return viToEn[type]
  return t ? t(type) : type
}

const normalizeWarehouse = (item) => ({
  id: item.id,
  name: item.name || 'Warehouse',
  address: item.address || item.location || 'Address updating',
  area: Number(item.area ?? item.capacity ?? 0),
  rentalPrice:
    item.rentalPrice == null && item.price == null && item.pricePerMonth == null
      ? null
      : Number(item.rentalPrice ?? item.price ?? item.pricePerMonth),
  rentalPricingType: item.rentalPricingType || 'PER_SQUARE_METER_MONTHLY',
  type: item.warehouseType?.name || item.typeName || item.type || 'Standard warehouse',
  status: item.status || 'AVAILABLE',
  image: item.coverImageUrl || item.thumbnail || item.imageUrls?.[0] || '',
  isVerified: item.isVerified ?? item.verified ?? false,
})

const ListingPreviewCard = ({ warehouse }) => {
  const { language, t } = useLanguage()

  return (
    <Link
      to={`/warehouse/${warehouse.id}`}
      className="group flex h-full flex-col overflow-hidden border border-slate-300 bg-white transition-colors hover:border-slate-500 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <div className="flex items-center justify-end gap-3 border-b border-slate-200 px-4 py-3 font-mono text-[10px] font-bold tracking-[0.08em] text-slate-900 uppercase">
        <span className="shrink-0 border border-sky-200 bg-sky-50 px-2 py-1 text-[9px] text-sky-800">
          {formatWarehouseType(warehouse.type, language, t)}
        </span>
      </div>

      <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
        {warehouse.image ? (
          <img
            src={warehouse.image}
            alt={warehouse.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <Warehouse className="h-8 w-8" aria-hidden="true" />
          </div>
        )}
        {warehouse.isVerified && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-slate-950 px-2 py-1 font-mono text-[10px] font-bold tracking-[0.05em] text-emerald-300 uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            {t('Field verified')}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate text-lg font-semibold tracking-tight text-slate-950 group-hover:text-[#0f084b]">
          {warehouse.name}
        </h3>
        <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-[#FF5A1F]" aria-hidden="true" />
          <span className="truncate">{t(warehouse.address)}</span>
        </p>

        <div className="mt-4 grid grid-cols-2 border border-slate-300 bg-slate-50 text-xs">
          <div className="border-r border-b border-slate-300 px-2.5 py-2">
            <p className="font-mono text-[9px] tracking-[0.08em] text-slate-500 uppercase">
              {t('Floor area')}
            </p>
            <p className="mt-1 font-mono font-bold text-slate-950 tabular-nums">
              {warehouse.area.toLocaleString('vi-VN')} m²
            </p>
          </div>
          <div className="border-b border-slate-300 px-2.5 py-2">
            <p className="font-mono text-[9px] tracking-[0.08em] text-slate-500 uppercase">
              {t('Pricing model')}
            </p>
            <p className="mt-1 truncate font-mono font-bold text-slate-950">
              {formatWarehousePricingType(warehouse.rentalPricingType, t)}
            </p>
          </div>
          <div className="border-r border-slate-300 px-2.5 py-2">
            <p className="font-mono text-[9px] tracking-[0.08em] text-slate-500 uppercase">
              {t('Status')}
            </p>
            <p className="mt-1 truncate font-mono font-bold text-slate-950">
              {formatWarehouseStatus(warehouse.status, t)}
            </p>
          </div>
          <div className="px-2.5 py-2">
            <p className="font-mono text-[9px] tracking-[0.08em] text-slate-500 uppercase">
              {t('Warehouse type')}
            </p>
            <p className="mt-1 truncate font-mono font-bold text-slate-950">
              {formatWarehouseType(warehouse.type, language, t)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-200 pt-4">
          <div className="min-w-0">
            <p className="font-mono text-[9px] tracking-[0.08em] text-slate-500 uppercase">
              {t('Reference price')}
            </p>
            <p className="mt-1 truncate font-mono text-sm font-bold text-[#FF5A1F]">
              {formatWarehousePricePerSquareMeter(warehouse, t('Negotiated'))}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 bg-slate-950 px-3 py-2 font-mono text-[10px] font-bold tracking-[0.04em] text-white uppercase transition-colors group-hover:bg-[#FF5A1F]">
            {t('View layout')} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  )
}

const LandingPageKhamkhao = () => {
  const { t } = useLanguage()
  const [approvedWarehouses, setApprovedWarehouses] = useState([])
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(true)

  useEffect(() => {
    const fetchApprovedWarehouses = async () => {
      try {
        setIsLoadingWarehouses(true)
        const response = await warehouseApi.getPublicWarehouses({
          page: 0,
          size: 6,
          sortBy: 'createdAt',
          sortDir: 'desc',
        })
        const payload = response?.data?.data
        const content = Array.isArray(payload?.content)
          ? payload.content
          : Array.isArray(payload)
            ? payload
            : []
        setApprovedWarehouses(
          content
            .filter((warehouse) => (warehouse.isVerified ?? warehouse.verified) === true)
            .map(normalizeWarehouse)
        )
      } catch {
        setApprovedWarehouses([])
      } finally {
        setIsLoadingWarehouses(false)
      }
    }

    fetchApprovedWarehouses()
  }, [])

  return (
    <div id="home" className="min-h-screen bg-[#f8f8f7] font-sans text-slate-900 antialiased">
      <PublicHeader />

      <main>
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(480px,1.1fr)] lg:items-center lg:px-8 lg:py-12">
            <div className="max-w-xl py-2 lg:py-8">
              <p className="text-xs font-semibold tracking-[0.12em] text-[#FF5A1F] uppercase">
                {t('Enterprise warehouse platform')}
              </p>
              <h1 className="mt-4 text-4xl leading-[1.08] font-bold tracking-tight text-[#0f084b] sm:text-5xl">
                {t('Find the right warehouse.')}
                <br />
                {t('Operate efficiently.')}
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
                {t(
                  'StockSpace helps businesses discover approved warehouses, track rental contracts, and continue warehouse operations on a single unified platform.'
                )}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/warehouses"
                  className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#FF5A1F] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#e04e19] focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  {t('Find warehouse now')}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex min-h-11 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#0f084b] focus-visible:outline-none"
                >
                  {t('Explore StockSpace')}
                </a>
              </div>
            </div>

            <div className="relative overflow-hidden border border-slate-200 bg-slate-100 shadow-lg shadow-slate-900/10">
              <img
                src={warehouseInterior}
                alt={t('Warehouse interior')}
                className="aspect-[16/10] h-full w-full object-cover"
              />
              <div className="absolute right-0 bottom-0 left-0 bg-[#0f084b]/90 px-5 py-4 text-white sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-[0.1em] text-orange-200 uppercase">
                    StockSpace
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {t('Discover warehouses first. Operate with control next.')}
                  </p>
                </div>
                <Warehouse className="mt-3 h-5 w-5 text-[#FF5A1F] sm:mt-0" aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-[#f8f8f7]">
          <div className="mx-auto grid max-w-[1400px] divide-y divide-slate-200 px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6 lg:px-8">
            {HIGHLIGHTS.map(({ titleKey, descKey }) => (
              <div key={titleKey} className="py-5 first:pl-0 last:pr-0 sm:px-5 sm:py-6">
                <h2 className="text-sm font-semibold text-slate-950">{t(titleKey)}</h2>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">{t(descKey)}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="approved-warehouses" className="bg-white py-12 lg:py-16">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-[#FF5A1F] uppercase">
                  {t('Verified warehouses')}
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#0f084b]">
                  {t('Storage spaces ready for business evaluation')}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  {t('Explore storage spaces tailored to your business needs.')}
                </p>
              </div>
              <Link
                to="/warehouses"
                className="inline-flex min-h-10 items-center gap-2 self-start rounded-md border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 transition-colors hover:border-[#0f084b] hover:text-[#0f084b] focus-visible:ring-2 focus-visible:ring-[#0f084b] focus-visible:outline-none"
              >
                {t('View all warehouses')}
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {isLoadingWarehouses
                ? Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="overflow-hidden rounded-lg border border-slate-200 bg-white"
                      aria-hidden="true"
                    >
                      <div className="aspect-[16/9] animate-pulse bg-slate-200" />
                      <div className="space-y-3 p-5">
                        <div className="h-5 w-3/5 animate-pulse rounded bg-slate-200" />
                        <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
                        <div className="h-12 animate-pulse rounded bg-slate-100" />
                      </div>
                    </div>
                  ))
                : approvedWarehouses.map((warehouse) => (
                    <ListingPreviewCard key={warehouse.id} warehouse={warehouse} />
                  ))}
            </div>

            {!isLoadingWarehouses && approvedWarehouses.length === 0 && (
              <div className="border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-600">
                {t('No warehouses are currently available to display.')}
              </div>
            )}
          </div>
        </section>

        <section
          id="how-it-works"
          className="border-y border-slate-200 bg-[#f8f8f7] py-12 lg:py-16"
        >
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
                {t('Seamless workflow')}
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#0f084b]">
                {t('From warehouse selection to daily operations')}
              </h2>
            </div>
            <ol className="mt-8 grid gap-0 border border-slate-200 bg-slate-200 md:grid-cols-4">
              {JOURNEY.map(({ step, titleKey, descKey }) => (
                <li key={step} className="relative bg-[#f8f8f7] p-5 md:min-h-52">
                  <span className="font-mono text-sm font-semibold text-[#FF5A1F]">{step}</span>
                  <h3 className="mt-8 text-lg font-semibold text-slate-950">{t(titleKey)}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{t(descKey)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="about" className="bg-[#0f172a] py-12 text-white lg:py-16">
          <div className="mx-auto grid max-w-[1400px] gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:items-center lg:px-8">
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-[#FF5A1F] uppercase">
                {t('Post-lease operations')}
              </p>
              <h2 className="mt-3 text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
                {t('More than finding space.')}
                <br />
                {t('Manage your entire operation.')}
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300">
                {t(
                  'StockSpace continues to support businesses with warehouse data, goods flow, inbound and outbound operations, and contract records after leasing.'
                )}
              </p>
              <Link
                to="/warehouses"
                className="mt-7 inline-flex min-h-10 items-center gap-2 rounded-md bg-[#FF5A1F] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#e04e19] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a] focus-visible:outline-none"
              >
                {t('Explore warehouses')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="border border-slate-700 bg-slate-800 p-1 shadow-2xl shadow-black/20">
              <div className="border border-slate-700 bg-slate-900 p-5 sm:p-6">
                <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.1em] text-slate-400 uppercase">
                      StockSpace WMS
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {t('Operations workspace')}
                    </p>
                  </div>
                  <ShieldCheck className="h-5 w-5 text-[#FF5A1F]" aria-hidden="true" />
                </div>
                <div className="mt-4 grid gap-px border border-slate-700 bg-slate-700 sm:grid-cols-2">
                  {WMS_CAPABILITIES.map((capability) => {
                    const Icon = capability.icon
                    return (
                      <div key={capability.titleKey} className="bg-slate-800 p-4">
                        <Icon className="h-4 w-4 text-orange-300" aria-hidden="true" />
                        <h3 className="mt-3 text-sm font-semibold text-white">
                          {t(capability.titleKey)}
                        </h3>
                        <p className="mt-1 text-sm leading-5 text-slate-300">
                          {t(capability.descKey)}
                        </p>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('Modules available according to your role and contract access.')}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-14 text-center lg:py-[72px]">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <p className="text-xs font-semibold tracking-[0.12em] text-[#FF5A1F] uppercase">
              {t('Get started with StockSpace')}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0f084b] sm:text-4xl">
              {t('Ready to find the ideal space for your business?')}
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              {t('Explore verified warehouses on StockSpace.')}
            </p>
            <Link
              to="/warehouses"
              className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-md bg-[#FF5A1F] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#e04e19] focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {t('View warehouses now')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
      <BackToTop />
    </div>
  )
}

export default LandingPageKhamkhao
