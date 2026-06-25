import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSelector, useDispatch } from 'react-redux'
import { logoutThunk } from '../../../store/authSlice'
import {
  Clock,
  Warehouse,
  Boxes,
  Truck,
  Menu,
  X,
  ArrowRight,
  Phone,
  Mail,
  Facebook,
  Youtube,
  Instagram,
} from 'lucide-react'

import logoDaidien from '../../../assets/logoDaidien.png'
import { useNavigate } from 'react-router-dom'
import BackToTop from '../../../components/BackToTop.jsx'
import LoginModal from '../../auth/pages/LoginPage.jsx'
import RegisterModal from '../../auth/pages/RegisterPage.jsx'

const SERVICES = [
  {
    icon: Clock,
    title: 'Cho Thuê Kho Ngắn Hạn',
    desc: 'Giải pháp lưu trữ linh hoạt theo mùa vụ, tối ưu hóa diện tích sử dụng ngắn hạn tùy biến theo dòng chảy hàng hóa của doanh nghiệp.',
  },
  {
    icon: ProjectManagementIcon,
    title: 'Cho Thuê Kho Dài Hạn',
    desc: 'Hệ thống hạ tầng kho bãi kiên cố, diện tích lớn với cam kết vận hành an toàn, ổn định dài lâu cùng chính sách chi phí ưu đãi.',
  },
  {
    icon: Warehouse,
    title: 'Quản Lý Tồn Kho',
    desc: 'Kiểm soát số lượng, định vị vị trí và theo dõi sát sao trạng thái đóng gói hàng hóa chính xác tuyệt đối nhờ quy trình tự động hóa.',
  },
  {
    icon: Boxes,
    title: 'Nhập Xuất Hàng Hóa',
    desc: 'Dịch vụ bốc xếp, phân loại chi tiết và hoàn tất đơn hàng tốc độ cao, hỗ trợ đẩy nhanh hiệu suất vận hành toàn chuỗi cung ứng.',
  },
  {
    icon: Truck,
    title: 'Báo Cáo Tồn Kho Realtime',
    desc: 'Hệ thống cập nhật luồng số liệu tức thời theo thời gian thực, hỗ trợ nhà quản trị đưa ra quyết định tái nhập hàng nhanh chóng.',
  },
]

function ProjectManagementIcon() {
  return (
    <svg
      className="h-8 w-8 text-[#FF5A1F]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
      />
    </svg>
  )
}

const LandingPageKhamkhao = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  
  const { user, isAuthenticated } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const getDashboardInfo = (role) => {
    switch (role) {
      case 'ROLE_TENANT': return { url: '/tenant/dashboard', label: 'Tenant Dashboard' }
      case 'ROLE_OWNER': return { url: '/owner/dashboard', label: 'Owner Dashboard' }
      case 'ROLE_STAFF': return { url: '/staff/dashboard', label: 'Staff Dashboard' }
      case 'ROLE_INSPECTOR': return { url: '/inspector/dashboard', label: 'Inspector Dashboard' }
      case 'ROLE_ADMIN': return { url: '/admin/dashboard', label: 'Admin Dashboard' }
      default: return { url: '/', label: 'Dashboard' }
    }
  }

  // ĐÃ THÊM: Hàm chuyển nhanh từ Login sang Register
  const switchToRegister = () => {
    setIsLoginOpen(false)
    setIsRegisterOpen(true)
  }

  // ĐÃ THÊM: Hàm chuyển nhanh từ Register sang Login
  const switchToLogin = () => {
    setIsRegisterOpen(false)
    setIsLoginOpen(true)
  }

  return (
    <div className="min-h-screen bg-white font-sans text-stone-900 antialiased selection:bg-[#FF5A1F] selection:text-white">
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img src={logoDaidien} alt="Logo" className="h-9 w-auto object-contain" />
            <span className="text-xl font-black tracking-tight text-stone-900 uppercase">
              <span className="text-[#0f084b]">Stock</span>{' '}
              <span className="text-[#FF5A1F]">Space</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-8 md:flex">
            {['Home', 'About', 'Services', 'Solutions', 'Contact'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm font-medium text-stone-600 transition-colors hover:text-[#FF5A1F]"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            {!isAuthenticated ? (
              <>
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className="inline-flex items-center justify-center rounded-md border border-stone-300 bg-white px-5 py-2.5 text-xs font-bold text-stone-700 uppercase transition-all hover:bg-stone-50"
                >
                  Đăng nhập
                </button>

                <button
                  onClick={() => setIsRegisterOpen(true)}
                  className="inline-flex items-center justify-center rounded-md border border-stone-300 bg-white px-5 py-2.5 text-xs font-bold text-stone-700 uppercase transition-all hover:bg-stone-50"
                >
                  Đăng ký
                </button>
              </>
            ) : (
              <div className="group relative">
                <button className="flex items-center gap-2 text-sm font-bold text-stone-700 hover:text-[#FF5A1F]">
                  <div className="h-8 w-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-600">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <span>{user?.name || 'User'}</span>
                </button>
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 opacity-0 invisible transition-all group-hover:opacity-100 group-hover:visible z-50">
                  <div className="py-1">
                    <button 
                      onClick={() => navigate('/profile')}
                      className="block w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
                    >
                      Hồ sơ cá nhân
                    </button>
                    {user?.role && (
                      <button 
                        onClick={() => navigate(getDashboardInfo(user.role).url)}
                        className="block w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-100 font-medium text-[#FF5A1F]"
                      >
                        {getDashboardInfo(user.role).label}
                      </button>
                    )}
                    <button className="block w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-100">
                      Cài đặt
                    </button>
                    <button
                      onClick={() => {
                        dispatch(logoutThunk())
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-stone-100"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div>
              <a
                href="#get-started"
                className="inline-flex items-center justify-center rounded-md bg-[#FF5A1F] px-5 py-2.5 text-xs font-bold tracking-wider text-white uppercase transition-all hover:bg-[#e04e19]"
              >
                Xem Kho <ArrowRight size={14} className="ml-1" />
              </a>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-stone-600 hover:text-[#FF5A1F] md:hidden"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* --- SERVICES SECTION --- */}
      <section id="services" className="bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto mb-20 max-w-3xl space-y-4 text-center">
            <h2 className="text-5xl font-extrabold tracking-tight text-stone-900 uppercase sm:text-6xl">
              Dịch vụ cốt lõi
            </h2>
            <p className="mx-auto max-w-xl text-sm leading-relaxed font-medium text-stone-500">
              Không gian thông minh. Quản trị tinh gọn. Hệ thống lưu kho toàn diện giải quyết triệt
              để bài toán vận hành hậu cần sau khi thuê cho doanh nghiệp của bạn.
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <a
                href="#quote"
                className="rounded-md bg-[#FF5A1F] px-6 py-3 text-xs font-bold tracking-wider text-white uppercase hover:bg-[#e04e19]"
              >
                Nhận báo giá ngay
              </a>
              <a
                href="#learn"
                className="rounded-md border border-stone-300 bg-white px-6 py-3 text-xs font-bold tracking-wider text-stone-800 uppercase hover:bg-stone-50"
              >
                Tìm hiểu thêm
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((srv, idx) => {
              const IconComp = srv.icon
              const getGridSpacing = (index) => {
                if (index === 0) return 'lg:mt-0'
                if (index === 1) return 'lg:mt-12'
                if (index === 2) return 'lg:mt-24'
                if (index === 3) return 'lg:-mt-12'
                return 'lg:mt-0'
              }

              return (
                <div
                  key={idx}
                  className={`border border-stone-200 bg-white p-8 text-left transition-all hover:shadow-xl ${getGridSpacing(idx)}`}
                >
                  <div className="mb-6 inline-block rounded-sm bg-stone-50 p-3 text-[#FF5A1F]">
                    <IconComp size={32} strokeWidth={1.2} />
                  </div>
                  <h3 className="mb-3 text-xl font-bold tracking-tight text-stone-950">
                    {srv.title}
                  </h3>
                  <p className="mb-6 text-xs leading-relaxed text-stone-500">{srv.desc}</p>
                  <a
                    href="#details"
                    className="inline-flex items-center gap-2 text-xs font-bold tracking-wider text-stone-950 uppercase hover:text-[#FF5A1F]"
                  >
                    <span className="flex h-4 w-4 items-center justify-center bg-stone-950 text-[10px] text-white">
                      ➔
                    </span>
                    Xem chi tiết
                  </a>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section className="relative overflow-hidden bg-[#F4F4F4] py-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-12 lg:px-8">
          <div className="z-10 space-y-6 text-left lg:col-span-7">
            <h2 className="text-4xl leading-tight font-extrabold tracking-tight text-stone-900 uppercase sm:text-5xl">
              Sẵn sàng bứt phá?
              <br />
              Tối ưu vận hành kho bãi ngay hôm nay.
            </h2>
            <p className="max-w-xl text-xs leading-relaxed font-medium text-stone-500">
              Bàn giao mặt bằng tiêu chuẩn cao kết hợp triển khai hệ thống số hóa quản trị tài sản
              tức thì. Chúng tôi không chỉ cho thuê diện tích, chúng tôi đồng hành cùng sự tăng
              trưởng của bạn.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <a
                href="#cta-quote"
                className="rounded-md bg-[#FF5A1F] px-6 py-3 text-xs font-bold tracking-wider text-white uppercase hover:bg-[#e04e19]"
              >
                Yêu cầu tư vấn
              </a>
              <a
                href="#services"
                className="rounded-md border border-stone-300 bg-transparent px-6 py-3 text-xs font-bold tracking-wider text-stone-800 uppercase hover:bg-stone-100"
              >
                Xem toàn bộ dịch vụ
              </a>
            </div>
          </div>

          <div className="relative flex h-64 w-full items-center justify-center overflow-hidden lg:col-span-5 lg:h-96">
            <div className="absolute inset-0 bg-[#FF5A1F]/10 opacity-90 mix-blend-multiply" />
            <svg
              className="h-full w-full stroke-[1] text-[#FF5A1F]/40"
              viewBox="0 0 100 100"
              fill="none"
            >
              <path
                d="M0,10 L100,90 M0,90 L100,10 M10,0 L10,100 M90,0 L90,100 M0,50 L100,50"
                stroke="currentColor"
              />
              <path d="M30,0 L30,100 M70,0 L70,100" stroke="currentColor" strokeDasharray="2,2" />
            </svg>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-[#121212] pt-16 pb-12 text-left text-stone-400">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 border-b border-stone-800 pb-16 sm:grid-cols-2 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-4">
              <div className="flex items-center gap-2 text-white">
                <span className="text-xl font-black tracking-wider uppercase">
                  <span className="text-white">Stock</span>{' '}
                  <span className="text-[#FF5A1F]">Space</span>
                </span>
              </div>
              <p className="max-w-sm text-xs leading-relaxed text-stone-500">
                Giải pháp hạ tầng lưu trữ tích hợp hệ thống số hóa thông minh, giải quyết triệt để
                bài toán lưu trữ và kiểm soát dữ liệu tồn kho sau khi ký hợp đồng thuê mặt bằng.
              </p>
              <div className="flex gap-3 pt-2">
                {[Facebook, Youtube, Instagram].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-900 text-white transition-colors hover:bg-[#FF5A1F]"
                  >
                    <Icon size={14} />
                  </a>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2">
              <h4 className="mb-4 text-xs font-bold tracking-wider text-white uppercase">Menu</h4>
              <ul className="space-y-2.5 text-xs">
                {['Trang chủ', 'Về chúng tôi', 'Dịch vụ kho', 'Giải pháp', 'Bảng giá'].map(
                  (link) => (
                    <li key={link}>
                      <a href="#" className="transition-colors hover:text-white">
                        {link}
                      </a>
                    </li>
                  )
                )}
              </ul>
            </div>

            <div className="lg:col-span-2">
              <h4 className="mb-4 text-xs font-bold tracking-wider text-white uppercase">Hỗ trợ</h4>
              <ul className="space-y-2.5 text-xs">
                {[
                  'Điều khoản sử dụng',
                  'Chính sách bảo mật',
                  'Trợ giúp 24/7',
                  'Tài liệu API',
                  'Quy trình vận hành',
                ].map((link) => (
                  <li key={link}>
                    <a href="#" className="transition-colors hover:text-white">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4 lg:col-span-4">
              <h4 className="mb-4 text-xs font-bold tracking-wider text-white uppercase">
                Liên hệ
              </h4>
              <div className="flex items-center gap-4 border border-stone-800 bg-[#1a1a1a] p-4 transition-all hover:border-stone-700">
                <div className="text-[#FF5A1F]">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-stone-500 uppercase">Hotline chăm sóc</p>
                  <p className="text-xs font-bold text-white">123456789</p>
                </div>
              </div>
              <div className="flex items-center gap-4 border border-stone-800 bg-[#1a1a1a] p-4 transition-all hover:border-stone-700">
                <div className="text-[#FF5A1F]">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-stone-500 uppercase">Hòm thư điện tử</p>
                  <p className="text-xs font-bold text-white">cuongbui10704@gmail.com</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between pt-8 text-[11px] text-stone-600 sm:flex-row">
            <p>© {new Date().getFullYear()} StockSpace. Tất cả các quyền được bảo hộ.</p>
          </div>
        </div>
      </footer>

      <BackToTop />

      {/* ĐÃ CẬP NHẬT: Quản lý và chuyển giao prop cho LoginModal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSwitchToRegister={switchToRegister}
      />

      {/* ĐÃ CẬP NHẬT: Quản lý và chuyển giao prop cho RegisterModal */}
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSwitchToLogin={switchToLogin}
      />
    </div>
  )
}

export default LandingPageKhamkhao
