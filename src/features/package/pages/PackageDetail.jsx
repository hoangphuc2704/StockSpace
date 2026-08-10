import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { ArrowLeft, Check } from 'lucide-react'
import PublicHeader from '../../../components/PublicHeader'
import packageApi from '../../../services/packageApi'
import subscriptionApi from '../../../services/tenant/subscriptionApi'
import { toast } from 'react-hot-toast'

const PackageDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useSelector((state) => state.auth)
  
  const [pkg, setPkg] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPurchasing, setIsPurchasing] = useState(false)

  useEffect(() => {
    const fetchPackageDetail = async () => {
      try {
        const response = await packageApi.getPackageById(id)
        setPkg(response.data?.data || response.data)
      } catch (error) {
        console.error('Failed to fetch package detail', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchPackageDetail()
  }, [id])

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để mua gói dịch vụ.")
      return
    }
    if (user?.role !== 'ROLE_TENANT') {
      toast.error("Chỉ tài khoản Người Thuê Kho (Tenant) mới có thể mua gói dịch vụ này.")
      return
    }
    
    const confirmBuy = window.confirm(`Bạn có chắc chắn muốn mua gói ${pkg.name} với giá ${Number(pkg.price || 0).toLocaleString('vi-VN')} VNĐ không?`)
    if (!confirmBuy) return

    try {
      setIsPurchasing(true)
      await subscriptionApi.purchasePackage({ packageId: id })
      toast.success("Đăng ký gói dịch vụ thành công! Hệ thống WMS của bạn đã được mở khóa.")
      navigate('/tenant/dashboard')
    } catch (error) {
      const errorCode = error.response?.data?.errorCode
      if (errorCode === 'WALLET_INSUFFICIENT_BALANCE') {
        const toWallet = window.confirm("Số dư ví của bạn không đủ để thanh toán. Bạn có muốn đi đến Ví của tôi để nạp thêm tiền không?")
        if (toWallet) {
          navigate('/tenant/wallet')
        }
      } else if (errorCode === 'SUBSCRIPTION_ALREADY_ACTIVE') {
        toast.error("Bạn đã có một gói dịch vụ đang hoạt động. Không thể đăng ký thêm.")
      } else {
        toast.error(error.response?.data?.message || "Đăng ký gói dịch vụ thất bại.")
      }
    } finally {
      setIsPurchasing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#faf7f4]">
        <PublicHeader />
        <div className="flex justify-center items-center h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF5A1F]"></div>
        </div>
      </div>
    )
  }

  if (!pkg) {
    return (
      <div className="min-h-screen bg-[#faf7f4]">
        <PublicHeader />
        <div className="flex flex-col justify-center items-center h-[calc(100vh-80px)]">
          <h2 className="text-2xl font-bold text-stone-900 mb-4">Không tìm thấy gói dịch vụ</h2>
          <Link to="/packages" className="text-[#FF5A1F] hover:underline flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại danh sách
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf7f4] font-sans text-stone-900 antialiased">
      <PublicHeader />
      
      <main className="py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <Link to="/packages" className="inline-flex items-center text-sm font-bold tracking-wider text-stone-500 hover:text-[#FF5A1F] mb-8 transition-colors uppercase">
            <ArrowLeft className="mr-2 h-4 w-4" /> Bảng giá
          </Link>
          
          <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xl">
            <div className="p-10 md:p-16 border-b border-stone-100">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mb-8">
                <div className="flex-1">
                  <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-stone-900 uppercase">
                    {pkg.name}
                  </h1>
                  <p className="mt-4 text-base text-stone-500 max-w-xl leading-relaxed">
                    {pkg.description || 'Thông tin chi tiết về gói dịch vụ. Cung cấp các giải pháp tối ưu cho doanh nghiệp.'}
                  </p>
                </div>
                <div className="text-left md:text-right mt-4 md:mt-0">
                  <p className="text-[11px] font-bold tracking-wider text-stone-400 uppercase mb-2">Giá đăng ký</p>
                  <div className="flex items-baseline text-[#FF5A1F]">
                    <span className="text-5xl font-black tracking-tight">
                      {Number(pkg.price || 0).toLocaleString('vi-VN')}
                    </span>
                    <span className="ml-2 text-lg font-bold">VNĐ</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${pkg.status === 'ACTIVE' || pkg.status === 'active' || pkg.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-700'}`}>
                  {pkg.status || 'Đang hoạt động'}
                </span>
              </div>
            </div>
            
            <div className="bg-stone-50 p-10 md:p-16">
              <h3 className="text-xl font-bold tracking-tight text-stone-900 mb-8 uppercase">
                Tính năng và Quyền lợi
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pkg.features && Array.isArray(pkg.features) && pkg.features.length > 0 ? (
                  pkg.features.map((feature, i) => (
                    <div key={i} className="flex items-start bg-white p-6 rounded-2xl border border-stone-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                      <Check className="mr-4 h-6 w-6 shrink-0 text-[#FF5A1F]" />
                      <span className="text-sm text-stone-700 font-medium leading-relaxed">{feature}</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex items-start bg-white p-6 rounded-2xl border border-stone-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                      <Check className="mr-4 h-6 w-6 shrink-0 text-[#FF5A1F]" />
                      <span className="text-sm text-stone-700 font-medium leading-relaxed">Hỗ trợ khách hàng ưu tiên 24/7 qua hotline và email</span>
                    </div>
                    <div className="flex items-start bg-white p-6 rounded-2xl border border-stone-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                      <Check className="mr-4 h-6 w-6 shrink-0 text-[#FF5A1F]" />
                      <span className="text-sm text-stone-700 font-medium leading-relaxed">Truy cập đầy đủ các tính năng quản lý kho bãi</span>
                    </div>
                    <div className="flex items-start bg-white p-6 rounded-2xl border border-stone-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                      <Check className="mr-4 h-6 w-6 shrink-0 text-[#FF5A1F]" />
                      <span className="text-sm text-stone-700 font-medium leading-relaxed">Báo cáo phân tích chuyên sâu về xuất nhập tồn</span>
                    </div>
                    <div className="flex items-start bg-white p-6 rounded-2xl border border-stone-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                      <Check className="mr-4 h-6 w-6 shrink-0 text-[#FF5A1F]" />
                      <span className="text-sm text-stone-700 font-medium leading-relaxed">Kết nối API tự động đồng bộ dữ liệu</span>
                    </div>
                  </>
                )}
              </div>
              
              <div className="mt-16 text-center">
                <button 
                  onClick={handlePurchase}
                  disabled={isPurchasing}
                  className="inline-flex items-center justify-center rounded-md bg-[#FF5A1F] px-10 py-4 text-xs font-bold tracking-wider text-white uppercase transition-all hover:bg-[#e04e19] shadow-[0_10px_30px_rgba(255,90,31,0.2)] hover:shadow-[0_15px_40px_rgba(255,90,31,0.3)] hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed">
                  {isPurchasing ? 'Đang xử lý...' : 'Đăng ký gói dịch vụ ngay'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default PackageDetail
