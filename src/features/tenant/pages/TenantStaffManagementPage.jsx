import { useCallback, useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import TableActionMenu from '@/components/TableActionMenu'
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'
import {
  Users,
  UserPlus,
  Trash2,
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  Calendar,
  Shield,
  Briefcase,
} from 'lucide-react'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import Modal from '@/components/organisms/Modal'
import InputField from '@/components/atoms/InputField'
import staffApi from '@/services/staff/staffApi'
import warehouseApi from '@/services/warehouse/warehouseApi'
import { toast } from 'react-hot-toast'
import { useConfirmDialog } from '@/components/ConfirmDialogProvider'

const TenantStaffManagementPage = () => {
  const confirmDialog = useConfirmDialog()
  const dispatch = useDispatch()
  const { isSidebarExpanded, isMobileOpen } = useSelector((state) => state.ui)

  // Data
  const [staffList, setStaffList] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Filters
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 10

  // Invite modal
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', fullName: '', phone: '' })
  const [isInviting, setIsInviting] = useState(false)

  // Remove confirm
  const [removingId, setRemovingId] = useState(null)

  // Assignment Modal
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [myWarehouses, setMyWarehouses] = useState([])
  const [isAssigning, setIsAssigning] = useState(false)
  const [assignForm, setAssignForm] = useState({
    warehouseId: '',
    customTitle: '',
    notes: '',
  })
  const [revokingId, setRevokingId] = useState(null)

  const fetchMyWarehouses = useCallback(async () => {
    try {
      const res = await warehouseApi.getMyWarehouses()
      setMyWarehouses(res.data?.data?.content || res.data?.data || [])
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error('The rental contract has expired or warehouse access was revoked.')
      } else {
        console.error('Failed to load warehouses', err)
      }
    }
  }, [])

  const fetchStaffs = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await staffApi.listStaffs({ page, size: pageSize, keyword })
      const data = res.data?.data
      setStaffList(data?.content || [])
      setTotalElements(data?.totalElements || 0)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to load employee list')
    } finally {
      setIsLoading(false)
    }
  }, [keyword, page])

  const fetchAssignments = useCallback(async (staffUserId) => {
    try {
      const res = await staffApi.getWarehouseAssignments(staffUserId)
      setAssignments(res.data?.data || [])
    } catch (err) {
      toast.error('Unable to load assignment history')
    }
  }, [])

  useEffect(() => {
    fetchStaffs()
    fetchMyWarehouses()
  }, [fetchMyWarehouses, fetchStaffs])

  // The expiry scheduler revokes assignments on the BE. Keep the tenant's
  // assignment modal and warehouse selector in sync with that change.
  useEffect(() => {
    const handleRentalNotification = (event) => {
      if (String(event.detail?.type || '').toUpperCase() !== 'RENTAL') return

      fetchMyWarehouses()
      if (selectedStaff) {
        fetchAssignments(selectedStaff.userId || selectedStaff.memberId)
      }
    }

    window.addEventListener('new_notification', handleRentalNotification)
    return () => window.removeEventListener('new_notification', handleRentalNotification)
  }, [fetchAssignments, fetchMyWarehouses, selectedStaff])

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteForm.email || !inviteForm.fullName) {
      toast.error('Please enter full Email and Full Name')
      return
    }
    setIsInviting(true)
    try {
      await staffApi.inviteStaff(inviteForm)
      toast.success(`Invitation sent ${inviteForm.email}. Invitations are valid for 48 hours.`)
      setIsInviteOpen(false)
      setInviteForm({ email: '', fullName: '', phone: '' })
      fetchStaffs()
    } catch (err) {
      const msg = err.response?.data?.message || 'Sending invitation failed'
      toast.error(msg)
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemove = async (memberId, name) => {
    const confirmed = await confirmDialog({
      title: 'Remove employee',
      message: `Are you sure you want to remove employee "${name}"? This action cannot be undone.`,
      confirmText: 'Remove employee',
      danger: true,
    })
    if (!confirmed) return
    setRemovingId(memberId)
    try {
      await staffApi.removeStaff(memberId)
      toast.success(`Deleted employee ${name} out of the organization`)
      fetchStaffs()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete employee failed')
    } finally {
      setRemovingId(null)
    }
  }

  const handleOpenAssign = async (staff) => {
    setSelectedStaff(staff)
    setIsAssignOpen(true)
    fetchAssignments(staff.userId || staff.memberId)
  }

  const handleAssign = async (e) => {
    e.preventDefault()
    if (!assignForm.warehouseId) {
      toast.error('Please select warehouse')
      return
    }
    setIsAssigning(true)
    try {
      const staffUserId = selectedStaff.userId || selectedStaff.memberId
      await staffApi.assignWarehouse(staffUserId, assignForm)
      toast.success('Warehouse assignment successful')
      setAssignForm({ warehouseId: '', customTitle: '', notes: '' })
      fetchAssignments(staffUserId)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assignment failed')
    } finally {
      setIsAssigning(false)
    }
  }

  const handleRevoke = async (assignmentId) => {
    const confirmed = await confirmDialog({
      title: 'Revoke warehouse assignment',
      message: 'Are you sure you want to revoke the assignment at this warehouse?',
      confirmText: 'Revoke assignment',
      danger: true,
    })
    if (!confirmed) return
    setRevokingId(assignmentId)
    try {
      await staffApi.revokeWarehouseAssignment(assignmentId)
      toast.success('Assignment revoked')
      fetchAssignments(selectedStaff.userId || selectedStaff.memberId)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Recall failed')
    } finally {
      setRevokingId(null)
    }
  }

  const totalPages = Math.ceil(totalElements / pageSize)

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
        <Sidebar currentRole="TENANT" />
        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
          }`}
        >
          <main className="mx-auto w-full max-w-350 space-y-6 p-6 md:p-8">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
                  <div className="rounded-xl bg-blue-100 p-2 text-blue-600">
                    <Users className="h-6 w-6" />
                  </div>
                  Warehouse Staff Management
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Invite and manage your organization's warehouse operations staff.
                </p>
              </div>
              <div className="flex items-center gap-3 text-black">
                <span className="text-sm text-slate-500">
                  Total: <strong className="text-slate-900">{totalElements}</strong> staff
                </span>
                <Button className="text-black" onClick={() => setIsInviteOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4 text-black" />
                  Invite Staff
                </Button>
              </div>
            </div>

            {/* Search bar */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex gap-3">
                <div className="relative max-w-sm flex-1">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <InputField
                    className="pl-10"
                    placeholder="Search by name, email..."
                    value={keyword}
                    onChange={(e) => {
                      setKeyword(e.target.value)
                      setPage(0)
                    }}
                  />
                </div>
              </div>

              {/* Table */}
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                </div>
              ) : staffList.length === 0 ? (
                <div className="py-16 text-center">
                  <Shield className="mx-auto mb-4 h-12 w-12 text-slate-200" />
                  <p className="font-medium text-slate-500">There are no employees yet</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Click "Invite Staff" to send an email invitation
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">
                          Staff
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">
                          Contact
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">
                          Joining date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider text-slate-500 uppercase">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {staffList.map((staff) => (
                        <tr key={staff.memberId} className="transition-colors hover:bg-slate-50">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-indigo-600 text-sm font-semibold text-white">
                                {staff.fullName?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">{staff.fullName}</p>
                                <p className="flex items-center gap-1 text-xs text-slate-400">
                                  <Mail className="h-3 w-3" />
                                  {staff.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {staff.phone ? (
                              <span className="flex items-center gap-1 text-slate-600">
                                <Phone className="h-3 w-3 text-slate-400" />
                                {staff.phone}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {staff.joinedAt ? (
                              <span className="flex items-center gap-1 text-slate-600">
                                <Calendar className="h-3 w-3 text-slate-400" />
                                {new Date(staff.joinedAt).toLocaleDateString('en-US')}
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-amber-500">
                                Wait for activation
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {(staff.active !== undefined ? staff.active : staff.isActive) ? (
                              <Badge variant="success">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Activities
                              </Badge>
                            ) : (
                              <Badge variant="danger">
                                <XCircle className="mr-1 h-3 w-3" />
                                Locked
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <TableActionMenu
                              label={`Actions for ${staff.fullName}`}
                              items={[
                                {
                                  label: 'Assignment',
                                  icon: Briefcase,
                                  disabled: !(staff.active !== undefined
                                    ? staff.active
                                    : staff.isActive),
                                  onClick: () => handleOpenAssign(staff),
                                },
                                {
                                  label: removingId === staff.memberId ? 'Removing...' : 'Remove',
                                  icon: Trash2,
                                  danger: true,
                                  disabled: removingId === staff.memberId,
                                  onClick: () => handleRemove(staff.memberId, staff.fullName),
                                },
                              ]}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ← Previous
                  </Button>
                  <span className="flex items-center text-sm text-slate-500">
                    Page {page + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next →
                  </Button>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => {
          setIsInviteOpen(false)
          setInviteForm({ email: '', fullName: '', phone: '' })
        }}
        title="Invite Warehouse Staff"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <p className="text-sm text-slate-500">
            The system will send an email containing the activation link to the address below. Link
            is valid in <strong>48 hours</strong>.
          </p>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Email <span className="text-red-500">*</span>
            </label>
            <InputField
              type="email"
              required
              placeholder="nhanvien@gmail.com"
              value={inviteForm.email}
              onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Full name <span className="text-red-500">*</span>
            </label>
            <InputField
              required
              placeholder="Nguyen Van A"
              value={inviteForm.fullName}
              onChange={(e) => setInviteForm((f) => ({ ...f, fullName: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Phone number</label>
            <InputField
              type="tel"
              placeholder="0987654321"
              value={inviteForm.phone}
              onChange={(e) => setInviteForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsInviteOpen(false)
                setInviteForm({ email: '', fullName: '', phone: '' })
              }}
            >
              Cancel
            </Button>
            <Button className="text-black" type="submit" isLoading={isInviting}>
              <Mail className="mr-2 h-4 w-4" />
              Send Invitations
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assignment Modal */}
      <Modal
        isOpen={isAssignOpen}
        onClose={() => {
          setIsAssignOpen(false)
          setSelectedStaff(null)
        }}
        title={`Warehouse assignment - ${selectedStaff?.fullName || ''}`}
        size="lg"
      >
        <div className="space-y-6">
          {/* Current Assignments */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">
              The warehouse is in charge
            </h3>
            <div className="space-y-2">
              {assignments.length > 0 ? (
                assignments.map((assign) => (
                  <div
                    key={assign.id}
                    className={`rounded-xl border p-3 ${assign.status === 'ACTIVE' ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50'} flex items-start justify-between`}
                  >
                    <div>
                      <p className="font-medium text-slate-900">{assign.warehouseName}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <Badge variant={assign.status === 'ACTIVE' ? 'success' : 'secondary'}>
                          {assign.status}
                        </Badge>
                        {assign.customTitle && (
                          <span className="text-slate-400">({assign.customTitle})</span>
                        )}
                      </div>
                    </div>
                    {assign.status === 'ACTIVE' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border-transparent text-red-500 hover:border-red-200 hover:bg-red-50"
                        disabled={revokingId === assign.id}
                        onClick={() => handleRevoke(assign.id)}
                      >
                        {revokingId === assign.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          'Withdrawal'
                        )}
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 italic">No warehouse has been assigned yet.</p>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200"></div>

          {/* Add new assignment */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">New warehouse assignment</h3>
            <form
              onSubmit={handleAssign}
              className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Select warehouse <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="focus:ring-primary/20 focus:border-primary h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm transition-all outline-none focus:ring-2"
                    value={assignForm.warehouseId}
                    onChange={(e) => setAssignForm((f) => ({ ...f, warehouseId: e.target.value }))}
                    required
                  >
                    <option value="">-- Select warehouse --</option>
                    {myWarehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Title displayed</label>
                  <InputField
                    placeholder="Example: Storekeeper Shift 1"
                    value={assignForm.customTitle}
                    onChange={(e) => setAssignForm((f) => ({ ...f, customTitle: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Notes</label>
                  <InputField
                    placeholder="Assignment notes..."
                    value={assignForm.notes}
                    onChange={(e) => setAssignForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" isLoading={isAssigning}>
                  Add Assignment
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default TenantStaffManagementPage
