import React, { useState, useEffect } from 'react'
import { ArrowLeft, Save, CheckCircle, XCircle } from 'lucide-react'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import Modal from '@/components/organisms/Modal'
import Header from '@/components/HeaderDashboard'
import Sidebar from '@/components/SideBar'
import { useParams, useNavigate } from 'react-router-dom'
import auditApi from '@/services/wms/auditApi'
import { toast } from 'react-hot-toast'
import moment from 'moment'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'

const STATUS_CONFIG = {
  PENDING: { label: 'Đang chờ', type: 'warning' },
  APPROVED: { label: 'Đã duyệt', type: 'success' },
  REJECTED: { label: 'Đã từ chối', type: 'error' },
  SUBMITTED: { label: 'Chờ duyệt', type: 'info' },
  COMPLETED: { label: 'Hoàn tất', type: 'success' },
}

const InventoryAuditDetailPage = ({ currentRole }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)

  const [audit, setAudit] = useState(null)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])

  // Modal từ chối
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [approving, setApproving] = useState(false)

  const fetchAuditDetail = async () => {
    try {
      setLoading(true)
      const res = await auditApi.getAuditDetail(id)
      if (res.data?.success) {
        setAudit(res.data.data)
        // copy items into state to allow editing actualQuantity
        const fetchedItems = res.data.data.items || []
        setItems(
          fetchedItems.map((item) => ({
            ...item,
            // Mặc định actualQuantity bằng expectedQuantity nếu chưa nhập
            actualQuantity:
              item.actualQuantity !== null ? item.actualQuantity : item.expectedQuantity,
          }))
        )
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi tải chi tiết phiếu kiểm kê')
      handleBack()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) fetchAuditDetail()
  }, [id])

  const handleBack = () => {
    if (currentRole === 'STAFF') {
      navigate('/staff/inventory-audits')
    } else {
      navigate('/tenant/inventory-audits')
    }
  }

  const handleQuantityChange = (batchId, value) => {
    const num = parseInt(value, 10)
    setItems((prev) =>
      prev.map((item) =>
        item.batchId === batchId ? { ...item, actualQuantity: isNaN(num) ? 0 : num } : item
      )
    )
  }

  const handleNoteChange = (batchId, value) => {
    setItems((prev) =>
      prev.map((item) => (item.batchId === batchId ? { ...item, note: value } : item))
    )
  }

  const handleSubmitAudit = async () => {
    try {
      setSubmitting(true)
      const payload = {
        items: items.map((item) => ({
          batchId: item.batchId,
          actualQuantity: item.actualQuantity,
          note: item.note || '',
        })),
      }
      const res = await auditApi.submitAudit(id, payload)
      if (res.data?.success) {
        toast.success('Nộp kết quả kiểm đếm thành công')
        fetchAuditDetail()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi nộp kết quả')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async () => {
    try {
      setApproving(true)
      const res = await auditApi.approveAudit(id)
      if (res.data?.success) {
        toast.success('Duyệt phiếu kiểm kê thành công')
        fetchAuditDetail()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi duyệt phiếu')
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async (e) => {
    e.preventDefault()
    try {
      setRejecting(true)
      const res = await auditApi.rejectAudit(id, { reason: rejectReason })
      if (res.data?.success) {
        toast.success('Từ chối phiếu kiểm kê thành công')
        setIsRejectModalOpen(false)
        fetchAuditDetail()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi từ chối phiếu')
    } finally {
      setRejecting(false)
    }
  }

  if (loading && !audit) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <Header />
        <div className="flex pt-14">
          <Sidebar currentRole={currentRole} />
          <div className="flex flex-1 items-center justify-center pt-20">
            <p>Đang tải...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!audit) return null

  const isPending = audit.status === 'PENDING'
  const isSubmitted = audit.status === 'SUBMITTED'
  const statusConfig = STATUS_CONFIG[audit.status] || { label: audit.status, type: 'default' }

  const columns = [
    {
      accessor: 'skuCode',
      header: 'Mã SKU',
    },
    {
      accessor: 'skuName',
      header: 'Tên Sản Phẩm',
    },
    {
      accessor: 'location',
      header: 'Vị trí',
      render: (row) => `${row.rackName || ''} - ${row.binName || ''}`,
    },
    {
      accessor: 'expectedQuantity',
      header: 'SL Hệ thống (Snapshot)',
      render: (row) => `${row.expectedQuantity} ${row.uomSymbol || ''}`,
    },
    {
      accessor: 'actualQuantity',
      header: 'SL Thực tế',
      render: (row) => {
        if (isPending) {
          return (
            <input
              type="number"
              min="0"
              className="focus:border-brand-500 focus:ring-brand-500 w-24 rounded-lg border border-slate-300 px-2 py-1 outline-none focus:ring-1"
              value={row.actualQuantity}
              onChange={(e) => handleQuantityChange(row.batchId, e.target.value)}
            />
          )
        }
        return `${row.actualQuantity} ${row.uomSymbol || ''}`
      },
    },
    {
      accessor: 'discrepancy',
      header: 'Chênh lệch',
      render: (row) => {
        const diff = isPending ? row.actualQuantity - row.expectedQuantity : row.discrepancy

        let colorClass = 'text-slate-600'
        let sign = ''
        if (diff > 0) {
          colorClass = 'text-green-600 font-medium'
          sign = '+'
        } else if (diff < 0) {
          colorClass = 'text-red-600 font-medium'
        }

        return (
          <span className={colorClass}>
            {sign}
            {diff}
          </span>
        )
      },
    },
    {
      accessor: 'note',
      header: 'Ghi chú',
      render: (row) => {
        if (isPending) {
          return (
            <input
              type="text"
              className="focus:border-brand-500 focus:ring-brand-500 w-full min-w-30 rounded-lg border border-slate-300 px-2 py-1 outline-none focus:ring-1"
              value={row.note || ''}
              placeholder="Ghi chú..."
              onChange={(e) => handleNoteChange(row.batchId, e.target.value)}
            />
          )
        }
        return row.note || '-'
      },
    },
  ]

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
      <div className="flex pt-14">
        <Sidebar currentRole={currentRole} />
        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
          }`}
        >
          <main className="mx-auto w-full max-w-400 space-y-8 p-6 md:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBack}
                  className="rounded-full p-2 transition-colors hover:bg-slate-200"
                >
                  <ArrowLeft className="h-5 w-5 text-slate-600" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Chi tiết Phiếu Kiểm Kê
                    {currentRole === 'STAFF' ? ` #${audit.id}` : ''}
                  </h1>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Badge type={statusConfig.type} className="px-3 py-1 text-sm">
                    {statusConfig.label}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-semibold text-slate-900">Thông tin chung</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Kho kiểm kê:</span>
                      <span className="font-medium text-slate-900">{audit.warehouseName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Người tạo:</span>
                      <span className="font-medium text-slate-900">{audit.requestedByName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ngày tạo:</span>
                      <span className="font-medium text-slate-900">
                        {moment(audit.createdAt).format('DD/MM/YYYY HH:mm')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ghi chú:</span>
                      <span className="font-medium text-slate-900">{audit.note || 'Không có'}</span>
                    </div>
                  </div>
                </div>

                {(audit.approvedByName || audit.status === 'REJECTED') && (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-semibold text-slate-900">
                      Thông tin xét duyệt
                    </h3>
                    <div className="space-y-3 text-sm">
                      {audit.approvedByName && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Người duyệt:</span>
                          <span className="font-medium text-slate-900">{audit.approvedByName}</span>
                        </div>
                      )}
                      {audit.updatedAt && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Ngày cập nhật:</span>
                          <span className="font-medium text-slate-900">
                            {moment(audit.updatedAt).format('DD/MM/YYYY HH:mm')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 p-4">
                  <h3 className="font-semibold text-slate-900">Danh sách sản phẩm kiểm đếm</h3>
                </div>
                <DataTable columns={columns} data={items} loading={loading} />
              </div>

              {/* Actions based on status */}
              <div className="flex justify-end gap-3 pt-2">
                {isPending && (
                  <Button
                    onClick={handleSubmitAudit}
                    isLoading={submitting}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Lưu kết quả kiểm đếm
                  </Button>
                )}

                {isSubmitted && currentRole === 'TENANT' && (
                  <>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                      onClick={() => setIsRejectModalOpen(true)}
                    >
                      <XCircle className="h-4 w-4" />
                      Từ chối
                    </Button>
                    <Button
                      onClick={handleApprove}
                      isLoading={approving}
                      className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Duyệt & Cập nhật tồn kho
                    </Button>
                  </>
                )}

                {isSubmitted && currentRole === 'STAFF' && (
                  <span className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-sm text-slate-500 italic">
                    Đang chờ Tenant duyệt kết quả
                  </span>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Từ chối phiếu kiểm kê"
        size="md"
      >
        <form onSubmit={handleReject} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Lý do từ chối <span className="text-red-500">*</span>
            </label>
            <textarea
              className="focus:border-brand-500 focus:ring-brand-500 w-full rounded-lg border border-slate-300 p-2.5 outline-none focus:ring-1"
              rows={3}
              placeholder="Nhập lý do từ chối..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsRejectModalOpen(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              variant="outline"
              className="bg-red-600 text-white hover:bg-red-700"
              isLoading={rejecting}
            >
              Từ chối
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default InventoryAuditDetailPage
