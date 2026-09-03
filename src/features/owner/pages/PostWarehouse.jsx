import { useState, useEffect, useMemo } from 'react'
import { FormShell } from '@/form/FormControls'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Warehouse,
  MapPin,
  FileText,
  Layers,
  DollarSign,
  UploadCloud,
  X,
  ArrowLeft,
  ArrowRight,
  Image as ImageIcon,
  Building2,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import Button from '../../../components/atoms/Button'
import TranslatableText from '../../../components/TranslatableText'
import logoDaidien from '../../../assets/logoDaidien.png'
import ownerApi from '../../../services/warehouse/warehouseApi'
import addressApi from '../../../services/addressApi'

const CreateWarehouse = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const draft = location.state?.draft
  const [warehouseTypes, setWarehouseTypes] = useState([])
  const [wards, setWards] = useState([])
  const [wardsLoading, setWardsLoading] = useState(true)
  const [wardsError, setWardsError] = useState('')
  const [selectedWardCode, setSelectedWardCode] = useState(() => draft?.selectedWardCode || '')
  const [addressDetail, setAddressDetail] = useState(() => draft?.addressDetail || '')

  // Form text
  const [formData, setFormData] = useState(
    () =>
      draft?.formData || {
        typeId: '',
        name: '',
        description: '',
        warehouseWidth: '',
        warehouseLength: '',
        warehouseHeight: '',
        rentalPricingType: 'PER_SQUARE_METER_MONTHLY',
        rentalPrice: '',
      }
  )

  // Ảnh bìa (tuỳ chọn)
  const [coverFile, setCoverFile] = useState(() => draft?.coverFile || null)
  const [coverPreview, setCoverPreview] = useState(() => draft?.coverPreview || null)

  // Ảnh liên quan (tuỳ chọn)
  const [relatedImages, setRelatedImages] = useState(() => draft?.relatedImages || [])

  // --- Lấy danh sách loại kho ---
  useEffect(() => {
    const fetchWarehouseTypes = async () => {
      try {
        const response = await ownerApi.getWarehouseTypesByOwner()
        if (response && response.data) {
          if (Array.isArray(response.data)) {
            setWarehouseTypes(response.data)
          } else if (response.data.data && Array.isArray(response.data.data)) {
            setWarehouseTypes(response.data.data)
          }
        } else if (Array.isArray(response)) {
          setWarehouseTypes(response)
        }
      } catch {
        setWarehouseTypes([])
      }
    }
    fetchWarehouseTypes()
  }, [])

  const fetchHoChiMinhCityWards = async () => {
    try {
      setWardsLoading(true)
      setWardsError('')
      const wardOptions = await addressApi.getHoChiMinhCityWards()
      setWards(wardOptions)
    } catch (error) {
      console.error('Unable to load Ho Chi Minh City wards:', error)
      setWards([])
      setWardsError('Unable to load wards and communes. Please try again.')
    } finally {
      setWardsLoading(false)
    }
  }

  useEffect(() => {
    let isActive = true

    addressApi
      .getHoChiMinhCityWards()
      .then((wardOptions) => {
        if (isActive) setWards(wardOptions)
      })
      .catch((error) => {
        console.error('Unable to load Ho Chi Minh City wards:', error)
        if (isActive) {
          setWards([])
          setWardsError('Unable to load wards and communes. Please try again.')
        }
      })
      .finally(() => {
        if (isActive) setWardsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [])

  const selectedWard = useMemo(
    () => wards.find((ward) => ward.code === selectedWardCode),
    [selectedWardCode, wards]
  )
  const selectedWarehouseType = useMemo(
    () => warehouseTypes.find((type) => String(type.id) === String(formData.typeId)),
    [formData.typeId, warehouseTypes]
  )
  const fullAddress = useMemo(() => {
    const detail = addressDetail.trim()
    return detail && selectedWard ? `${detail}, ${selectedWard.name}, Thành phố Hồ Chí Minh` : ''
  }, [addressDetail, selectedWard])
  const handleInputChange = (e) => {
    const { name, value } = e.target
    const processedValue =
      name === 'rentalPrice' ||
      name === 'warehouseWidth' ||
      name === 'warehouseLength' ||
      name === 'warehouseHeight'
        ? value === ''
          ? ''
          : Number(value)
        : value
    setFormData((prev) => ({ ...prev, [name]: processedValue }))
  }

  const handleCoverChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setCoverFile(file)
      setCoverPreview(URL.createObjectURL(file))
    }
  }

  const removeCoverFile = () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverFile(null)
    setCoverPreview(null)
  }

  const handleRelatedImagesChange = (e) => {
    const files = Array.from(e.target.files)
    const newImages = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setRelatedImages((prev) => [...prev, ...newImages])
  }

  const removeRelatedImage = (index) => {
    setRelatedImages((prev) => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index].preview)
      return updated.filter((_, idx) => idx !== index)
    })
  }

  const isFormValid =
    formData.name.trim() !== '' &&
    fullAddress !== '' &&
    formData.description.trim() !== '' &&
    formData.typeId !== '' &&
    Number(formData.warehouseWidth) > 0 &&
    Number(formData.warehouseLength) > 0 &&
    Number(formData.warehouseHeight) > 0 &&
    (formData.rentalPricingType === 'NEGOTIATED' || Number(formData.rentalPrice) > 0)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isFormValid) return

    navigate('/owner/confirm-postwarehouse', {
      state: {
        draft: {
          formData,
          selectedWardCode,
          addressDetail,
          fullAddress,
          selectedWarehouseType,
          coverFile,
          coverPreview,
          relatedImages,
        },
      },
    })
  }

  return (
    <div className="min-h-screen bg-[#fffaf7] font-sans text-slate-900">
      {/* HEADER */}
      <header className="fixed top-0 right-0 left-0 z-50 flex h-16 items-center justify-center border-b border-[#f8dfcf] bg-white px-6 shadow-[0_1px_0_#f97316]">
        <img src={logoDaidien} alt="StockSpace Logo" className="h-10 w-16 object-contain" />
      </header>

      {/* MAIN CONTENT */}
      <div className="pt-16">
        <div className="sticky top-16 z-40 border-b border-[#f6e7de] bg-[#fffaf7]/90 px-4 py-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-xl border border-[#f1dfd4] bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-[0_4px_14px_rgba(15,23,42,0.05)] transition hover:border-[#f97316] hover:text-[#ea580c]"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>

        <main className="mx-auto w-full max-w-250 space-y-7 p-4 sm:p-6 md:p-10">
          <div className="px-1 py-1 sm:px-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              Post a New Warehouse
            </h1>
            <p className="text-sm text-slate-500">
              Fill in all information to unlock the post button.
            </p>
          </div>

          <FormShell onSubmit={handleSubmit} className="space-y-7">
            <div className="overflow-hidden rounded-[26px] border border-[#fed7aa] bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
              <div className="grid grid-cols-1 gap-x-8 gap-y-8 p-5 sm:p-8 lg:grid-cols-3">
                {/* THÔNG TIN TEXT */}
                <div className="space-y-7 lg:col-span-2">
                  <div className="space-y-6">
                    <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                      1. Warehouse information
                    </h3>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Warehouse name *
                      </label>
                      <div className="relative">
                        <Warehouse className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          maxLength={255}
                          placeholder="For example: Thu Duc Distribution Hub"
                          className="w-full rounded-xl border border-[#e8e1de] bg-white py-3 pr-4 pl-10 text-sm transition focus:border-[#f97316] focus:bg-white focus:ring-2 focus:ring-[#ffedd5] focus:outline-none"
                          required
                        />
                      </div>
                      <p className="text-xs leading-5 text-slate-500">
                        This public name helps tenants quickly identify your warehouse.
                      </p>
                    </div>

                    <div className="space-y-4 border-y border-[#f8dfcf] py-5">
                      <div>
                        <label className="text-xs font-semibold text-slate-700">
                          Warehouse address *
                        </label>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Listings are currently limited to Ho Chi Minh City.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-slate-600">City</label>
                          <div className="relative">
                            <Building2 className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#f97316]" />
                            <input
                              type="text"
                              value="Ho Chi Minh City"
                              readOnly
                              className="w-full cursor-not-allowed rounded-xl border border-[#fbd8c5] bg-white py-3 pr-9 pl-10 text-sm font-medium text-slate-700"
                            />
                            <CheckCircle2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                          </div>
                          <p className="text-[11px] leading-4 text-slate-500">
                            Fixed service area for warehouse listings.
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <label
                            htmlFor="warehouse-ward"
                            className="text-[11px] font-semibold text-slate-600"
                          >
                            Ward / Commune *
                          </label>
                          <div className="relative">
                            <MapPin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#f97316]" />
                            <select
                              id="warehouse-ward"
                              value={selectedWardCode}
                              onChange={(event) => setSelectedWardCode(event.target.value)}
                              disabled={wardsLoading || Boolean(wardsError)}
                              className="w-full cursor-pointer appearance-none rounded-xl border border-[#fbd8c5] bg-white py-3 pr-9 pl-10 text-sm text-slate-700 transition focus:border-[#f97316] focus:ring-2 focus:ring-[#ffedd5] focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
                              required
                            >
                              <option value="">
                                {wardsLoading ? 'Loading wards...' : 'Select a ward or commune'}
                              </option>
                              {wards.map((ward) => (
                                <option key={ward.code} value={ward.code}>
                                  {ward.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <p className="text-[11px] leading-4 text-slate-500">
                            Administrative data is loaded from Vietnam Provinces API.
                          </p>
                        </div>
                      </div>

                      {wardsError && (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                          <p className="text-xs text-rose-600">{wardsError}</p>
                          <button
                            type="button"
                            onClick={fetchHoChiMinhCityWards}
                            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-rose-700 hover:underline"
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Retry
                          </button>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label
                          htmlFor="warehouse-address-detail"
                          className="text-[11px] font-semibold text-slate-600"
                        >
                          Street address *
                        </label>
                        <div className="relative">
                          <MapPin className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            id="warehouse-address-detail"
                            type="text"
                            value={addressDetail}
                            onChange={(event) => setAddressDetail(event.target.value)}
                            maxLength={300}
                            placeholder="House number, street name, industrial park..."
                            className="w-full rounded-xl border border-[#fbd8c5] bg-white py-3 pr-4 pl-10 text-sm transition focus:border-[#f97316] focus:ring-2 focus:ring-[#ffedd5] focus:outline-none"
                            required
                          />
                        </div>
                        <p className="text-[11px] leading-4 text-slate-500">
                          Enter the precise location so tenants and inspectors can find the
                          warehouse.
                        </p>
                      </div>

                      {fullAddress && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                          <p className="text-[10px] font-bold tracking-wide text-emerald-700 uppercase">
                            Full address preview
                          </p>
                          <p className="mt-1 text-xs leading-5 font-medium text-emerald-900">
                            {fullAddress}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">
                          Layout width *
                        </label>
                        <div className="relative">
                          <Layers className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="number"
                            name="warehouseWidth"
                            step="0.01"
                            value={formData.warehouseWidth}
                            onChange={handleInputChange}
                            placeholder="30"
                            className="w-full rounded-xl border border-[#e8e1de] bg-white py-3 pr-10 pl-10 text-sm transition focus:border-[#f97316] focus:bg-white focus:ring-2 focus:ring-[#ffedd5] focus:outline-none"
                            required
                          />
                          <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-slate-400">
                            m
                          </span>
                        </div>
                        <p className="text-xs leading-5 text-slate-500">
                          Horizontal size used to generate the warehouse layout canvas.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">
                          Layout length *
                        </label>
                        <div className="relative">
                          <Layers className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="number"
                            name="warehouseLength"
                            step="0.01"
                            value={formData.warehouseLength}
                            onChange={handleInputChange}
                            placeholder="40"
                            className="w-full rounded-xl border border-[#e8e1de] bg-white py-3 pr-10 pl-10 text-sm transition focus:border-[#f97316] focus:bg-white focus:ring-2 focus:ring-[#ffedd5] focus:outline-none"
                            required
                          />
                          <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-slate-400">
                            m
                          </span>
                        </div>
                        <p className="text-xs leading-5 text-slate-500">
                          Vertical size used with the width to draw the floor layout.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">
                          Warehouse height *
                        </label>
                        <div className="relative">
                          <Layers className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="number"
                            name="warehouseHeight"
                            step="0.01"
                            value={formData.warehouseHeight}
                            onChange={handleInputChange}
                            placeholder="10"
                            className="w-full rounded-xl border border-[#e8e1de] bg-white py-3 pr-12 pl-10 text-sm transition focus:border-[#f97316] focus:bg-white focus:ring-2 focus:ring-[#ffedd5] focus:outline-none"
                            required
                          />
                          <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-slate-400">
                            m
                          </span>
                        </div>
                        <p className="text-xs leading-5 text-slate-500">
                          Maximum vertical boundary used for racks and bins in the layout.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">
                          Rental pricing model *
                        </label>
                        <select
                          name="rentalPricingType"
                          value={formData.rentalPricingType}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-[#e8e1de] bg-white px-4 py-3 text-sm transition focus:border-[#f97316] focus:bg-white focus:ring-2 focus:ring-[#ffedd5] focus:outline-none"
                          required
                        >
                          <option value="FIXED_MONTHLY">Fixed total monthly price</option>
                          <option value="PER_SQUARE_METER_MONTHLY">Price per m²</option>
                          <option value="NEGOTIATED">Negotiated with tenant</option>
                        </select>
                        {formData.rentalPricingType === 'NEGOTIATED' ? (
                          <p className="text-xs leading-5 text-slate-500">
                            The final rental price will be agreed directly with the tenant.
                          </p>
                        ) : (
                          <div className="relative">
                            <DollarSign className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              type="number"
                              name="rentalPrice"
                              value={formData.rentalPrice}
                              onChange={handleInputChange}
                              step="0.01"
                              placeholder="30000000"
                              className="w-full rounded-xl border border-[#e8e1de] bg-white py-3 pr-14 pl-10 text-sm transition focus:border-[#f97316] focus:bg-white focus:ring-2 focus:ring-[#ffedd5] focus:outline-none"
                              min="0.01"
                              required
                            />
                            <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-slate-400">
                              VND
                            </span>
                          </div>
                        )}
                        {formData.rentalPricingType !== 'NEGOTIATED' && (
                          <p className="text-xs leading-5 text-slate-500">
                            This is a public listing price. The final contract rent can be
                            negotiated directly.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* PHÂN LOẠI & HÌNH ẢNH */}
                <div className="space-y-7">
                  <div className="space-y-5">
                    <h3 className="text-sm font-bold tracking-wider text-slate-400 uppercase">
                      2. Warehouse classification *
                    </h3>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="warehouse-type"
                        className="text-xs font-semibold text-slate-700"
                      >
                        Warehouse type
                      </label>
                      <div className="relative">
                        <Layers className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <select
                          id="warehouse-type"
                          name="typeId"
                          value={formData.typeId}
                          onChange={handleInputChange}
                          className="w-full cursor-pointer appearance-none rounded-xl border border-[#e8e1de] bg-white py-3 pr-8 pl-10 text-sm text-slate-700 transition focus:border-[#f97316] focus:bg-white focus:ring-2 focus:ring-[#ffedd5] focus:outline-none"
                          required
                        >
                          <option value="" disabled>
                            -- Select warehouse type --
                          </option>
                          {warehouseTypes.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="text-xs leading-5 text-slate-500">
                        Choose the category that best matches the warehouse's storage conditions.
                      </p>
                    </div>

                    {selectedWarehouseType && (
                      <div className="rounded-xl border border-[#fbd8c5] bg-[#fff7ed] p-3.5">
                        <div className="mb-2 flex items-center gap-2 text-[#ea580c]">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <p className="text-sm font-bold">{selectedWarehouseType.name}</p>
                        </div>
                        <TranslatableText
                          text={selectedWarehouseType.description}
                          fallback="No description is available for this warehouse type."
                          className="text-xs leading-5 whitespace-pre-line text-slate-600"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-6 border-t border-[#f8dfcf] pt-7">
                    <h3 className="text-sm font-bold tracking-wider text-slate-400 uppercase">
                      3. Actual images
                    </h3>

                    {/* Ảnh bìa (Tùy chọn) */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700">
                        Cover photo of warehouse representative (Optional)
                      </label>
                      <p className="text-[11px] leading-4 text-slate-500">
                        This is the primary image shown on warehouse cards and search results.
                      </p>
                      {!coverPreview ? (
                        <label className="flex h-28 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#fed7aa] bg-[#fff7ed] transition hover:bg-[#ffedd5]">
                          <UploadCloud className="h-5 w-5 text-[#f97316]" />
                          <span className="mt-1 text-xs text-slate-700">
                            Choose the main cover photo
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleCoverChange}
                          />
                        </label>
                      ) : (
                        <div className="relative h-36 w-full overflow-hidden rounded-xl border">
                          <img
                            src={coverPreview}
                            alt="Cover"
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={removeCoverFile}
                            className="absolute top-2 right-2 rounded-full bg-slate-900/70 p-1.5 text-white hover:bg-rose-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Ảnh bổ sung (Tùy chọn) */}
                    <div className="space-y-2 border-t border-slate-100 pt-4">
                      <label className="text-xs font-semibold text-slate-700">
                        Related photos (Optional)
                      </label>
                      <p className="text-[11px] leading-4 text-slate-500">
                        Add clear photos of the interior, entrance, loading area and facilities.
                      </p>
                      <label className="flex h-20 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200">
                        <ImageIcon className="h-4 w-4 text-slate-400" />
                        <span className="text-xs text-slate-500">Add another angle photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleRelatedImagesChange}
                        />
                      </label>

                      {relatedImages.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 pt-1">
                          {relatedImages.map((img, idx) => (
                            <div
                              key={idx}
                              className="relative aspect-square overflow-hidden rounded-lg border"
                            >
                              <img
                                src={img.preview}
                                alt="related"
                                className="h-full w-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removeRelatedImage(idx)}
                                className="absolute top-0.5 right-0.5 rounded-full bg-slate-900/60 p-0.5 text-white hover:bg-rose-600"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#f6e2d6] px-5 py-7 sm:px-8">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Detailed description *
                  </label>
                  <div className="relative">
                    <FileText className="absolute top-4 left-3 h-4 w-4 text-slate-400" />
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={4}
                      placeholder="Describe access roads, operating hours, security, loading facilities and suitable goods..."
                      className="w-full resize-none rounded-xl border border-[#e8e1de] bg-white py-3 pr-4 pl-10 text-sm leading-6 transition focus:border-[#f97316] focus:bg-white focus:ring-2 focus:ring-[#ffedd5] focus:outline-none"
                      required
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Explain the warehouse's main advantages and operating conditions. You can enter
                    in Vietnamese or English.
                  </p>
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <div className="sticky bottom-0 z-30 flex justify-end border-t border-[#f6e2d6] bg-white/95 px-5 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md sm:px-8">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!isFormValid}
                  className="w-full justify-center rounded-xl bg-[#f97316] py-4 text-base font-semibold text-white shadow-[0_8px_18px_rgba(249,115,22,0.24)] transition-all hover:bg-[#ea580c] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:opacity-40 sm:w-100"
                >
                  Continue <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </FormShell>
        </main>
      </div>
    </div>
  )
}

export default CreateWarehouse
