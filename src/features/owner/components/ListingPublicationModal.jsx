import { useEffect, useState } from 'react'
import { CalendarDays, CheckCircle2, CreditCard, Loader2, Megaphone, X } from 'lucide-react'
import Button from '@/components/atoms/Button'
import listingApi from '@/services/listingApi'
import { showApiErrorToast } from '@/config/apiError'
import { toast } from 'react-hot-toast'

const formatVND = (value) =>
  value == null ? '—' : `${Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} ₫`

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-GB') : '—')

const addDays = (date, days) => {
  const result = new Date(date)
  result.setDate(result.getDate() + Number(days || 0))
  return result
}

const ListingPublicationModal = ({ warehouse, onClose, onSuccess }) => {
  const [packages, setPackages] = useState([])
  const [history, setHistory] = useState([])
  const [selectedPackageId, setSelectedPackageId] = useState(warehouse.preferredPackageId || '')
  const [isLoading, setIsLoading] = useState(true)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const selectedPackage = packages.find((pkg) => String(pkg.id) === String(selectedPackageId))
  const now = new Date()
  const currentVisibilityEnd = warehouse.visibleUntil ? new Date(warehouse.visibleUntil) : null
  const periodStart = currentVisibilityEnd > now ? currentVisibilityEnd : now
  const periodEnd = selectedPackage ? addDays(periodStart, selectedPackage.durationDays) : null

  useEffect(() => {
    let isActive = true
    Promise.all([listingApi.getPublicPackages(), listingApi.getOwnerPublicationHistory(warehouse.id)])
      .then(([packagesResponse, historyResponse]) => {
        const payload = packagesResponse?.data?.data || packagesResponse?.data
        const historyPayload = historyResponse?.data?.data || historyResponse?.data
        const activePackages = Array.isArray(payload)
          ? payload.filter((item) => item.isActive ?? item.active)
          : []
        if (isActive) {
          setPackages(activePackages)
          setSelectedPackageId(
            activePackages.find((item) => String(item.id) === String(warehouse.preferredPackageId))?.id ||
              activePackages[0]?.id ||
              ''
          )
          setHistory(Array.isArray(historyPayload) ? historyPayload : [])
        }
      })
      .catch((error) => showApiErrorToast(error, 'Could not load listing packages.'))
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [warehouse.id, warehouse.preferredPackageId])

  const handlePurchase = async () => {
    if (!selectedPackageId || isPurchasing) return

    try {
      setIsPurchasing(true)
      await listingApi.purchasePublication(warehouse.id, selectedPackageId)
      toast.success(warehouse.canRenew ? 'Warehouse listing renewed.' : 'Warehouse listing published.')
      onSuccess()
      onClose()
    } catch (error) {
      showApiErrorToast(error, 'Could not purchase the listing package.')
    } finally {
      setIsPurchasing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div>
            <div className="flex items-center gap-2 text-blue-600">
              <Megaphone className="h-5 w-5" />
              <span className="text-xs font-bold tracking-[0.18em] uppercase">Warehouse visibility</span>
            </div>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              {warehouse.canRenew ? 'Renew listing' : 'Publish warehouse'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{warehouse.name}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          {warehouse.publicationStatus && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 p-4 text-sm">
              <span className="font-semibold text-slate-600">Current status:</span>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">{warehouse.publicationStatus}</span>
              {warehouse.visibleUntil && <span className="text-slate-500">Visible until {formatDate(warehouse.visibleUntil)}</span>}
            </div>
          )}

          {isLoading ? (
            <div className="flex min-h-36 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>
          ) : packages.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              No active listing packages are available right now.
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <p className="text-sm font-bold text-blue-900">Choose how long this listing should be visible</p>
                <p className="mt-1 text-xs leading-5 text-blue-700">
                  Select a package below. The package price is the listing fee and will be charged when you confirm payment.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {packages.map((pkg) => {
                  const isSelected = String(pkg.id) === String(selectedPackageId)
                  return (
                    <button
                      type="button"
                      key={pkg.id}
                      onClick={() => setSelectedPackageId(pkg.id)}
                      className={`rounded-2xl border p-4 text-left transition ${isSelected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-300'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-bold text-slate-900">{pkg.name}</p>
                        {isSelected && <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-600" />}
                      </div>
                      <p className="mt-3 text-2xl font-black text-blue-700">{formatVND(pkg.price)}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <CalendarDays className="h-3.5 w-3.5" /> {pkg.durationDays} days of visibility
                      </p>
                    </button>
                  )
                })}
              </div>
              {history.length > 0 && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">Purchase history</p>
                  <div className="mt-3 space-y-2">
                    {history.slice(0, 3).map((order) => (
                      <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-700">{order.listingPackageName || 'Listing package'}</span>
                        <span className="text-slate-500">{formatDate(order.periodStart)} – {formatDate(order.periodEnd)}</span>
                        <span className="font-bold text-slate-700">{formatVND(order.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedPackage && periodEnd && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold tracking-widest text-emerald-700 uppercase">Payment summary</p>
                      <p className="mt-1 text-sm font-bold text-emerald-950">{selectedPackage.name}</p>
                      <p className="mt-1 text-xs text-emerald-800">
                        Visibility: {formatDate(periodStart)} → {formatDate(periodEnd)} ({selectedPackage.durationDays} days)
                      </p>
                    </div>
                    <p className="text-xl font-black text-emerald-700">{formatVND(selectedPackage.price)}</p>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-emerald-800">
                    The actual period is finalized by the server. If the listing is still active, this purchase will continue from its current end date.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/70 p-6">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handlePurchase} isLoading={isPurchasing} disabled={isLoading || packages.length === 0 || !selectedPackageId}>
            <CreditCard className="mr-2 h-4 w-4" />
            {selectedPackage
              ? `Pay ${formatVND(selectedPackage.price)} & ${warehouse.canRenew ? 'renew' : 'publish'}`
              : 'Select a package'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ListingPublicationModal
