import { useCallback, useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { closeMobileSidebar } from '@/store/uiSlide'
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'
import TableActionMenu from '@/components/TableActionMenu'
import {
  ArrowRight,
  ArrowRightLeft,
  ChevronRight,
  Eye,
  PackageCheck,
  Plus,
  Truck,
  Warehouse,
  X,
} from 'lucide-react'
import transferApi from '@/services/wms/transferApi'
import warehouseApi from '@/services/warehouse/warehouseApi'
import { toast } from 'react-hot-toast'
import { showApiErrorToast } from '@/config/apiError'
import { useConfirmDialog } from '@/components/ConfirmDialogProvider'
import CreateTransferModal from '../components/CreateTransferModal'
import ReceiveTransferModal from '../components/ReceiveTransferModal'
import TransferDetailModal from '../components/TransferDetailModal'
import useActiveWarehouseContext from '@/hooks/useActiveWarehouseContext'

const TRANSFER_STATUS_META = {
  PENDING: {
    label: 'Pending',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  IN_TRANSIT: {
    label: 'In transit',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'border-slate-200 bg-slate-100 text-slate-700',
  },
}

const getTransferStatusMeta = (status) =>
  TRANSFER_STATUS_META[status] || {
    label: status || 'Unknown',
    className: 'border-slate-200 bg-slate-100 text-slate-700',
  }

const TransferPage = ({ currentRole }) => {
  const confirmDialog = useConfirmDialog()
  const dispatch = useDispatch()
  const [searchParams] = useSearchParams()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)

  const [transfers, setTransfers] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')
  const [loading, setLoading] = useState(true)

  useActiveWarehouseContext(selectedWarehouseId)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [receiveModalOpen, setReceiveModalOpen] = useState(false)
  const [selectedTransferForReceive, setSelectedTransferForReceive] = useState(null)

  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedTransferIdForDetail, setSelectedTransferIdForDetail] = useState(null)

  const fetchWarehouses = useCallback(async () => {
    try {
      const response = await warehouseApi.getMyWarehouses()
      const list = response.data?.data?.content || response.data?.data || []
      setWarehouses(list)
      setSelectedWarehouseId((current) => {
        const requestedWarehouseId = searchParams.get('warehouseId')
        if (list.some((warehouse) => String(warehouse.id) === String(requestedWarehouseId))) {
          return requestedWarehouseId
        }
        return list.some((warehouse) => String(warehouse.id) === String(current))
          ? current
          : list[0]?.id || ''
      })
    } catch (error) {
      showApiErrorToast(error, 'Could not load warehouses.')
    }
  }, [searchParams])

  useEffect(() => {
    // This preserves the existing initial warehouse fetch and selection behavior.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWarehouses()
  }, [fetchWarehouses])

  const fetchTransfers = useCallback(async () => {
    try {
      setLoading(true)
      const params = { page: 0, size: 20 }

      const res = await transferApi.getTransfers(params)
      if (res?.data?.success) {
        setTransfers(res.data.data.content || [])
      }
    } catch (error) {
      console.error('Error getting list of transfers:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // This preserves the existing initial transfer-list fetch behavior.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTransfers()
  }, [fetchTransfers])

  const handleApproveDispatch = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Approve Dispatch',
      message:
        'Are you sure you want to approve this transfer for dispatch? Stock will be deducted from the source warehouse.',
      confirmText: 'Approve',
    })
    if (!confirmed) return

    try {
      await transferApi.approveDispatch(id)
      toast.success('Transfer dispatched successfully.')
      fetchTransfers()
    } catch (error) {
      showApiErrorToast(error, 'Could not dispatch transfer.')
    }
  }

  const handleReject = async (id) => {
    const reason = window.prompt('Enter reason for rejection:')
    if (reason === null) return // cancelled
    try {
      await transferApi.rejectTransfer(id, reason || 'No reason provided')
      toast.success('Transfer rejected.')
      fetchTransfers()
    } catch (error) {
      showApiErrorToast(error, 'Could not reject transfer.')
    }
  }

  const handleCancel = async (id) => {
    const reason = window.prompt('Enter reason for cancellation:')
    if (reason === null) return
    try {
      await transferApi.cancelTransfer(id, reason || 'Cancelled by user')
      toast.success('Transfer cancelled.')
      fetchTransfers()
    } catch (error) {
      showApiErrorToast(error, 'Could not cancel transfer.')
    }
  }

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
        <Sidebar currentRole={currentRole} />

        <div
          className={`flex min-w-0 flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
          }`}
        >
          <main className="mx-auto w-full max-w-[1600px] space-y-5 px-4 py-6 sm:px-6 md:py-8 lg:px-8">
            <header className="flex flex-col justify-between gap-5 border-b border-slate-300 pb-5 xl:flex-row xl:items-end">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
                  <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  Warehouse operations
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                  Stock transfers
                </h1>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">
                  Track and control stock movements between warehouse locations.
                </p>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <label className="flex min-w-48 flex-col gap-1 text-xs font-semibold text-slate-600">
                  Warehouse context
                  <select
                    aria-label="Warehouse context"
                    className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 transition-colors outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    value={selectedWarehouseId}
                    onChange={(event) => setSelectedWarehouseId(event.target.value)}
                  >
                    <option value="">All warehouses</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </option>
                    ))}
                  </select>
                </label>
                {currentRole === 'TENANT' && (
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(true)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md bg-blue-700 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Create transfer
                  </button>
                )}
              </div>
            </header>

            <section
              aria-labelledby="transfer-records-heading"
              aria-busy={loading}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs"
            >
              <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <h2
                    id="transfer-records-heading"
                    className="text-sm font-semibold text-slate-950"
                  >
                    Transfer records
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Latest transfer requests across your warehouse network
                  </p>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  {loading
                    ? 'Loading records'
                    : `${transfers.length} record${transfers.length === 1 ? '' : 's'}`}
                </span>
              </div>

              <div className="overflow-x-auto">
                {loading ? (
                  <div className="min-w-[860px] divide-y divide-slate-200" aria-hidden="true">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-[130px_minmax(330px,1fr)_90px_120px_64px] items-center gap-5 px-5 py-4"
                      >
                        <span className="h-4 animate-pulse rounded bg-slate-200" />
                        <span
                          className="h-4 animate-pulse rounded bg-slate-200"
                          style={{ width: `${80 - index * 5}%` }}
                        />
                        <span className="h-4 animate-pulse rounded bg-slate-200" />
                        <span className="h-6 animate-pulse rounded bg-slate-200" />
                        <span className="ml-auto h-8 w-8 animate-pulse rounded bg-slate-200" />
                      </div>
                    ))}
                  </div>
                ) : transfers.length > 0 ? (
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <caption className="sr-only">Stock transfer records</caption>
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold tracking-[0.08em] text-slate-600 uppercase">
                      <tr>
                        <th scope="col" className="px-5 py-3">
                          Transfer ID
                        </th>
                        <th scope="col" className="px-5 py-3">
                          Warehouse route
                        </th>
                        <th scope="col" className="px-5 py-3 text-right">
                          Items
                        </th>
                        <th scope="col" className="px-5 py-3">
                          Status
                        </th>
                        <th scope="col" className="px-5 py-3 text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {transfers.map((transfer) => {
                        const statusMeta = getTransferStatusMeta(transfer.status)
                        const transferReference = String(transfer.id || 'Unknown')
                          .slice(0, 8)
                          .toUpperCase()
                        return (
                          <tr key={transfer.id} className="transition-colors hover:bg-slate-50">
                            <td className="px-5 py-3.5 align-middle">
                              <div className="font-mono text-xs font-semibold text-slate-800">
                                TRF-{transferReference}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">Internal transfer</div>
                            </td>
                            <td className="px-5 py-3.5 align-middle">
                              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                                <div className="min-w-0">
                                  <span className="block text-xs font-medium tracking-[0.08em] text-slate-500 uppercase">
                                    From
                                  </span>
                                  <span className="mt-1 block truncate font-semibold text-slate-900">
                                    {transfer.sourceWarehouse?.name || 'Unknown warehouse'}
                                  </span>
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                                <div className="min-w-0">
                                  <span className="block text-xs font-medium tracking-[0.08em] text-slate-500 uppercase">
                                    To
                                  </span>
                                  <span className="mt-1 block truncate font-semibold text-slate-900">
                                    {transfer.destinationWarehouse?.name || 'Unknown warehouse'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-right align-middle">
                              <span className="font-semibold text-slate-900 tabular-nums">
                                {transfer.items?.length || 0}
                              </span>
                              <span className="ml-1 text-xs text-slate-500">SKU</span>
                            </td>
                            <td className="px-5 py-3.5 align-middle">
                              <span
                                className={`inline-flex items-center rounded border px-2 py-1 text-[11px] font-semibold ${statusMeta.className}`}
                              >
                                {statusMeta.label}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right align-middle">
                              <TableActionMenu
                                label={`Actions for transfer ${transferReference}`}
                                items={[
                                  {
                                    label: 'View details',
                                    icon: Eye,
                                    onClick: () => {
                                      setSelectedTransferIdForDetail(transfer.id)
                                      setDetailModalOpen(true)
                                    },
                                  },
                                  transfer.status === 'PENDING' &&
                                    currentRole === 'TENANT' && {
                                      label: 'Approve dispatch',
                                      icon: Truck,
                                      onClick: () => handleApproveDispatch(transfer.id),
                                    },
                                  transfer.status === 'IN_TRANSIT' &&
                                    currentRole === 'TENANT' && {
                                      label: 'Receive transfer',
                                      icon: PackageCheck,
                                      onClick: () => {
                                        setSelectedTransferForReceive(transfer)
                                        setReceiveModalOpen(true)
                                      },
                                    },
                                  transfer.status === 'PENDING' &&
                                    currentRole === 'TENANT' && {
                                      label: 'Reject transfer',
                                      icon: X,
                                      onClick: () => handleReject(transfer.id),
                                      danger: true,
                                    },
                                  (transfer.status === 'PENDING' ||
                                    transfer.status === 'IN_TRANSIT') &&
                                    currentRole === 'TENANT' && {
                                      label: 'Cancel transfer',
                                      icon: X,
                                      onClick: () => handleCancel(transfer.id),
                                      danger: true,
                                    },
                                ].filter(Boolean)}
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
                    <Warehouse className="h-7 w-7 text-slate-400" aria-hidden="true" />
                    <h3 className="mt-3 text-sm font-semibold text-slate-800">
                      No transfer records
                    </h3>
                    <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                      Transfer requests will appear here once stock is scheduled to move between
                      warehouses.
                    </p>
                    {currentRole === 'TENANT' && (
                      <button
                        type="button"
                        onClick={() => setCreateModalOpen(true)}
                        className="mt-4 inline-flex min-h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                      >
                        Create transfer
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
          </main>
        </div>
      </div>

      <CreateTransferModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        sourceWarehouseId={selectedWarehouseId}
        onSuccess={fetchTransfers}
      />

      <ReceiveTransferModal
        isOpen={receiveModalOpen}
        onClose={() => {
          setReceiveModalOpen(false)
          setSelectedTransferForReceive(null)
        }}
        transfer={selectedTransferForReceive}
        onSuccess={fetchTransfers}
      />

      <TransferDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false)
          setSelectedTransferIdForDetail(null)
        }}
        transferId={selectedTransferIdForDetail}
      />
    </div>
  )
}

export default TransferPage
