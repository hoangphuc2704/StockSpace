import React, { useState, useEffect } from 'react'
import { FormShell } from '@/form/FormControls'
import { Plus, Search, Eye } from 'lucide-react'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import Modal from '@/components/organisms/Modal'
import TableActionMenu from '@/components/TableActionMenu'
import Header from '@/components/HeaderDashboard'
import Sidebar from '@/components/SideBar'
import { useNavigate } from 'react-router-dom'
import auditApi from '@/services/wms/auditApi'
import warehouseApi from '@/services/warehouse/warehouseApi'
import { toast } from 'react-hot-toast'
import moment from 'moment'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import { showApiErrorToast } from '@/config/apiError'

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', type: 'warning' },
  APPROVED: { label: 'Approved', type: 'success' },
  REJECTED: { label: 'Rejected', type: 'error' },
  SUBMITTED: { label: 'Awaiting approval', type: 'info' },
  COMPLETED: { label: 'Completed', type: 'success' },
}

const InventoryAuditPage = ({ currentRole }) => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)

  const [audits, setAudits] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Create Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [warehouses, setWarehouses] = useState([])
  const [formWarehouseId, setFormWarehouseId] = useState('')
  const [formNote, setFormNote] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchAudits = async () => {
    try {
      setLoading(true)
      const res = await auditApi.getAudits({ page, size: pageSize })
      if (res.data?.success) {
        setAudits(res.data.data.content || [])
        setTotalPages(res.data.data.totalPages || 1)
      }
    } catch (error) {
      showApiErrorToast(error, 'Could not load audits.')
    } finally {
      setLoading(false)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const res = await warehouseApi.getMyWarehouses()
      if (res.data?.success) {
        setWarehouses(res.data.data || [])
      }
    } catch (error) {
      showApiErrorToast(error, 'Could not load warehouses.')
    }
  }

  useEffect(() => {
    fetchAudits()
  }, [page, pageSize])

  const handleCreateAudit = async (e) => {
    e.preventDefault()
    if (!formWarehouseId) {
      toast.error('Select a warehouse.')
      return
    }

    try {
      setCreating(true)
      const payload = {
        warehouseId: formWarehouseId,
        note: formNote,
      }
      const res = await auditApi.createAudit(payload)
      if (res.data?.success) {
      toast.success('Audit created.')
        setIsCreateModalOpen(false)
        setFormWarehouseId('')
        setFormNote('')
        setPage(0)
        fetchAudits()
      }
    } catch (error) {
      showApiErrorToast(error, 'Could not create audit.')
    } finally {
      setCreating(false)
    }
  }

  const handleOpenCreateModal = () => {
    fetchWarehouses()
    setIsCreateModalOpen(true)
  }

  const handleViewDetail = (id) => {
    if (currentRole === 'STAFF') {
      navigate(`/staff/inventory-audits/${id}`)
    } else {
      navigate(`/tenant/inventory-audits/${id}`)
    }
  }

  const columns = [
    ...(currentRole === 'TENANT' || currentRole === 'STAFF'
      ? []
      : [
          {
            accessor: 'id',
            header: 'Audit ID',
            render: (row) => <span className="font-medium text-slate-900">#{row.id}</span>,
          },
        ]),
    {
      accessor: 'warehouseName',
      header: 'Warehouse',
    },
    {
      accessor: 'status',
      header: 'Status',
      render: (row) => {
        const config = STATUS_CONFIG[row.status] || { label: row.status, type: 'default' }
        return <Badge type={config.type}>{config.label}</Badge>
      },
    },
    {
      accessor: 'requestedByName',
      header: 'Created by',
    },
    {
      accessor: 'createdAt',
      header: 'Created date',
      render: (row) => moment(row.createdAt).format('DD/MM/YYYY HH:mm'),
    },
    {
      accessor: 'actions',
      header: 'Actions',
      render: (row) => (
        <TableActionMenu
          items={[{ label: 'Details', icon: Eye, onClick: () => handleViewDetail(row.id) }]}
        />
      ),
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
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory Audits</h1>
                  <p className="text-sm text-slate-500">Review and complete warehouse stock counts.</p>
                </div>
                <Button onClick={handleOpenCreateModal} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  New audit
                </Button>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <DataTable
                  columns={columns}
                  data={audits}
                  loading={loading}
                  pagination={{
                    page,
                    pageSize,
                    totalPages,
                    onPageChange: setPage,
                    onPageSizeChange: setPageSize,
                  }}
                />
              </div>
            </div>
          </main>
        </div>
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create audit"
        size="md"
      >
        <FormShell onSubmit={handleCreateAudit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Warehouse <span className="text-red-500">*</span>
            </label>
            <select
              className="focus:border-brand-500 focus:ring-brand-500 w-full rounded-lg border border-slate-300 p-2.5 outline-none focus:ring-1"
              value={formWarehouseId}
              onChange={(e) => setFormWarehouseId(e.target.value)}
              required
            >
              <option value="">-- Select warehouse --</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Note</label>
            <textarea
              className="focus:border-brand-500 focus:ring-brand-500 w-full rounded-lg border border-slate-300 p-2.5 outline-none focus:ring-1"
              rows={3}
              placeholder="Add a note or audit reason..."
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={creating}>
              Create audit
            </Button>
          </div>
        </FormShell>
      </Modal>
    </div>
  )
}

export default InventoryAuditPage
