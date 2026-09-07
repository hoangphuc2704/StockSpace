import { useEffect, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  FileText,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Warehouse,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import PublicHeader from '../../../components/PublicHeader'
import BackToTop from '../../../components/BackToTop.jsx'
import warehouseApi from '../../../services/warehouse/warehouseApi'
import PublicFooter from '../../../components/PublicFooter'
import warehouseInterior from '@/assets/image.png'
import { formatWarehousePricePerSquareMeter } from '@/utils/warehousePricing'

const JOURNEY = [
  ['01', 'Tìm kho', 'Khám phá các kho đã được phê duyệt phù hợp với nhu cầu lưu trữ.'],
  ['02', 'Thuê kho', 'Xem thông tin kho và thực hiện quy trình thuê trong hệ thống.'],
  ['03', 'Quản lý hợp đồng', 'Theo dõi hợp đồng thuê và các mốc thời hạn quan trọng.'],
  ['04', 'Vận hành', 'Quản lý hàng hóa và hoạt động kho theo vai trò được phân quyền.'],
]

const WMS_CAPABILITIES = [
  { icon: Boxes, title: 'Tồn kho', description: 'Theo dõi SKU và vị trí lưu trữ.' },
  { icon: Warehouse, title: 'Layout kho', description: 'Làm việc với khu vực, rack và bin.' },
  { icon: PackageCheck, title: 'Nhập xuất', description: 'Quản lý luồng hàng hóa theo tác vụ.' },
  {
    icon: ClipboardList,
    title: 'Hợp đồng',
    description: 'Theo dõi hồ sơ thuê trong cùng nền tảng.',
  },
]

const formatWarehouseCode = (id) => {
  const normalizedId = String(id || '')
    .replace(/-/g, '')
    .toUpperCase()
  return normalizedId ? `WH-${normalizedId.slice(-6)}` : 'WH-N/A'
}

const formatWarehouseStatus = (status) => {
  if (status === 'AVAILABLE') return 'Sẵn sàng'
  if (status === 'PENDING_APPROVAL') return 'Đang duyệt'
  if (status === 'INACTIVE') return 'Tạm ngưng'
  return 'Đang cập nhật'
}

const formatWarehousePricingType = (pricingType) => {
  if (pricingType === 'FIXED_MONTHLY') return 'Theo tháng'
  if (pricingType === 'NEGOTIATED') return 'Thỏa thuận'
  return 'Theo m² / tháng'
}

const normalizeWarehouse = (item) => ({
  id: item.id,
  code: item.code || item.warehouseCode || formatWarehouseCode(item.id),
  name: item.name || 'Warehouse',
  address: item.address || item.location || 'Đang cập nhật địa chỉ',
  area: Number(item.area ?? item.capacity ?? 0),
  rentalPrice:
    item.rentalPrice == null && item.price == null && item.pricePerMonth == null
      ? null
      : Number(item.rentalPrice ?? item.price ?? item.pricePerMonth),
  rentalPricingType: item.rentalPricingType || 'PER_SQUARE_METER_MONTHLY',
  type: item.warehouseType?.name || item.typeName || item.type || 'Kho thường',
  status: item.status || 'AVAILABLE',
  image: item.coverImageUrl || item.thumbnail || item.imageUrls?.[0] || '',
  isVerified: item.isVerified ?? item.verified ?? false,
})

const ListingPreviewCard = ({ warehouse }) => (
  <Link
    to={`/warehouse/${warehouse.id}`}
    className="group flex h-full flex-col overflow-hidden border border-slate-300 bg-white transition-colors hover:border-slate-500 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2 focus-visible:outline-none"
  >
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 font-mono text-[10px] font-bold tracking-[0.08em] text-slate-900 uppercase">
      <span className="truncate">ID: {warehouse.code}</span>
      <span className="shrink-0 border border-sky-200 bg-sky-50 px-2 py-1 text-[9px] text-sky-800">
        {warehouse.type}
      </span>
    </div>

    <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
      {warehouse.image ? (
        <img
          src={warehouse.image}
          alt={warehouse.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-slate-400">
          <Warehouse className="h-8 w-8" aria-hidden="true" />
        </div>
      )}
      <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-slate-950 px-2 py-1 font-mono text-[10px] font-bold tracking-[0.05em] text-emerald-300 uppercase">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
        {warehouse.isVerified ? 'Đã xác minh thực địa' : 'Đã phê duyệt'}
      </span>
    </div>

    <div className="flex flex-1 flex-col p-4">
      <h3 className="truncate text-lg font-semibold tracking-tight text-slate-950 group-hover:text-[#0f084b]">
        {warehouse.name}
      </h3>
      <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-slate-500">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#FF5A1F]" aria-hidden="true" />
        <span className="truncate">{warehouse.address}</span>
      </p>

      <div className="mt-4 grid grid-cols-2 border border-slate-300 bg-slate-50 text-xs">
        <div className="border-r border-b border-slate-300 px-2.5 py-2">
          <p className="font-mono text-[9px] tracking-[0.08em] text-slate-500 uppercase">
            Diện tích sàn
          </p>
          <p className="mt-1 font-mono font-bold text-slate-950 tabular-nums">
            {warehouse.area.toLocaleString('vi-VN')} m²
          </p>
        </div>
        <div className="border-b border-slate-300 px-2.5 py-2">
          <p className="font-mono text-[9px] tracking-[0.08em] text-slate-500 uppercase">
            Hình thức giá
          </p>
          <p className="mt-1 truncate font-mono font-bold text-slate-950">
            {formatWarehousePricingType(warehouse.rentalPricingType)}
          </p>
        </div>
        <div className="border-r border-slate-300 px-2.5 py-2">
          <p className="font-mono text-[9px] tracking-[0.08em] text-slate-500 uppercase">
            Trạng thái
          </p>
          <p className="mt-1 truncate font-mono font-bold text-slate-950">
            {formatWarehouseStatus(warehouse.status)}
          </p>
        </div>
        <div className="px-2.5 py-2">
          <p className="font-mono text-[9px] tracking-[0.08em] text-slate-500 uppercase">
            Loại kho
          </p>
          <p className="mt-1 truncate font-mono font-bold text-slate-950">{warehouse.type}</p>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-200 pt-4">
        <div className="min-w-0">
          <p className="font-mono text-[9px] tracking-[0.08em] text-slate-500 uppercase">
            Đơn giá tham chiếu
          </p>
          <p className="mt-1 truncate font-mono text-sm font-bold text-[#FF5A1F]">
            {formatWarehousePricePerSquareMeter(warehouse, 'Thương lượng')}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 bg-slate-950 px-3 py-2 font-mono text-[10px] font-bold tracking-[0.04em] text-white uppercase transition-colors group-hover:bg-[#FF5A1F]">
          Xem bản vẽ <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>
    </div>
  </Link>
)

const LandingPageKhamkhao = () => {
  const [approvedWarehouses, setApprovedWarehouses] = useState([])
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(true)

  useEffect(() => {
    const fetchApprovedWarehouses = async () => {
      try {
        setIsLoadingWarehouses(true)
        const response = await warehouseApi.getPublicWarehouses({
          page: 0,
          size: 6,
          sortBy: 'createdAt',
          sortDir: 'desc',
        })
        const payload = response?.data?.data
        const content = Array.isArray(payload?.content)
          ? payload.content
          : Array.isArray(payload)
            ? payload
            : []
        setApprovedWarehouses(content.map(normalizeWarehouse))
      } catch {
        setApprovedWarehouses([])
      } finally {
        setIsLoadingWarehouses(false)
      }
    }

    fetchApprovedWarehouses()
  }, [])

  return (
    <div id="home" className="min-h-screen bg-[#f8f8f7] font-sans text-slate-900 antialiased">
      <PublicHeader />

      <main>
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(480px,1.1fr)] lg:items-center lg:px-8 lg:py-12">
            <div className="max-w-xl py-2 lg:py-8">
              <p className="text-xs font-semibold tracking-[0.12em] text-[#FF5A1F] uppercase">
                Nền tảng kho bãi cho doanh nghiệp
              </p>
              <h1 className="mt-4 text-4xl leading-[1.08] font-bold tracking-tight text-[#0f084b] sm:text-5xl">
                Tìm đúng kho.
                <br />
                Vận hành hiệu quả.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
                StockSpace giúp doanh nghiệp khám phá kho đã được phê duyệt, theo dõi hợp đồng và
                tiếp tục vận hành kho trong cùng một hệ thống.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/warehouses"
                  className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#FF5A1F] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#e04e19] focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  Tìm kho ngay
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex min-h-11 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#0f084b] focus-visible:outline-none"
                >
                  Khám phá StockSpace
                </a>
              </div>
            </div>

            <div className="relative overflow-hidden border border-slate-200 bg-slate-100 shadow-lg shadow-slate-900/10">
              <img
                src={warehouseInterior}
                alt="Không gian bên trong kho"
                className="aspect-[16/10] h-full w-full object-cover"
              />
              <div className="absolute right-0 bottom-0 left-0 bg-[#0f084b]/90 px-5 py-4 text-white sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-[0.1em] text-orange-200 uppercase">
                    StockSpace
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    Khám phá kho trước. Vận hành có kiểm soát sau đó.
                  </p>
                </div>
                <Warehouse className="mt-3 h-5 w-5 text-[#FF5A1F] sm:mt-0" aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-[#f8f8f7]">
          <div className="mx-auto grid max-w-[1400px] divide-y divide-slate-200 px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6 lg:px-8">
            {[
              ['Kho được xác minh', 'Thông tin kho được kiểm duyệt trước khi hiển thị.'],
              [
                'Thông tin minh bạch',
                'Diện tích, loại kho, vị trí và giá thuê được trình bày rõ ràng.',
              ],
              ['Quản lý tập trung', 'Theo dõi hợp đồng và vận hành kho trên cùng một nền tảng.'],
            ].map(([title, description]) => (
              <div key={title} className="py-5 first:pl-0 last:pr-0 sm:px-5 sm:py-6">
                <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="approved-warehouses" className="bg-white py-12 lg:py-16">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-[#FF5A1F] uppercase">
                  Kho đã được xác minh
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#0f084b]">
                  Không gian lưu trữ sẵn sàng để doanh nghiệp đánh giá
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Khám phá những không gian lưu trữ phù hợp với nhu cầu của doanh nghiệp.
                </p>
              </div>
              <Link
                to="/warehouses"
                className="inline-flex min-h-10 items-center gap-2 self-start rounded-md border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 transition-colors hover:border-[#0f084b] hover:text-[#0f084b] focus-visible:ring-2 focus-visible:ring-[#0f084b] focus-visible:outline-none"
              >
                Xem tất cả kho
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {isLoadingWarehouses
                ? Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="overflow-hidden rounded-lg border border-slate-200 bg-white"
                      aria-hidden="true"
                    >
                      <div className="aspect-[16/9] animate-pulse bg-slate-200" />
                      <div className="space-y-3 p-5">
                        <div className="h-5 w-3/5 animate-pulse rounded bg-slate-200" />
                        <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
                        <div className="h-12 animate-pulse rounded bg-slate-100" />
                      </div>
                    </div>
                  ))
                : approvedWarehouses.map((warehouse) => (
                    <ListingPreviewCard key={warehouse.id} warehouse={warehouse} />
                  ))}
            </div>

            {!isLoadingWarehouses && approvedWarehouses.length === 0 && (
              <div className="border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-600">
                Hiện chưa có kho sẵn sàng để hiển thị.
              </div>
            )}
          </div>
        </section>

        <section
          id="how-it-works"
          className="border-y border-slate-200 bg-[#f8f8f7] py-12 lg:py-16"
        >
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
                Quy trình liền mạch
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#0f084b]">
                Từ lựa chọn kho đến hoạt động hằng ngày
              </h2>
            </div>
            <ol className="mt-8 grid gap-0 border border-slate-200 bg-slate-200 md:grid-cols-4">
              {JOURNEY.map(([number, title, description]) => (
                <li key={number} className="relative bg-[#f8f8f7] p-5 md:min-h-52">
                  <span className="font-mono text-sm font-semibold text-[#FF5A1F]">{number}</span>
                  <h3 className="mt-8 text-lg font-semibold text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="about" className="bg-[#0f172a] py-12 text-white lg:py-16">
          <div className="mx-auto grid max-w-[1400px] gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:items-center lg:px-8">
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-[#FF5A1F] uppercase">
                Vận hành sau khi thuê
              </p>
              <h2 className="mt-3 text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
                Không chỉ tìm kho.
                <br />
                Quản lý cả quá trình vận hành.
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300">
                StockSpace tiếp tục hỗ trợ doanh nghiệp quản lý dữ liệu kho, hàng hóa, luồng nhập
                xuất và hồ sơ hợp đồng sau khi không gian được thuê.
              </p>
              <Link
                to="/warehouses"
                className="mt-7 inline-flex min-h-10 items-center gap-2 rounded-md bg-[#FF5A1F] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#e04e19] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a] focus-visible:outline-none"
              >
                Khám phá kho
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="border border-slate-700 bg-slate-800 p-1 shadow-2xl shadow-black/20">
              <div className="border border-slate-700 bg-slate-900 p-5 sm:p-6">
                <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.1em] text-slate-400 uppercase">
                      StockSpace WMS
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      Không gian làm việc vận hành
                    </p>
                  </div>
                  <ShieldCheck className="h-5 w-5 text-[#FF5A1F]" aria-hidden="true" />
                </div>
                <div className="mt-4 grid gap-px border border-slate-700 bg-slate-700 sm:grid-cols-2">
                  {WMS_CAPABILITIES.map((capability) => {
                    const Icon = capability.icon
                    return (
                      <div key={capability.title} className="bg-slate-800 p-4">
                        <Icon className="h-4 w-4 text-orange-300" aria-hidden="true" />
                        <h3 className="mt-3 text-sm font-semibold text-white">
                          {capability.title}
                        </h3>
                        <p className="mt-1 text-sm leading-5 text-slate-300">
                          {capability.description}
                        </p>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  Các mô-đun khả dụng theo vai trò và quyền truy cập hợp đồng của bạn.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-14 text-center lg:py-[72px]">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <p className="text-xs font-semibold tracking-[0.12em] text-[#FF5A1F] uppercase">
              Bắt đầu cùng StockSpace
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0f084b] sm:text-4xl">
              Sẵn sàng tìm không gian phù hợp cho doanh nghiệp của bạn?
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Khám phá các kho đã được xác minh trên StockSpace.
            </p>
            <Link
              to="/warehouses"
              className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-md bg-[#FF5A1F] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#e04e19] focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Xem kho ngay
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
      <BackToTop />
    </div>
  )
}

export default LandingPageKhamkhao
