import api from '../apiConfig'

const staffApi = {
  // ========================
  // Tenant — Staff Management
  // ========================

  /** GET /api/tenant/staffs - Danh sách nhân viên kho */
  listStaffs: ({ page = 0, size = 10, keyword = '' } = {}) => {
    return api.get('/tenant/staffs', { params: { page, size, keyword } })
  },

  /** POST /api/tenant/staffs/invite - Gửi lời mời nhân viên qua email */
  inviteStaff: (data) => {
    // data: { email, fullName, phone }
    return api.post('/tenant/staffs/invite', data)
  },

  /** DELETE /api/tenant/staffs/{memberId} - Sa thải nhân viên (soft delete) */
  removeStaff: (memberId) => {
    return api.delete(`/tenant/staffs/${memberId}`)
  },

  // ========================
  // Staff Invitation (Public — không cần JWT)
  // ========================

  /** GET /api/auth/staff/invite?token=XYZ - Validate token lời mời */
  validateInviteToken: (token) => {
    return api.get('/auth/staff/invite', { params: { token } })
  },

  /** POST /api/auth/staff/accept - Chấp nhận lời mời + thiết lập mật khẩu */
  acceptInvitation: (data) => {
    // data: { token, password, confirmPassword }
    return api.post('/auth/staff/accept', data)
  },
}

export default staffApi
