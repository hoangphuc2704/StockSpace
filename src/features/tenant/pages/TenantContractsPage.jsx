import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  CheckCircle,
  ClipboardList,
  Edit3,
  Eye,
  FileText,
  Loader2,
  PackageOpen,
  X,
} from 'lucide-react'
import { FormShell } from '@/form/FormControls'
import useEscapeKey from '@/hooks/useEscapeKey'
import { closeMobileSidebar } from '@/store/uiSlide'
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'
import ContractViewerModal from '@/components/ContractViewerModal'
import TableActionMenu from '@/components/TableActionMenu'
import contractApi from '@/services/contractApi'
import { toast } from 'react-hot-toast'
import { showApiErrorToast } from '@/config/apiError'
import { required } from '@/config/validation'
import { useConfirmDialog } from '@/components/ConfirmDialogProvider'
import { formatVND } from '@/utils/currency'

const CONTRACT_STATUS_META = {
  DRAFT: { label: 'Bản nháp', className: 'border-slate-200 bg-slate-100 text-slate-700' },
  PENDING_TENANT_CONFIRM: {
    label: 'Chờ xác nhận',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  CHANGES_REQUESTED: {
    label: 'Yêu cầu chỉnh sửa',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  ACTIVE: {
    label: 'Đang hoạt động',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  REJECTED: { label: 'Đã từ chối', className: 'border-rose-200 bg-rose-50 text-rose-800' },
  EXPIRED: { label: 'Đã hết hạn', className: 'border-slate-200 bg-slate-100 text-slate-700' },
}

const getStatusMeta = (status) =>
  CONTRACT_STATUS_META[status] || {
    label: status || 'Không xác định',
    className: 'border-slate-200 bg-slate-100 text-slate-700',
  }

const formatContractDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(`${dateString}T00:00:00`)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('vi-VN')
}

const formatContractReference = (id) =>
  `HĐ-${
    String(id || '')
      .slice(0, 8)
      .toUpperCase() || '-'
  }`

const isExpiringSoon = (contract) => {
  if (contract.status !== 'ACTIVE' || !contract.endDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(`${contract.endDate}T00:00:00`)
  if (Number.isNaN(endDate.getTime())) return false
  const daysUntilEnd = Math.ceil((endDate - today) / 86_400_000)
  return daysUntilEnd >= 0 && daysUntilEnd <= 30
}

const ReasonModal = ({ isOpen, title, action, contractId, onClose, onSuccess }) => {
  useEscapeKey(isOpen, onClose)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReason('')
      setError(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (event) => {
    event.preventDefault()
    const reasonError = required(reason, 'Reason')
    if (reasonError) {
      setError(reasonError)
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      if (action === 'request-changes') {
        await contractApi.requestChanges(contractId, reason.trim())
        toast.success('Changes requested successfully.')
      } else if (action === 'reject') {
        await contractApi.reject(contractId, reason.trim())
        toast.success('Contract rejected.')
      }
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Submit failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const isRejecting = action === 'reject'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="contract-reason-title"
        className="w-full max-w-md overflow-hidden rounded-lg border border-slate-300 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase">
              Rà soát hợp đồng
            </p>
            <h3 id="contract-reason-title" className="mt-1 text-lg font-bold text-slate-950">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close contract review"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <FormShell onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
          {isRejecting && (
            <div className="border-l-2 border-rose-500 bg-rose-50 px-3 py-2.5 text-sm leading-5 text-rose-900">
              Từ chối hợp đồng sẽ kết thúc quy trình phê duyệt hiện tại cho thỏa thuận này.
            </div>
          )}
          <div>
            <label
              htmlFor="contract-reason"
              className="mb-1.5 block text-sm font-semibold text-slate-800"
            >
              Lý do <span className="text-rose-600">*</span>
            </label>
            <textarea
              id="contract-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              placeholder={`Nhập lý do ${isRejecting ? 'từ chối' : 'yêu cầu chỉnh sửa'} hợp đồng...`}
              className="w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 transition-colors outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          {error && <p className="text-sm text-rose-700">{error}</p>}
          <footer className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                isRejecting
                  ? 'bg-rose-700 hover:bg-rose-800 focus-visible:ring-rose-600'
                  : 'bg-blue-700 hover:bg-blue-800 focus-visible:ring-blue-600'
              }`}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {submitting ? 'Đang gửi' : 'Gửi yêu cầu'}
            </button>
          </footer>
        </FormShell>
      </section>
    </div>
  )
}

const TenantContractsPage = () => {
  const confirmDialog = useConfirmDialog()
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)

  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [reasonModalOpen, setReasonModalOpen] = useState(false)
  const [reasonAction, setReasonAction] = useState(null)
  const [selectedContractId, setSelectedContractId] = useState(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerImages, setViewerImages] = useState([])

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true)
      const res = await contractApi.getMyContracts({ page: 0, size: 20 })
      if (res?.data?.success) {
        setContracts(res.data.data.content || [])
      }
    } catch (error) {
      console.error('Error getting list of contracts:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchContracts()
  }, [fetchContracts])

  const contractSummary = useMemo(
    () => ({
      total: contracts.length,
      active: contracts.filter((contract) => contract.status === 'ACTIVE').length,
      expiringSoon: contracts.filter(isExpiringSoon).length,
    }),
    [contracts]
  )

  const handleConfirmContract = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Confirm contract',
      message: 'Are you sure you want to confirm this contract?',
      confirmText: 'Confirm contract',
    })
    if (!confirmed) return

    try {
      await contractApi.confirm(id)
      toast.success('Contract confirmed and activated.')
      fetchContracts()
    } catch (error) {
      showApiErrorToast(error, 'Could not confirm contract.')
    }
  }

  const handleViewContract = (imageUrlRaw) => {
    try {
      if (!imageUrlRaw) throw new Error('No image')
      const imageArray = Array.isArray(imageUrlRaw) ? imageUrlRaw : [imageUrlRaw]
      if (!imageArray || imageArray.length === 0) throw new Error('Invalid URL')
      setViewerImages(imageArray)
      setViewerOpen(true)
    } catch {
      toast.error('Contract file unavailable.')
    }
  }

  const getActions = (contract) =>
    [
      contract.paperContractFiles?.length > 0 && {
        label: 'Xem hợp đồng giấy',
        icon: FileText,
        onClick: () => handleViewContract(contract.paperContractFiles),
      },
      contract.canViewLayout && {
        label: 'Xem sơ đồ kho',
        icon: Eye,
        onClick: () => window.open(`/tenant/contracts/${contract.id}/layout`, '_blank'),
      },
      contract.canConfirm && {
        label: 'Xác nhận hợp đồng',
        icon: CheckCircle,
        onClick: () => handleConfirmContract(contract.id),
      },
      contract.canRequestChanges && {
        label: 'Yêu cầu chỉnh sửa',
        icon: Edit3,
        onClick: () => {
          setSelectedContractId(contract.id)
          setReasonAction('request-changes')
          setReasonModalOpen(true)
        },
      },
      contract.canReject && {
        label: 'Từ chối hợp đồng',
        icon: X,
        onClick: () => {
          setSelectedContractId(contract.id)
          setReasonAction('reject')
          setReasonModalOpen(true)
        },
        danger: true,
      },
      contract.canManageWms && {
        label: 'Mở WMS',
        icon: PackageOpen,
        onClick: () =>
          window.open(`/tenant/inventory?warehouseId=${contract.warehouseId}`, '_blank'),
      },
    ].filter(Boolean)

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header />
      <div className="md:hidden">
        {isMobileOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-slate-900/40"
            onClick={() => dispatch(closeMobileSidebar())}
          />
        )}
      </div>

      <div className="flex pt-14">
        <Sidebar currentRole="TENANT" />
        <div
          className={`flex min-w-0 flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
          }`}
        >
          <main className="mx-auto w-full max-w-[1600px] space-y-5 px-4 py-6 sm:px-6 md:py-8 lg:px-8">
            <header className="flex flex-col gap-5 border-b border-slate-300 pb-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
                  <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                  Tenant operations
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                  Hợp đồng của tôi
                </h1>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">
                  Quản lý và theo dõi các hợp đồng thuê kho của bạn.
                </p>
              </div>

              <dl className="grid grid-cols-3 divide-x divide-slate-200 border border-slate-200 bg-white text-left">
                <div className="min-w-[104px] px-3 py-2.5 sm:px-4">
                  <dt className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
                    Tổng hợp đồng
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-slate-950 tabular-nums">
                    {loading ? '-' : contractSummary.total}
                  </dd>
                </div>
                <div className="min-w-[104px] px-3 py-2.5 sm:px-4">
                  <dt className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
                    Đang hoạt động
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-emerald-700 tabular-nums">
                    {loading ? '-' : contractSummary.active}
                  </dd>
                </div>
                <div className="min-w-[104px] px-3 py-2.5 sm:px-4">
                  <dt className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
                    Sắp hết hạn
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-amber-700 tabular-nums">
                    {loading ? '-' : contractSummary.expiringSoon}
                  </dd>
                </div>
              </dl>
            </header>

            <section
              aria-labelledby="contract-records-heading"
              aria-busy={loading}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs"
            >
              <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <h2
                    id="contract-records-heading"
                    className="text-sm font-semibold text-slate-950"
                  >
                    Danh sách hợp đồng
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Hồ sơ thuê kho và các thao tác hiện có theo từng hợp đồng
                  </p>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  {loading ? 'Đang tải hồ sơ' : `${contracts.length} hợp đồng hiển thị`}
                </span>
              </div>

              <div className="overflow-x-auto">
                {loading ? (
                  <div className="min-w-[1060px] divide-y divide-slate-200" aria-hidden="true">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-[170px_180px_minmax(200px,1fr)_150px_190px_130px_64px] items-center gap-5 px-5 py-4"
                      >
                        {Array.from({ length: 7 }).map((__, cellIndex) => (
                          <span
                            key={cellIndex}
                            className="h-4 animate-pulse rounded bg-slate-200"
                            style={{ width: `${cellIndex === 2 ? 85 : 65}%` }}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                ) : contracts.length > 0 ? (
                  <table className="w-full min-w-[1060px] text-left text-sm">
                    <caption className="sr-only">Danh sách hợp đồng thuê kho</caption>
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold tracking-[0.08em] text-slate-600 uppercase">
                      <tr>
                        <th scope="col" className="px-5 py-3">
                          Hợp đồng
                        </th>
                        <th scope="col" className="px-5 py-3">
                          Chủ kho
                        </th>
                        <th scope="col" className="px-5 py-3">
                          Kho bãi
                        </th>
                        <th scope="col" className="px-5 py-3 text-right">
                          Giá thuê
                        </th>
                        <th scope="col" className="px-5 py-3">
                          Thời hạn
                        </th>
                        <th scope="col" className="px-5 py-3">
                          Trạng thái
                        </th>
                        <th scope="col" className="px-5 py-3 text-right">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {contracts.map((contract) => {
                        const statusMeta = getStatusMeta(contract.status)
                        const actions = getActions(contract)
                        return (
                          <tr key={contract.id} className="transition-colors hover:bg-slate-50">
                            <td className="px-5 py-3.5 align-middle">
                              <p className="font-mono text-xs font-semibold text-slate-900">
                                {formatContractReference(contract.id)}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">Hợp đồng thuê kho</p>
                            </td>
                            <td className="px-5 py-3.5 align-middle">
                              <p className="font-semibold text-slate-900">
                                {contract.ownerName || '-'}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">Chủ kho</p>
                            </td>
                            <td className="px-5 py-3.5 align-middle">
                              <p className="max-w-72 truncate font-semibold text-slate-900">
                                {contract.warehouseName || '-'}
                              </p>
                              <p className="mt-1 max-w-72 truncate text-xs text-slate-500">
                                {contract.warehouseAddress || 'Không có địa chỉ kho'}
                              </p>
                            </td>
                            <td className="px-5 py-3.5 text-right align-middle">
                              <p className="font-semibold text-slate-950 tabular-nums">
                                {formatVND(contract.finalMonthlyRent || 0)}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">/ tháng</p>
                            </td>
                            <td className="px-5 py-3.5 align-middle">
                              <p className="font-medium text-slate-800 tabular-nums">
                                {formatContractDate(contract.startDate)}{' '}
                                <span className="px-1 text-slate-400">→</span>{' '}
                                {formatContractDate(contract.endDate)}
                              </p>
                              {isExpiringSoon(contract) && (
                                <p className="mt-1 text-xs font-medium text-amber-700">
                                  Sắp hết hạn
                                </p>
                              )}
                            </td>
                            <td className="px-5 py-3.5 align-middle">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-semibold ${statusMeta.className}`}
                              >
                                <span
                                  className="h-1.5 w-1.5 rounded-full bg-current opacity-80"
                                  aria-hidden="true"
                                />
                                {statusMeta.label}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right align-middle">
                              <TableActionMenu
                                label={`Thao tác cho ${formatContractReference(contract.id)}`}
                                items={actions}
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
                    <FileText className="h-7 w-7 text-slate-400" aria-hidden="true" />
                    <h3 className="mt-3 text-sm font-semibold text-slate-800">Chưa có hợp đồng</h3>
                    <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                      Bạn chưa có hợp đồng thuê kho nào để theo dõi.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </main>
        </div>
      </div>

      <ReasonModal
        isOpen={reasonModalOpen}
        title={reasonAction === 'reject' ? 'Từ chối hợp đồng' : 'Yêu cầu chỉnh sửa'}
        action={reasonAction}
        contractId={selectedContractId}
        onClose={() => setReasonModalOpen(false)}
        onSuccess={fetchContracts}
      />

      <ContractViewerModal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        images={viewerImages}
      />
    </div>
  )
}

export default TenantContractsPage
