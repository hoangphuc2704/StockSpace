
import api from '../apiConfig'

/**
 * Admin API Service
 * baseURL đã có /api (từ VITE_API_URL=http://localhost:8080/api)
 * → các path ở đây CHỈ dùng /admin/... (không có /api prefix)
 *
 * Tham số request/response map theo BE controller và DTO.
 * Ref: stockspace_be/admin/controller + stockspace_be/admin/dto
 */
const adminApi = {

  // =========================
  // USER MANAGEMENT
  // GET /api/admin/users
  //   params: { keyword, roleName, isActive, page, size, sortBy, sortDir }
  //   response: ApiResponse<PagedResponse<UserResponse>>
  //     UserResponse: { id, email, fullName, phone, isActive, roles: Set<RoleResponse>, createdAt, updatedAt }
  // =========================
  getUsers: ({ keyword, roleName, isActive, page = 0, size = 10, sortBy = 'createdAt', sortDir = 'desc' } = {}) =>
    api.get('/admin/users', { params: { keyword, roleName, isActive, page, size, sortBy, sortDir } }),

  createUser: (data) =>
    // body: CreateUserRequest { email, password, fullName, phone, roleIds: UUID[] }
    api.post('/admin/users', data),

  getUserById: (id) =>
    api.get(`/admin/users/${id}`),

  updateUser: (id, data) =>

    api.put(`/admin/users/${id}`, data),

  deleteUser: (id) =>
    api.delete(`/admin/users/${id}`),

  activateUser: (id) =>

    api.patch(`/admin/users/${id}/activate`),

  deactivateUser: (id) =>
    api.patch(`/admin/users/${id}/deactivate`),

  resetUserPassword: (id, data) =>
    // body: ResetPasswordRequest { newPassword, confirmPassword }
    api.patch(`/admin/users/${id}/reset-password`, data),

  // =========================
  // ROLE MANAGEMENT
  // =========================
  getRoles: () =>
    // response: ApiResponse<List<RoleResponse>>
    //   RoleResponse: { id, name, description, permissions }
    api.get('/admin/roles'),

  createRole: (data) =>
    // body: CreateRoleRequest { name, description }
    api.post('/admin/roles', data),

  updateRole: (id, data) =>
    api.put(`/admin/roles/${id}`, data),

  deleteRole: (id) =>

    api.delete(`/admin/roles/${id}`),

  assignRoleToUser: (userId, data) =>
    // body: AssignRoleRequest { roleId: UUID }
    api.post(`/admin/users/${userId}/roles`, data),

  removeRoleFromUser: (userId, roleId) =>
    api.delete(`/admin/users/${userId}/roles/${roleId}`),

  // =========================
  // PERMISSION MANAGEMENT
  // =========================
  getPermissions: () =>
    // response: ApiResponse<List<PermissionResponse>>
    //   PermissionResponse: { id, name, description }
    api.get('/admin/permissions'),

  createPermission: (data) =>
    // body: CreatePermissionRequest { name, description }
    api.post('/admin/permissions', data),

  assignPermissionToRole: (roleId, data) =>
    // body: AssignPermissionRequest { permissionId: UUID }
    api.post(`/admin/roles/${roleId}/permissions`, data),

  removePermissionFromRole: (roleId, permId) =>
    api.delete(`/admin/roles/${roleId}/permissions/${permId}`),

  // =========================
  // WAREHOUSE MANAGEMENT
  // GET /api/admin/warehouses
  //   params: { keyword, status (WarehouseStatus enum), isVerified, page, size, sortBy, sortDir }
  //   response: ApiResponse<PagedResponse<WarehouseResponse>>
  // =========================
  getWarehouses: ({ keyword, status, isVerified, page = 0, size = 10, sortBy = 'createdAt', sortDir = 'desc' } = {}) =>
    api.get('/admin/warehouses', { params: { keyword, status, isVerified, page, size, sortBy, sortDir } }),

  verifyWarehouse: (id) =>
    api.post(`/admin/warehouses/${id}/verify`),

  rejectWarehouse: (id) =>
    api.post(`/admin/warehouses/${id}/reject`),

  // =========================
  // WAREHOUSE TYPE MANAGEMENT
  //   params: { keyword, page, size, sortBy, sortDir }
  //   response: ApiResponse<PagedWarehouseTypeResponse>
  // =========================
  getWarehouseTypes: ({ keyword, page = 0, size = 10, sortBy = 'createdAt', sortDir = 'desc' } = {}) =>
    api.get('/admin/warehouse-types', { params: { keyword, page, size, sortBy, sortDir } }),

  createWarehouseType: (data) =>
    api.post('/admin/warehouse-types', data),

  getWarehouseTypeById: (id) =>
    api.get(`/admin/warehouse-types/${id}`),

  updateWarehouseType: (id, data) =>
    api.put(`/admin/warehouse-types/${id}`, data),

  deleteWarehouseType: (id) =>
    api.delete(`/admin/warehouse-types/${id}`),

  // =========================
  // SYSTEM POLICIES
  //   params: { page, size }
  //   response: ApiResponse<PagedResponse<SystemPolicyResponse>>
  // POST /api/admin/system-policies
  //   body: CreateSystemPolicyRequest (from BE common.dto)
  // =========================
  getSystemPolicies: ({ page = 0, size = 10 } = {}) =>
    api.get('/admin/system-policies', { params: { page, size } }),

  createSystemPolicy: (data) =>
    api.post('/admin/system-policies', data),

  // =========================
  // PACKAGES & SUBSCRIPTIONS
  // =========================
  createPackage: (data) =>
    // body: CreatePackageRequest
    // response: ApiResponse<ServicePackageResponse>
    api.post('/admin/packages', data),

  updatePackage: (id, data) =>
    // body: UpdatePackageRequest
    api.put(`/admin/packages/${id}`, data),

  deletePackage: (id) =>
    api.delete(`/admin/packages/${id}`),

  getSubscriptions: ({ page = 0, size = 10 } = {}) =>
    // response: ApiResponse<Page<SubscriptionResponse>>
    api.get('/admin/subscriptions', { params: { page, size } }),

  // =========================
  // INSPECTIONS
  //   params: { status (InspectionStatus: PENDING|IN_PROGRESS|PASSED|FAILED), page, size }
  //   response: ApiResponse<PagedResponse<InspectionReportResponse>>
  // =========================
  getInspections: ({ status, page = 0, size = 10 } = {}) =>
    api.get('/admin/inspections', { params: { status, page, size } }),

  assignInspection: (id, inspectorId) =>
    // inspectorId là UUID của Inspector (query param, không phải body)
    api.post(`/admin/inspections/${id}/assign`, null, { params: { inspectorId } }),

  // =========================
  // DISPUTES
  //   params: { status (string), page, size }
  //   response: ApiResponse<PagedResponse<DisputeResponse>>
  // POST /api/admin/disputes/{id}/resolve
  //   body: ResolveDisputeRequest { adminNote, depositResolution: 'REFUND_TO_TENANT'|'FORFEIT_TO_OWNER'|'KEEP_IN_SYSTEM' }
  // =========================
  getDisputes: ({ status, page = 0, size = 10 } = {}) =>
    api.get('/admin/disputes', { params: { status, page, size } }),

  resolveDispute: (id, data) =>
    // data: { adminNote: string, depositResolution: string }
    api.post(`/admin/disputes/${id}/resolve`, data),

  // =========================
  // WITHDRAWALS
  //   params: { status (ApprovalStatus enum), page, size }
  //   response: ApiResponse<PagedResponse<WithdrawResponse>>
  //   body: { adminNotes?: string }
  //   body: { adminNotes?: string }
  // =========================
  getWithdrawals: ({ status, page = 0, size = 10 } = {}) =>
    api.get('/admin/withdrawals', { params: { status, page, size } }),

  approveWithdrawal: (id, adminNotes = '') =>
    api.patch(`/admin/withdrawals/${id}/approve`, { adminNotes }),

  rejectWithdrawal: (id, adminNotes = '') =>
    api.patch(`/admin/withdrawals/${id}/reject`, { adminNotes }),

  // =========================
  // TRANSACTIONS
  //   params: { page, size }
  //   response: ApiResponse<PagedTransactionResponse>
  // =========================
  getTransactions: ({ page = 0, size = 10 } = {}) =>
    api.get('/admin/transactions', { params: { page, size } }),
}

export default adminApi

