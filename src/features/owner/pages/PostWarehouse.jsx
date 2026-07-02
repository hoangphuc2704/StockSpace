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
} from 'lucide-react'
import Button from '../../../components/atoms/Button'
import logoDaidien from '../../../assets/logoDaidien.png'
import warehouseApi from '../../../services/admin/adminApi'
import ownerApi from '../../../services/warehouse/warehouseApi'

const CreateWarehouse = () => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [warehouseTypes, setWarehouseTypes] = useState([]) // Danh sách loại kho lấy từ API

  // State thông tin form text theo đúng cấu trúc JSON yêu cầu
  const [formData, setFormData] = useState({
    typeId: '', // Sẽ lưu trữ UUID của loại kho được chọn (VD: "2c0157a2-6fa4...")
    name: '',
    address: '',
    description: '',
    capacity: '',
    pricePerMonth: '',
  })

  // State ảnh bìa chính (Bắt buộc)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)

  // State các ảnh liên quan (Tùy chọn)
  const [relatedImages, setRelatedImages] = useState([])

  // Gọi API lấy danh sách loại kho thực tế
  useEffect(() => {
    const fetchWarehouseTypes = async () => {
      try {
        const response = await ownerApi.getWarehouseTypesByOwner()

        // 1. IN THỬ RA ĐỂ KIỂM TRA (Hãy bật F12 xem dòng này hiện ra cái gì)
        console.log('=== PHẢN HỒI THỰC TẾ TỪ API ===', response)

        // 2. Ép cấu trúc bóc tách dữ liệu chuẩn xác
        if (response && response.data) {
          if (Array.isArray(response.data)) {
            setWarehouseTypes(response.data)
          } else if (response.data.data && Array.isArray(response.data.data)) {
            setWarehouseTypes(response.data.data)
          }
        } else if (Array.isArray(response)) {
          setWarehouseTypes(response)
        }
      } catch (error) {
        console.error('Lỗi khi gọi API lấy loại kho:', error)
      }
    }
    fetchWarehouseTypes()
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    // Ép kiểu float/int cho capacity và pricePerMonth đúng như format JSON yêu cầu
    const processedValue = name === 'capacity' || name === 'pricePerMonth' ? Number(value) : value
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
    formData.typeId !== '' && // Đảm bảo người dùng đã bấm chọn loại kho hợp lệ
    Number(formData.capacity) > 0 &&
    Number(formData.pricePerMonth) > 0 &&
    coverFile !== null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isFormValid || isLoading) return

    setIsLoading(true)

    try {
      const formPayload = new FormData()

      // 1. Tạo object chứa thông tin kho theo đúng format JSON của bạn
      const warehouseInfo = {
        typeId: formData.typeId,
        name: formData.name,
        address: formData.address,
        description: formData.description,
        capacity: Number(formData.capacity),
        pricePerMonth: Number(formData.pricePerMonth),
      }

      // 2. Chuyển object trên thành chuỗi JSON gán vào key 'request' dạng Blob theo đúng Swagger yêu cầu
      formPayload.append(
        'request',
        new Blob([JSON.stringify(warehouseInfo)], { type: 'application/json' })
      )

      // 3. Đẩy ảnh bìa vào mảng 'files'
      if (coverFile) {
        formPayload.append('files', coverFile)
      }

      // 4. Đẩy tiếp các ảnh liên quan vào mảng 'files'
      relatedImages.forEach((imgObj) => {
        if (imgObj.file) {
          formPayload.append('files', imgObj.file)
        }
      })

      // 5. Gọi API gửi đi
      const response = await ownerApi.createWarehouse(formPayload)

      if (response && (response.success || response.status === 200 || response.status === 21)) {
        alert('Đăng tin kho vận thành công!')
        navigate('/owner/warehouses')
      } else {
        alert(response?.message || 'Đăng tin thất bại, vui lòng kiểm tra lại dữ liệu.')
      }
    } catch (error) {
      console.error('Error creating warehouse:', error)
      alert('Đã xảy ra lỗi hệ thống khi kết nối!')
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
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </button>
        </div>

        <main className="mx-auto w-full max-w-250 space-y-6 p-6 md:p-10">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Đăng tin kho vận mới</h1>
            <p className="text-sm text-slate-500">Điền đầy đủ thông tin để mở khóa nút đăng tin.</p>
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

              {/* PHÂN LOẠI & GIAO DIỆN HÌNH ẢNH */}
              <div className="space-y-6">
                {/* ĐÃ CẬP NHẬT: PHẦN CHỌN LOẠI KHO DẠNG SELECT DROPDOWN */}
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
                disabled={!isFormValid || isLoading}
                className={`w-full justify-center rounded-xl py-4 text-base font-semibold transition-all ${
                  !isFormValid || isLoading
                    ? 'cursor-not-allowed bg-slate-300 text-slate-500 opacity-40'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Save className="mr-2 h-5 w-5" />
                {isLoading ? 'Đang xử lý đăng tin...' : 'Đăng tin kho vận ngay'}
              </Button>
            </div>
          </form>
        </main>
      </div>
    </div>
  )
}

export default CreateWarehouse
