import { useState } from 'react'
import { User, Mail, Phone, MapPin, Lock, Camera, Save } from 'lucide-react'
import Button from '@/components/atoms/Button'

// Import Sidebar và Header mới tách
import Sidebar from '../../../components/SideBar'
import Header from '../../../components/HeaderDashboard' // Đảm bảo đường dẫn này trỏ đúng đến file Header.jsx của bạn
import { toast } from 'react-hot-toast'

const OwnerProfile = () => {
  // Quản lý trạng thái đóng mở Sidebar đồng bộ với hệ thống
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Mock data thông tin người dùng ban đầu
  const [formData, setFormData] = useState({
    fullName: "Nguyen Van A",
    email: 'nguyenvana@stockspace.vn',
    phone: '0901234567',
    role: "Warehouse owner (OWNER)",
    address: "123 Song Hanh Street, District 2, City. Ho Chi Minh",
    bio: "Managing the logistics chain in the Southern region.",
  })

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileOpen(!isMobileOpen)
    } else {
      setIsSidebarExpanded(!isSidebarExpanded)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Xử lý logic Call API cập nhật thông tin tại đây
    toast.success("Updated account information successfully!")
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      1. FIXED GLOBAL HEADER (Replaced with shared Component)
      <Header toggleSidebar={toggleSidebar} />
      {/* MOBILE OVERLAY */}
      <div className="md:hidden">
        {isMobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/30"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </div>
      <div className="flex pt-14">
        {/* 2. APP SIDEBAR */}
        <Sidebar
          isSidebarExpanded={isSidebarExpanded}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
          currentRole="OWNER"
        />

        {/* 3. DYNAMIC CONTAINER NỘI DUNG CHÍNH */}
        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-[72px]'
          }`}
        >
          <main className="mx-auto w-full max-w-[1200px] space-y-6 p-6 md:p-8">
            {/* Header Tiêu đề */}
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Personal information</h1>
              <p className="text-sm text-slate-500">
                Manage account profile information and basic security settings.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* CỘT TRÁI: AVATAR & THAO TÁC NHANH */}
              <div className="flex h-fit flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <div className="group relative mb-4 cursor-pointer">
                  <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-slate-100 bg-slate-200">
                    <User className="h-16 w-16 text-slate-400" />
                  </div>
                  <button className="absolute right-0 bottom-0 rounded-full bg-blue-600 p-2 text-white shadow-md transition-all group-hover:scale-105 hover:bg-blue-700">
                    <Camera className="h-4 w-4" />
                  </button>
                </div>

                <h3 className="text-lg font-bold text-slate-900">{formData.fullName}</h3>
                <p className="mt-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold tracking-wider text-blue-600 uppercase">
                  {formData.role}
                </p>
                <p className="mt-2 text-sm text-slate-400">{formData.email}</p>

                <div className="mt-6 w-full space-y-2 border-t border-slate-100 pt-4">
                  <Button variant="outline" size="sm" className="w-full justify-center">
                    <Lock className="mr-2 h-4 w-4" /> Change password
                  </Button>
                </div>
              </div>

              {/* CỘT PHẢI: FORM CHỈNH SỬA THÔNG TIN */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                <h3 className="mb-6 border-b border-slate-100 pb-2 text-base font-bold text-slate-900">
                  Profile details
                </h3>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Họ và tên */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600">Full name</label>
                      <div className="relative">
                        <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleChange}
                          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          placeholder="Enter first and last name"
                          required
                        />
                      </div>
                    </div>

                    {/* Số điện thoại */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600">Phone number</label>
                      <div className="relative">
                        <Phone className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          placeholder="Enter phone number"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Địa chỉ Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">
                      Email Address (Cannot be changed)
                    </label>
                    <div className="relative">
                      <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-300" />
                      <input
                        type="email"
                        value={formData.email}
                        disabled
                        className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-4 pl-10 text-sm font-medium text-slate-400"
                      />
                    </div>
                  </div>

                  {/* Địa chỉ liên hệ */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Contact address</label>
                    <div className="relative">
                      <MapPin className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        placeholder="Enter your address"
                      />
                    </div>
                  </div>

                  {/* Giới thiệu ngắn */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Short introduction</label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      rows={4}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      placeholder="Describe a little about yourself..."
                    />
                  </div>

                  {/* Nút submit */}
                  <div className="flex justify-end pt-2">
                    <Button type="submit" size="sm" className="px-6">
                      <Save className="mr-2 h-4 w-4" /> Save changes
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default OwnerProfile
