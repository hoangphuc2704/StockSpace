import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'
import DataTable from '@/components/organisms/DataTable'
import Badge from '@/components/atoms/Badge'
import TableActionMenu from '@/components/TableActionMenu'
import { ListTodo, CheckCircle2, Clock } from 'lucide-react'

const MOCK_TASKS = [
  {
    id: 'TSK-001',
    title: 'Audit Zone A',
    type: 'INVENTORY_AUDIT',
    priority: 'HIGH',
    status: 'PENDING',
    dueDate: '2026-07-24',
  },
  {
    id: 'TSK-002',
    title: 'Putaway Shipment #1022',
    type: 'PUTAWAY',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    dueDate: '2026-07-24',
  },
  {
    id: 'TSK-003',
    title: 'Pick Order #551',
    type: 'PICKING',
    priority: 'HIGH',
    status: 'COMPLETED',
    dueDate: '2026-07-23',
  },
]

const StaffTasksPage = () => {
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)
  const [tasks, setTasks] = useState(MOCK_TASKS)

  const columns = [
    {
      header: 'Title',
      render: (row) => <span className="font-bold text-slate-900">{row.title}</span>,
    },
    {
      header: 'Type',
      render: (row) => (
        <Badge variant="primary" size="sm">
          {row.type}
        </Badge>
      ),
    },
    {
      header: 'Priority',
      render: (row) => (
        <span
          className={`text-xs font-bold ${row.priority === 'HIGH' ? 'text-danger' : 'text-warning'}`}
        >
          {row.priority}
        </span>
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
    { header: 'Due Date', accessor: 'dueDate' },
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
                <DataTable columns={columns} data={tasks} />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default StaffTasksPage
