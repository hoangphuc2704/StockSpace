import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import TableActionMenu from '@/components/TableActionMenu'
import { ListTodo, CheckCircle2, Clock } from 'lucide-react'
import staffApi from '@/services/staff/staffApi'
import { toast } from 'react-hot-toast'
import { showApiErrorToast } from '@/config/apiError'

const StaffTasksPage = () => {
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  const currentWarehouseId = useSelector((state) => state.auth.warehouseId)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true)
        const params = { page: 0, size: 50 }
        if (currentWarehouseId) {
          params.warehouseId = currentWarehouseId
        }
        const res = await staffApi.getOperations(params)
        setTasks(res.data?.data?.content || [])
      } catch (error) {
        showApiErrorToast(error, 'Could not load tasks.')
      } finally {
        setLoading(false)
      }
    }
    fetchTasks()
  }, [currentWarehouseId])

  const columns = [
    {
      header: 'Title',
      render: (row) => <span className="font-bold text-slate-900">{row.title}</span>,
    },
    {
      header: 'Operation Type',
      render: (row) => (
        <Badge variant="primary" size="sm">
          {row.operationType}
        </Badge>
      ),
    },
    {
      header: 'Operation ID',
      render: (row) => (
        <span className="text-xs font-mono">{row.operationId?.split('-')[0]}...</span>
      ),
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge
          variant={
            row.status === 'COMPLETED'
              ? 'success'
              : row.status === 'IN_PROGRESS'
                ? 'warning'
                : 'primary'
          }
        >
          {row.status}
        </Badge>
      ),
    },
    { header: 'Created At', render: (row) => new Date(row.createdAt).toLocaleDateString() },
    {
      header: 'Actions',
      render: (row) => (
        <TableActionMenu
          items={[
            {
              label: row.status === 'COMPLETED' ? 'Done' : 'Update Status',
              disabled: row.status === 'COMPLETED',
            },
          ]}
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
        <Sidebar currentRole="STAFF" />
        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
          }`}
        >
          <main className="mx-auto w-full max-w-[1600px] space-y-8 p-6 md:p-8">
            <div className="space-y-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
                    <div className="bg-primary/10 text-primary rounded-lg p-2">
                      <ListTodo className="h-6 w-6" />
                    </div>
                    My Tasks
                  </h1>
                  <p className="text-sm text-slate-500">
                    Manage your assigned warehouse tasks and operations.
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <DataTable columns={columns} data={tasks} isLoading={loading} />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default StaffTasksPage
