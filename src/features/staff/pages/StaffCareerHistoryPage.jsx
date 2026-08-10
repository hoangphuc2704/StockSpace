import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'
import { Briefcase, Building2, Calendar, MapPin, ShieldCheck, Loader2 } from 'lucide-react'
import Badge from '@/components/atoms/Badge'
import staffApi from '@/services/staff/staffApi'
import { toast } from 'react-hot-toast'

const StaffCareerHistoryPage = () => {
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  const { user } = useSelector((state) => state.auth)

  const [isLoading, setIsLoading] = useState(false)
  const [historyData, setHistoryData] = useState(null)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    setIsLoading(true)
    try {
      const res = await staffApi.getMyWorkHistory()
      setHistoryData(res.data?.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể tải lịch sử làm việc')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Hiện tại'
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header />
      <div className="md:hidden">
        {isMobileOpen && (
          <button
            className="fixed inset-0 z-40 bg-slate-900/30"
            onClick={() => dispatch(closeMobileSidebar())}
          />
        )}
      </div>

      <div className="flex pt-16">
        <Sidebar role="STAFF" />
        <main
          className={`flex-1 transition-all duration-300 ease-in-out ${
            isSidebarExpanded ? 'md:ml-64' : 'md:ml-20'
          }`}
        >
          <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="h-8 w-8 text-primary" />
                  Lịch Sử Sự Nghiệp
                </h1>
                <p className="text-slate-500 mt-1">
                  Theo dõi quá trình làm việc của bạn qua các công ty và kho bãi
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : historyData ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Thông tin cá nhân */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Hồ Sơ Nhân Viên</h2>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-slate-500">Họ và tên</p>
                        <p className="font-semibold">{historyData.fullName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Email</p>
                        <p className="font-semibold">{historyData.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Số điện thoại</p>
                        <p className="font-semibold">{historyData.phone || 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Công Ty Đã Làm Việc</h2>
                    <div className="space-y-4">
                      {historyData.tenantTenures?.length > 0 ? (
                        historyData.tenantTenures.map((tenant) => (
                          <div key={tenant.membershipId} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-indigo-500" />
                                <span className="font-semibold text-slate-800">{tenant.tenantName}</span>
                              </div>
                              <Badge variant={tenant.isActive ? 'success' : 'secondary'}>
                                {tenant.isActive ? 'Active' : 'Resigned'}
                              </Badge>
                            </div>
                            <div className="mt-2 text-sm text-slate-500 flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(tenant.joinedAt)} - {formatDate(tenant.resignedAt)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-500 italic">Chưa tham gia công ty nào.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quá trình phụ trách kho */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Lịch Sử Phụ Trách Kho Bãi</h2>
                    
                    <div className="space-y-6">
                      {historyData.warehouseAssignments?.length > 0 ? (
                        historyData.warehouseAssignments.map((assignment) => (
                          <div key={assignment.id} className="relative pl-6 border-l-2 border-slate-200 pb-4 last:border-0 last:pb-0">
                            <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white ${assignment.status === 'ACTIVE' ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                            
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 shadow-sm">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                                    {assignment.warehouseName}
                                  </h3>
                                  <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                                    <MapPin className="h-4 w-4" /> {assignment.warehouseAddress}
                                  </p>
                                </div>
                                <Badge variant={assignment.status === 'ACTIVE' ? 'success' : assignment.status === 'REVOKED' ? 'danger' : 'warning'}>
                                  {assignment.status}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 bg-white p-3 rounded-lg border border-slate-200">
                                <div>
                                  <p className="text-xs text-slate-400 font-medium uppercase">Chức danh</p>
                                  <p className="font-semibold mt-1 flex items-center gap-1">
                                    <ShieldCheck className="h-4 w-4 text-blue-500" />
                                    {assignment.customTitle || assignment.role}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-400 font-medium uppercase">Vai trò Hệ thống</p>
                                  <p className="font-medium mt-1">{assignment.role}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-400 font-medium uppercase">Thời gian</p>
                                  <p className="text-sm mt-1">
                                    {formatDate(assignment.startDate)} - {formatDate(assignment.endDate)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-400 font-medium uppercase">Ghi chú</p>
                                  <p className="text-sm mt-1">{assignment.notes || 'Không có ghi chú'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                          <p className="text-slate-500">Chưa được phân công phụ trách kho nào.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-20 text-slate-500">
                Không tìm thấy dữ liệu lịch sử sự nghiệp.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default StaffCareerHistoryPage
