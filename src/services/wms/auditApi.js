import api from '../apiConfig'

const auditApi = {
  // Danh sách phiếu kiểm kê của Tenant (có phân trang)
  getAudits: (warehouseId, { page, size } = {}) => {
    return api.get('/tenant/inventory/audits', {
      params: {
        ...(warehouseId ? { warehouseId } : {}),
        page,
        size,
      }
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

  // Bắt đầu đếm kho (chụp snapshot)
  startAudit: (id) => {
    return api.post(`/tenant/inventory/audits/${id}/start`)
  },

  // Lưu tiến độ đếm tạm thời
  saveCounts: (id, data) => {
    return api.put(`/tenant/inventory/audits/${id}/counts`, data)
  },

  // Nộp kết quả kiểm đếm thực tế (V2 không cần data)
  submitAudit: (id) => {
    return api.post(`/tenant/inventory/audits/${id}/submit`)
  },

  // Duyệt phiếu kiểm kê (tự động sinh phiếu điều chỉnh tồn)
  approveAudit: (id) => {
    return api.post(`/tenant/inventory/audits/${id}/approve`)
  },

  // Hủy phiếu kiểm kê (thay cho reject cũ)
  cancelAudit: (id, data) => {
    return api.post(`/tenant/inventory/audits/${id}/cancel`, data)
  },

  // Yêu cầu đếm lại
  recountAudit: (id, data) => {
    return api.post(`/tenant/inventory/audits/${id}/recount`, data)
  },

  // Thêm hàng bất thường không có trong hệ thống
  addUnexpectedItem: (id, data) => {
    return api.post(`/tenant/inventory/audits/${id}/unexpected-items`, data)
  }
}

export default auditApi
