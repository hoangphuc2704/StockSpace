import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Warehouse,
  Clock,
  ShieldCheck,
  Boxes,
  FileSpreadsheet,
  Truck,
  TrendingUp,
  Layers,
  Menu,
  X,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Users,
  Activity,
  Star,
  ChevronDown,
  Phone,
  Mail,
  MapPin,
  LayoutDashboard,
  Download,
  AlertTriangle,
  Facebook,
  Linkedin,
  Youtube,
} from 'lucide-react'

// --- MOCK DATA ---
const SERVICES = [
  {
    icon: Clock,
    title: 'Cho Thuê Kho Ngắn Hạn',
    desc: 'Giải pháp lưu trữ linh hoạt theo mùa vụ, phù hợp cho các chiến dịch kinh doanh ngắn hạn của doanh nghiệp.',
  },
  {
    icon: Warehouse,
    title: 'Cho Thuê Kho Dài Hạn',
    desc: 'Hệ thống kho bãi cố định với diện tích lớn, cam kết vận hành ổn định và tối ưu chi phí dài hạn.',
  },
  {
    icon: Boxes,
    title: 'Quản Lý Tồn Kho',
    desc: 'Kiểm soát số lượng, vị trí và tình trạng hàng hóa chính xác tuyệt đối nhờ quy trình chuẩn hóa.',
  },
  {
    icon: Truck,
    title: 'Nhập Xuất Hàng Hóa',
    desc: 'Dịch vụ bốc xếp, phân loại và hoàn tất đơn hàng chuyên nghiệp, tăng tốc độ xử lý chuỗi cung ứng.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Báo Cáo Tồn Kho Realtime',
    desc: 'Hệ thống cập nhật số liệu tự động theo từng giây, giúp đưa ra quyết định nhập hàng kịp thời.',
  },
]

const STEPS = [
  {
    num: '01',
    title: 'Đăng Ký Nhu Cầu',
    desc: 'Gửi thông tin diện tích và loại hàng hóa cần lưu trữ.',
  },
  {
    num: '02',
    title: 'Khảo Sát & Tư Vấn',
    desc: 'Chuyên viên WarehousePro liên hệ tư vấn giải pháp kho tối ưu.',
  },
  {
    num: '03',
    title: 'Ký Hợp Đồng',
    desc: 'Thống nhất các điều khoản minh bạch, linh hoạt theo ngân sách.',
  },
  {
    num: '04',
    title: 'Bàn Giao & Quản Lý',
    desc: 'Kích hoạt tài khoản phần mềm và tiến hành lưu kho.',
  },
]

const FEATURES = [
  {
    title: 'Giá Thuê Cạnh Tranh',
    desc: 'Tối ưu chi phí lưu trữ nhờ mô hình chia sẻ không gian linh hoạt, dùng bao nhiêu trả bấy nhiêu.',
  },
  {
    title: 'Hợp Đồng Minh Bạch',
    desc: 'Điều khoản rõ ràng, cam kết không phát sinh chi phí ẩn và hỗ trợ thay đổi diện tích linh hoạt.',
  },
  {
    title: 'Hỗ Trợ Kỹ Thuật Nhanh Chóng',
    desc: 'Đội ngũ kỹ sư vận hành và chuyên viên IT túc trực hỗ trợ hệ thống 24/7/365.',
  },
  {
    title: 'Hệ Thống Quản Lý Thông Minh',
    desc: 'Quản lý, theo dõi biến động hàng hóa mọi lúc mọi nơi ngay trên giao diện Web/Mobile.',
  },
]

const STATS = [
  { value: '500+', label: 'Khách hàng doanh nghiệp' },
  { value: '99.9%', label: 'Độ an toàn hàng hóa' },
  { value: '24/7', label: 'Hỗ trợ khách hàng' },
]

const TESTIMONIALS = [
  {
    name: 'Nguyễn Văn Minh',
    role: 'Giám đốc Vận hành',
    company: 'LogiTech Express',
    content:
      'Từ khi chuyển sang dùng hệ thống kho và phần mềm quản lý của WarehousePro, tỷ lệ sai sót đơn hàng của chúng tôi giảm từ 3% xuống còn dưới 0.1%. Rất đáng đầu tư!',
  },
  {
    name: 'Lê Thị Hồng Hạnh',
    role: 'Trưởng phòng Chuỗi cung ứng',
    company: 'FastRetail Việt Nam',
    content:
      'Vị trí kho tại TP.HCM rất thuận tiện cho việc phân phối chặng cuối. Thao tác xuất nhập hàng nhanh chóng, thủ tục giấy tờ minh bạch khiến tôi cực kỳ yên tâm.',
  },
  {
    name: 'Trần Đại Hải',
    role: 'Founder',
    company: 'Hải Sản Biển Đông',
    content:
      'Kho bãi hiện đại, hệ thống cảnh báo tồn kho thấp hoạt động rất nhạy giúp doanh nghiệp chủ động được nguồn hàng phân phối cho các siêu thị.',
  },
]

const FAQS = [
  {
    q: 'Có thể thuê theo tháng không?',
    a: 'Có. WarehousePro cung cấp cả giải pháp thuê ngắn hạn theo tháng linh hoạt để phục vụ nhu cầu lưu trữ thời vụ hoặc chạy chiến dịch của doanh nghiệp.',
  },
  {
    q: 'Có hỗ trợ quản lý hàng hóa không?',
    a: 'Chúng tôi cung cấp trọn gói từ không gian kho, đội ngũ bốc xếp vận hành chuyên nghiệp đến phần mềm quản lý theo dõi từ xa.',
  },
  {
    q: 'Có tích hợp phần mềm quản lý kho không?',
    a: 'Có, tất cả khách hàng thuê kho tại WarehousePro đều được cấp tài khoản sử dụng hệ thống Dashboard SaaS độc quyền để quản lý dữ liệu thời gian thực.',
  },
  {
    q: 'Chính sách bảo hiểm hàng hóa như thế nào?',
    a: '100% kho bãi của WarehousePro đều được trang bị hệ thống PCCC tiêu chuẩn quốc tế và có gói bảo hiểm rủi ro tài sản toàn diện cho khách hàng.',
  },
]

const LandingPageKhamkhao = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 antialiased selection:bg-[#FF7A00] selection:text-white">
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-[#FFFFFF]/90 shadow-sm backdrop-blur-md transition-all">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-[#0F3D75] p-2 text-[#FFFFFF] shadow-md shadow-[#0F3D75]/20">
              <Warehouse size={24} className="stroke-[2.5]" />
            </div>
            <span className="text-xl font-black tracking-tight text-[#0F3D75]">
              Warehouse<span className="text-[#FF7A00]">Pro</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#trang-chu"
              className="text-sm font-semibold text-slate-600 transition-colors hover:text-[#0F3D75]"
            >
              Trang chủ
            </a>
            <a
              href="#dich-vu"
              className="text-sm font-semibold text-slate-600 transition-colors hover:text-[#0F3D75]"
            >
              Dịch vụ
            </a>
            <a
              href="#giai-phap"
              className="text-sm font-semibold text-slate-600 transition-colors hover:text-[#0F3D75]"
            >
              Giải pháp
            </a>
            <a
              href="#bang-gia"
              className="text-sm font-semibold text-slate-600 transition-colors hover:text-[#0F3D75]"
            >
              Bảng giá
            </a>
            <a
              href="#faq"
              className="text-sm font-semibold text-slate-600 transition-colors hover:text-[#0F3D75]"
            >
              FAQ
            </a>
            <a
              href="#lien-he"
              className="text-sm font-semibold text-slate-600 transition-colors hover:text-[#0F3D75]"
            >
              Liên hệ
            </a>
          </nav>

          <div className="hidden md:block">
            <a
              href="#lien-he"
              className="inline-flex items-center justify-center rounded-xl bg-[#0F3D75] px-5 py-2.5 text-sm font-bold text-[#FFFFFF] shadow-md shadow-[#0F3D75]/10 transition-all hover:-translate-y-0.5 hover:bg-[#0F3D75]/90"
            >
              Nhận Báo Giá
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-slate-600 hover:text-[#0F3D75] md:hidden"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-20 left-0 flex w-full flex-col gap-4 border-b border-slate-200 bg-[#FFFFFF] px-4 py-6 shadow-xl md:hidden"
            >
              <a
                href="#trang-chu"
                onClick={() => setIsMenuOpen(false)}
                className="border-b border-slate-50 py-2 text-base font-bold text-slate-700"
              >
                Trang chủ
              </a>
              <a
                href="#dich-vu"
                onClick={() => setIsMenuOpen(false)}
                className="border-b border-slate-50 py-2 text-base font-bold text-slate-700"
              >
                Dịch vụ
              </a>
              <a
                href="#giai-phap"
                onClick={() => setIsMenuOpen(false)}
                className="border-b border-slate-50 py-2 text-base font-bold text-slate-700"
              >
                Giải pháp
              </a>
              <a
                href="#bang-gia"
                onClick={() => setIsMenuOpen(false)}
                className="border-b border-slate-50 py-2 text-base font-bold text-slate-700"
              >
                Bảng giá
              </a>
              <a
                href="#faq"
                onClick={() => setIsMenuOpen(false)}
                className="border-b border-slate-50 py-2 text-base font-bold text-slate-700"
              >
                FAQ
              </a>
              <a
                href="#lien-he"
                onClick={() => setIsMenuOpen(false)}
                className="border-b border-slate-50 py-2 text-base font-bold text-slate-700"
              >
                Liên hệ
              </a>
              <a
                href="#lien-he"
                onClick={() => setIsMenuOpen(false)}
                className="mt-2 w-full rounded-xl bg-[#0F3D75] py-3 text-center text-sm font-bold text-[#FFFFFF] shadow-md"
              >
                Nhận Báo Giá
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* --- HERO SECTION --- */}
      <section
        id="trang-chu"
        className="relative overflow-hidden bg-gradient-to-b from-white to-[#F8FAFC] pt-12 pb-24 lg:pt-20 lg:pb-32"
      >
        <div className="pointer-events-none absolute top-0 right-0 -mt-20 -mr-40 h-[500px] w-[500px] rounded-full bg-[#0F3D75]/5 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 -mb-20 -ml-40 h-[400px] w-[400px] rounded-full bg-[#FF7A00]/5 blur-3xl" />

        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8">
          {/* Hero Left */}
          <div className="space-y-8 text-left lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#0F3D75]/10 bg-[#0F3D75]/5 px-3 py-1.5 text-xs font-bold tracking-wide text-[#0F3D75] uppercase">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#FF7A00]" />
              Hệ thống kho vận thông minh hàng đầu TP.HCM
            </div>
            <h1 className="text-4xl leading-[1.1] font-black tracking-tight text-[#0F3D75] sm:text-5xl lg:text-6xl">
              Giải Pháp Cho Thuê Kho <br className="hidden sm:inline" />
              Và Quản Lý Hàng Hóa <br />
              <span className="text-[#FF7A00]">Toàn Diện Tại TP.HCM</span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed font-medium text-slate-500">
              Kho bãi hiện đại, quản lý tồn kho theo thời gian thực, hỗ trợ nhập xuất hàng chuyên
              nghiệp giúp doanh nghiệp tối ưu chi phí vận hành.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <a
                href="#lien-he"
                className="group inline-flex h-14 items-center justify-center rounded-2xl bg-[#0F3D75] px-8 text-base font-bold text-white shadow-xl shadow-[#0F3D75]/20 transition-all hover:-translate-y-0.5 hover:bg-[#0F3D75]/90"
              >
                Nhận Báo Giá{' '}
                <ArrowRight
                  size={18}
                  className="ml-2 transition-transform group-hover:translate-x-1"
                />
              </a>
              <a
                href="#lien-he"
                className="inline-flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-white px-8 text-base font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50"
              >
                Đặt Lịch Tham Quan Kho
              </a>
            </div>
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-200/60 pt-4 text-sm font-bold text-slate-600">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-[#FF7A00]" /> Quản lý thời gian thực
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-[#FF7A00]" /> Hỗ trợ 24/7
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-[#FF7A00]" /> Vận hành chuyên nghiệp
              </div>
            </div>
          </div>

          {/* Hero Right: Premium Visual & Mini Dashboard */}
          <div className="relative flex h-[400px] w-full items-center justify-center overflow-hidden rounded-3xl border border-slate-200/60 bg-slate-200/40 shadow-2xl shadow-slate-300/40 sm:h-[500px] lg:col-span-6">
            {/* Base Background: Isometric Warehouse Illustration Representation */}
            <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-br from-slate-900 via-[#0F3D75] to-slate-950 p-8">
              <div className="flex items-start justify-between opacity-20">
                <div className="grid h-24 w-24 grid-cols-3 gap-2 rounded-xl border border-white/20 p-2">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="rounded-sm bg-white/40" />
                  ))}
                </div>
                <div className="h-32 w-48 rounded-xl border border-white/20 bg-white/5" />
              </div>
              <div className="flex items-center justify-center gap-4 text-9xl font-black tracking-tighter text-white/10 select-none">
                LOGISTICS
              </div>
            </div>

            {/* Overlay Elements representing modern logistics nodes */}
            <div className="absolute inset-0 z-10 flex flex-col justify-end gap-4 p-6">
              {/* Warehouse Status Badge Floating */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex max-w-xs items-center gap-3 self-end rounded-2xl border border-slate-100 bg-white/95 p-4 shadow-xl backdrop-blur-md"
              >
                <div className="rounded-xl bg-[#FF7A00]/10 p-2.5 text-[#FF7A00]">
                  <Truck size={20} />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    Đang nhập kho
                  </p>
                  <p className="text-sm font-black text-slate-800">Xe hàng #4829 - Đang xử lý</p>
                </div>
              </motion.div>

              {/* Floating Live SaaS Widget Overlay */}
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mx-auto w-full max-w-md rounded-2xl border border-slate-100 bg-white p-4 shadow-2xl"
              >
                <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 animate-ping rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-700">Dữ liệu thời gian thực</span>
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                    Khu A-05
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-left">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400">Tỷ lệ lấp đầy</span>
                    <p className="text-lg font-extrabold text-[#0F3D75]">84.2%</p>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full w-[84%] bg-[#FF7A00]" />
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400">
                      Nhiệt độ hiện tại
                    </span>
                    <p className="text-lg font-extrabold text-emerald-600">22.5 °C</p>
                    <span className="text-[10px] font-bold text-slate-400">
                      ✓ Đạt chuẩn lưu kho
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* --- VỀ CHÚNG TÔI --- */}
      <section className="border-t border-slate-100 bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="space-y-6 text-left">
              <span className="text-sm font-extrabold tracking-widest text-[#FF7A00] uppercase">
                Về chúng tôi
              </span>
              <h2 className="text-3xl font-black tracking-tight text-[#0F3D75] sm:text-4xl">
                Đối Tác Tin Cậy Trong Lĩnh Vực Kho Bãi
              </h2>
              <p className="text-base leading-relaxed font-medium text-slate-500 sm:text-lg">
                Chúng tôi cung cấp giải pháp lưu trữ và quản lý hàng hóa chuyên nghiệp cho cá nhân
                và doanh nghiệp tại TP.HCM. Hệ thống kho hiện đại kết hợp phần mềm quản lý thông
                minh giúp kiểm soát hàng hóa hiệu quả.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                'Vị trí thuận tiện tại TP.HCM',
                'Hệ thống quản lý hiện đại',
                'Hỗ trợ doanh nghiệp mọi quy mô',
                'Đội ngũ vận hành chuyên nghiệp',
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200/50 bg-[#F8FAFC] p-6 text-left transition-all duration-300 hover:border-[#0F3D75]/20 hover:bg-white hover:shadow-xl"
                >
                  <div className="mt-1 shrink-0 rounded-md bg-[#0F3D75]/5 p-1 text-[#0F3D75]">
                    <CheckCircle2 size={18} />
                  </div>
                  <p className="text-base font-bold text-slate-800">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --- DỊCH VỤ NỔI BẬT --- */}
      <section id="dich-vu" className="bg-[#F8FAFC] py-24">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-3xl space-y-4">
            <span className="text-sm font-extrabold tracking-widest text-[#FF7A00] uppercase">
              Dịch vụ toàn diện
            </span>
            <h2 className="text-3xl font-black tracking-tight text-[#0F3D75] sm:text-4xl">
              Dịch Vụ Nổi Bật Tại WarehousePro
            </h2>
            <p className="text-base font-medium text-slate-500 sm:text-lg">
              Hạ tầng đáp ứng đa dạng các yêu cầu quản lý chuỗi cung ứng khắt khe của mọi ngành
              hàng.
            </p>
          </div>

          {/* Grid 5 Cards Layout */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((srv, idx) => {
              const IconComp = srv.icon
              return (
                <div
                  key={idx}
                  className={`group flex flex-col justify-between rounded-2xl border border-slate-200/60 bg-white p-8 text-left shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-transparent hover:shadow-2xl ${
                    idx >= 3 ? 'lg:col-span-1.5 md:col-span-1' : ''
                  }`}
                >
                  <div className="space-y-6">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#0F3D75]/5 text-[#0F3D75] shadow-sm transition-all group-hover:bg-[#0F3D75] group-hover:text-white">
                      <IconComp size={26} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-slate-900">{srv.title}</h3>
                      <p className="text-sm leading-relaxed font-medium text-slate-500">
                        {srv.desc}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center border-t border-slate-100 pt-6 text-xs font-bold text-[#0F3D75] transition-colors group-hover:text-[#FF7A00]">
                    Tìm hiểu chi tiết <ChevronRight size={14} className="ml-1" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* --- QUY TRÌNH THUÊ KHO --- */}
      <section className="overflow-hidden border-t border-b border-slate-100 bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-3xl space-y-4">
            <span className="text-sm font-extrabold tracking-widest text-[#FF7A00] uppercase">
              Quy trình chuẩn hóa
            </span>
            <h2 className="text-3xl font-black tracking-tight text-[#0F3D75] sm:text-4xl">
              Quy Trình Thuê Kho Tiết Kiệm Thời Gian
            </h2>
          </div>

          {/* Horizontal Timeline */}
          <div className="relative grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Background Line Connector for Desktop */}
            <div className="absolute top-12 right-[12%] left-[12%] z-0 hidden h-[2px] bg-slate-100 lg:block" />

            {STEPS.map((step, idx) => (
              <div key={idx} className="group relative z-10 flex flex-col items-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-slate-200 bg-[#F8FAFC] text-xl font-black text-slate-400 shadow-sm transition-all group-hover:border-[#0F3D75] group-hover:bg-[#0F3D75] group-hover:text-white">
                  {step.num}
                </div>
                <h3 className="mb-2 text-lg font-black text-slate-900">{step.title}</h3>
                <p className="max-w-xs text-sm leading-relaxed font-medium text-slate-500">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- GIẢI PHÁP QUẢN LÝ SAU KHI THUÊ (SAAS DASHBOARD MOCKUP) --- */}
      <section id="giai-phap" className="bg-[#F8FAFC] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            {/* Content Left */}
            <div className="space-y-8 text-left lg:col-span-5">
              <div className="space-y-4">
                <span className="text-sm font-extrabold tracking-widest text-[#FF7A00] uppercase">
                  Hệ thống quản trị SaaS
                </span>
                <h2 className="text-3xl leading-tight font-black tracking-tight text-[#0F3D75] sm:text-4xl">
                  Quản Lý Kho <br />
                  Mọi Lúc, Mọi Nơi
                </h2>
                <p className="text-base leading-relaxed font-medium text-slate-500">
                  Đồng bộ hóa hoạt động vận hành thực tế lên đám mây. Sở hữu công cụ quản trị dữ
                  liệu thông minh độc quyền giúp bạn đưa ra chiến lược chính xác nhất.
                </p>
              </div>

              {/* Feature List */}
              <div className="space-y-4">
                {[
                  'Dashboard quản lý hàng hóa tổng quan',
                  'Theo dõi tồn kho realtime chính xác 100%',
                  'Lịch sử nhập xuất hàng chi tiết chi tiết',
                  'Cảnh báo thông minh khi tồn kho thấp',
                  'Xuất báo cáo tự động bằng 1-Click',
                ].map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 text-sm font-bold text-slate-700 sm:text-base"
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                      <CheckCircle2 size={14} className="stroke-[3]" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Dashboard Mockup Right */}
            <div className="flex h-[500px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl lg:col-span-7">
              {/* Mockup Topbar */}
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3 text-white">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </div>
                  <span className="ml-2 text-xs font-semibold text-slate-400">
                    wms.warehousepro.vn/dashboard
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live
                  Client
                </div>
              </div>

              {/* Mockup Main Frame */}
              <div className="flex flex-1 overflow-hidden text-left text-xs text-slate-700">
                {/* Sidebar */}
                <div className="hidden w-40 shrink-0 flex-col gap-1 border-r border-slate-200/60 bg-slate-50 p-3 sm:flex">
                  <div className="mb-2 px-2 py-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    Điều hướng
                  </div>
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex items-center gap-2 rounded-lg px-2 py-2 font-bold transition-colors ${activeTab === 'dashboard' ? 'bg-[#0F3D75] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <LayoutDashboard size={14} /> Dashboard
                  </button>
                  <button
                    onClick={() => setActiveTab('inventory')}
                    className={`flex items-center gap-2 rounded-lg px-2 py-2 font-bold transition-colors ${activeTab === 'inventory' ? 'bg-[#0F3D75] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <Boxes size={14} /> Tồn kho
                  </button>
                  <div className="flex cursor-not-allowed items-center gap-2 px-2 py-2 font-bold text-slate-400">
                    <Truck size={14} /> Nhập hàng
                  </div>
                  <div className="flex cursor-not-allowed items-center gap-2 px-2 py-2 font-bold text-slate-400">
                    <Activity size={14} /> Xuất hàng
                  </div>
                  <div className="flex cursor-not-allowed items-center gap-2 px-2 py-2 font-bold text-slate-400">
                    <FileSpreadsheet size={14} /> Báo cáo
                  </div>
                </div>

                {/* Dashboard Core Content View */}
                <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50/40 p-4 sm:p-6">
                  {activeTab === 'dashboard' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-6"
                    >
                      {/* Widgets */}
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
                          <p className="text-[10px] font-bold tracking-tight text-slate-400 uppercase">
                            Tổng hàng tồn
                          </p>
                          <p className="mt-1 text-base font-black text-[#0F3D75]">24,580</p>
                        </div>
                        <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
                          <p className="text-[10px] font-bold tracking-tight text-slate-400 uppercase">
                            Số đơn nhập
                          </p>
                          <p className="mt-1 text-base font-black text-emerald-600">142</p>
                        </div>
                        <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
                          <p className="text-[10px] font-bold tracking-tight text-slate-400 uppercase">
                            Số đơn xuất
                          </p>
                          <p className="mt-1 text-base font-black text-[#FF7A00]">98</p>
                        </div>
                        <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
                          <p className="text-[10px] font-bold tracking-tight text-slate-400 uppercase">
                            Lấp đầy kho
                          </p>
                          <p className="mt-1 text-base font-black text-indigo-600">78.4%</p>
                        </div>
                      </div>

                      {/* Charts Simulated */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                          <p className="text-xs font-bold text-slate-800">
                            Nhập/Xuất Theo Tháng (Tấn)
                          </p>
                          <div className="flex h-24 items-end gap-3 border-b border-slate-200 px-1 pt-2">
                            <div className="flex-1 space-y-1">
                              <div className="h-12 rounded-t-sm bg-[#0F3D75]" />
                              <div className="h-6 rounded-t-sm bg-[#FF7A00]" />
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="h-16 rounded-t-sm bg-[#0F3D75]" />
                              <div className="h-10 rounded-t-sm bg-[#FF7A00]" />
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="h-20 rounded-t-sm bg-[#0F3D75]" />
                              <div className="h-14 rounded-t-sm bg-[#FF7A00]" />
                            </div>
                          </div>
                          <div className="flex justify-between px-1 text-[10px] font-bold text-slate-400">
                            <span>Tháng 4</span>
                            <span>Tháng 5</span>
                            <span>Tháng 6</span>
                          </div>
                        </div>

                        <div className="space-y-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                          <p className="text-xs font-bold text-slate-800">
                            Tồn Kho Theo Nhóm Sản Phẩm
                          </p>
                          <div className="space-y-2 pt-1">
                            <div>
                              <div className="mb-1 flex justify-between text-[10px] font-bold text-slate-600">
                                <span>Điện tử máy móc</span>
                                <span>45%</span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-slate-100">
                                <div className="h-full w-[45%] rounded-full bg-[#0F3D75]" />
                              </div>
                            </div>
                            <div>
                              <div className="mb-1 flex justify-between text-[10px] font-bold text-slate-600">
                                <span>Thời trang / Mỹ phẩm</span>
                                <span>35%</span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-slate-100">
                                <div className="h-full w-[35%] rounded-full bg-[#FF7A00]" />
                              </div>
                            </div>
                            <div>
                              <div className="mb-1 flex justify-between text-[10px] font-bold text-slate-600">
                                <span>Thực phẩm khô</span>
                                <span>20%</span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-slate-100">
                                <div className="h-full w-[20%] rounded-full bg-indigo-500" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'inventory' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-3">
                        <span className="font-bold text-slate-800">Danh Sách Mã SKU Tồn Kho</span>
                        <button className="rounded border border-slate-200 p-1 text-[#0F3D75] hover:bg-white">
                          <Download size={12} />
                        </button>
                      </div>
                      <div className="divide-y divide-slate-100 text-[11px]">
                        <div className="grid grid-cols-3 bg-slate-50/20 p-3 font-bold tracking-wider text-slate-400 uppercase">
                          <span>Mã SKU</span>
                          <span>Số lượng</span>
                          <span>Trạng thái</span>
                        </div>
                        <div className="grid grid-cols-3 p-3 font-semibold">
                          <span>SKU-ELEC-402</span>
                          <span className="font-bold">1,240</span>
                          <span className="font-bold text-emerald-600">✓ An toàn</span>
                        </div>
                        <div className="grid grid-cols-3 p-3 font-semibold">
                          <span>SKU-CLOT-881</span>
                          <span className="font-bold">450</span>
                          <span className="font-bold text-emerald-600">✓ An toàn</span>
                        </div>
                        <div className="grid grid-cols-3 bg-amber-50/40 p-3 font-semibold text-amber-900">
                          <span>SKU-FOOD-102</span>
                          <span className="font-bold text-amber-700">12</span>
                          <span className="flex items-center gap-1 font-black text-amber-700">
                            <AlertTriangle size={10} /> Thấp
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- VÌ SAO CHỌN CHÚNG TÔI --- */}
      <section className="border-t border-b border-slate-200/50 bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-3xl space-y-4">
            <span className="text-sm font-extrabold tracking-widest text-[#FF7A00] uppercase">
              Lợi thế cạnh tranh
            </span>
            <h2 className="text-3xl font-black tracking-tight text-[#0F3D75] sm:text-4xl">
              Tại Sao Doanh Nghiệp Chọn WarehousePro?
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feat, idx) => (
              <div
                key={idx}
                className="space-y-4 rounded-2xl border border-slate-200/60 bg-[#F8FAFC] p-8 text-left shadow-sm transition-all duration-300 hover:bg-white hover:shadow-xl"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F3D75]/5 text-sm font-black text-[#0F3D75]">
                  0{idx + 1}
                </div>
                <h3 className="text-lg font-black text-slate-900">{feat.title}</h3>
                <p className="text-sm leading-relaxed font-medium text-slate-500">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- THỐNG KÊ (COUNTER) --- */}
      <section className="relative overflow-hidden bg-[#0F3D75] py-16 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-5" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 divide-y divide-white/10 text-center md:grid-cols-3 md:divide-x md:divide-y-0">
            {STATS.map((stat, idx) => (
              <div key={idx} className="space-y-2 pt-6 first:pt-0 md:pt-0">
                <p className="text-4xl font-black tracking-tight text-[#FF7A00] sm:text-5xl">
                  {stat.value}
                </p>
                <p className="text-sm font-bold tracking-wide text-slate-300 uppercase">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- ĐÁNH GIÁ KHÁCH HÀNG --- */}
      <section className="bg-[#F8FAFC] py-24">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-3xl space-y-4">
            <span className="text-sm font-extrabold tracking-widest text-[#FF7A00] uppercase">
              Khách hàng nói gì
            </span>
            <h2 className="text-3xl font-black tracking-tight text-[#0F3D75] sm:text-4xl">
              Được Tin Tưởng Bởi Các Doanh Nghiệp Lớn Nhỏ
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {TESTIMONIALS.map((test, idx) => (
              <div
                key={idx}
                className="relative flex flex-col justify-between rounded-2xl border border-slate-200/60 bg-white p-8 text-left shadow-sm"
              >
                <div className="space-y-6">
                  {/* Stars */}
                  <div className="flex gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} fill="currentColor" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed font-medium text-slate-600 italic sm:text-base">
                    "{test.content}"
                  </p>
                </div>
                <div className="mt-8 flex items-center gap-4 border-t border-slate-100 pt-6">
                  {/* Simulated Avatar placeholders */}
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-[#0F3D75] to-indigo-400 text-sm font-black text-white">
                    {test.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 sm:text-base">{test.name}</h4>
                    <p className="mt-0.5 text-xs font-bold text-slate-400">
                      {test.role} - <span className="text-[#0F3D75]">{test.company}</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- BẢNG GIÁ --- */}
      <section id="bang-gia" className="border-t border-b border-slate-100 bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-3xl space-y-4">
            <span className="text-sm font-extrabold tracking-widest text-[#FF7A00] uppercase">
              Chi phí tối ưu
            </span>
            <h2 className="text-3xl font-black tracking-tight text-[#0F3D75] sm:text-4xl">
              Bảng Giá Thuê Kho Linh Hoạt theo Nhu Cầu
            </h2>
          </div>

          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
            {/* Gói BASIC */}
            <div className="relative flex flex-col justify-between space-y-8 rounded-3xl border border-slate-200/80 bg-[#F8FAFC] p-8 text-left shadow-sm sm:p-12">
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-black text-slate-900">BASIC</h3>
                  <p className="mt-1 text-sm font-medium text-slate-400">
                    Phù hợp cho cá nhân hoặc doanh nghiệp nhỏ khởi nghiệp.
                  </p>
                </div>
                <div className="space-y-4 border-t border-slate-200/60 pt-6">
                  <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                    <CheckCircle2 size={16} className="shrink-0 text-[#0F3D75]" /> Thuê kho tiêu
                    chuẩn
                  </div>
                  <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                    <CheckCircle2 size={16} className="shrink-0 text-[#0F3D75]" /> Theo dõi tồn kho
                    cơ bản
                  </div>
                  <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                    <CheckCircle2 size={16} className="shrink-0 text-[#0F3D75]" /> Hỗ trợ giờ hành
                    chính
                  </div>
                </div>
              </div>
              <a
                href="#lien-he"
                className="w-full rounded-2xl border border-slate-300 bg-white py-4 text-center text-base font-bold text-slate-700 shadow-sm transition-all hover:border-slate-400 hover:bg-slate-50"
              >
                Liên Hệ Tư Vấn
              </a>
            </div>

            {/* Gói BUSINESS (Featured Plan) */}
            <div className="relative flex flex-col justify-between space-y-8 overflow-hidden rounded-3xl border-2 border-[#0F3D75] bg-white p-8 text-left shadow-2xl sm:p-12">
              <div className="absolute top-0 right-0 rounded-bl-xl bg-[#FF7A00] px-4 py-1.5 text-[10px] font-black tracking-widest text-white uppercase">
                Nổi bật
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-black text-[#0F3D75]">BUSINESS</h3>
                  <p className="mt-1 text-sm font-medium text-slate-400">
                    Gói tối ưu cho các doanh nghiệp TMĐT, chuỗi bán lẻ lớn.
                  </p>
                </div>
                <div className="space-y-4 border-t border-slate-200/60 pt-6">
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <CheckCircle2 size={16} className="shrink-0 text-[#FF7A00]" /> Thuê kho linh
                    hoạt tùy biến diện tích
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <CheckCircle2 size={16} className="shrink-0 text-[#FF7A00]" /> Toàn quyền truy
                    cập Dashboard SaaS
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <CheckCircle2 size={16} className="shrink-0 text-[#FF7A00]" /> Hệ thống báo cáo
                    phân tích tự động
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <CheckCircle2 size={16} className="shrink-0 text-[#FF7A00]" /> Hỗ trợ vận hành &
                    IT ưu tiên 24/7
                  </div>
                </div>
              </div>
              <a
                href="#lien-he"
                className="w-full rounded-2xl bg-[#0F3D75] py-4 text-center text-base font-bold text-white shadow-xl shadow-[#0F3D75]/20 transition-all hover:bg-[#0F3D75]/90"
              >
                Liên Hệ Tư Vấn
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* --- FAQ SECTION (ACCORDION) --- */}
      <section id="faq" className="bg-[#F8FAFC] py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 space-y-4 text-center">
            <span className="text-sm font-extrabold tracking-widest text-[#FF7A00] uppercase">
              Giải đáp thắc mắc
            </span>
            <h2 className="text-3xl font-black tracking-tight text-[#0F3D75] sm:text-4xl">
              Câu Hỏi Thường Gặp
            </h2>
          </div>

          <div className="space-y-4 text-left">
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="flex w-full items-center justify-between px-6 py-5 text-base font-bold text-slate-800 transition-colors hover:text-[#0F3D75] sm:text-lg"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={18}
                    className={`transform text-slate-400 transition-transform ${openFaq === idx ? 'rotate-180 text-[#0F3D75]' : ''}`}
                  />
                </button>
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-slate-100 px-6 pt-3 pb-6 text-sm leading-relaxed font-medium text-slate-500 sm:text-base">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CTA CUỐI TRANG (CONVERSION BLOCK) --- */}
      <section
        id="lien-he"
        className="relative overflow-hidden bg-[#0F3D75] py-24 text-center text-white"
      >
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[#FF7A00]/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-3xl space-y-8 px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
            Sẵn Sàng Tối Ưu Hoạt Động Kho Hàng?
          </h2>
          <p className="mx-auto max-w-xl text-base leading-relaxed font-medium text-slate-300 sm:text-lg">
            Liên hệ ngay với các chuyên gia kỹ thuật và kho bãi của chúng tôi để nhận báo giá chi
            tiết, thiết kế riêng cho mô hình kinh doanh của bạn.
          </p>
          <div className="flex flex-col justify-center gap-4 pt-2 sm:flex-row">
            <button className="h-14 rounded-2xl bg-[#FF7A00] px-10 text-base font-bold text-white shadow-xl shadow-[#FF7A00]/20 transition-all hover:-translate-y-0.5 hover:bg-[#FF7A00]/90">
              Nhận Báo Giá
            </button>
            <button className="h-14 rounded-2xl border border-white/20 bg-white/10 px-10 text-base font-bold text-white backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/20">
              Đăng Ký Tư Vấn
            </button>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-slate-800 bg-slate-900 py-16 text-slate-400">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 text-left sm:px-6 md:grid-cols-12 lg:px-8">
          {/* Company identity info */}
          <div className="space-y-6 md:col-span-5">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-[#FF7A00] p-2 text-white">
                <Warehouse size={20} />
              </div>
              <span className="text-lg font-black tracking-tight text-white">
                Warehouse<span className="text-[#FF7A00]">Pro</span>
              </span>
            </div>
            <div className="space-y-3 text-sm font-medium">
              <p className="flex items-center gap-2.5">
                <MapPin size={16} className="text-[#FF7A00]" /> Thành phố Hồ Chí Minh, Việt Nam
              </p>
              <p className="flex items-center gap-2.5">
                <Phone size={16} className="text-[#FF7A00]" /> 1900 xxx xxx
              </p>
              <p className="flex items-center gap-2.5">
                <Mail size={16} className="text-[#FF7A00]" /> contact@warehousepro.vn
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="grid grid-cols-2 gap-8 md:col-span-4">
            <div className="space-y-4">
              <h4 className="text-xs font-black tracking-wider text-white uppercase">Khám phá</h4>
              <ul className="space-y-2 text-sm font-bold">
                <li>
                  <a href="#trang-chu" className="transition-colors hover:text-white">
                    Trang chủ
                  </a>
                </li>
                <li>
                  <a href="#dich-vu" className="transition-colors hover:text-white">
                    Dịch vụ
                  </a>
                </li>
                <li>
                  <a href="#giai-phap" className="transition-colors hover:text-white">
                    Giải pháp
                  </a>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-xs font-black tracking-wider text-white uppercase">Thông tin</h4>
              <ul className="space-y-2 text-sm font-bold">
                <li>
                  <a href="#bang-gia" className="transition-colors hover:text-white">
                    Bảng giá
                  </a>
                </li>
                <li>
                  <a href="#faq" className="transition-colors hover:text-white">
                    FAQ
                  </a>
                </li>
                <li>
                  <a href="#lien-he" className="transition-colors hover:text-white">
                    Liên hệ
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Socials & Media */}
          <div className="space-y-4 md:col-span-3">
            <h4 className="text-xs font-black tracking-wider text-white uppercase">
              Kết nối với chúng tôi
            </h4>
            <div className="flex gap-4">
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400 shadow-sm transition-all hover:bg-[#0F3D75] hover:text-white"
              >
                <Facebook size={18} />
              </a>
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400 shadow-sm transition-all hover:bg-sky-700 hover:text-white"
              >
                <Linkedin size={18} />
              </a>
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400 shadow-sm transition-all hover:bg-rose-600 hover:text-white"
              >
                <Youtube size={18} />
              </a>
            </div>
          </div>
        </div>

        {/* Footer Bottom copyright area */}
        <div className="mx-auto mt-12 max-w-7xl border-t border-slate-800/60 px-4 pt-8 text-center text-xs font-bold tracking-wide sm:px-6 lg:px-8">
          © 2026 WarehousePro. All rights reserved.
        </div>
      </footer>
    </div>
  )
}

export default LandingPageKhamkhao
