import api from '../apiConfig'

const auditApi = {
  // Danh sách phiếu kiểm kê của Tenant (có phân trang)
  getAudits: (warehouseId, { page, size } = {}) => {
    return api.get('/tenant/inventory/audits', {
      params: { warehouseId, page, size }
    })
  },

  // Tạo phiếu kiểm kê mới (tự động snapshot tồn kho hiện tại)
  createAudit: (data) => {
    return api.post('/tenant/inventory/audits', data)
  },

  // Xem chi tiết phiếu kiểm kê
  getAuditDetail: (id) => {
    return api.get(`/tenant/inventory/audits/${id}`)
  },

  // Nộp kết quả kiểm đếm thực tế
  submitAudit: (id, data) => {
    return api.post(`/tenant/inventory/audits/${id}/submit`, data)
  },

  // Duyệt phiếu kiểm kê (tự động sinh phiếu điều chỉnh tồn)
  approveAudit: (id) => {
    return api.patch(`/tenant/inventory/audits/${id}/approve`)
  },

  // Từ chối phiếu kiểm kê
  rejectAudit: (id, data) => {
    return api.patch(`/tenant/inventory/audits/${id}/reject`, data)
  }
}

export default auditApi
