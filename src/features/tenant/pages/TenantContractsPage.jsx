import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import { FileText, CheckCircle, Loader2, Scale, X, Upload, ImageIcon, AlertCircle, CheckCircle2, User } from 'lucide-react'
import contractApi from '@/services/contractApi'
import disputeApi from '@/services/disputeApi'

// ─── Helpers ─────────────────────────────────────────────────────────────────
/** Kiểm tra hợp đồng còn trong vòng 7 ngày kể từ createdAt */
const isWithin7Days = (createdAt) => {
  if (!createdAt) return false
  const created = new Date(createdAt)
  const now = new Date()
  const diffMs = now - created
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays <= 7
}

/** Trạng thái hợp đồng cho phép mở dispute */
const DISPUTABLE_STATUSES = ['ACTIVE', 'PENDING_HANDOVER', 'PENDING_CANCEL']

const STATUS_CONFIG = {
  OPEN: { label: 'Đang mở', variant: 'warning', icon: AlertCircle },
  RESOLVED: { label: 'Đã giải quyết', variant: 'success', icon: CheckCircle2 },
}
const formatDate = (dt) => (dt ? new Date(dt).toLocaleString('vi-VN', { hour12: false }) : '—')
const shortId = (id) => (id ? `#${String(id).slice(0, 8).toUpperCase()}` : '—')

// ─── Dispute Modal ───────────────────────────────────────────────────────────
const DisputeModal = ({ contractId, onClose, onSuccess }) => {
  const [reason, setReason] = useState('')
  const [files, setFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do tranh chấp.')
      return
    }
    setError(null)
    setSubmitting(true)

    try {
      await disputeApi.createDispute(
        { contractId, reason: reason.trim() },
        files
      )
      alert('Đã gửi yêu cầu tranh chấp thành công! Admin sẽ xử lý sớm.')
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Gửi tranh chấp thất bại. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="animate-in fade-in zoom-in-95 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl duration-150">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Scale className="h-5 w-5 text-amber-600" /> Mở tranh chấp
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          <strong>Lưu ý:</strong> Tranh chấp sẽ được gửi đến Admin hệ thống. Inspector sẽ được gán để
          kiểm tra và đưa ra phán quyết. Admin sẽ là người ra quyết định cuối cùng về xử lý tiền cọc.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold text-slate-500">
              Lý do tranh chấp <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Mô tả chi tiết lý do tranh chấp: vấn đề bàn giao, vi phạm cam kết, tiền cọc..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 transition-colors focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold text-slate-500">
              Ảnh bằng chứng (tùy chọn)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-1.5 file:text-xs file:font-bold file:text-blue-600 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
            {files.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {files.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                  >
                    <ImageIcon size={12} />
                    <span className="max-w-[120px] truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-amber-600 disabled:bg-slate-300"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <Scale className="mr-1.5 h-3.5 w-3.5" />
                  Gửi tranh chấp
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Detail Modal ────────────────────────────────────────────────────────────
const DetailModal = ({ dispute, onClose }) => {
  const StatusIcon = STATUS_CONFIG[dispute.status]?.icon || AlertCircle

  let evidenceImages = []
  if (dispute.evidenceImages) {
    try {
      evidenceImages = JSON.parse(dispute.evidenceImages)
    } catch {
      if (typeof dispute.evidenceImages === 'string' && dispute.evidenceImages.startsWith('[')) {
        const content = dispute.evidenceImages.slice(1, -1)
        if (content) evidenceImages = content.split(',').map((s) => s.trim())
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl animate-in fade-in zoom-in-95 rounded-2xl bg-white p-6 shadow-2xl duration-150" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Scale size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Chi tiết tranh chấp</h2>
              <p className="text-xs text-slate-400">{shortId(dispute.id)}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <span className="font-medium text-slate-600">Trạng thái</span>
            <Badge variant={STATUS_CONFIG[dispute.status]?.variant || 'slate'} size="sm" className="rounded-full">
              <StatusIcon size={12} className="mr-1 inline" />
              {STATUS_CONFIG[dispute.status]?.label || dispute.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="mb-1 text-xs text-slate-400">Hợp đồng</p>
              <p className="font-mono text-xs font-bold text-slate-700">{shortId(dispute.contractId)}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="mb-1 text-xs text-slate-400">Ngày tạo</p>
              <p className="font-medium text-slate-700">{formatDate(dispute.createdAt)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="mb-1 flex items-center gap-1 text-xs text-slate-400">
                <User size={11} /> Người khiếu nại
              </p>
              <p className="font-semibold text-slate-800">{dispute.raisedByName || '—'}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="mb-1 flex items-center gap-1 text-xs text-slate-400">
                <User size={11} /> Người xử lý
              </p>
              <p className="font-semibold text-slate-800">{dispute.handledByName || 'Chưa có'}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="mb-1 flex items-center gap-1 text-xs text-slate-400">
              <FileText size={11} /> Lý do khiếu nại
            </p>
            <p className="text-slate-700">{dispute.reason || '—'}</p>
          </div>

          {evidenceImages.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="mb-2 flex items-center gap-1 text-xs text-slate-400">
                <ImageIcon size={11} /> Ảnh bằng chứng
              </p>
              <div className="flex flex-wrap gap-2">
                {evidenceImages.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt={`Evidence ${i + 1}`} className="h-20 w-20 rounded-lg border border-slate-200 object-cover transition-transform hover:scale-105" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {dispute.adminNote && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="mb-1.5 text-xs font-medium text-blue-500">Ghi chú Admin / Phán quyết</p>
              <p className="text-blue-800">{dispute.adminNote}</p>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}


// ─── Main Page ───────────────────────────────────────────────────────────────
const TenantContractsPage = () => {
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)

  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)

  // Dispute modal state
  const [disputeContractId, setDisputeContractId] = useState(null)
  
  const [viewDispute, setViewDispute] = useState(null)
  const [loadingDispute, setLoadingDispute] = useState(false)

  const fetchContracts = async () => {
    try {
      setLoading(true)
      const res = await contractApi.getMyContracts({ page: 0, size: 20 })
      if (res?.data?.success) {
        setContracts(res.data.data.content || [])
      }
    } catch (error) {
      console.error('Lỗi lấy danh sách hợp đồng:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContracts()
  }, [])

  const handleConfirmContract = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xác nhận hợp đồng này không?")) return;

    try {
      await contractApi.tenantConfirmContract(id)
      alert('Đã xác nhận hợp đồng thành công! Hợp đồng đã có hiệu lực (ACTIVE).')
      fetchContracts()
    } catch (error) {
      alert(error.response?.data?.message || 'Xác nhận hợp đồng thất bại')
    }
  }

  const handleViewContract = (imageUrlRaw) => {
    try {
      if (!imageUrlRaw) throw new Error('No image');
      
      let imageUrl = imageUrlRaw;
      
      if (typeof imageUrlRaw === 'string' && imageUrlRaw.startsWith('[')) {
        try {
          const parsed = JSON.parse(imageUrlRaw);
          if (parsed && parsed.length > 0) imageUrl = parsed[0];
        } catch (e) {
          // Fallback cho Java List.toString() không có quotes
          const content = imageUrlRaw.slice(1, -1);
          if (content) {
            imageUrl = content.split(',')[0].trim();
          }
        }
      }

      if (!imageUrl || imageUrl.startsWith('[')) throw new Error('Invalid URL');
      window.open(imageUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      alert('Chủ kho chưa upload bản hợp đồng hoặc không tìm thấy file hợp lệ!')
    }
  }

  const handleViewDispute = async (contractId) => {
    try {
      setLoadingDispute(true)
      const res = await disputeApi.getMyDisputes({ size: 100 })
      const myDisputes = res?.data?.data?.content || []
      const dispute = myDisputes.find((d) => d.contractId === contractId)
      
      if (dispute) {
        setViewDispute(dispute)
      } else {
        alert('Không tìm thấy chi tiết tranh chấp do bạn mở cho hợp đồng này.\n\n(Lưu ý: Bạn chỉ xem được nếu bạn là người trực tiếp mở tranh chấp).')
      }
    } catch (err) {
      alert('Lỗi khi lấy thông tin tranh chấp.')
    } finally {
      setLoadingDispute(false)
    }
  }

  const columns = [
    {
      header: 'Owner',
      render: (row) => (
        <div>
          <p className="font-bold text-slate-900">{row.ownerName}</p>
        </div>
      ),
    },
    { header: 'Warehouse', accessor: 'warehouseName' },
    {
      header: 'Start Date',
      render: (row) => <span>{row.startDate ? new Date(row.startDate).toLocaleDateString('vi-VN') : 'N/A'}</span>
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge
          variant={
            row.status === 'ACTIVE' ? 'success' :
            row.status === 'DISPUTED' ? 'danger' :
              row.status === 'PENDING_TENANT_CONFIRM' ? 'warning' : 'secondary'
          }
        >
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          {/* Luôn hiện nút Xem nếu có link ảnh */}
          {row.paperContractImages && (
            <Button size="sm" variant="outline" className="text-black" onClick={() => handleViewContract(row.paperContractImages)}>
              <FileText className="mr-2 h-4 w-4" /> Xem
            </Button>
          )}
          
          {row.status === 'PENDING_TENANT_CONFIRM' && (
            <Button size="sm" className="text-black bg-blue-100 hover:bg-blue-200" onClick={() => handleConfirmContract(row.id)}>
              <CheckCircle className="mr-2 h-4 w-4" /> Xác Nhận
            </Button>
          )}

          {/* Nút Tranh chấp — hiện khi status phù hợp & trong vòng 7 ngày */}
          {DISPUTABLE_STATUSES.includes(row.status) && isWithin7Days(row.createdAt) && (
            <Button
              size="sm"
              className="bg-amber-100 text-amber-700 hover:bg-amber-200"
              onClick={() => setDisputeContractId(row.id)}
            >
              <Scale className="mr-1.5 h-4 w-4" /> Tranh chấp
            </Button>
          )}

          {/* Trạng thái DISPUTED — đã có tranh chấp */}
          {row.status === 'DISPUTED' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600">
              <Scale size={12} /> Đang tranh chấp
            </span>
          )}

          {/* Nút Xem kết quả tranh chấp (khi đã DISPUTED hoặc CANCELLED) */}
          {(row.status === 'DISPUTED' || row.status === 'CANCELLED') && (
             <Button
               size="sm"
               className="bg-slate-100 text-slate-700 hover:bg-slate-200"
               onClick={() => handleViewDispute(row.id)}
               disabled={loadingDispute}
             >
               <Scale className="mr-1.5 h-4 w-4" /> Chi tiết tranh chấp
             </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header />

      {/* MOBILE OVERLAY */}
      <div className="md:hidden">
        {isMobileOpen && (
          <button
            className="fixed inset-0 z-40 bg-slate-900/30"
            onClick={() => dispatch(closeMobileSidebar())}
          />
        )}
      </div>

      <div className="flex pt-14">
        <Sidebar currentRole="TENANT" />

        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
            }`}
        >
          <main className="mx-auto w-full max-w-4000 space-y-6 p-6 md:p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">My Contracts</h1>
                <p className="text-sm text-slate-500">Manage your warehouse rental agreements.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <DataTable columns={columns} data={contracts} isLoading={loading} />
            </div>
          </main>
        </div>
      </div>

      {/* Dispute Modal */}
      {disputeContractId && (
        <DisputeModal
          contractId={disputeContractId}
          onClose={() => setDisputeContractId(null)}
          onSuccess={fetchContracts}
        />
      )}

      {/* View Dispute Modal */}
      {viewDispute && (
        <DetailModal
          dispute={viewDispute}
          onClose={() => setViewDispute(null)}
        />
      )}
    </div>
  )
}

export default TenantContractsPage
