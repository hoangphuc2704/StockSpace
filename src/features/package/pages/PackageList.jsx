import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useSelector } from 'react-redux'
import PublicHeader from '../../../components/PublicHeader'
import packageApi from '../../../services/packageApi'
import subscriptionApi from '../../../services/subscriptionApi'
import { parseFeaturesToList } from '../../../utils/formatFeatures'
import TranslatableText from '@/components/TranslatableText'

const normalizePackageText = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const isInternalFeePackage = (pkg = {}) => {
  const name = normalizePackageText(pkg.name)
  const featureType = (() => {
    if (typeof pkg.features !== 'string') return normalizePackageText(pkg.features?.type)
    try {
      return normalizePackageText(JSON.parse(pkg.features)?.type)
    } catch {
      return normalizePackageText(pkg.features)
    }
  })()

  return (
    featureType.includes('posting_fee') ||
    featureType.includes('inspection_fee') ||
    name.includes('posting fee') ||
    name.includes('inspection fee') ||
    name.includes('phi dang bai') ||
    name.includes('phi kiem dinh')
  )
}

const PackageList = () => {
  const [packages, setPackages] = useState([])
  const [activeSub, setActiveSub] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const { user, isAuthenticated } = useSelector((state) => state.auth)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [pkgRes] = await Promise.all([packageApi.getPackages()])

        const payload = pkgRes?.data?.data || pkgRes?.data
        const content = Array.isArray(payload?.content)
          ? payload.content
          : Array.isArray(payload)
            ? payload
            : []

        // Internal one-time fees are not Tenant subscription plans.
        const subscriptionPackages = content.filter((pkg) => !isInternalFeePackage(pkg))
        setPackages(subscriptionPackages)

        // Fetch active subscription if user is a TENANT
        if (isAuthenticated && user?.role === 'ROLE_TENANT') {
          try {
            const subRes = await subscriptionApi.getActiveSubscription()
            setActiveSub(subRes?.data?.data)
          } catch {
            // Ignore 404 or errors if tenant doesn't have an active sub
          }
        }
      } catch (error) {
        console.error('Failed to fetch data', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [isAuthenticated, user])

  return (
    <div className="min-h-screen bg-[#faf7f4] font-sans text-stone-900 antialiased">
      <PublicHeader />

      <main className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-3xl space-y-4 text-center">
            <h2 className="text-4xl font-extrabold tracking-tight text-stone-900 uppercase sm:text-5xl">
              Service price list
            </h2>
            <p className="mx-auto max-w-xl text-sm leading-relaxed font-medium text-stone-500">
              Choose a service package that suits your business's storage and warehouse management
              needs.
            </p>
          </div>

          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#FF5A1F]"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {packages.map((pkg, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={pkg.id}
                  className="flex flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="p-8">
                    <h3 className="mb-2 text-2xl font-bold tracking-tight text-stone-900">
                      {pkg.name}
                    </h3>
                    <TranslatableText
                      text={pkg.description}
                      fallback="Premium service package for businesses."
                      className="mb-6 min-h-[40px] text-sm text-stone-500"
                    />
                    <div className="mb-6 flex items-baseline text-stone-900">
                      <span className="text-4xl font-extrabold tracking-tight">
                        {Number(pkg.price || 0).toLocaleString('en-US')}
                      </span>
                      <span className="ml-1 text-sm font-medium text-stone-500">VND</span>
                    </div>
                    {activeSub?.servicePackage?.id === pkg.id ? (
                      <div className="block w-full cursor-default rounded-md bg-emerald-500 py-3 text-center text-xs font-bold tracking-wider text-white uppercase">
                        In use
                      </div>
                    ) : (
                      <Link
                        to={`/packages/${pkg.id}`}
                        className="block w-full rounded-md bg-[#FF5A1F] py-3 text-center text-xs font-bold tracking-wider text-white uppercase transition-colors hover:bg-[#e04e19]"
                      >
                        See details
                      </Link>
                    )}
                  </div>
                  <div className="flex-1 bg-stone-50 p-8">
                    <p className="mb-4 text-xs font-bold tracking-wider text-stone-900 uppercase">
                      Features included
                    </p>
                    <ul className="space-y-4">
                      <li className="flex items-start">
                        <Check className="mr-3 h-5 w-5 shrink-0 text-[#FF5A1F]" />
                        <span className="text-sm font-bold text-stone-700">
                          {pkg.maxStaff > 0 ? `Max ${pkg.maxStaff} staff` : 'Unlimited employees'}
                        </span>
                      </li>
                      {(() => {
                        const featuresList = parseFeaturesToList(pkg.features)

                        if (featuresList.length > 0) {
                          return featuresList.map((feature, i) => (
                            <li key={i} className="flex items-start">
                              <Check className="mr-3 h-5 w-5 shrink-0 text-emerald-500" />
                              <span className="text-sm text-stone-600">{feature}</span>
                            </li>
                          ))
                        } else {
                          return (
                            <>
                              <li className="flex items-start">
                                <Check className="mr-3 h-5 w-5 shrink-0 text-emerald-500" />
                                <span className="text-sm text-stone-600">
                                  Access full system features
                                </span>
                              </li>
                              <li className="flex items-start">
                                <Check className="mr-3 h-5 w-5 shrink-0 text-emerald-500" />
                                <span className="text-sm text-stone-600">
                                  24/7 priority customer support
                                </span>
                              </li>
                            </>
                          )
                        }
                      })()}
                    </ul>
                  </div>
                </motion.div>
              ))}

              {!isLoading && packages.length === 0 && (
                <div className="col-span-full rounded-3xl border border-dashed border-stone-300 bg-white py-20 text-center text-stone-500">
                  There are currently no service packs configured.
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default PackageList
