import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { closeMobileSidebar } from '@/store/uiSlide'
import Sidebar from '@/components/SideBar'
import Header from '@/components/HeaderDashboard'
import {
  Users, UserPlus, Trash2, Search, Loader2,
  CheckCircle, XCircle, Mail, Phone, Calendar, Shield, Briefcase
} from 'lucide-react'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import Modal from '@/components/organisms/Modal'
import InputField from '@/components/atoms/InputField'
import staffApi from '@/services/staff/staffApi'
import warehouseApi from '@/services/warehouse/warehouseApi'
import { toast } from 'react-hot-toast'

const TenantStaffManagementPage = () => {
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
    notes: ''
  })
  const [revokingId, setRevokingId] = useState(null)

  useEffect(() => {
    fetchStaffs()
    fetchMyWarehouses()
  }, [page, keyword])

  const fetchMyWarehouses = async () => {
    try {
      const res = await warehouseApi.getMyWarehouses()
      setMyWarehouses(res.data?.data?.content || res.data?.data || [])
    } catch (err) {
      console.error('Failed to load warehouses', err)
    }
  }

  const fetchStaffs = async () => {
    setIsLoading(true)
    try {
      const res = await staffApi.listStaffs({ page, size: pageSize, keyword })
      const data = res.data?.data
      setStaffList(data?.content || [])
      setTotalElements(data?.totalElements || 0)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể tải danh sách nhân viên')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteForm.email || !inviteForm.fullName) {
      toast.error('Vui lòng nhập đầy đủ Email và Họ tên')
      return
    }
    setIsInviting(true)
    try {
      await staffApi.inviteStaff(inviteForm)
      toast.success(`Đã gửi lời mời đến ${inviteForm.email}. Lời mời có hiệu lực 48 giờ.`)
      setIsInviteOpen(false)
      setInviteForm({ email: '', fullName: '', phone: '' })
      fetchStaffs()
    } catch (err) {
      const msg = err.response?.data?.message || 'Gửi lời mời thất bại'
      toast.error(msg)
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemove = async (memberId, name) => {
    if (!window.confirm(`Bạn có chắc muốn sa thải nhân viên "${name}"? Thao tác này không thể hoàn tác.`)) return
    setRemovingId(memberId)
    try {
      await staffApi.removeStaff(memberId)
      toast.success(`Đã xóa nhân viên ${name} khỏi tổ chức`)
      fetchStaffs()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xóa nhân viên thất bại')
    } finally {
      setRemovingId(null)
    }
  }

  const handleOpenAssign = async (staff) => {
    setSelectedStaff(staff)
    setIsAssignOpen(true)
    fetchAssignments(staff.userId || staff.memberId)
  }

  const fetchAssignments = async (staffUserId) => {
    try {
      const res = await staffApi.getWarehouseAssignments(staffUserId)
      setAssignments(res.data?.data || [])
    } catch (err) {
      toast.error('Không thể tải lịch sử phân công')
    }
  }

  const handleAssign = async (e) => {
    e.preventDefault()
    if (!assignForm.warehouseId) {
      toast.error('Vui lòng chọn kho')
      return
    }
    setIsAssigning(true)
    try {
      const staffUserId = selectedStaff.userId || selectedStaff.memberId
      await staffApi.assignWarehouse(staffUserId, assignForm)
      toast.success('Phân công kho thành công')
      setAssignForm({ warehouseId: '', customTitle: '', notes: '' })
      fetchAssignments(staffUserId)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Phân công thất bại')
    } finally {
      setIsAssigning(false)
    }
  }

  const handleRevoke = async (assignmentId) => {
    if (!window.confirm('Bạn có chắc muốn thu hồi quyền làm việc tại kho này?')) return
    setRevokingId(assignmentId)
    try {
      await staffApi.revokeWarehouseAssignment(assignmentId)
      toast.success('Đã thu hồi phân công')
      fetchAssignments(selectedStaff.userId || selectedStaff.memberId)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Thu hồi thất bại')
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
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
            }`}
        >
          <main className="mx-auto w-full max-w-[1400px] space-y-6 p-6 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                    <Users className="h-6 w-6" />
                  </div>
                  Quản Lý Nhân Viên Kho
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Mời và quản lý nhân viên vận hành kho của tổ chức bạn.
                </p>
              </div>
              <div className="flex items-center gap-3 text-black">
                <span className="text-sm text-slate-500">
                  Tổng: <strong className="text-slate-900">{totalElements}</strong> nhân viên
                </span>
                <Button className="text-black" onClick={() => setIsInviteOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2 text-black" />
                  Mời Nhân Viên
                </Button>
              </div>
            </div>

            {/* Search bar */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex gap-3 mb-6">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <InputField
                    className="pl-10"
                    placeholder="Tìm theo tên, email..."
                    value={keyword}
                    onChange={(e) => { setKeyword(e.target.value); setPage(0) }}
                  />
                </div>
              </div>

              {/* Table */}
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                </div>
              ) : staffList.length === 0 ? (
                <div className="text-center py-16">
                  <Shield className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">Chưa có nhân viên nào</p>
                  <p className="text-slate-400 text-sm mt-1">Bấm "Mời Nhân Viên" để gửi lời mời qua email</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Nhân viên</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Liên hệ</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Ngày gia nhập</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Trạng thái</th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {staffList.map((staff) => (
                        <tr key={staff.memberId} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                {staff.fullName?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">{staff.fullName}</p>
                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                  <Mail className="h-3 w-3" />{staff.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {staff.phone ? (
                              <span className="flex items-center gap-1 text-slate-600">
                                <Phone className="h-3 w-3 text-slate-400" />{staff.phone}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            {staff.joinedAt ? (
                              <span className="flex items-center gap-1 text-slate-600">
                                <Calendar className="h-3 w-3 text-slate-400" />
                                {new Date(staff.joinedAt).toLocaleDateString('vi-VN')}
                              </span>
                            ) : (
                              <span className="text-amber-500 text-xs font-medium">Chờ kích hoạt</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            {(staff.active !== undefined ? staff.active : staff.isActive) ? (
                              <Badge variant="success">
                                <CheckCircle className="h-3 w-3 mr-1" />Hoạt động
                              </Badge>
                            ) : (
                              <Badge variant="danger">
                                <XCircle className="h-3 w-3 mr-1" />Bị khóa
                              </Badge>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-primary border-primary/20 hover:bg-primary/5"
                                disabled={!(staff.active !== undefined ? staff.active : staff.isActive)}
                                onClick={() => handleOpenAssign(staff)}
                              >
                                <Briefcase className="h-4 w-4 mr-1" />
                                Phân công
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                disabled={removingId === staff.memberId}
                                onClick={() => handleRemove(staff.memberId, staff.fullName)}
                              >
                                {removingId === staff.memberId ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                    ← Trước
                  </Button>
                  <span className="flex items-center text-sm text-slate-500">
                    Trang {page + 1} / {totalPages}
                  </span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                    Tiếp →
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
        onClose={() => { setIsInviteOpen(false); setInviteForm({ email: '', fullName: '', phone: '' }) }}
        title="Mời Nhân Viên Kho"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <p className="text-sm text-slate-500">
            Hệ thống sẽ gửi email chứa link kích hoạt đến địa chỉ bên dưới. Link có hiệu lực trong <strong>48 giờ</strong>.
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
              onChange={(e) => setInviteForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <InputField
              required
              placeholder="Nguyễn Văn A"
              value={inviteForm.fullName}
              onChange={(e) => setInviteForm(f => ({ ...f, fullName: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Số điện thoại</label>
            <InputField
              type="tel"
              placeholder="0987654321"
              value={inviteForm.phone}
              onChange={(e) => setInviteForm(f => ({ ...f, phone: e.target.value }))}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setIsInviteOpen(false); setInviteForm({ email: '', fullName: '', phone: '' }) }}
            >
              Hủy
            </Button>
            <Button className="text-black" type="submit" isLoading={isInviting}>
              <Mail className="h-4 w-4 mr-2" />
              Gửi Lời Mời
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assignment Modal */}
      <Modal
        isOpen={isAssignOpen}
        onClose={() => { setIsAssignOpen(false); setSelectedStaff(null); }}
        title={`Phân công kho - ${selectedStaff?.fullName || ''}`}
        size="lg"
      >
        <div className="space-y-6">
          {/* Current Assignments */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Kho đang phụ trách</h3>
            <div className="space-y-2">
              {assignments.length > 0 ? assignments.map(assign => (
                <div key={assign.id} className={`p-3 rounded-xl border ${assign.status === 'ACTIVE' ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100'} flex items-start justify-between`}>
                  <div>
                    <p className="font-medium text-slate-900">{assign.warehouseName}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <Badge variant={assign.status === 'ACTIVE' ? 'success' : 'secondary'}>{assign.status}</Badge>
                      {assign.customTitle && <span className="text-slate-400">({assign.customTitle})</span>}
                    </div>
                  </div>
                  {assign.status === 'ACTIVE' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:bg-red-50 hover:border-red-200 border-transparent h-8"
                      disabled={revokingId === assign.id}
                      onClick={() => handleRevoke(assign.id)}
                    >
                      {revokingId === assign.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Thu hồi'}
                    </Button>
                  )}
                </div>
              )) : (
                <p className="text-slate-500 text-sm italic">Chưa được phân công kho nào.</p>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200"></div>

          {/* Add new assignment */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Phân công kho mới</h3>
            <form onSubmit={handleAssign} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Chọn kho <span className="text-red-500">*</span></label>
                  <select
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    value={assignForm.warehouseId}
                    onChange={e => setAssignForm(f => ({ ...f, warehouseId: e.target.value }))}
                    required
                  >
                    <option value="">-- Chọn kho --</option>
                    {myWarehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Chức danh hiển thị</label>
                  <InputField
                    placeholder="VD: Thủ kho Ca 1"
                    value={assignForm.customTitle}
                    onChange={e => setAssignForm(f => ({ ...f, customTitle: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Ghi chú</label>
                  <InputField
                    placeholder="Ghi chú phân công..."
                    value={assignForm.notes}
                    onChange={e => setAssignForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" isLoading={isAssigning}>
                  Thêm Phân Công
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
