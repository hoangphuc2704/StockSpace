import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  DollarSign,
  FileText,
  Image as ImageIcon,
  MapPin,
  Ruler,
  Warehouse,
} from 'lucide-react'
import Button from '../../../components/atoms/Button'
import logoDaidien from '../../../assets/logoDaidien.png'
import ownerApi from '../../../services/warehouse/warehouseApi'
import { toast } from 'react-hot-toast'
import { showApiErrorToast } from '@/config/apiError'

const layoutDimensionsKey = (warehouseId) => `stockspace:warehouse-layout-dimensions:${warehouseId}`
const pendingOwnerLayoutKey = 'stockspace:pending-owner-layout'

const ConfirmPostWarehouse = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useSelector((state) => state.auth.user)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const draft = location.state?.draft

  const formData = draft?.formData || {}
  const relatedImages = draft?.relatedImages || []
  const warehouseWidth = Number(formData.warehouseWidth)
  const warehouseLength = Number(formData.warehouseLength)
  const warehouseHeight = Number(formData.warehouseHeight)
  const rentalPrice = Number(formData.rentalPrice)

  const handleBack = () => {
    navigate('/owner/postwarehouse', { state: { draft } })
  }

  const handleConfirmSubmit = async (event) => {
    event.preventDefault()
    if (!draft || isSubmitting) return

    setIsSubmitting(true)
    try {
      const formPayload = new FormData()
      const warehouseInfo = {
        typeId: formData.typeId,
        name: String(formData.name || '').trim(),
        address: draft.fullAddress,
        description: String(formData.description || '').trim(),
        capacity: warehouseWidth * warehouseLength,
        rentalPrice: formData.rentalPricingType === 'NEGOTIATED' ? null : rentalPrice,
        rentalPricingType: formData.rentalPricingType,
        imageUrls: [],
      }

      formPayload.append(
        'request',
        new Blob([JSON.stringify(warehouseInfo)], { type: 'application/json' })
      )
      if (draft.coverFile) {
        formPayload.append('files', draft.coverFile)
      }
      relatedImages.forEach((image) => {
        if (image.file) formPayload.append('files', image.file)
      })

      const response = await ownerApi.createWarehouse(formPayload)
      if (!response?.data?.success) {
        showApiErrorToast({ response: { data: response?.data } }, 'Could not post warehouse.')
        return
      }

      const createdWarehouseId = response?.data?.data?.id ?? response?.data?.data?.warehouseId
      if (!createdWarehouseId) {
        toast.error('Warehouse created without an ID.')
        return
      }

      try {
        localStorage.setItem(
          layoutDimensionsKey(createdWarehouseId),
          JSON.stringify({
            width: warehouseWidth,
            length: warehouseLength,
            height: warehouseHeight,
          })
        )
        sessionStorage.setItem(
          pendingOwnerLayoutKey,
          JSON.stringify({
            ownerId: user?.userId || null,
            warehouseId: createdWarehouseId,
            width: warehouseWidth,
            length: warehouseLength,
            height: warehouseHeight,
          })
        )
      } catch {
        // Query parameters below still carry the dimensions for the immediate layout flow.
      }

      toast.success(
        'Warehouse submitted for Admin approval. You can pay for the listing after approval.'
      )
      navigate(
        `/owner/layoutwarehouses?warehouseId=${encodeURIComponent(String(createdWarehouseId))}&width=${warehouseWidth}&length=${warehouseLength}&height=${warehouseHeight}&setupRequired=true`
      )
    } catch (error) {
      console.error('Error creating warehouse:', error)
      showApiErrorToast(error, 'Connection error.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!draft) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fffaf7] px-6">
        <div className="rounded-2xl border border-[#fed7aa] bg-white p-8 text-center shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
          <h1 className="text-xl font-bold text-slate-900">No warehouse draft found</h1>
          <p className="mt-2 text-sm text-slate-500">Please complete the warehouse form first.</p>
          <Button
            type="button"
            size="sm"
            onClick={() => navigate('/owner/postwarehouse')}
            className="mt-5 rounded-xl bg-[#f97316] px-5 py-3 text-white hover:bg-[#ea580c]"
          >
            Back to post warehouse
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fffaf7] font-sans text-slate-900">
      <header className="fixed top-0 right-0 left-0 z-50 flex h-16 items-center justify-center border-b border-[#f8dfcf] bg-white px-6 shadow-[0_1px_0_#f97316]">
        <img src={logoDaidien} alt="StockSpace Logo" className="h-10 w-16 object-contain" />
      </header>

      <div className="pt-16">
        <div className="sticky top-16 z-40 border-b border-[#f6e7de] bg-[#fffaf7]/90 px-4 py-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 rounded-xl border border-[#f1dfd4] bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-[0_4px_14px_rgba(15,23,42,0.05)] transition hover:border-[#f97316] hover:text-[#ea580c]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to edit
          </button>
        </div>

        <main className="mx-auto w-full max-w-250 space-y-7 p-4 sm:p-6 md:p-10">
          <div className="px-1 py-1 sm:px-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              Confirm warehouse post
            </h1>
            <p className="text-sm text-slate-500">
              Review all information before submitting this warehouse for Admin approval.
            </p>
          </div>

          <form onSubmit={handleConfirmSubmit}>
            <div className="overflow-hidden rounded-[26px] border border-[#fed7aa] bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
              <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    {draft.coverPreview ? (
                      <img
                        src={draft.coverPreview}
                        alt="Warehouse cover"
                        className="h-24 w-28 shrink-0 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-24 w-28 shrink-0 items-center justify-center rounded-2xl bg-[#fff7ed] text-[#f97316]">
                        <Warehouse className="h-8 w-8" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                        Warehouse information
                      </p>
                      <h2 className="mt-1 break-words text-xl font-black text-slate-950">
                        {formData.name}
                      </h2>
                      <p className="mt-2 flex items-start gap-1.5 text-sm leading-5 text-slate-500">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#f97316]" />
                        {draft.fullAddress}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 border-y border-[#f8dfcf] py-5 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-400">Warehouse type</p>
                      <p className="mt-1 text-sm font-bold text-slate-800">
                        {draft.selectedWarehouseType?.name || formData.typeId}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400">Capacity</p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-800">
                        <Ruler className="h-4 w-4 text-[#f97316]" />
                        {Number.isFinite(warehouseWidth * warehouseLength)
                          ? `${(warehouseWidth * warehouseLength).toLocaleString('vi-VN')} m²`
                          : 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400">Layout dimensions</p>
                      <p className="mt-1 text-sm font-bold text-slate-800">
                        {warehouseWidth}m × {warehouseLength}m × {warehouseHeight}m
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400">Rental pricing</p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-800">
                        <DollarSign className="h-4 w-4 text-[#f97316]" />
                        {formData.rentalPricingType === 'NEGOTIATED'
                          ? 'Negotiated with tenant'
                          : `${rentalPrice.toLocaleString('vi-VN')} VND`}
                      </p>
                    </div>
                  </div>

                  {relatedImages.length > 0 && (
                    <div>
                      <p className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wider text-slate-400 uppercase">
                        <ImageIcon className="h-4 w-4 text-[#f97316]" /> Related photos
                      </p>
                      <div className="grid grid-cols-5 gap-2">
                        {relatedImages.map((image, index) => (
                          <img
                            key={`${image.preview}-${index}`}
                            src={image.preview}
                            alt={`Related warehouse ${index + 1}`}
                            className="aspect-square w-full rounded-xl object-cover"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="self-start rounded-2xl border border-[#fed7aa] bg-[#fff7ed] p-5">
                  <p className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#ea580c] uppercase">
                    <CreditCard className="h-4 w-4" /> Listing payment
                  </p>
                  <p className="mt-4 text-sm leading-6 text-slate-700">
                    Listing payment is not required at this step. After Admin approves the
                    warehouse, choose a 10, 15 or 30-day package and pay from My Warehouses.
                  </p>
                  <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-600">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#f97316]" />
                    Inspection is optional. The warehouse only waits for Admin approval at this step.
                  </div>
                </div>
              </div>

              <div className="border-t border-[#f6e2d6] px-5 py-7 sm:px-8">
                <p className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-400 uppercase">
                  <FileText className="h-4 w-4 text-[#f97316]" /> Detailed description
                </p>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">
                  {formData.description}
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-[#f6e2d6] bg-white/95 px-5 py-4 sm:flex-row sm:justify-between sm:px-8">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  className="w-full justify-center rounded-xl border-[#f1dfd4] py-4 text-slate-600 hover:bg-[#fffaf7] sm:w-auto sm:px-6"
                >
                  Back to edit
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSubmitting}
                  className="w-full justify-center rounded-xl bg-[#f97316] py-4 text-base font-semibold text-white shadow-[0_8px_18px_rgba(249,115,22,0.24)] hover:bg-[#ea580c] sm:w-auto sm:px-8"
                >
                  Confirm &amp; submit for Admin approval
                </Button>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  )
}

export default ConfirmPostWarehouse
