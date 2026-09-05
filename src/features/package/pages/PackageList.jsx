import { useEffect, useMemo, useState } from 'react'
import { Check, ClipboardList, Users, Warehouse } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import PublicHeader from '../../../components/PublicHeader'
import packageApi from '../../../services/packageApi'
import subscriptionApi from '../../../services/subscriptionApi'
import { isInternalFeePackage, parseFeaturesToList } from '../../../utils/formatFeatures'
import TranslatableText from '@/components/TranslatableText'

const PackageSkeleton = () => (
  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white" aria-hidden="true">
    <div className="space-y-4 p-6">
      <div className="h-5 w-28 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
      <div className="h-10 w-3/5 animate-pulse rounded bg-slate-200" />
      <div className="h-10 animate-pulse rounded bg-slate-100" />
    </div>
    <div className="space-y-3 border-t border-slate-200 bg-slate-50 p-6">
      <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-4/5 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-3/5 animate-pulse rounded bg-slate-200" />
    </div>
  </div>
)

const PackageList = () => {
  const [packages, setPackages] = useState([])
  const [activeSub, setActiveSub] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const { user, isAuthenticated } = useSelector((state) => state.auth)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [pkgRes] = await Promise.all([packageApi.getPackages()])
        const payload = pkgRes?.data?.data || pkgRes?.data
        const content = Array.isArray(payload?.content)
          ? payload.content
          : Array.isArray(payload)
            ? payload
            : []
        setPackages(content.filter((pkg) => !isInternalFeePackage(pkg)))

        if (isAuthenticated && user?.role === 'ROLE_TENANT') {
          try {
            const subRes = await subscriptionApi.getActiveSubscription()
            setActiveSub(subRes?.data?.data)
          } catch {
            // A tenant can legitimately have no active subscription.
          }
        }
      } catch (error) {
        console.error('Failed to fetch data', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [isAuthenticated, user])

  const highestPricePackageId = useMemo(() => {
    if (!packages.length) return null
    return packages.reduce((highest, pkg) =>
      Number(pkg.price || 0) > Number(highest.price || 0) ? pkg : highest
    ).id
  }, [packages])

  return (
    <div className="min-h-screen bg-[#f8f8f7] font-sans text-slate-900 antialiased">
      <PublicHeader />

      <main>
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-[1200px] gap-6 px-4 py-9 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end lg:px-8 lg:py-12">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.12em] text-[#FF5A1F] uppercase">
                Bảng giá StockSpace
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#0f084b] sm:text-4xl">
                Chọn gói phù hợp với quy mô doanh nghiệp
              </h1>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Lựa chọn gói dịch vụ phù hợp để quản lý kho, nhân sự và hoạt động vận hành hiệu quả
                hơn.
              </p>
            </div>
            <div className="border-l-2 border-[#FF5A1F] bg-[#fff7f3] px-4 py-3 text-sm leading-6 text-slate-700">
              Mỗi gói xác định phạm vi truy cập và năng lực vận hành của doanh nghiệp trên
              StockSpace.
            </div>
          </div>
        </section>

        <section aria-labelledby="plans-heading" className="py-10 lg:py-14">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-end justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase">
                  Gói dịch vụ
                </p>
                <h2 id="plans-heading" className="mt-1 text-xl font-semibold text-slate-950">
                  Chọn gói theo nhu cầu vận hành
                </h2>
              </div>
              {!isLoading && (
                <span className="text-sm text-slate-500">{packages.length} gói hiện có</span>
              )}
            </div>

            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-2 lg:gap-6">
              {isLoading
                ? Array.from({ length: 2 }).map((_, index) => <PackageSkeleton key={index} />)
                : packages.map((pkg) => {
                    const isCurrentPlan = activeSub?.servicePackage?.id === pkg.id
                    const isHighestValuePlan =
                      pkg.id === highestPricePackageId && packages.length > 1
                    const features = parseFeaturesToList(pkg.features)

                    return (
                      <article
                        key={pkg.id}
                        className={`flex flex-col overflow-hidden rounded-lg border bg-white ${
                          isCurrentPlan
                            ? 'border-emerald-400 shadow-md shadow-emerald-950/5'
                            : isHighestValuePlan
                              ? 'border-[#0f084b] shadow-md shadow-slate-950/10'
                              : 'border-slate-200 shadow-sm'
                        }`}
                      >
                        {isHighestValuePlan && !isCurrentPlan && (
                          <div className="bg-[#0f084b] px-5 py-2 text-xs font-semibold tracking-[0.1em] text-white uppercase">
                            Gói có phạm vi cao hơn
                          </div>
                        )}
                        {isCurrentPlan && (
                          <div className="bg-emerald-700 px-5 py-2 text-xs font-semibold tracking-[0.1em] text-white uppercase">
                            Gói đang sử dụng
                          </div>
                        )}

                        <div className="p-5 sm:p-6">
                          <h3 className="text-2xl font-semibold tracking-tight text-[#0f084b]">
                            {pkg.name}
                          </h3>
                          <TranslatableText
                            text={pkg.description}
                            fallback="Thông tin gói dịch vụ StockSpace."
                            className="mt-2 min-h-12 text-sm leading-6 text-slate-600"
                          />

                          <div className="mt-6 border-y border-slate-200 py-4">
                            <p className="text-xs font-medium text-slate-500">Chi phí dịch vụ</p>
                            <div className="mt-1 flex items-baseline gap-1.5 text-[#0f084b]">
                              <span className="text-4xl font-bold tracking-tight tabular-nums">
                                {Number(pkg.price || 0).toLocaleString('vi-VN')}
                              </span>
                              <span className="text-base font-semibold">₫</span>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                              / {pkg.durationDays || 0} ngày
                            </p>
                          </div>

                          {isCurrentPlan ? (
                            <div className="mt-5 flex min-h-11 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800">
                              Đang sử dụng
                            </div>
                          ) : (
                            <Link
                              to={`/packages/${pkg.id}`}
                              className={`mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
                                isHighestValuePlan
                                  ? 'bg-[#FF5A1F] text-white hover:bg-[#e04e19] focus-visible:ring-[#FF5A1F]'
                                  : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 focus-visible:ring-[#0f084b]'
                              }`}
                            >
                              Xem chi tiết
                            </Link>
                          )}
                        </div>

                        <div className="mt-auto border-t border-slate-200 bg-slate-50 p-5 sm:p-6">
                          <p className="text-xs font-semibold tracking-[0.1em] text-slate-600 uppercase">
                            Tính năng bao gồm
                          </p>
                          <ul className="mt-4 space-y-3">
                            <li className="flex items-start gap-2.5 text-sm text-slate-700">
                              <Check
                                className="mt-0.5 h-4 w-4 shrink-0 text-[#FF5A1F]"
                                aria-hidden="true"
                              />
                              <span className="font-medium">
                                {pkg.maxStaff > 0
                                  ? `Tối đa ${pkg.maxStaff} nhân viên`
                                  : 'Không giới hạn nhân viên'}
                              </span>
                            </li>
                            {features.map((feature, index) => (
                              <li
                                key={index}
                                className="flex items-start gap-2.5 text-sm leading-5 text-slate-600"
                              >
                                <Check
                                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                                  aria-hidden="true"
                                />
                                <span>{feature}</span>
                              </li>
                            ))}
                            {features.length === 0 && (
                              <li className="text-sm leading-5 text-slate-500">
                                Thông tin tính năng chi tiết sẽ hiển thị khi gói được cấu hình.
                              </li>
                            )}
                          </ul>
                        </div>
                      </article>
                    )
                  })}
            </div>

            {!isLoading && packages.length === 0 && (
              <div className="mx-auto flex min-h-64 max-w-5xl flex-col items-center justify-center border border-dashed border-slate-300 bg-white px-6 text-center">
                <Warehouse className="h-7 w-7 text-slate-400" aria-hidden="true" />
                <h3 className="mt-3 text-base font-semibold text-slate-800">Chưa có gói dịch vụ</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Hiện chưa có gói dịch vụ nào được cấu hình.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white py-8">
          <div className="mx-auto grid max-w-[1200px] gap-0 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
            {[
              [Warehouse, 'Quản lý kho', 'Tập trung thông tin vận hành kho trong một nền tảng.'],
              [
                Users,
                'Quản lý nhân sự',
                'Giới hạn nhân sự được thể hiện rõ theo từng gói dịch vụ.',
              ],
              [
                ClipboardList,
                'Vận hành tập trung',
                'Hỗ trợ các luồng công việc kho theo quyền truy cập của doanh nghiệp.',
              ],
            ].map(([Icon, title, description], index) => (
              <div
                key={title}
                className={`py-4 sm:px-5 ${index > 0 ? 'sm:border-l sm:border-slate-200' : ''}`}
              >
                <Icon className="h-5 w-5 text-[#FF5A1F]" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-semibold text-slate-950">{title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#0f084b] py-10 text-white">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 text-left sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
            <div>
              <p className="text-xs font-semibold tracking-[0.1em] text-orange-200 uppercase">
                StockSpace plans
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                Chọn gói phù hợp để bắt đầu vận hành kho hiệu quả hơn.
              </h2>
            </div>
            <Link
              to="/"
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-[#0f084b] transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f084b] focus-visible:outline-none"
            >
              Khám phá StockSpace
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}

export default PackageList
