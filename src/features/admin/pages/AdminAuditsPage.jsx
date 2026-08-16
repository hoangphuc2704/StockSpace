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
import TableActionMenu from '@/components/TableActionMenu'
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
    return new Date(dateString).toLocaleDateString('en-US', options)
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
      toast.error(error.response?.data?.message || 'Could not load inventory.')
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
        return (
          <span className="rounded-full border border-yellow-200 bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
            Waiting for approval
          </span>
        )
      case 'APPROVED':
      case 'PASSED':
        return (
          <span className="rounded-full border border-green-200 bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            Approved
          </span>
        )
      case 'REJECTED':
      case 'FAILED':
        return (
          <span className="rounded-full border border-red-200 bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
            Refuse
          </span>
        )
      default:
        return (
          <span className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
            {status}
          </span>
        )
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
              <a href="/" aria-label="Back to landing page">
                <img src={logoDaidien} alt="Logo" className="h-10 w-17" />
              </a>
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-slate-950">
              StockSpace Admin
            </span>
          </div>
        </div>
      </header>

      <div className="flex pt-14">
        <Sidebar currentRole="ADMIN" />

        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'}`}
        >
          <main className="mx-auto flex h-[calc(100vh-3.5rem)] w-full max-w-7xl flex-col space-y-6 p-6 md:p-8">
            {/* Header */}
            <div className="flex shrink-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">WMS - Inventory Management</h1>
                <p className="text-sm text-slate-500">
                  Monitor inventory activities throughout the system.
                </p>
              </div>
            </div>

            {/* Danh sách phiếu kiểm kê */}
            <div className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Voucher Code / Warehouse</th>
                      <th className="px-6 py-4 font-semibold">Creation date</th>
                      <th className="px-6 py-4 font-semibold">Requester</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 text-center font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600"></div>
                            <span>Loading data...</span>
                          </div>
                        </td>
                      </tr>
                    ) : audits.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                          There are no inventory sheets in the system.
                        </td>
                      </tr>
                    ) : (
                      audits.map((audit) => (
                        <tr key={audit.id} className="transition-colors hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <div
                              className="w-48 truncate font-medium text-slate-900"
                              title={audit.id}
                            >
                              {audit.id.substring(0, 8)}...
                            </div>
                            <div className="mt-1 text-xs text-slate-500">{audit.warehouseName}</div>
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
                            <TableActionMenu
                              items={[
                                {
                                  label: 'View details',
                                  icon: HiOutlineEye,
                                  onClick: () => openDetailModal(audit),
                                },
                              ]}
                            />
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
                    Page <span className="font-medium text-slate-900">{page + 1}</span> /{' '}
                    <span className="font-medium text-slate-900">{totalPages}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 0}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Before
                    </button>
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= totalPages - 1}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Next
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
                title="Details of Inventory Form"
                className="w-[90vw] max-w-4xl"
              >
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <p className="text-xs font-medium tracking-wider text-slate-500 uppercase">
                        Voucher Code
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{selectedAudit.id}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium tracking-wider text-slate-500 uppercase">
                        Warehouse
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {selectedAudit.warehouseName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium tracking-wider text-slate-500 uppercase">
                        Status
                      </p>
                      <div className="mt-1">{getStatusBadge(selectedAudit.status)}</div>
                    </div>
                    <div>
                      <p className="text-xs font-medium tracking-wider text-slate-500 uppercase">
                        Notes
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        {selectedAudit.note || 'No notes'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium tracking-wider text-slate-500 uppercase">
                        Creator
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {selectedAudit.requestedByName || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium tracking-wider text-slate-500 uppercase">
                        Reviewer
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {selectedAudit.approvedByName || 'Not approved yet'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 text-sm font-bold tracking-wider text-slate-800 uppercase">
                      List of inventory lines
                    </h3>
                    <div className="max-h-80 overflow-hidden overflow-y-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-sm text-slate-600">
                        <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 text-xs text-slate-500 uppercase">
                          <tr>
                            <th className="px-4 py-3 font-semibold">SKU</th>
                            <th className="px-4 py-3 font-semibold">Location (Zone/Rack/Bin)</th>
                            <th className="px-4 py-3 text-right font-semibold">System Inventory</th>
                            <th className="px-4 py-3 text-right font-semibold">Actual count</th>
                            <th className="px-4 py-3 text-right font-semibold">Difference</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {!selectedAudit.items || selectedAudit.items.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                                The ticket does not have any detailed lines.
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
                                  {item.expectedQuantity}{' '}
                                  <span className="text-xs text-slate-400">{item.uomSymbol}</span>
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-blue-600">
                                  {item.actualQuantity}{' '}
                                  <span className="text-xs text-slate-400">{item.uomSymbol}</span>
                                </td>
                                <td
                                  className={`px-4 py-3 text-right font-bold ${
                                    item.discrepancy < 0
                                      ? 'text-red-600'
                                      : item.discrepancy > 0
                                        ? 'text-green-600'
                                        : 'text-slate-400'
                                  }`}
                                >
                                  {item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-end border-t border-slate-100 pt-4">
                    <button
                      onClick={closeDetailModal}
                      className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
                    >
                      Close
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
