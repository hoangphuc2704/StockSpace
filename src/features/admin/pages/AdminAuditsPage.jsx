import React, { useState, useEffect } from 'react'
import {
  HiOutlineClipboardDocumentList,
  HiOutlineEye,
  HiOutlineXMark,
  HiOutlineCalendar,
  HiOutlineUser,
} from 'react-icons/hi2'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import adminApi from '../../../services/admin/adminApi'
import Modal from '../../../components/organisms/Modal'
import Sidebar from '../../../components/SideBar'
import logoDaidien from '../../../assets/logoDaidien.png'
import { HiBars3 } from 'react-icons/hi2'

const AdminAuditsPage = () => {
  const { isSidebarExpanded } = useSelector((state) => state.ui)
  const [audits, setAudits] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Xem chi tiết
  const [selectedAudit, setSelectedAudit] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  const formatDate = (dateString, showTime = false) => {
    if (!dateString) return 'N/A'
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' }
    if (showTime) {
      options.hour = '2-digit'
      options.minute = '2-digit'
    }
    return new Date(dateString).toLocaleDateString('vi-VN', options)
  }

  const fetchAudits = async (currentPage = 0) => {
    try {
      setLoading(true)
      const res = await adminApi.getAdminAudits({ page: currentPage, size: 20 })
      const data = res.data?.data
      setAudits(data?.content || [])
      setTotalPages(data?.totalPages || 0)
      setPage(data?.pageNo ?? data?.page ?? 0)
    } catch (error) {
      console.error('Error fetching audits:', error)
      toast.error(error.response?.data?.message || 'Lỗi khi tải danh sách phiếu kiểm kê')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAudits(page)
  }, [page])

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      setPage(newPage)
    }
  }

  const openDetailModal = (audit) => {
    setSelectedAudit(audit)
    setIsDetailModalOpen(true)
  }

  const closeDetailModal = () => {
    setSelectedAudit(null)
    setIsDetailModalOpen(false)
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700 border border-yellow-200">Chờ duyệt</span>
      case 'APPROVED':
      case 'PASSED':
        return <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 border border-green-200">Đã duyệt</span>
      case 'REJECTED':
      case 'FAILED':
        return <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 border border-red-200">Từ chối</span>
      default:
        return <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 border border-gray-200">{status}</span>
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* TOP HEADER */}
      <header className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-4">
          <button className="rounded-full p-2 text-slate-700 hover:bg-slate-100 active:bg-slate-200">
            <HiBars3 className="h-6 w-6" />
          </button>
          <div className="flex cursor-pointer items-center gap-2">
            <div className="shrink-0 rounded-lg bg-white p-1.5">
              <img src={logoDaidien} alt="Logo" className="h-10 w-17" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-slate-950">
              StockSpace Admin
            </span>
          </div>
        </div>
      </header>

      <div className="flex pt-14">
        <Sidebar currentRole="ADMIN" />

        <div className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-[72px]'}`}>
          <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8 flex flex-col h-[calc(100vh-3.5rem)]">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between shrink-0">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">WMS - Quản Lý Phiếu Kiểm Kê</h1>
                <p className="text-sm text-slate-500">Giám sát hoạt động kiểm kê tồn kho trên toàn hệ thống.</p>
              </div>
            </div>

            {/* Danh sách phiếu kiểm kê */}
            <div className="flex-1 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden flex flex-col">
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Mã Phiếu / Kho</th>
                      <th className="px-6 py-4 font-semibold">Ngày tạo</th>
                      <th className="px-6 py-4 font-semibold">Người yêu cầu</th>
                      <th className="px-6 py-4 font-semibold">Trạng thái</th>
                      <th className="px-6 py-4 font-semibold text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600"></div>
                            <span>Đang tải dữ liệu...</span>
                          </div>
                        </td>
                      </tr>
                    ) : audits.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                          Không có phiếu kiểm kê nào trong hệ thống.
                        </td>
                      </tr>
                    ) : (
                      audits.map((audit) => (
                        <tr key={audit.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-900 truncate w-48" title={audit.id}>
                              {audit.id.substring(0, 8)}...
                            </div>
                            <div className="text-xs text-slate-500 mt-1">{audit.warehouseName}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <HiOutlineCalendar className="h-4 w-4 text-slate-400" />
                              {formatDate(audit.createdAt, true)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <HiOutlineUser className="h-4 w-4 text-slate-400" />
                              <span>{audit.requestedByName || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">{getStatusBadge(audit.status)}</td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => openDetailModal(audit)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              title="Xem chi tiết"
                            >
                              <HiOutlineEye className="h-4 w-4 text-blue-600" />
                              Xem
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Phân trang */}
              {!loading && totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
                  <span className="text-sm text-slate-500">
                    Trang <span className="font-medium text-slate-900">{page + 1}</span> /{' '}
                    <span className="font-medium text-slate-900">{totalPages}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 0}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Trước
                    </button>
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= totalPages - 1}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Chi Tiết */}
            {selectedAudit && (
              <Modal
                isOpen={isDetailModalOpen}
                onClose={closeDetailModal}
                title="Chi Tiết Phiếu Kiểm Kê"
                className="max-w-4xl w-[90vw]"
              >
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 border border-slate-200">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Mã Phiếu</p>
                      <p className="text-sm font-medium text-slate-900 mt-1">{selectedAudit.id}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Kho Bãi</p>
                      <p className="text-sm font-medium text-slate-900 mt-1">{selectedAudit.warehouseName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Trạng Thái</p>
                      <div className="mt-1">{getStatusBadge(selectedAudit.status)}</div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ghi Chú</p>
                      <p className="text-sm text-slate-700 mt-1">{selectedAudit.note || 'Không có ghi chú'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Người tạo</p>
                      <p className="text-sm font-medium text-slate-900 mt-1">{selectedAudit.requestedByName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Người duyệt</p>
                      <p className="text-sm font-medium text-slate-900 mt-1">{selectedAudit.approvedByName || 'Chưa duyệt'}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">Danh sách dòng kiểm kê</h3>
                    <div className="rounded-xl border border-slate-200 overflow-hidden max-h-80 overflow-y-auto">
                      <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200 sticky top-0">
                          <tr>
                            <th className="px-4 py-3 font-semibold">SKU</th>
                            <th className="px-4 py-3 font-semibold">Vị trí (Zone/Rack/Bin)</th>
                            <th className="px-4 py-3 font-semibold text-right">Tồn hệ thống</th>
                            <th className="px-4 py-3 font-semibold text-right">Đếm thực tế</th>
                            <th className="px-4 py-3 font-semibold text-right">Chênh lệch</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {!selectedAudit.items || selectedAudit.items.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                                Phiếu không có dòng chi tiết nào.
                              </td>
                            </tr>
                          ) : (
                            selectedAudit.items.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3">
                                  <div className="font-medium text-slate-900">{item.skuCode}</div>
                                  <div className="text-xs text-slate-500">{item.skuName}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-slate-700">{item.zoneName || '-'}</div>
                                  <div className="text-xs text-slate-500">
                                    {item.rackName || '-'} / {item.binName || '-'}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right font-medium">
                                  {item.expectedQuantity} <span className="text-xs text-slate-400">{item.uomSymbol}</span>
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-blue-600">
                                  {item.actualQuantity} <span className="text-xs text-slate-400">{item.uomSymbol}</span>
                                </td>
                                <td className={`px-4 py-3 text-right font-bold ${item.discrepancy < 0 ? 'text-red-600' : item.discrepancy > 0 ? 'text-green-600' : 'text-slate-400'
                                  }`}>
                                  {item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                      onClick={closeDetailModal}
                      className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </Modal>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

export default AdminAuditsPage
