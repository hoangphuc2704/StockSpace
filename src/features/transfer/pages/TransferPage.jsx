import React, { useCallback, useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import TableActionMenu from '@/components/TableActionMenu'
import { CheckCircle, X, Send, Download, Truck, PackageCheck, Eye } from 'lucide-react'
import transferApi from '@/services/wms/transferApi'
import { toast } from 'react-hot-toast'
import { showApiErrorToast } from '@/config/apiError'
import { useConfirmDialog } from '@/components/ConfirmDialogProvider'
import CreateTransferModal from '../components/CreateTransferModal'
import ReceiveTransferModal from '../components/ReceiveTransferModal'
import TransferDetailModal from '../components/TransferDetailModal'

const TransferPage = ({ currentRole }) => {
  const confirmDialog = useConfirmDialog()
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  const currentWarehouseId = useSelector((state) => state.auth.warehouseId)

  const [transfers, setTransfers] = useState([])
  const [loading, setLoading] = useState(true)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [receiveModalOpen, setReceiveModalOpen] = useState(false)
  const [selectedTransferForReceive, setSelectedTransferForReceive] = useState(null)
  
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedTransferIdForDetail, setSelectedTransferIdForDetail] = useState(null)

  const fetchTransfers = useCallback(async () => {
    try {
      setLoading(true)
      // If a warehouse is selected, optionally filter by sourceWarehouseId or destinationWarehouseId
      const params = { page: 0, size: 20 }
      if (currentWarehouseId) {
        // By default, showing transfers where current warehouse is either source or destination
        // (BE might only support one at a time, we will just fetch all for now or pass source)
        // params.sourceWarehouseId = currentWarehouseId
      }
      
      const res = await transferApi.getTransfers(params)
      if (res?.data?.success) {
        setTransfers(res.data.data.content || [])
      }
    } catch (error) {
      console.error('Error getting list of transfers:', error)
    } finally {
      setLoading(false)
    }
  }, [currentWarehouseId])

  useEffect(() => {
    fetchTransfers()
  }, [fetchTransfers])

  const handleApproveDispatch = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Approve Dispatch',
      message: 'Are you sure you want to approve this transfer for dispatch? Stock will be deducted from the source warehouse.',
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
    const reason = window.prompt("Enter reason for rejection:")
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
    const reason = window.prompt("Enter reason for cancellation:")
    if (reason === null) return
    try {
      await transferApi.cancelTransfer(id, reason || 'Cancelled by user')
      toast.success('Transfer cancelled.')
      fetchTransfers()
    } catch (error) {
      showApiErrorToast(error, 'Could not cancel transfer.')
    }
  }

  const columns = [
    {
      header: 'Transfer ID',
      accessor: 'id',
      render: (row) => <span className="text-xs font-mono">{row.id.split('-')[0]}...</span>
    },
    {
      header: 'Source Warehouse',
      render: (row) => <span>{row.sourceWarehouse?.name || '-'}</span>
    },
    {
      header: 'Destination Warehouse',
      render: (row) => <span>{row.destinationWarehouse?.name || '-'}</span>
    },
    {
      header: 'Items',
      render: (row) => <span>{row.items?.length || 0} SKU(s)</span>
    },
    {
      header: 'Status',
      render: (row) => {
        const variants = {
          PENDING: 'warning',
          IN_TRANSIT: 'secondary',
          COMPLETED: 'success',
          REJECTED: 'danger',
          CANCELLED: 'slate'
        }
        return <Badge variant={variants[row.status] || 'slate'}>{row.status}</Badge>
      }
    },
    {
      header: 'Actions',
      render: (row) => (
        <TableActionMenu
          items={[
            {
              label: 'View Details',
              icon: Eye,
              onClick: () => {
                setSelectedTransferIdForDetail(row.id)
                setDetailModalOpen(true)
              }
            },
            row.status === 'PENDING' && currentRole === 'TENANT' && {
              label: 'Approve Dispatch',
              icon: Truck,
              onClick: () => handleApproveDispatch(row.id),
            },
            row.status === 'IN_TRANSIT' && currentRole === 'TENANT' && {
              label: 'Receive',
              icon: PackageCheck,
              onClick: () => {
                setSelectedTransferForReceive(row)
                setReceiveModalOpen(true)
              },
            },
            row.status === 'PENDING' && currentRole === 'TENANT' && {
              label: 'Reject',
              icon: X,
              onClick: () => handleReject(row.id),
              danger: true,
            },
            (row.status === 'PENDING' || row.status === 'IN_TRANSIT') && currentRole === 'TENANT' && {
              label: 'Cancel',
              icon: X,
              onClick: () => handleCancel(row.id),
              danger: true,
            }
          ].filter(Boolean)}
        />
      ),
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header />
      <div className="md:hidden">
        {isMobileOpen && (
          <button className="fixed inset-0 z-40 bg-slate-900/30" onClick={() => dispatch(closeMobileSidebar())} />
        )}
      </div>

      <div className="flex pt-14">
        <Sidebar currentRole={currentRole} />

        <div className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'}`}>
          <main className="mx-auto w-full max-w-4000 space-y-6 p-6 md:p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Stock Transfers</h1>
                <p className="text-sm text-slate-500">Manage stock moving between your warehouses.</p>
              </div>
              {currentRole === 'TENANT' && (
                <button 
                  onClick={() => setCreateModalOpen(true)}
                  className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700"
                >
                  Create Transfer
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <DataTable columns={columns} data={transfers} isLoading={loading} />
            </div>
          </main>
        </div>
      </div>

      <CreateTransferModal 
        isOpen={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
        sourceWarehouseId={currentWarehouseId}
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
