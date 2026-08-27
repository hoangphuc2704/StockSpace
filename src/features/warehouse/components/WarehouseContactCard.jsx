import { useState } from 'react'
import { Check, Copy, LogIn, Phone, ShieldCheck, UserRound } from 'lucide-react'
import Button from '@/components/atoms/Button'
import { formatWarehousePricePerSquareMeter } from '@/utils/warehousePricing'

const WarehouseContactCard = ({
  isAuthenticated,
  contact,
  rentalPrice,
  rentalPricingType = 'FIXED_MONTHLY',
  area,
  isLoading = false,
  onContact,
}) => {
  const [isCopied, setIsCopied] = useState(false)
  const phone = contact?.phone || ''
  const pricingUnit = rentalPricingType === 'NEGOTIATED' ? '' : '/m²'
  const priceDisplay = formatWarehousePricePerSquareMeter(
    { rentalPrice, rentalPricingType, area },
    'Negotiated'
  )

  const handleCopy = async () => {
    if (!phone || !navigator.clipboard) return
    await navigator.clipboard.writeText(phone)
    setIsCopied(true)
    window.setTimeout(() => setIsCopied(false), 1800)
  }

  return (
    <aside className="h-fit w-full shrink-0 lg:sticky lg:top-24 lg:w-96">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
        <div className="bg-slate-950 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-slate-400 uppercase">Next step</p>
              <h2 className="mt-1 text-xl font-bold">Contact the owner</h2>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Discuss availability, terms and the final rental price directly with the warehouse owner.
          </p>
        </div>

        <div className="space-y-5 p-6">
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4">
            <div>
              <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Listing price</p>
              <p className="mt-1 text-lg font-black text-slate-900">
                {priceDisplay}
                <span className="ml-1 text-xs font-semibold text-slate-500">{pricingUnit}</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Platform</p>
              <p className="mt-1 text-sm font-bold text-emerald-700">Direct contact</p>
            </div>
          </div>

          {phone ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-emerald-700">Owner contact</p>
                  <a href={`tel:${phone}`} className="mt-1 block truncate text-lg font-black text-emerald-900">
                    {phone}
                  </a>
                  <div className="mt-3 flex gap-2">
                    <a
                      href={`tel:${phone}`}
                      className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      <Phone className="mr-1.5 h-3.5 w-3.5" /> Call owner
                    </a>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                    >
                      {isCopied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                      {isCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <Button
                type="button"
                onClick={onContact}
                isLoading={isLoading}
                className="w-full rounded-xl py-3.5 text-sm font-bold"
              >
                {isAuthenticated ? (
                  <><Phone className="mr-2 h-4 w-4" /> Contact owner</>
                ) : (
                  <><LogIn className="mr-2 h-4 w-4" /> Log in to contact</>
                )}
              </Button>
              <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                {isAuthenticated
                  ? 'Your request is authenticated and the phone number is loaded only when requested.'
                  : 'Sign in first. Owner contact details are protected and are never shown publicly.'}
              </p>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}

export default WarehouseContactCard
