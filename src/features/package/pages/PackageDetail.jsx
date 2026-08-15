import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { ArrowLeft, Check } from 'lucide-react'
import PublicHeader from '../../../components/PublicHeader'
import packageApi from '../../../services/packageApi'
import subscriptionApi from '../../../services/tenant/subscriptionApi'
import { parseFeaturesToList } from '../../../utils/formatFeatures'
import { toast } from 'react-hot-toast'
import Modal from '@/components/organisms/Modal'
import Button from '@/components/atoms/Button'
import TranslatableText from '@/components/TranslatableText'

const PackageDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useSelector((state) => state.auth)

  const [pkg, setPkg] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [previewData, setPreviewData] = useState(null)

  const [showBuyConfirm, setShowBuyConfirm] = useState(false)
  const [showWalletConfirm, setShowWalletConfirm] = useState(false)

  useEffect(() => {
    const fetchPackageDetail = async () => {
      try {
        const response = await packageApi.getPackageById(id)
        setPkg(response.data?.data || response.data)
      } catch (error) {
        console.error('Failed to fetch package detail', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchPackageDetail()
  }, [id])

  const handlePurchaseClick = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to purchase service packages.')
      return
    }
    if (user?.role !== 'ROLE_TENANT') {
      toast.error('Only Tenant accounts can purchase this service package.')
      return
    }

    try {
      setIsPreviewing(true)
      const res = await subscriptionApi.previewSubscriptionChange(id)
      const data = res.data?.data || res.data

      if (data && data.canProceed === false) {
        toast.error(data.message || 'This transaction cannot be performed.')
        return
      }

      setPreviewData(data)
      setShowBuyConfirm(true)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Cannot preview transactions.')
    } finally {
      setIsPreviewing(false)
    }
  }

  const confirmPurchase = async () => {
    setShowBuyConfirm(false)
    try {
      setIsPurchasing(true)
      await subscriptionApi.purchasePackage({ packageId: id })
      toast.success('Registered service package successfully! Your WMS system has been unlocked.')
      navigate('/tenant/dashboard')
    } catch (error) {
      const errorCode = error.response?.data?.errorCode
      if (errorCode === 'WALLET_INSUFFICIENT_BALANCE') {
        setShowWalletConfirm(true)
      } else if (errorCode === 'SUBSCRIPTION_ALREADY_ACTIVE') {
        toast.error('You already have an active service plan. Cannot register further.')
      } else {
        toast.error(error.response?.data?.message || 'Service pack registration failed.')
      }
    } finally {
      setIsPurchasing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#faf7f4]">
        <PublicHeader />
        <div className="flex h-[calc(100vh-80px)] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#FF5A1F]"></div>
        </div>
      </div>
    )
  }

  if (!pkg) {
    return (
      <div className="min-h-screen bg-[#faf7f4]">
        <PublicHeader />
        <div className="flex h-[calc(100vh-80px)] flex-col items-center justify-center">
          <h2 className="mb-4 text-2xl font-bold text-stone-900">Service pack not found</h2>
          <Link to="/packages" className="flex items-center text-[#FF5A1F] hover:underline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to the list
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf7f4] font-sans text-stone-900 antialiased">
      <PublicHeader />

      <main className="py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <Link
            to="/packages"
            className="mb-8 inline-flex items-center text-sm font-bold tracking-wider text-stone-500 uppercase transition-colors hover:text-[#FF5A1F]"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Price list
          </Link>

          <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xl">
            <div className="border-b border-stone-100 p-10 md:p-16">
              <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="flex-1">
                  <h1 className="text-4xl font-extrabold tracking-tight text-stone-900 uppercase md:text-5xl">
                    {pkg.name}
                  </h1>
                  <TranslatableText
                    text={pkg.description}
                    fallback="Detailed information about service packages. Providing optimal solutions for businesses."
                    className="mt-4 max-w-xl text-base leading-relaxed text-stone-500"
                  />
                </div>
                <div className="mt-4 text-left md:mt-0 md:text-right">
                  <p className="mb-2 text-[11px] font-bold tracking-wider text-stone-400 uppercase">
                    Registration price
                  </p>
                  <div className="flex items-baseline text-[#FF5A1F]">
                    <span className="text-5xl font-black tracking-tight">
                      {Number(pkg.price || 0).toLocaleString('en-US')}
                    </span>
                    <span className="ml-2 text-lg font-bold">VND</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span
                  className={`inline-flex items-center rounded-full px-4 py-1.5 text-[11px] font-bold tracking-wider uppercase ${pkg.status === 'ACTIVE' || pkg.status === 'active' || pkg.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-700'}`}
                >
                  {pkg.status || 'Active'}
                </span>
                <span className="inline-flex items-center rounded-full bg-blue-100 px-4 py-1.5 text-[11px] font-bold tracking-wider text-blue-700 uppercase">
                  {pkg.maxStaff > 0 ? `Max ${pkg.maxStaff} staff` : 'Unlimited employees'}
                </span>
              </div>
            </div>

            <div className="bg-stone-50 p-10 md:p-16">
              <h3 className="mb-8 text-xl font-bold tracking-tight text-stone-900 uppercase">
                Features and Benefits
              </h3>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {(() => {
                  const featuresList = parseFeaturesToList(pkg.features)

                  if (featuresList.length > 0) {
                    return featuresList.map((feature, i) => (
                      <div
                        key={i}
                        className="flex items-start rounded-2xl border border-stone-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <Check className="mr-4 h-6 w-6 shrink-0 text-[#FF5A1F]" />
                        <span className="text-sm leading-relaxed font-medium text-stone-700">
                          {feature}
                        </span>
                      </div>
                    ))
                  } else {
                    return (
                      <>
                        <div className="flex items-start rounded-2xl border border-stone-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                          <Check className="mr-4 h-6 w-6 shrink-0 text-[#FF5A1F]" />
                          <span className="text-sm leading-relaxed font-medium text-stone-700">
                            24/7 priority customer support via hotline and email
                          </span>
                        </div>
                        <div className="flex items-start rounded-2xl border border-stone-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                          <Check className="mr-4 h-6 w-6 shrink-0 text-[#FF5A1F]" />
                          <span className="text-sm leading-relaxed font-medium text-stone-700">
                            Access full warehouse management features
                          </span>
                        </div>
                        <div className="flex items-start rounded-2xl border border-stone-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                          <Check className="mr-4 h-6 w-6 shrink-0 text-[#FF5A1F]" />
                          <span className="text-sm leading-relaxed font-medium text-stone-700">
                            API connection automatically synchronizes data
                          </span>
                        </div>
                      </>
                    )
                  }
                })()}
              </div>

              <div className="mt-16 text-center">
                <button
                  onClick={handlePurchaseClick}
                  disabled={isPurchasing || isPreviewing}
                  className="inline-flex items-center justify-center rounded-md bg-[#FF5A1F] px-10 py-4 text-xs font-bold tracking-wider text-white uppercase shadow-[0_10px_30px_rgba(255,90,31,0.2)] transition-all hover:-translate-y-1 hover:bg-[#e04e19] hover:shadow-[0_15px_40px_rgba(255,90,31,0.3)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isPurchasing
                    ? 'Processing...'
                    : isPreviewing
                      ? 'Checking...'
                      : 'Sign up for the service package now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Buy Confirm Modal */}
      <Modal
        isOpen={showBuyConfirm}
        onClose={() => setShowBuyConfirm(false)}
        title="Confirm purchase of service package"
      >
        <div className="space-y-4">
          <div
            className={`flex items-center gap-4 rounded-xl p-4 ${previewData?.transactionType === 'UPGRADE' ? 'bg-blue-50 text-blue-800' : 'bg-amber-50 text-amber-800'}`}
          >
            <p className="text-sm whitespace-pre-line">
              {previewData?.message ||
                `Are you sure you want to buy the package ${pkg?.name} with price ${Number(pkg?.price || 0).toLocaleString('en-US')} VND?`}
            </p>
          </div>
          <div className="flex justify-end gap-3 border-t border-stone-100 pt-4">
            <Button variant="outline" onClick={() => setShowBuyConfirm(false)}>
              Cancel
            </Button>
            <Button
              className="border-transparent bg-[#FF5A1F] text-white hover:bg-[#e04e19]"
              onClick={confirmPurchase}
              isLoading={isPurchasing}
            >
              Confirm purchase
            </Button>
          </div>
        </div>
      </Modal>

      {/* Wallet Insufficient Confirm Modal */}
      <Modal
        isOpen={showWalletConfirm}
        onClose={() => setShowWalletConfirm(false)}
        title="Insufficient balance"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4 rounded-xl bg-red-50 p-4 text-red-800">
            <p className="text-sm">
              Your wallet balance is not enough to pay. Do you want to go to My Wallet to add more
              funds?
            </p>
          </div>
          <div className="flex justify-end gap-3 border-t border-stone-100 pt-4">
            <Button variant="outline" onClick={() => setShowWalletConfirm(false)}>
              Cancel
            </Button>
            <Button
              className="border-transparent bg-[#FF5A1F] text-white hover:bg-[#e04e19]"
              onClick={() => navigate('/tenant/wallet')}
            >
              To my wallet
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default PackageDetail
