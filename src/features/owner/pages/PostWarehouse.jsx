import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
} from 'lucide-react'
import Button from '../../../components/atoms/Button'
import ownerApi from '../../../services/warehouse/warehouseApi'
import walletApi from '../../../services/wallet/walletApi'
import { toast } from 'react-hot-toast'

// Phí tạo bài đăng (VND) - chỉnh lại theo quy định thực tế của hệ thống
const POSTING_FEE = 50000

const CreateWarehouse = () => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [warehouseTypes, setWarehouseTypes] = useState([])

  // --- State ví ---
  const [wallet, setWallet] = useState(null)
  const [walletLoading, setWalletLoading] = useState(true)

  // --- State modal nạp tiền ---
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositLoading, setDepositLoading] = useState(false)

  // Form text
  const [formData, setFormData] = useState({
    typeId: '',
    name: '',
    address: '',
    description: '',
    warehouseWidth: '',
    warehouseHeight: '',
    capacity: '',
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
        console.error('Lỗi lấy dữ liệu ví:', error)
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

  const handleInputChange = (e) => {
    const { name, value } = e.target
    const processedValue =
      name === 'capacity' ||
      name === 'pricePerMonth' ||
      name === 'warehouseWidth' ||
      name === 'warehouseHeight'
        ? Number(value)
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
    formData.address.trim() !== '' &&
    formData.description.trim() !== '' &&
    formData.typeId !== '' &&
    Number(formData.warehouseWidth) > 0 &&
    Number(formData.warehouseHeight) > 0 &&
    Number(formData.capacity) > 0 &&
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
      const warehouseHeight = Number(formData.warehouseHeight)
      const capacity = Number(formData.capacity)
      const pricePerMonth = Number(formData.pricePerMonth)

      const warehouseInfo = {
        typeId: formData.typeId,
        name: formData.name.trim(),
        address: formData.address.trim(),
        description: formData.description.trim(),
        capacity,
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

        toast.success('Đăng tin kho vận thành công! Hãy cấu hình layout cho kho vừa tạo.')
        navigate(
          createdWarehouseId
            ? `/owner/layoutwarehouses?warehouseId=${encodeURIComponent(String(createdWarehouseId))}&width=${encodeURIComponent(String(warehouseWidth))}&height=${encodeURIComponent(String(warehouseHeight))}`
            : '/owner/layoutwarehouses'
        )
      } else {
        toast.error(response?.data?.message || 'Đăng tin thất bại, vui lòng kiểm tra lại dữ liệu.')
      }
    } catch (error) {
      console.error('Error creating warehouse:', error)
      toast.error(error.response?.data?.message || 'Đã xảy ra lỗi hệ thống khi kết nối!')
    } finally {
      setIsLoading(false)
    }
  }

  // --- Xử lý nạp tiền VNPay ---
  const handleDepositSubmit = async (e) => {
    e.preventDefault()
    const amountNumber = Number(depositAmount)
    if (isNaN(amountNumber) || amountNumber <= 0) {
      toast.error('Vui lòng nhập số tiền nạp hợp lệ và lớn hơn 0')
      return
    }
    try {
      setDepositLoading(true)
      const payload = { amount: amountNumber, paymentMethod: 'VNPAY' }
      const res = await walletApi.requestDeposit(payload)
      if (res?.data?.success && res?.data?.data?.paymentUrl) {
        window.location.href = res.data.data.paymentUrl
      } else {
        toast.error(res?.data?.message || 'Không tìm thấy link thanh toán VNPay từ hệ thống!')
      }
    } catch (error) {
      console.error('Lỗi nạp tiền:', error)
      toast.error('Yêu cầu nạp tiền thất bại, vui lòng thử lại!')
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
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </button>
        </div>

        <main className="mx-auto w-full max-w-250 space-y-6 p-6 md:p-10">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Đăng tin kho vận mới</h1>
            <p className="text-sm text-slate-500">Điền đầy đủ thông tin để mở khóa nút đăng tin.</p>
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
                <p className="text-xs font-semibold text-slate-500 uppercase">Số dư ví của bạn</p>
                <p
                  className={`text-lg font-bold ${
                    walletLoading
                      ? 'text-slate-400'
                      : hasEnoughBalance
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                  }`}
                >
                  {walletLoading ? 'Đang tải...' : formatVND(walletBalance)}
                </p>
                {!walletLoading && !hasEnoughBalance && (
                  <p className="text-xs text-amber-600">
                    Ví chưa có tiền — vui lòng nạp tiền trước khi đăng tin.
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
                <PlusCircle className="h-4 w-4" /> Nạp tiền ngay
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* THÔNG TIN TEXT */}
              <div className="space-y-6 lg:col-span-2">
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                    1. Thông tin kho
                  </h3>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Tên nhà kho *</label>
                    <div className="relative">
                      <Warehouse className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 text-sm focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Địa chỉ chính xác *
                    </label>
                    <div className="relative">
                      <MapPin className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 text-sm focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Chiều rộng kho (m) *
                      </label>
                      <div className="relative">
                        <Layers className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          name="warehouseWidth"
                          step="any"
                          value={formData.warehouseWidth}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 text-sm focus:border-blue-500 focus:outline-none"
                          min="1"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Chiều cao kho (m) *
                      </label>
                      <div className="relative">
                        <Layers className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          name="warehouseHeight"
                          step="any"
                          value={formData.warehouseHeight}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 text-sm focus:border-blue-500 focus:outline-none"
                          min="1"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Sức chứa (m²) *
                      </label>
                      <div className="relative">
                        <Layers className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          name="capacity"
                          step="any"
                          value={formData.capacity}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 text-sm focus:border-blue-500 focus:outline-none"
                          min="1"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Giá thuê / tháng (VND) *
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          name="pricePerMonth"
                          value={formData.pricePerMonth}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 text-sm focus:border-blue-500 focus:outline-none"
                          min="1"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Mô tả chi tiết *</label>
                    <div className="relative">
                      <FileText className="absolute top-4 left-3 h-4 w-4 text-slate-400" />
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 text-sm focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* PHÂN LOẠI & HÌNH ẢNH */}
              <div className="space-y-6">
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-bold tracking-wider text-slate-400 uppercase">
                    2. Phân loại kho *
                  </h3>
                  <div className="relative">
                    <select
                      name="typeId"
                      value={formData.typeId}
                      onChange={handleInputChange}
                      className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                      required
                    >
                      <option value="" disabled>
                        -- Chọn loại kho --
                      </option>
                      {warehouseTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-bold tracking-wider text-slate-400 uppercase">
                    3. Hình ảnh thực tế
                  </h3>

                  {/* Ảnh bìa (Bắt buộc) */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700">
                      Ảnh bìa đại diện kho *
                    </label>
                    {!coverPreview ? (
                      <label className="flex h-28 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/20">
                        <UploadCloud className="h-5 w-5 text-blue-500" />
                        <span className="mt-1 text-xs text-slate-700">Chọn ảnh bìa chính</span>
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
                      Ảnh liên quan (Tùy chọn)
                    </label>
                    <label className="flex h-20 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200">
                      <ImageIcon className="h-4 w-4 text-slate-400" />
                      <span className="text-xs text-slate-500">Thêm ảnh góc cạnh khác</span>
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
            <div className="pt-4">
              <Button
                type="submit"
                size="sm"
                disabled={!isFormValid || isLoading || walletLoading}
                className={`w-full justify-center rounded-xl py-4 text-base font-semibold transition-all ${
                  !isFormValid || isLoading || walletLoading
                    ? 'cursor-not-allowed bg-slate-300 text-slate-500 opacity-40'
                    : !hasEnoughBalance
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang xử lý đăng tin...
                  </>
                ) : !hasEnoughBalance && !walletLoading ? (
                  <>
                    <AlertTriangle className="mr-2 h-5 w-5" /> Nạp tiền để đăng tin
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" /> Đăng tin kho vận ngay
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
                <Wallet className="h-5 w-5 text-blue-600" /> Nạp tiền vào ví
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
                <p className="text-sm font-semibold text-amber-800">Số dư ví không đủ</p>
                <p className="text-xs text-amber-700">
                  Số dư hiện tại: <span className="font-bold">{formatVND(walletBalance)}</span>. Vui
                  lòng nạp thêm tiền để tiếp tục đăng tin kho.
                </p>
              </div>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-500 uppercase">
                  Nhập số tiền cần nạp (VND)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    autoFocus
                    required
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Ví dụ: 2000000"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  />
                  <span className="absolute top-1/2 right-4 -translate-y-1/2 text-xs font-bold text-slate-400">
                    ₫
                  </span>
                </div>
                {depositAmount && !isNaN(Number(depositAmount)) && (
                  <p className="mt-2 text-xs font-medium text-emerald-600">
                    Xem trước: {formatVND(Number(depositAmount))}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={depositLoading || !depositAmount}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-blue-700 disabled:bg-slate-300"
                >
                  {depositLoading ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Đang kết nối...
                    </>
                  ) : (
                    <>Thanh toán qua VNPay</>
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
