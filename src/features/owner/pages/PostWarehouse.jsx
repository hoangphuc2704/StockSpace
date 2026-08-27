import { useState, useEffect, useMemo } from 'react'
import { FormShell } from '@/form/FormControls'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  Warehouse,
  MapPin,
  FileText,
  Layers,
  DollarSign,
  UploadCloud,
  X,
  ArrowLeft,
  Save,
  Image as ImageIcon,
  Loader2,
  Building2,
  CheckCircle2,
  RefreshCw,
  CalendarDays,
  CreditCard,
} from 'lucide-react'
import Button from '../../../components/atoms/Button'
import TranslatableText from '../../../components/TranslatableText'
import ownerApi from '../../../services/warehouse/warehouseApi'
import listingApi from '../../../services/listingApi'
import addressApi from '../../../services/addressApi'
import { toast } from 'react-hot-toast'
import { showApiErrorToast } from '@/config/apiError'

const layoutDimensionsKey = (warehouseId) => `stockspace:warehouse-layout-dimensions:${warehouseId}`
const pendingOwnerLayoutKey = 'stockspace:pending-owner-layout'
const pendingOwnerListingKey = 'stockspace:pending-owner-listing'

const CreateWarehouse = () => {
  const navigate = useNavigate()
  const user = useSelector((state) => state.auth.user)
  const [isLoading, setIsLoading] = useState(false)
  const [warehouseTypes, setWarehouseTypes] = useState([])
  const [wards, setWards] = useState([])
  const [wardsLoading, setWardsLoading] = useState(true)
  const [wardsError, setWardsError] = useState('')
  const [selectedWardCode, setSelectedWardCode] = useState('')
  const [addressDetail, setAddressDetail] = useState('')
  const [listingPackages, setListingPackages] = useState([])
  const [listingPackagesLoading, setListingPackagesLoading] = useState(true)
  const [listingPackagesError, setListingPackagesError] = useState('')
  const [selectedListingPackageId, setSelectedListingPackageId] = useState('')

  // Form text
  const [formData, setFormData] = useState({
    typeId: '',
    name: '',
    description: '',
    warehouseWidth: '',
    warehouseLength: '',
    warehouseHeight: '',
    rentalPricingType: 'PER_SQUARE_METER_MONTHLY',
    rentalPrice: '',
  })

  // Ảnh bìa (bắt buộc)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)

  // Ảnh liên quan (tuỳ chọn)
  const [relatedImages, setRelatedImages] = useState([])

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

  useEffect(() => {
    let isActive = true

    listingApi
      .getPublicPackages()
      .then((response) => {
        const payload = response?.data?.data || response?.data
        const activePackages = Array.isArray(payload)
          ? payload.filter((item) => item.active ?? item.isActive)
          : []
        if (isActive) {
          setListingPackages(activePackages)
          setSelectedListingPackageId(activePackages[0]?.id || '')
        }
      })
      .catch((error) => {
        if (isActive) setListingPackagesError(error.response?.data?.message || 'Could not load listing packages.')
      })
      .finally(() => {
        if (isActive) setListingPackagesLoading(false)
      })

    return () => {
      isActive = false
    }
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
  const selectedListingPackage = useMemo(
    () => listingPackages.find((item) => String(item.id) === String(selectedListingPackageId)),
    [listingPackages, selectedListingPackageId]
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
    Number(formData.warehouseWidth) >= 20 &&
    Number(formData.warehouseLength) >= 20 &&
    Number(formData.warehouseHeight) >= 4 &&
    (formData.rentalPricingType === 'NEGOTIATED' || Number(formData.rentalPrice) > 0) &&
    coverFile !== null &&
    Boolean(selectedListingPackageId) &&
    !listingPackagesLoading

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isFormValid || isLoading) return
    await doCreateWarehouse()
  }

  const doCreateWarehouse = async () => {
    setIsLoading(true)
    try {
      const formPayload = new FormData()
      const warehouseWidth = Number(formData.warehouseWidth)
      const warehouseLength = Number(formData.warehouseLength)
      const warehouseHeight = Number(formData.warehouseHeight)
      const rentalPrice = formData.rentalPricingType === 'NEGOTIATED' ? null : Number(formData.rentalPrice)

      const warehouseInfo = {
        typeId: formData.typeId,
        name: formData.name.trim(),
        address: fullAddress,
        description: formData.description.trim(),
        capacity: warehouseWidth * warehouseLength,
        rentalPrice,
        rentalPricingType: formData.rentalPricingType,
        imageUrls: [],
      }

      formPayload.append(
        'request',
        new Blob([JSON.stringify(warehouseInfo)], { type: 'application/json' })
      )
      if (coverFile) {
        formPayload.append('files', coverFile)
      }
      relatedImages.forEach((imgObj) => {
        if (imgObj.file) {
          formPayload.append('files', imgObj.file)
        }
      })

      const response = await ownerApi.createWarehouse(formPayload)
      if (response?.data?.success) {
        const createdWarehouseId = response?.data?.data?.id ?? response?.data?.data?.warehouseId

        if (createdWarehouseId) {
          try {
            localStorage.setItem(
              layoutDimensionsKey(createdWarehouseId),
              JSON.stringify({
                width: warehouseWidth,
                length: warehouseLength,
                height: warehouseHeight,
              })
            )
          } catch {
            // Query parameters below still carry the dimensions for the immediate layout flow.
          }
        }

        if (!createdWarehouseId) {
          toast.error('Warehouse created without an ID.')
          return
        }

        try {
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
          sessionStorage.setItem(
            pendingOwnerListingKey,
            JSON.stringify({
              warehouseId: createdWarehouseId,
              listingPackageId: selectedListingPackageId,
            })
          )
        } catch {
          // The selected package remains visible in the post form; owner can select it again after approval.
        }

        toast.success(
          `Warehouse submitted for Admin approval. ${selectedListingPackage?.name || 'Listing package'} is ready to pay after approval.`
        )
        navigate(
          `/owner/layoutwarehouses?warehouseId=${encodeURIComponent(String(createdWarehouseId))}&width=${warehouseWidth}&length=${warehouseLength}&height=${warehouseHeight}&setupRequired=true`
        )
      } else {
        showApiErrorToast({ response: { data: response?.data } }, 'Could not post warehouse.')
      }
    } catch (error) {
      console.error('Error creating warehouse:', error)
      showApiErrorToast(error, 'Connection error.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* HEADER */}
      <header className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
        <div className="flex items-center gap-2">
          <span className="font-display text-xl font-bold tracking-tight text-slate-950">
            StockSpace Portal
          </span>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="pt-14">
        <div className="sticky top-14 z-40 bg-slate-50/80 px-6 py-4 backdrop-blur-md">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>

        <main className="mx-auto w-full max-w-250 space-y-6 p-6 md:p-10">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Post a New Warehouse</h1>
            <p className="text-sm text-slate-500">
              Fill in all information to unlock the post button.
            </p>
          </div>

          <FormShell onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* THÔNG TIN TEXT */}
              <div className="space-y-6 lg:col-span-2">
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                    1. Warehouse information
                  </h3>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Warehouse name *</label>
                    <div className="relative">
                      <Warehouse className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        maxLength={255}
                        placeholder="For example: Thu Duc Distribution Hub"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pr-4 pl-10 text-sm transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none"
                        required
                      />
                    </div>
                    <p className="text-xs leading-5 text-slate-500">
                      This public name helps tenants quickly identify your warehouse.
                    </p>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
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
                          <Building2 className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-blue-500" />
                          <input
                            type="text"
                            value="Ho Chi Minh City"
                            readOnly
                            className="w-full cursor-not-allowed rounded-xl border border-blue-100 bg-white py-3 pr-9 pl-10 text-sm font-medium text-slate-700"
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
                          <MapPin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-blue-500" />
                          <select
                            id="warehouse-ward"
                            value={selectedWardCode}
                            onChange={(event) => setSelectedWardCode(event.target.value)}
                            disabled={wardsLoading || Boolean(wardsError)}
                            className="w-full cursor-pointer appearance-none rounded-xl border border-blue-100 bg-white py-3 pr-9 pl-10 text-sm text-slate-700 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
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
                          className="w-full rounded-xl border border-blue-100 bg-white py-3 pr-4 pl-10 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                          required
                        />
                      </div>
                      <p className="text-[11px] leading-4 text-slate-500">
                        Enter the precise location so tenants and inspectors can find the warehouse.
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
                      <label className="text-xs font-semibold text-slate-700">Layout width *</label>
                      <div className="relative">
                        <Layers className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          name="warehouseWidth"
                          step="0.01"
                          value={formData.warehouseWidth}
                          onChange={handleInputChange}
                          placeholder="30"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pr-10 pl-10 text-sm transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none"
                          min="20"
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
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pr-10 pl-10 text-sm transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none"
                          min="20"
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
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pr-12 pl-10 text-sm transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none"
                          min="4"
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
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none"
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
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pr-14 pl-10 text-sm transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none"
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
                          This is a public listing price. The final contract rent can be negotiated directly.
                        </p>
                      )}
                    </div>
                  </div>

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
                        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 py-3 pr-4 pl-10 text-sm leading-6 transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none"
                        required
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      Explain the warehouse's main advantages and operating conditions. You can
                      enter in Vietnamese or English.
                    </p>
                  </div>
                </div>
              </div>

              {/* PHÂN LOẠI & HÌNH ẢNH */}
              <div className="space-y-6">
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
                        className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50/50 py-3 pr-8 pl-10 text-sm text-slate-700 transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none"
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
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3.5">
                      <div className="mb-2 flex items-center gap-2 text-blue-700">
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

                <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-bold tracking-wider text-slate-400 uppercase">
                    3. Actual images
                  </h3>

                  {/* Ảnh bìa (Bắt buộc) */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700">
                      Cover photo of warehouse representative *
                    </label>
                    <p className="text-[11px] leading-4 text-slate-500">
                      This is the primary image shown on warehouse cards and search results.
                    </p>
                    {!coverPreview ? (
                      <label className="flex h-28 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/20">
                        <UploadCloud className="h-5 w-5 text-blue-500" />
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

            <section className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm lg:col-span-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold tracking-wider text-slate-400 uppercase">
                    <CreditCard className="h-4 w-4 text-blue-600" /> 4. Choose listing days and fee *
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    Choose the number of days and the listing package before submitting this post.
                    Your selected package is saved with the complete post, then Admin reviews it.
                  </p>
                </div>
                {selectedListingPackage && (
                  <div className="rounded-xl bg-emerald-50 px-4 py-3 text-right">
                    <p className="text-[10px] font-bold tracking-widest text-emerald-700 uppercase">Selected fee</p>
                    <p className="mt-1 text-lg font-black text-emerald-800">
                      {Number(selectedListingPackage.price).toLocaleString('vi-VN')} ₫
                    </p>
                  </div>
                )}
              </div>

              {listingPackagesLoading ? (
                <div className="mt-5 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> Loading visibility packages...
                </div>
              ) : listingPackagesError ? (
                <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {listingPackagesError}
                </div>
              ) : listingPackages.length === 0 ? (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  No active listing package is available. Please contact Admin before posting.
                </div>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(240px,0.8fr)] md:items-end">
                  <div>
                    <label htmlFor="listing-duration" className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
                      <CalendarDays className="h-4 w-4 text-blue-600" />
                      Number of days to publish <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="listing-duration"
                      value={selectedListingPackageId}
                      onChange={(event) => setSelectedListingPackageId(event.target.value)}
                      disabled={listingPackagesLoading || listingPackages.length === 0}
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      <option value="">Select the number of days</option>
                      {listingPackages.map((listingPackage) => (
                        <option key={listingPackage.id} value={listingPackage.id}>
                          {listingPackage.durationDays} days — {Number(listingPackage.price).toLocaleString('vi-VN')} ₫
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-slate-500">
                      Select a duration from the active packages configured by Admin.
                    </p>
                  </div>

                  {selectedListingPackage && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-slate-600">Selected duration</span>
                        <span className="text-base font-black text-blue-800">{selectedListingPackage.durationDays} days</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 border-t border-blue-100 pt-2">
                        <span className="text-sm font-semibold text-slate-600">Listing fee</span>
                        <span className="text-lg font-black text-slate-900">
                          {Number(selectedListingPackage.price).toLocaleString('vi-VN')} ₫
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* SUBMIT BUTTON */}
            <div className="flex justify-center pt-4">
              <Button
                type="submit"
                size="sm"
                disabled={!isFormValid || isLoading}
                className="w-100 justify-center rounded-xl bg-blue-600 py-4 text-base font-semibold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:opacity-40"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing submitting...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" /> Submit post for Admin approval
                  </>
                )}
              </Button>
            </div>
          </FormShell>
        </main>
      </div>

    </div>
  )
}

export default CreateWarehouse
