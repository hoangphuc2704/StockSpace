import { useState, useEffect, useMemo } from 'react'
import useEscapeKey from '@/hooks/useEscapeKey'
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
  Wallet,
  PlusCircle,
  Loader2,
  AlertTriangle,
  Building2,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import Button from '../../../components/atoms/Button'
import TranslatableText from '../../../components/TranslatableText'
import ownerApi from '../../../services/warehouse/warehouseApi'
import walletApi from '../../../services/wallet/walletApi'
import addressApi from '../../../services/addressApi'
import { toast } from 'react-hot-toast'
import { showApiErrorToast } from '@/config/apiError'
import { positiveNumber } from '@/config/validation'

// Phí tạo bài đăng (VND) - chỉnh lại theo quy định thực tế của hệ thống
const POSTING_FEE = 50000
const layoutDimensionsKey = (warehouseId) => `stockspace:warehouse-layout-dimensions:${warehouseId}`
const pendingOwnerLayoutKey = 'stockspace:pending-owner-layout'

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

  // --- State ví ---
  const [wallet, setWallet] = useState(null)
  const [walletLoading, setWalletLoading] = useState(true)

  // --- State modal nạp tiền ---
  const [showDepositModal, setShowDepositModal] = useState(false)

  useEscapeKey(showDepositModal, () => setShowDepositModal(false))
  const [depositAmount, setDepositAmount] = useState('')
  const [depositLoading, setDepositLoading] = useState(false)

  // Form text
  const [formData, setFormData] = useState({
    typeId: '',
    name: '',
    description: '',
    warehouseWidth: '',
    warehouseLength: '',
    warehouseHeight: '',
    pricePerMonth: '',
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

  // --- Lấy thông tin ví ---
  useEffect(() => {
    const fetchWallet = async () => {
      try {
        setWalletLoading(true)
        const res = await walletApi.getWallet()
        if (res?.data?.success) {
          setWallet(res.data.data)
        } else {
          setWallet(res?.data || res)
        }
      } catch (error) {
        console.error('Error retrieving wallet data:', error)
      } finally {
        setWalletLoading(false)
      }
    }
    fetchWallet()
  }, [])

  const formatVND = (value) => {
    if (value === undefined || value === null) return '0 ₫'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
  }

  const walletBalance = wallet?.balance ?? 0
  const hasEnoughBalance = walletBalance >= POSTING_FEE
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
      name === 'pricePerMonth' ||
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
    Number(formData.pricePerMonth) > 0 &&
    coverFile !== null

  // --- Submit: kiểm tra ví trước ---
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isFormValid || isLoading) return

    // Kiểm tra số dư ví
    if (!hasEnoughBalance) {
      setDepositAmount('')
      setShowDepositModal(true)
      return
    }

    await doCreateWarehouse()
  }

  const doCreateWarehouse = async () => {
    setIsLoading(true)
    try {
      const formPayload = new FormData()
      const warehouseWidth = Number(formData.warehouseWidth)
      const warehouseLength = Number(formData.warehouseLength)
      const warehouseHeight = Number(formData.warehouseHeight)
      const pricePerMonth = Number(formData.pricePerMonth)

      const warehouseInfo = {
        typeId: formData.typeId,
        name: formData.name.trim(),
        address: fullAddress,
        description: formData.description.trim(),
        capacity: warehouseWidth * warehouseLength,
        pricePerMonth,
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

        toast.success('Warehouse posted.')
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
        } catch {
          // Query parameters still keep the layout setup flow targeted to this warehouse.
        }

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

  // --- Xử lý nạp tiền VNPay ---
  const handleDepositSubmit = async (e) => {
    e.preventDefault()
    const amountNumber = Number(depositAmount)
    const amountError = positiveNumber(amountNumber, 'Enter a valid amount.')
    if (amountError) {
      toast.error(amountError)
      return
    }
    try {
      setDepositLoading(true)
      const payload = { amount: amountNumber, paymentMethod: 'VNPAY' }
      const res = await walletApi.requestDeposit(payload)
      if (res?.data?.success && res?.data?.data?.paymentUrl) {
        window.location.href = res.data.data.paymentUrl
      } else {
        showApiErrorToast({ response: { data: res?.data } }, 'Payment link unavailable.')
      }
    } catch (error) {
      console.error('Deposit error:', error)
      showApiErrorToast(error, 'Deposit failed. Try again.')
    } finally {
      setDepositLoading(false)
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

          {/* THÔNG TIN SỐ DƯ VÍ */}
          <div
            className={`flex items-center justify-between rounded-2xl border p-4 ${
              walletLoading
                ? 'border-slate-200 bg-white'
                : hasEnoughBalance
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-amber-200 bg-amber-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  walletLoading
                    ? 'bg-slate-100'
                    : hasEnoughBalance
                      ? 'bg-emerald-100'
                      : 'bg-amber-100'
                }`}
              >
                {walletLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                ) : hasEnoughBalance ? (
                  <Wallet className="h-5 w-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">
                  Your wallet balance
                </p>
                <p
                  className={`text-lg font-bold ${
                    walletLoading
                      ? 'text-slate-400'
                      : hasEnoughBalance
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                  }`}
                >
                  {walletLoading ? 'Loading...' : formatVND(walletBalance)}
                </p>
                {!walletLoading && !hasEnoughBalance && (
                  <p className="text-xs text-amber-600">
                    Your wallet has no funds yet — please top up before posting.
                  </p>
                )}
              </div>
            </div>
            {!walletLoading && !hasEnoughBalance && (
              <button
                type="button"
                onClick={() => {
                  setDepositAmount('')
                  setShowDepositModal(true)
                }}
                className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-600"
              >
                <PlusCircle className="h-4 w-4" /> Deposit now
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                        Monthly rental price *
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          name="pricePerMonth"
                          value={formData.pricePerMonth}
                          onChange={handleInputChange}
                          step="1"
                          placeholder="30000000"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pr-14 pl-10 text-sm transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none"
                          min="1"
                          required
                        />
                        <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-slate-400">
                          VND
                        </span>
                      </div>
                      <p className="text-xs leading-5 text-slate-500">
                        Base rent charged each month, excluding deposits or platform fees.
                        {Number(formData.pricePerMonth) > 0 && (
                          <span className="ml-1 font-semibold text-emerald-600">
                            Preview: {formatVND(Number(formData.pricePerMonth))}
                          </span>
                        )}
                      </p>
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

            {/* SUBMIT BUTTON */}
            <div className="flex justify-center pt-4">
              <Button
                type="submit"
                size="sm"
                disabled={!isFormValid || isLoading || walletLoading}
                className={`w-100 justify-center rounded-xl py-4 text-base font-semibold transition-all ${
                  !isFormValid || isLoading || walletLoading
                    ? 'cursor-not-allowed bg-slate-300 text-slate-500 opacity-40'
                    : !hasEnoughBalance
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing submitting...
                  </>
                ) : !hasEnoughBalance && !walletLoading ? (
                  <>
                    <AlertTriangle className="mr-2 h-5 w-5" /> Top Up to Post
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" /> Submit
                  </>
                )}
              </Button>
            </div>
          </form>
        </main>
      </div>

      {/* MODAL NẠP TIỀN */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Wallet className="h-5 w-5 text-blue-600" /> Top up your wallet
              </h3>
              <button
                onClick={() => setShowDepositModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cảnh báo số dư không đủ */}
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Wallet balance is not enough</p>
                <p className="text-xs text-amber-700">
                  Current balance: <span className="font-bold">{formatVND(walletBalance)}</span>.
                  Fun Please deposit more money to continue posting inventory.
                </p>
              </div>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-500 uppercase">
                  Enter the amount to deposit (VND)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    autoFocus
                    required
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="For example: 2000000"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  />
                  <span className="absolute top-1/2 right-4 -translate-y-1/2 text-xs font-bold text-slate-400">
                    ₫
                  </span>
                </div>
                {depositAmount && !isNaN(Number(depositAmount)) && (
                  <p className="mt-2 text-xs font-medium text-emerald-600">
                    Preview: {formatVND(Number(depositAmount))}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={depositLoading || !depositAmount}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-blue-700 disabled:bg-slate-300"
                >
                  {depositLoading ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Connecting...
                    </>
                  ) : (
                    <>Payment via VNPay</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CreateWarehouse
