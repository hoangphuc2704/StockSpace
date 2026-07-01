import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Warehouse,
  MapPin,
  FileText,
  Layers,
  DollarSign,
  Phone,
  User,
  UploadCloud,
  X,
  ArrowLeft,
  Save,
  Image as ImageIcon,
} from 'lucide-react'
import Button from '@/components/atoms/Button'
import logoDaidien from '../../../assets/logoDaidien.png'
import warehouseApi from '../../../services/warehouse/warehouseApi'

const CreateWarehouse = () => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  // State lưu trữ dữ liệu form
  const [formData, setFormData] = useState({
    typeId: '',
    name: '',
    address: '',
    description: '',
    capacity: '',
    pricePerMonth: '',
    imageUrls: [],
  })

  //state upload file
  const [uploadedFiles, setUploadedFiles] = useState([])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    const processedValue = name === 'capacity' || name === 'pricePerMonth' ? Number(value) : value

    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }))
  }

  // Kiểm tra xem toàn bộ các trường bắt buộc đã được điền đầy đủ chưa
  const isFormValid =
    formData.name.trim() !== '' &&
    formData.address.trim() !== '' &&
    formData.description.trim() !== '' &&
    Number(formData.capacity) > 0 &&
    Number(formData.pricePerMonth) > 0 &&
    coverFile !== null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isFormValid || isLoading) return

    setIsLoading(true)
    const submissionData = new FormData()

    // Append các trường text
    submissionData.append('typeId', formData.typeId)
    submissionData.append('name', formData.name)
    submissionData.append('address', formData.address)
    submissionData.append('description', formData.description)
    submissionData.append('capacity', formData.capacity)
    submissionData.append('pricePerMonth', formData.pricePerMonth)
    submissionData.append('imageUrls', JSON.stringify(formData.imageUrls) || '[]')

    try {
      // Gọi API createWarehouse từ file service hệ thống của bạn
      const response = await warehouseApi.createWarehouse(submissionData)

      if (response && (response.success || response.status === 200 || response.status === 21)) {
        alert('Đăng tin kho vận thành công!')
        navigate('/owner/warehouses') // Chuyển hướng về trang danh sách kho
      } else {
        alert(response?.message || 'Đăng tin thất bại, vui lòng kiểm tra lại dữ liệu.')
      }
    } catch (error) {
      console.error('Error creating warehouse:', error)
      alert('Đã xảy ra lỗi hệ thống khi kết nối API!')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* HEADER CỐ ĐỊNH TRÊN CÙNG */}
      <header className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
        <div className="flex items-center gap-2">
          <div className="shrink-0 rounded-lg p-1">
            <img src={logoDaidien} alt="Logo" className="h-10 w-16 object-contain" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-slate-950">
            StockSpace Portal
          </span>
        </div>
      </header>

      {/* NỘI DUNG CHÍNH BẮT ĐẦU DƯỚI HEADER */}
      <div className="pt-14">
        {/* NÚT QUAY LẠI ĐẶT BÊN TRÁI PHÍA DƯỚI HEADER */}
        <div className="sticky top-14 z-40 -mx-6 -mt-6 bg-slate-50/80 px-6 py-4 backdrop-blur-md md:-mx-10 md:-mt-10 md:px-10">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 active:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại trang trước
            </button>
          </div>
        </div>
        <main className="mx-auto w-full max-w-250 space-y-6 p-6 md:p-10">
          {/* TIÊU ĐỀ TRANG */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Đăng tin kho vận mới</h1>
            <p className="text-sm text-slate-500">
              Vui lòng điền đầy đủ tất cả các trường thông tin có dấu{' '}
              <span className="text-rose-500">*</span> và upload hình ảnh ảnh bìa để mở khóa nút
              đăng tin ở cuối trang.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* KHỐI BÊN TRÁI & GIỮA: THÔNG TIN VÀ HÌNH ẢNH */}
              <div className="space-y-6 lg:col-span-2">
                {/* 1. Thông tin kho */}
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-2 text-xs font-bold tracking-wider text-slate-400 uppercase">
                    1. Thông tin kho
                  </h3>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Tên nhà kho <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Warehouse className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-slate-200 py-2.5 pr-4 pl-10 text-sm font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        placeholder="Kho Lạnh Logistics miền Nam"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Địa chỉ chính xác <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-slate-200 py-2.5 pr-4 pl-10 text-sm font-medium focus:border-blue-500 focus:outline-none"
                        placeholder="Số nhà, Quận/Huyện, Tỉnh/Thành phố"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Sức chứa (m²) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Layers className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          name="capacity"
                          value={formData.capacity}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-slate-200 py-2.5 pr-4 pl-10 text-sm font-medium focus:border-blue-500 focus:outline-none"
                          placeholder="VD: 500"
                          min="1"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Giá thuê / tháng (VND) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          name="pricePerMonth"
                          value={formData.pricePerMonth}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-slate-200 py-2.5 pr-4 pl-10 text-sm font-medium focus:border-blue-500 focus:outline-none"
                          placeholder="VD: 15000000"
                          min="1"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Mô tả chi tiết <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <FileText className="absolute top-4 left-3 h-4 w-4 text-slate-400" />
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full resize-none rounded-xl border border-slate-200 py-2.5 pr-4 pl-10 text-sm font-medium focus:border-blue-500 focus:outline-none"
                        placeholder="Mô tả hiện trạng, hệ thống an ninh, PCCC..."
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Upload File Hình ảnh */}
                <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-bold tracking-wider text-slate-400 uppercase">
                    2. Hình ảnh thực tế
                  </h3>

                  {/* Ảnh bìa chính (Bắt buộc để mở nút Submit) */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700">
                      Ảnh bìa đại diện kho <span className="text-rose-500">*</span>
                    </label>

                    {!coverPreview ? (
                      <div className="flex w-full items-center justify-center">
                        <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/20 transition-colors hover:bg-blue-50/50">
                          <div className="flex flex-col items-center justify-center p-4 text-center">
                            <UploadCloud className="mb-2 h-6 w-6 text-blue-500" />
                            <p className="text-xs font-medium text-slate-700">
                              Tải lên ảnh bìa chính
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              Hỗ trợ JPG, PNG (Bắt buộc)
                            </p>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleCoverChange}
                          />
                        </label>
                      </div>
                    ) : (
                      <div className="relative h-40 w-full max-w-xs overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        <img
                          src={coverPreview}
                          alt="Cover Preview"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={removeCoverFile}
                          className="absolute top-2 right-2 rounded-full bg-slate-900/60 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-rose-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <div className="absolute bottom-2 left-2 rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
                          Ảnh bìa chính
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ảnh phụ */}
                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <label className="text-xs font-semibold text-slate-700">
                      Các ảnh chi tiết bổ sung (Tùy chọn)
                    </label>
                    <div className="flex w-full items-center justify-center">
                      <label className="flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 transition-colors hover:bg-slate-50">
                        <div className="flex flex-col items-center justify-center text-center">
                          <ImageIcon className="mb-1 h-5 w-5 text-slate-400" />
                          <p className="text-xs text-slate-500">
                            Tải lên nhiều hình ảnh góc cạnh nhà kho
                          </p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleSubFilesChange}
                        />
                      </label>
                    </div>

                    {subFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {subFiles.map((file, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 py-1 pr-1.5 pl-3 text-xs font-medium text-slate-700"
                          >
                            <span className="max-w-30 overflow-hidden text-ellipsis whitespace-nowrap">
                              {file.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeSubFile(idx)}
                              className="rounded-md p-0.5 text-slate-400 hover:text-rose-500"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* KHỐI BÊN PHẢI: PHÂN LOẠI & THÔNG TIN LIÊN HỆ */}
              <div className="space-y-6">
                {/* Phân loại kho */}
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-bold tracking-wider text-slate-400 uppercase">
                    3. Phân loại
                  </h3>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Loại hình kho <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="typeName"
                      value={formData.typeName}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium focus:border-blue-500 focus:outline-none"
                      required
                    >
                      <option value="">-- Chọn loại kho --</option>
                      <option value="Kho Thường">Kho tổng hợp (Kho thường)</option>
                      <option value="Kho Lạnh">Kho mát / Kho đông lạnh</option>
                      <option value="Kho Ngoại Quan">Kho ngoại quan</option>
                      <option value="Kho Mini">Kho tự quản mini</option>
                    </select>
                  </div>
                </div>

                {/* Thông tin liên hệ */}
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-bold tracking-wider text-slate-400 uppercase">
                    4. Người liên hệ
                  </h3>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Tên người đại diện <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        name="ownerName"
                        value={formData.ownerName}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-slate-200 py-2.5 pr-4 pl-10 text-sm font-medium focus:border-blue-500 focus:outline-none"
                        placeholder="Nguyễn Văn A"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Số điện thoại <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        name="ownerPhone"
                        value={formData.ownerPhone}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-slate-200 py-2.5 pr-4 pl-10 text-sm font-medium focus:border-blue-500 focus:outline-none"
                        placeholder="090XXXXXXXX"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* NÚT SUBMIT */}
            <div className="pt-4">
              <Button
                type="submit"
                size="sm"
                disabled={!isFormValid || isLoading}
                className={`w-full justify-center rounded-xl py-4 text-base font-semibold shadow-md transition-all ${
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
